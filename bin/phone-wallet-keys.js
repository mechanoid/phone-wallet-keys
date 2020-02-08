#!/usr/bin/env node
const util = require('util')
const path = require('path')
const fs = require('fs-extra')

const exec = util.promisify(require('child_process').exec)

const tplPath = file => path.resolve(__dirname, '..', 'files', file)
const projectPath = targetPath => path.resolve(process.cwd(), targetPath)

const packageJsonPath = () => path.resolve(process.cwd(), 'package.json')

const packageInfo = async () => {
  const data = await fs.readFile(packageJsonPath())
  return JSON.parse(data)
}

const createFromFile = (src, target) => fs.copy(tplPath(src), projectPath(target || src), { overwrite: false })

const addProjectBinary = async ({ info }) => {
  const binaryPath = `bin/${info.name}.js`
  createFromFile('bin-template.js', binaryPath)

  if (!info.bin) {
    info.bin = {}
  }

  if (!info.bin[info.name]) {
    info.bin[info.name] = binaryPath
    return fs.outputJson(packageJsonPath(), info, { spaces: 2 })
  }
}

const addEslintStandard = async () => {
  await createFromFile('.eslintrc')

  const { stdout, stderr } = await exec('npm i --save-dev eslint eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-promise eslint-plugin-standard')
  console.log(stdout)
  console.log(stderr)
}

const addEditorConfig = async () => createFromFile('.editorconfig')
const addGitIgnore = async () => createFromFile('.gitignore')

const addLicenseFile = async ({ info }) => {
  await createFromFile('LICENSE')
  if (info.license !== 'MIT') {
    info.license = 'MIT'
    return fs.outputJson(packageJsonPath(), info, { spaces: 2 })
  }
}

const bootstrap = async () => {
  const info = await packageInfo()
  try {
    await addProjectBinary({ info })
    await addEslintStandard()
    await addEditorConfig()
    await addLicenseFile({ info })
    await addGitIgnore()
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
