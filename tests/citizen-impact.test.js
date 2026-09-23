import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { Ward } from '../src/models/ward.models.js'
import { Issue } from '../src/models/issue.models.js'
import * as cloudinaryUtil from '../src/utils/cloudinary.js'

vi.spyOn(cloudinaryUtil, 'uploadOnCloudinary').mockImplementation(async (filePath) => {
  return { url: 'http://cloudinary.mock/test-photo.jpg' }
})

describe('Citizen Impact API Routes', () => {
  let ward, citizenToken, citizenUser

  beforeEach(async () => {
    ward = await Ward.create({
      name: 'South Ward',
      location: {
        type: 'Polygon',
        coordinates: [
          [
            [77.0, 28.0],
            [77.2, 28.0],
            [77.2, 28.2],
            [77.0, 28.2],
            [77.0, 28.0]
          ]
        ]
      }
    })

    const citizenReg = await request(app).post('/api/v1/users/register').send({
      fullname: 'Impact Citizen',
      email: 'impact@example.com',
      username: 'impactcitizen',
      password: 'password123',
      role: 'citizen'
    })
    citizenUser = citizenReg.body.data

    const loginRes = await request(app).post('/api/v1/users/login').send({
      email: 'impact@example.com',
      password: 'password123'
    })
    citizenToken = loginRes.body.data.accessToken

    // Create an issue for this citizen
    await request(app)
      .post('/api/v1/issues/register')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('title', 'Pothole in South Ward')
      .field('description', 'Large pothole')
      .field('category', 'Pothole')
      .field('coordinates', JSON.stringify([77.1, 28.1]))
      .attach('photoOfIssue', Buffer.from('fake-image-content'), 'photo.jpg')
  })

  describe('GET /api/v1/citizen-impact', () => {
    it('should return impact statistics for current authenticated citizen', async () => {
      const res = await request(app)
        .get('/api/v1/citizen-impact')
        .set('Authorization', `Bearer ${citizenToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.totalIssues).toBe(1)
      expect(res.body.data.issueStatusCount).toBeDefined()
      expect(res.body.data.issueStatusCount[0]._id).toBe('pending')
      expect(res.body.data.issueStatusCount[0].count).toBe(1)
    })

    it('should return impact statistics by user ID', async () => {
      const res = await request(app)
        .get(`/api/v1/citizen-impact/${citizenUser._id}`)
        .set('Authorization', `Bearer ${citizenToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.totalIssues).toBe(1)
    })

    it('should also work on /api/v1/users/impact endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/users/impact')
        .set('Authorization', `Bearer ${citizenToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.totalIssues).toBe(1)
    })

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/citizen-impact')
      expect(res.status).toBe(401)
    })

    it('should return 400 for invalid user id format', async () => {
      const res = await request(app)
        .get('/api/v1/citizen-impact/invalid-id')
        .set('Authorization', `Bearer ${citizenToken}`)

      expect(res.status).toBe(400)
    })
  })
})
