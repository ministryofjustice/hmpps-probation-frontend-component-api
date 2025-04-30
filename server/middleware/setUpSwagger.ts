import fs from 'fs'
import path from 'path'
import express from 'express'
import swaggerUi from 'swagger-ui-express'

export default function setUpSwagger(app: express.Express) {
  const config = fs.readFileSync(path.join(process.cwd(), 'dist/swagger.json')).toString()
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(JSON.parse(config)))
}
