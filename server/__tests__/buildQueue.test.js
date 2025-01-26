const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const Bot = require('../models/Bot');
const { createTestUser, generateToken } = require('./testUtils');

describe('Build Queue', () => {
  let token;
  let userId;

  beforeAll(async () => {
    const user = await createTestUser();
    token = generateToken(user);
    userId = user._id;
  });

  beforeEach(async () => {
    await Bot.deleteMany({});
  });

  it('should create new build queue when starting build', async () => {
    const response = await request(app)
      .post('/api/bots/build')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    expect(response.status).toBe(200);
    expect(response.body.buildQueue).toBeDefined();
    expect(response.body.buildQueue.type).toBe('breacher');
    expect(response.body.buildQueue.quantity).toBe(5);
    expect(response.body.buildQueue.botsBuilt).toBe(0);
    expect(new Date(response.body.buildQueue.completesAt).getTime())
      .toBeGreaterThan(new Date(response.body.buildQueue.startedAt).getTime());
  });

  it('should reject invalid bot types', async () => {
    const response = await request(app)
      .post('/api/bots/build')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'invalid_type',
        quantity: 5
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid bot type');
  });

  it('should reject invalid quantities', async () => {
    const response = await request(app)
      .post('/api/bots/build')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'breacher',
        quantity: 0
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid quantity');
  });

  it('should calculate progress correctly', async () => {
    // Create a build started 30 seconds ago
    const startTime = new Date(Date.now() - 30000);
    const endTime = new Date(Date.now() + 30000);
    
    await Bot.create({
      userId,
      buildQueue: {
        type: 'breacher',
        quantity: 5,
        startedAt: startTime,
        completesAt: endTime,
        botsBuilt: 2
      }
    });

    const response = await request(app)
      .get('/api/bots/build-state')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.buildQueue.progress).toBe(50);
  });
}); 