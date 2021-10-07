import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

const app = express()
app.use(helmet())
app.use(morgan('combined'))

export default config => {
  return app
}
