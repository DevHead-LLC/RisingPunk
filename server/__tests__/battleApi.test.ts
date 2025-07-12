import request from 'supertest';
import express from 'express';
import battleRoutes from '../src/routes/battle';
import { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// Mock auth middleware to simulate authenticated/unauthenticated users
const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers['authorization'] === 'Bearer validtoken') {
    req.user = { _id: 'user1' };
    next();
  } else {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Patch the battle router to use mockAuth instead of real auth
app.use('/api/battle', mockAuth, battleRoutes);

describe('Battle API', () => {
  it('should reject unauthenticated requests to start a battle', async () => {
    const res = await request(app)
      .post('/api/battle/start')
      .send({ defenderId: 'user2' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Please authenticate');
  });

  // TODO: Add authenticated battle start test when we implement proper mocking
  // This test requires refactoring the router/controller for dependency injection
  // or setting up a test database with proper mocks
}); 