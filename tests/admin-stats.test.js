import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'

describe('Admin Stats API Routes', () => {
  let adminToken, citizenToken

  beforeEach(async () => {
    // Register & login admin
    await request(app).post('/api/v1/users/register').send({
      fullname: 'Admin User',
      email: 'adminstats@example.com',
      username: 'adminstatsuser',
      password: 'password123',
      role: 'admin'
    })

    const adminLogin = await request(app).post('/api/v1/users/login').send({
      email: 'adminstats@example.com',
      password: 'password123'
    })
    adminToken = adminLogin.body.data.accessToken

    // Register & login citizen
    await request(app).post('/api/v1/users/register').send({
      fullname: 'Non Admin Citizen',
      email: 'nonadmin@example.com',
      username: 'nonadminuser',
      password: 'password123',
      role: 'citizen'
    })

    const citizenLogin = await request(app).post('/api/v1/users/login').send({
      email: 'nonadmin@example.com',
      password: 'password123'
    })
    citizenToken = citizenLogin.body.data.accessToken
  })

  describe('GET /api/v1/admin-stats', () => {
    it('should allow admin to view stats overview at /api/v1/admin-stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin-stats')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.statusCounts).toBeDefined()
      expect(res.body.data.categoryCounts).toBeDefined()
      expect(res.body.data.countByWard).toBeDefined()
      expect(res.body.data.avgResolutionTime).toBeDefined()
    })

    it('should allow admin to view stats overview at /api/v1/admin-stats/overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin-stats/overview')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should deny non-admin users access to admin stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin-stats')
        .set('Authorization', `Bearer ${citizenToken}`)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('should deny unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/admin-stats')
      expect(res.status).toBe(401)
    })
  })
})
