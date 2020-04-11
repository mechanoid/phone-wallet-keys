import fs from 'fs-extra'
import { spawn as spawnStream } from 'child_process'

const spawn = (command, args, options) => {
  const cmd = spawnStream(command, args, options)

  const p = new Promise((resolve, reject) => {
    cmd.on('close', code => {
      if (code !== 0) {
        const message = `${command} ${(args || []).join(
          ' '
        )} failed with ${code}`
        reject(new Error(message))
      }
      resolve()
    })
  })

  return [p, cmd]
}

export default (npmPackage, utils, config) => {
  const addProjectBinary = async () => {
    const info = await npmPackage.packageInfo()

    const binaryPath = `bin/${info.name}.js`
    utils.createFromFile('bin-template.js', binaryPath)

    if (!info.bin) {
      info.bin = {}
    }

    if (!info.bin[info.name]) {
      info.bin[info.name] = binaryPath
      await fs.outputJson(npmPackage.packageJsonPath(), info, { spaces: 2 })
    }

    return info
  }

  const addEslintStandard = async () => {
    await utils.createFromFile('.eslintrc')

    const [promise, eslintInstall] = spawn(
      'npm',
      [
        'i',
        '--save-dev',
        'eslint',
        'eslint-config-standard',
        'eslint-plugin-import',
        'eslint-plugin-node',
        'eslint-plugin-promise',
        'eslint-plugin-standard'
      ],
      {
        cwd: process.cwd(),
        stdio: 'inherit'
      }
    )

    eslintInstall.on('close', code => {
      if (code !== 0) {
        console.log(
          `npm install of eslint/standardjs dependendencies failed with code: ${code}`
        )
      }
    })

    return promise
  }

  const addEditorConfig = async () => utils.createFromFile('.editorconfig')
  const addGitIgnore = async () =>
    utils.createFromFile('gitignore', '.gitignore')

  const addLicenseFile = async () => {
    const info = await npmPackage.packageInfo()
    await utils.createFromFile('LICENSE')
    if (info.license !== 'MIT') {
      info.license = 'MIT'
      await fs.outputJson(npmPackage.packageJsonPath(), info, { spaces: 2 })
    }
    return info
  }

  const defineProjectAsModuleBased = async () => {
    const info = await npmPackage.packageInfo()
    if (!info.type) {
      info.type = 'module'
      info.module = 'index.js'
      await fs.outputJson(npmPackage.packageJsonPath(), info, { spaces: 2 })
    }
    return info
  }

  const initGit = async () => {
    const [promise, gitInit] = spawn('git', ['init'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    })

    gitInit.on('close', code => {
      if (code !== 0) {
        console.log(`git init failed with code: ${code}`)
      }
    })

    return promise
  }

  const saveToGit = async message => {
    const [promise1, gitAdd] = spawn('git', ['add', '-A'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    })
    gitAdd.on('close', async code => {
      if (code !== 0) {
        console.log(`git add failed with code: ${code}`)
      }
    })

    return promise1.then(() => {
      const [promise2, gitCommit] = spawn('git', ['commit', '-m', message], {
        cwd: process.cwd(),
        stdio: 'inherit'
      })

      gitCommit.on('close', code => {
        if (code !== 0) {
          console.log(`git commit failed with code: ${code}`)
        }

        console.log('\ncommitted:', message, '\n\n')
      })

      return promise2
    })
  }

  const installExpressDeps = async () => {
    const [promise, npmInstall] = spawn(
      'npm',
      ['i', 'express', 'helmet', 'morgan', 'dotenv'],
      {
        cwd: process.cwd(),
        stdio: 'inherit'
      }
    )

    npmInstall.on('close', code => {
      if (code !== 0) {
        console.log(
          `npm install of express dependencies failed with code: ${code}`
        )
      }
    })
    return promise
  }

  const initializeExpressApp = async () => {
    const info = await npmPackage.packageInfo()
    if (!info.scripts.start) {
      info.scripts.start = `node -r dotenv/config bin/${info.name}.js`
      info.scripts['dev:generate-self-signed-certs'] =
        'mkdir certs; openssl req -nodes -new -x509 -keyout certs/server.key -out certs/server.cert'
      await fs.outputJson(npmPackage.packageJsonPath(), info, { spaces: 2 })
    }

    await installExpressDeps()

    await utils.createFromFile('express.bin.js', `bin/${info.name}.js`)
    await utils.createFromFile('express.app.js', 'index.js')
    await utils.createFromFile('.env.template')
    await utils.createFromFile('.env.template', '.env')

    return info
  }

  const bootstrap = async () => {
    try {
      await initGit()
      await addGitIgnore()
      await addProjectBinary()
      await addEditorConfig()
      await addLicenseFile()
      await saveToGit('initialize empty js project')

      // npm is updating the package json again, so do it last
      if (!config.withoutEslintStandardJS) {
        await addEslintStandard()
        await saveToGit('added standardjs elint setup')
      }

      if (config.asESMProject) {
        await defineProjectAsModuleBased()
        await saveToGit('define app as module based')
      }

      if (config.asExpressApp) {
        await initializeExpressApp()
        await saveToGit('initialize express app')
      }
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  }

  return bootstrap
}
