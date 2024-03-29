#!/usr/bin/env node
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs-extra'
import arg from 'arg'
import { findUp } from 'find-up'
import phoneWalletKeys from '../index.js'

const argOptions = {
  '--module': Boolean,
  '--express': Boolean,
  '--without-standard': Boolean,
  '--without-license': Boolean,
  '--license-holder': String,
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
  '--express':
    'Initialize a default configured express app (--module is part of that automatically)',
  '--without-standard':
    'By default projects are enabled with StandardJS. You can skip that out completely with that option',
  '--help': 'shows help message'
}

const alias = name => {
  const entry = Object.entries(aliases).find(
    ([alias, option]) => option === name
  )
  return entry ? entry[0] : null
}

const argsHelp = () => {
  const options = Object.entries(argOptions).map(([name, type]) => ({
    name,
    type,
    alias: alias(name),
    description: argDescriptions[name]
  }))

  return `
Phone Wallet Keys is a bootstrapping help for nodejs projects.

Usage:

1. mkdir MY_NEW_PROJECT
2. cd MY_NEW_PROJECT
3. npm init
4. phone_wallet_keys [ARGS]

allowed ARGS:

${options
  .map(
    o =>
      `  ${o.name}${o.alias ? ` / ${o.alias}` : ''} (${o.type &&
        o.type.name}): ${o.description}`
  )
  .join('\n')}
`
}

const __dirname = fileURLToPath(import.meta.url)
const filesDir = path.resolve(__dirname, '..', '..', 'files')

const tplPath = file => path.resolve(filesDir, file)
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

const createFromFile = async (src, target, data = null) => {
  if (data) {
    const content = await (await fs.readFile(tplPath(src))).toString()
    const interpolated = Object.keys(data).reduce((res, key) => res.replace(`$\{${key}}`, data[key]), content)
    return await fs.writeFile(projectPath(target || src), interpolated)
  }

  return fs.copy(tplPath(src), projectPath(target || src))
}

let clientConfig

try {
  const clientConfigPath = await findUp('.phone-wallet-keys.mjs', '.phone-wallet-keys.js')
  console.log(`found client defaults at: ${clientConfigPath}`);
  if (clientConfigPath) {
    console.log('resolve client config');
    clientConfig = await import(clientConfigPath)
  }
} catch(e) {
}


if (!!clientConfig) {
  clientConfig = clientConfig.default
} else {
  clientConfig = {}
}

try {
  const args = arg(Object.assign({}, argOptions, aliases))

  if (args['--help']) {
    console.log(argsHelp())
    process.exit(0)
  }

  const config = {
    asESMProject: args['--module'] || args['--express'] || clientConfig['--module'],
    asExpressApp: args['--express'] || clientConfig['--express'],
    withoutEslintStandardJS: args['--without-standard'] || clientConfig['--without-standard'],
    withoutLicense: args['--without-license'] || clientConfig['--without-license'],
    licenseHolder:  args['--license-holder'] || clientConfig['--license-holder']
  }

  const bootstrap = phoneWalletKeys(
    { packageInfo, packageJsonPath },
    { createFromFile },
    config
  )

  bootstrap()
    .then(() =>
      console.log(`
Phone! Wallet! Keys!
----------------> lets go!!`)
    )
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
