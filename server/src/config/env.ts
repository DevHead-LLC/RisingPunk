import dotenvFlow from 'dotenv-flow';

// Get NODE_ENV before loading env files
const nodeEnv = process.env.NODE_ENV || 'development';

// Load environment variables from .env.* files based on NODE_ENV
// silent: true suppresses warnings when .env files don't exist (expected for AWS deployments)
// Map "development" to "dev" and "production" to "prod" to match our file naming convention
const envFileMap: Record<string, string> = {
  'development': 'dev',
  'production': 'prod'
};

const mappedNodeEnv = envFileMap[nodeEnv] || nodeEnv;

// Load environment files: .env, .env.local, .env.<mappedNodeEnv>, .env.<mappedNodeEnv>.local
// This will load .env.dev when NODE_ENV=development, .env.prod when NODE_ENV=production, etc.
dotenvFlow.config({ 
  node_env: mappedNodeEnv,
  silent: true 
});

export const NODE_ENV: string = nodeEnv;
export const PORT: number = Number(process.env.PORT || 5001);
export const MONGODB_URI: string = process.env.MONGODB_URI || '';
export const JWT_SECRET: string = process.env.JWT_SECRET || 'defaultsecret';
export const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY || '';
export const CORS_ORIGINS: string[] = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Google Sign In Configuration
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';

// Apple Sign In Configuration
export const APPLE_CLIENT_ID: string = process.env.APPLE_CLIENT_ID || 'com.devheadllc.risingpunk';
export const APPLE_TEAM_ID: string = process.env.APPLE_TEAM_ID || '';
export const APPLE_KEY_ID: string = process.env.APPLE_KEY_ID || '';
export const APPLE_PRIVATE_KEY: string = process.env.APPLE_PRIVATE_KEY || '';