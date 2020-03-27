import fs from 'fs-extra'

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

    const installCmd = 'npm i --save-dev eslint eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-standard'
    const { stdout, stderr } = await utils.exec(installCmd, { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)
  }

  const addEditorConfig = async () => utils.createFromFile('.editorconfig')
  const addGitIgnore = async () => utils.createFromFile('gitignore', '.gitignore')

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
    const { stdout, stderr } = await utils.exec('git init', { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)
  }

  const saveToGit = async message => {
    const { stdout, stderr } = await utils.exec(`git add -A; git commit -m "${message}"`, { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)
  }

  const initializeExpressApp = async () => {
    const info = await npmPackage.packageInfo()
    if (!info.scripts.start) {
      info.scripts.start = `node -r dotenv/config bin/${info.name}.js`
      info.scripts['dev:generate-self-signed-certs'] = 'mkdir certs; openssl req -nodes -new -x509 -keyout certs/server.key -out certs/server.cert'
      await fs.outputJson(npmPackage.packageJsonPath(), info, { spaces: 2 })
    }

    const installCmd = 'npm i express helmet morgan dotenv'
    const { stdout, stderr } = await utils.exec(installCmd, { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)

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
