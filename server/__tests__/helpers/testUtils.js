const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Bot = require('../../models/Bot');

let mongoServer;

const setupTestDB = () => {
  beforeAll(async () => {
    await mongoose.disconnect();
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  });
};

const createTestUser = async () => {
  const user = await User.create({
    username: 'testuser',
    password: 'password123'
  });
  return user;
};

const getAuthToken = async (app, user = null) => {
  if (!user) {
    user = await createTestUser();
  }
  
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      username: user.username,
      password: 'password123'
    });

  return response.body.token;
};

module.exports = {
  setupTestDB,
  createTestUser,
  getAuthToken
}; 