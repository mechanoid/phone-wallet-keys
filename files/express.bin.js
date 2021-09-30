#!/usr/bin/env node

import app from '../index.js'

const env = process.env

const config = {
  port: env.PORT
}

const server = app(config).listen(config.port, () => {
  console.log(`started at http://localhost:${server.address().port}`)
})
