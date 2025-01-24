const request = require('supertest');
const app = require('../server');
const { setupTestDB, getAuthToken } = require('./helpers/testUtils');

describe('Bot Building API', () => {
  let authToken;

  // Set up fresh test database for all tests
  setupTestDB();

  // Get fresh auth token before each test
  beforeEach(async () => {
    authToken = await getAuthToken(app);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start a new bot build process', async () => {
    const response = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('buildId');
    expect(response.body).toHaveProperty('startTime');
    expect(response.body.type).toBe('breacher');
    expect(response.body.quantity).toBe(5);
  });

  it('should persist build state across server restarts', async () => {
    // Start a build
    const buildResponse = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    // Simulate server restart by clearing cache
    await app.close();
    await app.listen();

    // Check build status persists
    const statusResponse = await request(app)
      .get('/api/bots/build/status')
      .set('Authorization', `Bearer ${authToken}`);

    expect(statusResponse.body.buildId).toBe(buildResponse.body.buildId);
  });

  it('should handle invalid build requests', async () => {
    const invalidRequests = [
      { type: 'invalid_type', quantity: 1 },
      { type: 'breacher', quantity: 0 },
      { type: 'breacher', quantity: 1001 }, // Assuming max is 1000
      { type: 'breacher' }, // Missing quantity
      { quantity: 1 }, // Missing type
    ];

    for (const invalidRequest of invalidRequests) {
      const response = await request(app)
        .post('/api/bots/build/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    }
  });

  it('should validate resources before starting build', async () => {
    await request(app)
      .post('/api/balance/set')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ balance: 4 });

    const response = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Insufficient funds');
    expect(response.body.required).toBe(5);
    expect(response.body.available).toBe(4);
  });

  it('should handle complete build lifecycle', async () => {
    const buildResponse = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    expect(buildResponse.status).toBe(200);
    expect(buildResponse.body.buildId).toBeTruthy();

    // Check progress updates
    jest.advanceTimersByTime(2500);
    const midStatus = await request(app)
      .get('/api/bots/build/status')
      .set('Authorization', `Bearer ${authToken}`);
    expect(midStatus.body.progress).toBe(50);
    expect(midStatus.body.botsCompleted).toBe(2);

    // Complete build
    jest.advanceTimersByTime(2500);
    const finalStatus = await request(app)
      .get('/api/bots/build/status')
      .set('Authorization', `Bearer ${authToken}`);
    expect(finalStatus.body.progress).toBe(100);
    expect(finalStatus.body.botsCompleted).toBe(5);

    // Verify barracks updated
    const barracksResponse = await request(app)
      .get('/api/barracks')
      .set('Authorization', `Bearer ${authToken}`);
    expect(barracksResponse.body.bots.breacher).toBe(5);

    // Verify form reset
    const formResponse = await request(app)
      .get('/api/bots/build/form-state')
      .set('Authorization', `Bearer ${authToken}`);
    expect(formResponse.body).toEqual({
      selectedType: null,
      quantity: '',
      buildingProgress: null
    });
  });

  it('should persist build progress', async () => {
    const buildResponse = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    jest.advanceTimersByTime(2000);

    const statusResponse = await request(app)
      .get('/api/bots/build/status')
      .set('Authorization', `Bearer ${authToken}`);
    expect(statusResponse.body.buildId).toBe(buildResponse.body.buildId);
    expect(statusResponse.body.progress).toBe(40);
  });

  it('should prevent concurrent builds', async () => {
    await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 2
      });

    const secondBuildResponse = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'guardian',
        quantity: 3
      });

    expect(secondBuildResponse.status).toBe(400);
    expect(secondBuildResponse.body.error).toBe('Build already in progress');
  });

  it('should handle invalid requests', async () => {
    const invalidRequests = [
      {
        payload: { type: 'invalid_type', quantity: 5 },
        expectedError: 'Invalid bot type'
      },
      {
        payload: { type: 'breacher', quantity: 0 },
        expectedError: 'Quantity must be greater than 0'
      },
      {
        payload: { type: 'breacher', quantity: 1001 },
        expectedError: 'Maximum build quantity exceeded'
      }
    ];

    for (const { payload, expectedError } of invalidRequests) {
      const response = await request(app)
        .post('/api/bots/build/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(expectedError);
    }
  });

  describe('Time-based progress calculation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate progress based on elapsed time', async () => {
      const buildResponse = await request(app)
        .post('/api/bots/build/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'breacher',
          quantity: 5
        });

      // Advance time by 50% of build duration
      const buildDuration = 5 * 1000; // 5 bots * 1 second each
      jest.advanceTimersByTime(buildDuration / 2);

      const statusResponse = await request(app)
        .get('/api/bots/build/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.body.progress).toBeCloseTo(50, 1);
      expect(statusResponse.body.botsCompleted).toBe(2);
    });
  });

  it('should automatically add completed bots to barracks', async () => {
    // Start a build
    const buildResponse = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    // Fast forward time to completion
    jest.advanceTimersByTime(5000); // 5 bots * 1000ms build time each
    
    // Verify bots were automatically added to barracks
    const botsResponse = await request(app)
      .get('/api/bots')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(botsResponse.body.breacher).toBe(5);
    
    // Verify build was marked complete
    const statusResponse = await request(app)
      .get('/api/bots/build/status')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(statusResponse.body.activeBuilds).not.toContainEqual(
      expect.objectContaining({ buildId: buildResponse.body.buildId })
    );
  });

  it('should reset build form when build completes', async () => {
    const buildResponse = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    // Fast forward time to completion
    jest.advanceTimersByTime(5000);

    // Check form state
    const formResponse = await request(app)
      .get('/api/bots/build/form-state')
      .set('Authorization', `Bearer ${authToken}`);

    expect(formResponse.body).toEqual({
      selectedType: null,
      quantity: '',
      buildingProgress: null
    });
  });

  it('should persist build data through page navigation', async () => {
    // Start a build
    const buildResponse = await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    // Simulate navigation away and back
    const statusBeforeNav = await request(app)
      .get('/api/bots/build/status')
      .set('Authorization', `Bearer ${authToken}`);

    // Advance time during "navigation"
    jest.advanceTimersByTime(2000);

    const statusAfterNav = await request(app)
      .get('/api/bots/build/status')
      .set('Authorization', `Bearer ${authToken}`);

    expect(statusAfterNav.body.buildId).toBe(statusBeforeNav.body.buildId);
    expect(statusAfterNav.body.progress).toBeGreaterThan(statusBeforeNav.body.progress);
  });

  it('should correctly deduct balance for bot builds', async () => {
    // Get initial balance
    const initialBalanceResponse = await request(app)
      .get('/api/balance')
      .set('Authorization', `Bearer ${authToken}`);
    
    const initialBalance = initialBalanceResponse.body.total;
    const buildCost = 5; // 5 bots * 1 cost each

    // Start build
    await request(app)
      .post('/api/bots/build/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'breacher',
        quantity: 5
      });

    // Check updated balance
    const updatedBalanceResponse = await request(app)
      .get('/api/balance')
      .set('Authorization', `Bearer ${authToken}`);

    expect(updatedBalanceResponse.body.total).toBe(initialBalance - buildCost);
  });
}); 