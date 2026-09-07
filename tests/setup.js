import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { beforeAll, afterAll, beforeEach } from 'vitest'

process.env.ACCESS_TOKEN_SECRET = 'test_access_token_secret_12345'
process.env.ACCESS_TOKEN_EXPIRY = '1d'
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_token_secret_12345'
process.env.REFRESH_TOKEN_EXPIRY = '30d'
process.env.ORIGIN_CORS = '*'

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
}, 180000)

afterAll(async () => {
  await mongoose.disconnect()
  if (mongoServer) {
    await mongoServer.stop()
  }
})

beforeEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})
