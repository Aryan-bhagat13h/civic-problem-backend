import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { User } from '../src/models/user.models.js'
import { Ward } from '../src/models/ward.models.js'

describe('User Controller & Authentication API', () => {
  let testWard

  beforeEach(async () => {
    testWard = await Ward.create({
      name: 'Central Ward',
      location: {
        type: 'Polygon',
        coordinates: [
          [
            [77.0, 28.0],
            [77.1, 28.0],
            [77.1, 28.1],
            [77.0, 28.1],
            [77.0, 28.0]
          ]
        ]
      }
    })
  })

  describe('POST /api/v1/users/register', () => {
    it('should register a new citizen successfully without a ward', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          fullname: 'John Citizen',
          email: 'john@example.com',
          username: 'johncitizen',
          password: 'password123',
          role: 'citizen'
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.username).toBe('johncitizen')
      expect(res.body.data.email).toBe('john@example.com')
      expect(res.body.data.password).toBeUndefined()
    })

    it('should register a ward officer successfully when valid ward is provided', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          fullname: 'Officer Smith',
          email: 'officer@example.com',
          username: 'officersmith',
          password: 'password123',
          role: 'ward-officer',
          ward: testWard._id.toString()
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.role).toBe('ward-officer')
    })

    it('should fail registering a ward officer without a ward', async () => {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          fullname: 'Officer Smith',
          email: 'officer2@example.com',
          username: 'officersmith2',
          password: 'password123',
          role: 'ward-officer'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toMatch(/ward is required/i)
    })

    it('should reject registration when email or username is already registered', async () => {
      await request(app)
        .post('/api/v1/users/register')
        .send({
          fullname: 'First User',
          email: 'duplicate@example.com',
          username: 'dupuser',
          password: 'password123'
        })

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          fullname: 'Second User',
          email: 'duplicate@example.com',
          username: 'otheruser',
          password: 'password123'
        })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/users/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/users/register')
        .send({
          fullname: 'Alice Wonder',
          email: 'alice@example.com',
          username: 'alicew',
          password: 'secretpassword'
        })
    })

    it('should login successfully with email and password', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'alice@example.com',
          password: 'secretpassword'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.accessToken).toBeDefined()
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('should login successfully with username and password', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({
          username: 'alicew',
          password: 'secretpassword'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should fail login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'alice@example.com',
          password: 'wrongpassword'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toMatch(/password is incorrect/i)
    })
  })

  describe('Authenticated user actions: profile & password', () => {
    let token, cookie, userId

    beforeEach(async () => {
      await request(app)
        .post('/api/v1/users/register')
        .send({
          fullname: 'Bob User',
          email: 'bob@example.com',
          username: 'bobuser',
          password: 'password123'
        })

      const loginRes = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'bob@example.com',
          password: 'password123'
        })

      token = loginRes.body.data.accessToken
      cookie = loginRes.headers['set-cookie']
      userId = loginRes.body.data.user._id
    })

    it('should update user profile successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullname: 'Bob Updated',
          username: 'bobnewname'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.fullname).toBe('Bob Updated')
      expect(res.body.data.username).toBe('bobnewname')
    })

    it('should change password successfully', async () => {
      const res = await request(app)
        .post('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'password123',
          newPassword: 'newpassword456'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Confirm login with new password works
      const loginRes = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'bob@example.com',
          password: 'newpassword456'
        })
      expect(loginRes.status).toBe(200)
    })

    it('should logout user and clear refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const dbUser = await User.findById(userId)
      expect(dbUser.refreshToken).toBeNull()
    })
  })
})
