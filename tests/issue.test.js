import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { Ward } from '../src/models/ward.models.js'
import { Issue } from '../src/models/issue.models.js'
import * as cloudinaryUtil from '../src/utils/cloudinary.js'

vi.spyOn(cloudinaryUtil, 'uploadOnCloudinary').mockImplementation(async (filePath) => {
  return { url: 'http://cloudinary.mock/test-photo.jpg' }
})

describe('Issue Controller & Management API', () => {
  let ward, citizenToken, officerToken, adminToken, citizenUser, officerUser, adminUser

  beforeEach(async () => {
    // Create Ward with polygon
    ward = await Ward.create({
      name: 'North Ward',
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

    // Create Citizen
    const citizenReg = await request(app).post('/api/v1/users/register').send({
      fullname: 'Citizen Jane',
      email: 'jane@example.com',
      username: 'citizenjane',
      password: 'password123',
      role: 'citizen'
    })
    citizenUser = citizenReg.body.data
    const citizenLogin = await request(app).post('/api/v1/users/login').send({
      email: 'jane@example.com',
      password: 'password123'
    })
    citizenToken = citizenLogin.body.data.accessToken

    // Create Ward Officer
    const officerReg = await request(app).post('/api/v1/users/register').send({
      fullname: 'Officer Dan',
      email: 'dan@example.com',
      username: 'officerdan',
      password: 'password123',
      role: 'ward-officer',
      ward: ward._id.toString()
    })
    officerUser = officerReg.body.data
    const officerLogin = await request(app).post('/api/v1/users/login').send({
      email: 'dan@example.com',
      password: 'password123'
    })
    officerToken = officerLogin.body.data.accessToken

    // Create Admin
    const adminReg = await request(app).post('/api/v1/users/register').send({
      fullname: 'Admin Chief',
      email: 'admin@example.com',
      username: 'adminchief',
      password: 'password123',
      role: 'admin'
    })
    adminUser = adminReg.body.data
    const adminLogin = await request(app).post('/api/v1/users/login').send({
      email: 'admin@example.com',
      password: 'password123'
    })
    adminToken = adminLogin.body.data.accessToken
  })

  describe('POST /api/v1/issues/register', () => {
    it('should allow a citizen to create an issue with photo upload within valid ward', async () => {
      const res = await request(app)
        .post('/api/v1/issues/register')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', 'Broken Streetlight')
        .field('description', 'Light flickering near park')
        .field('category', 'Streetlight')
        .field('coordinates', JSON.stringify([77.1, 28.1]))
        .attach('photoOfIssue', Buffer.from('fake-image-content'), 'photo.jpg')

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe('Broken Streetlight')
      expect(res.body.data.photoOfIssue).toBe('http://cloudinary.mock/test-photo.jpg')
      expect(res.body.data.assignedTo).toBe(officerUser._id)
    })

    it('should reject issue creation if coordinates fall outside any known ward', async () => {
      const res = await request(app)
        .post('/api/v1/issues/register')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', 'Out of Bounds Issue')
        .field('description', 'Far away location')
        .field('category', 'Pothole')
        .field('coordinates', JSON.stringify([0, 0]))
        .attach('photoOfIssue', Buffer.from('fake-image-content'), 'photo.jpg')

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toMatch(/outside any known ward/i)
    })

    it('should reject issue creation by non-citizen roles', async () => {
      const res = await request(app)
        .post('/api/v1/issues/register')
        .set('Authorization', `Bearer ${officerToken}`)
        .field('title', 'Officer Issue')
        .field('description', 'Desc')
        .field('category', 'Other')
        .field('coordinates', JSON.stringify([77.1, 28.1]))
        .attach('photoOfIssue', Buffer.from('fake-image-content'), 'photo.jpg')

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('Issue Lifecycle & Operations', () => {
    let testIssue

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/issues/register')
        .set('Authorization', `Bearer ${citizenToken}`)
        .field('title', 'Pothole on Main St')
        .field('description', 'Deep pothole')
        .field('category', 'Pothole')
        .field('coordinates', JSON.stringify([77.1, 28.1]))
        .attach('photoOfIssue', Buffer.from('fake-image-content'), 'photo.jpg')

      testIssue = res.body.data
    })

    it('should allow citizen to fetch their own issues', async () => {
      const res = await request(app)
        .get('/api/v1/issues/mine')
        .set('Authorization', `Bearer ${citizenToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.length).toBe(1)
    })

    it('should allow ward officer to update issue status', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${testIssue._id}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'in-progress' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('in-progress')
    })

    it('should allow ward officer to resolve issue with resolution photo', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${testIssue._id}/resolve`)
        .set('Authorization', `Bearer ${officerToken}`)
        .attach('resolutionPhoto', Buffer.from('fixed-image'), 'resolved.jpg')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('resolved')
      expect(res.body.data.resolutionPhoto).toBe('http://cloudinary.mock/test-photo.jpg')
    })

    it('should allow reporter to reopen a resolved issue', async () => {
      // First resolve
      await request(app)
        .patch(`/api/v1/issues/${testIssue._id}/resolve`)
        .set('Authorization', `Bearer ${officerToken}`)
        .attach('resolutionPhoto', Buffer.from('fixed-image'), 'resolved.jpg')

      // Reopen
      const res = await request(app)
        .patch(`/api/v1/issues/${testIssue._id}/reopen`)
        .set('Authorization', `Bearer ${citizenToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('pending')
    })

    it('should allow ward officer to reject issue with reason', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${testIssue._id}/reject`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ rejectionReason: 'Not a public road issue' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('rejected')
      expect(res.body.data.rejectionReason).toBe('Not a public road issue')
    })

    it('should allow users to comment on an issue', async () => {
      const res = await request(app)
        .post(`/api/v1/issues/${testIssue._id}/comment`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ comment: 'Please fix this urgently!' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.comment).toBe('Please fix this urgently!')
    })

    it('should allow admin to view stats overview', async () => {
      const res = await request(app)
        .get('/api/v1/issues/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.statusCounts).toBeDefined()
    })

    it('should allow citizen to delete their own issue', async () => {
      const res = await request(app)
        .delete(`/api/v1/issues/${testIssue._id}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ reason: 'Accidental submission' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.isDeleted).toBe(true)
    })
  })
})
