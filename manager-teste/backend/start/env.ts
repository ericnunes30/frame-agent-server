/*
    |--------------------------------------------------------------------------
    | Environment variables service
    |--------------------------------------------------------------------------
    |
    | The `Env.create` method creates an instance of the Env service. The
    | service validates the environment variables and also cast values
    | to JavaScript data types.
    |
    */

import 'dotenv/config'
import { Env } from '@adonisjs/core/env'

const baseUrl = new URL('../../', import.meta.url)

export default await Env.create(baseUrl, {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test']),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  FRONTEND_URL: Env.schema.string.optional(),
})
