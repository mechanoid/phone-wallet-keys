#!/usr/bin/env node
const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const arg = require('arg')

const argOptions = {
  '--module': Boolean,
  '--express': Boolean,
  '--help': Boolean
}
const aliases = {
  // aliases
  '-h': '--help',
  '-m': '--module',
  '-e': '--express'
}

const argDescriptions = {
  '--module': 'Initializes npm package with `"type": "module"` enabled',
  '--express': 'Initialize a default configured express app (--module is part of that automatically)',
  '--help': 'shows help message'
}

const alias = name => {
  const entry = Object.entries(aliases).find(([alias, option]) => option === name)
  return entry ? entry[0] : null
}

const argsHelp = () => {
  const options = Object
    .entries(argOptions)
    .map(([name, type]) => ({ name, type, alias: alias(name), description: argDescriptions[name] }))

  return `
Phone Wallet Keys is a bootstrapping help for nodejs projects.

Usage:

1. mkdir MY_NEW_PROJECT
2. cd MY_NEW_PROJECT
3. npm init
4. phone_wallet_keys [ARGS]

allowed ARGS:

${options.map(o => `  ${o.name}${o.alias ? ` / ${o.alias}` : ''} (${o.type && o.type.name}): ${o.description}`).join('\n')}
`
}

try {
  const args = arg(Object.assign({}, argOptions, aliases))

  if (args['--help']) {
    console.log(argsHelp())
    process.exit(0)
  }

  const exec = util.promisify(require('child_process').exec)

  const tplPath = file => path.resolve(__dirname, '..', 'files', file)
  const projectPath = targetPath => path.resolve(process.cwd(), targetPath)

  const packageJsonPath = () => path.resolve(process.cwd(), 'package.json')

  const packageInfo = async () => {
    try {
      const data = await fs.readFile(packageJsonPath())
      return JSON.parse(data)
    } catch (e) {
      console.error(`the current folder does not seem to be a npm project yet.

Please initialize a npm project with \`npm init\``)
      process.exit(1)
    }
  }

  const createFromFile = (src, target) => fs.copy(tplPath(src), projectPath(target || src))

  const addProjectBinary = async () => {
    const info = await packageInfo()
    const binaryPath = `bin/${info.name}.js`
    createFromFile('bin-template.js', binaryPath)

    if (!info.bin) {
      info.bin = {}
    }

    if (!info.bin[info.name]) {
      info.bin[info.name] = binaryPath
      await fs.outputJson(packageJsonPath(), info, { spaces: 2 })
    }

    return info
  }

  const addEslintStandard = async () => {
    await createFromFile('.eslintrc')

    const installCmd = 'npm i --save-dev eslint eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-standard'
    const { stdout, stderr } = await exec(installCmd, { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)
  }

  const addEditorConfig = async () => createFromFile('.editorconfig')
  const addGitIgnore = async () => createFromFile('gitignore', '.gitignore')

  const addLicenseFile = async () => {
    const info = await packageInfo()
    await createFromFile('LICENSE')
    if (info.license !== 'MIT') {
      info.license = 'MIT'
      await fs.outputJson(packageJsonPath(), info, { spaces: 2 })
    }
    return info
  }

  const defineProjectAsModuleBased = async () => {
    const info = await packageInfo()
    if (!info.type) {
      info.type = 'module'
      info.module = 'index.js'
      await fs.outputJson(packageJsonPath(), info, { spaces: 2 })
    }
    return info
  }

  const initGit = async () => {
    const { stdout, stderr } = await exec('git init', { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)
  }

  const saveToGit = async message => {
    const { stdout, stderr } = await exec(`git add -A; git commit -m "${message}"`, { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)
  }

  const initializeExpressApp = async () => {
    const info = await packageInfo()
    if (!info.scripts.start) {
      info.scripts.start = `node -r dotenv/config bin/${info.name}.js`
      info.scripts['dev:generate-self-signed-certs'] = 'mkdir certs; openssl req -nodes -new -x509 -keyout certs/server.key -out certs/server.cert'
      await fs.outputJson(packageJsonPath(), info, { spaces: 2 })
    }

    const installCmd = 'npm i express helmet morgan dotenv'
    const { stdout, stderr } = await exec(installCmd, { cwd: process.cwd() })
    console.log(stdout)
    console.log(stderr)

    await createFromFile('express.bin.js', `bin/${info.name}.js`)
    await createFromFile('express.app.js', 'index.js')
    await createFromFile('.env.template')
    await createFromFile('.env.template', '.env')

    return info
  }

  const bootstrap = async () => {
    try {
      await initGit()
      await addGitIgnore()
      await addProjectBinary()
      await addEditorConfig()
      await addLicenseFile()

      // npm is updating the package json again, so do it last
      await addEslintStandard()
      await saveToGit('initialize empty js project')

      if (args['--module'] || args['--express']) {
        await defineProjectAsModuleBased()
        await saveToGit('define app as module based')
      }

      if (args['--express']) {
        await initializeExpressApp()
        await saveToGit('initialize express app')
      }
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  }

  bootstrap()
    .then(() => console.log(`
Phone! Wallet! Keys!
----------------> lets go!!`))
    .catch(e => {
      console.error(e)
      process.exit(1)
    })
} catch (err) {
  if (err.code === 'ARG_UNKNOWN_OPTION') {
    console.error(err.message)
    console.error(argsHelp())
  } else {
    throw err
  }
}
