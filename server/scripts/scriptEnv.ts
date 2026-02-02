/**
 * Shared env and database config for server/scripts run with ts-node.
 * Import this first so dotenv-flow runs before other imports that read process.env.
 */
import dotenvFlow from 'dotenv-flow';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFileMap: Record<string, string> = {
  development: 'dev',
  production: 'prod',
  staging: 'staging',
};
const mappedNodeEnv = envFileMap[nodeEnv] || nodeEnv;

dotenvFlow.config({
  node_env: mappedNodeEnv,
  silent: true,
});

if (process.env.NODE_ENV !== nodeEnv) {
  process.env.NODE_ENV = nodeEnv;
}

/**
 * Database name for mongoose connect({ dbName }) by NODE_ENV.
 * Single source of truth for all scripts.
 * Staging and development share the same DB (RisingPunk); production uses RisingPunkProd.
 */
export function getDatabaseName(): string {
  const env = process.env.NODE_ENV || 'development';
  switch (env) {
    case 'production':
      return 'RisingPunkProd';
    case 'staging':
    case 'development':
    default:
      return 'RisingPunk';
  }
}
