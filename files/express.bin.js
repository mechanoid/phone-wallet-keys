#!/usr/bin/env node

import yenv from 'yenv'
import app from '../index.js'

const env = yenv('env.yaml', { env: process.env.NODE_ENV === 'production' ? 'production' : 'development' })

const config = {
  port: env.PORT
}

const server = app(config).listen(config.port, () => {
  console.log(`listening to port: ${server.address().port}`)
})
