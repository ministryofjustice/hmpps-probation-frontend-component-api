const { copy } = require('esbuild-plugin-copy')
const { typecheckPlugin } = require('@jgoz/esbuild-plugin-typecheck')
const esbuild = require('esbuild')
const glob = require('glob')
const path = require('path')
const { writeFile } = require('fs/promises')
const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Probation Frontend Components API',
      version: '1.0.0',
      description: 'API to serve common components used in digital services in Probation',
    },
    servers: [
      {
        url: 'probation-frontend-components-dev.service.justice.gov.uk',
      },
      // {
      //   url: 'probation-frontend-components-preprod.service.justice.gov.uk',
      // },
      // {
      //   url: 'probation-frontend-components.service.justice.gov.uk',
      // },
    ],
  },
  apis: [path.join(__dirname, '../server/routes/componentRoutes.ts')],
}

const configFromJsDoc = swaggerConfig => async () => {
  const swaggerJson = JSON.stringify(swaggerJsdoc(swaggerConfig), null, 2)
  await writeFile(path.join(__dirname, '../dist/swagger.json'), swaggerJson)
}

const generateSwaggerPlugin = swaggerConfig => ({
  name: 'generateSwaggerPlugin',
  async setup(build) {
    build.onEnd(configFromJsDoc(swaggerConfig))
  },
})

/**
 * Build typescript application into CommonJS
 * @type {BuildStep}
 */
const buildApp = buildConfig => {
  return esbuild.build({
    entryPoints: glob.sync(buildConfig.app.entryPoints),
    outdir: buildConfig.app.outDir,
    bundle: false,
    sourcemap: true,
    platform: 'node',
    format: 'cjs',
    plugins: [
      typecheckPlugin(),
      copy({
        resolveFrom: 'cwd',
        assets: buildConfig.app.copy,
      }),
      generateSwaggerPlugin(options),
    ],
  })
}

/**
 * @param {BuildConfig} buildConfig
 * @returns {Promise}
 */
module.exports = buildConfig => {
  process.stderr.write('\u{1b}[1m\u{2728} Building app...\u{1b}[0m\n')

  return buildApp(buildConfig)
}
