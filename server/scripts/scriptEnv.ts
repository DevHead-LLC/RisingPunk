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
 * Mongo client options for seed scripts (NPCs, etc.) to reduce ECONNREFUSED / getMore
 * errors when talking to Atlas replica sets. Use with mongoose.connect(uri, { ...getSeedScriptMongoOptions('my-script'), dbName: getDatabaseName() }).
 * - readPreference: 'primary' avoids secondaries that may be unreachable from your network.
 * - family: 4 forces IPv4 (Node 17+ can prefer IPv6 and cause connection issues).
 * - Timeouts are generous for long-running seed runs.
 * Bugbot: This function is used by server/scripts/NPCs/seedNPCsLevel2.ts; not dead code.
 */
export function getSeedScriptMongoOptions(appName: string): Record<string, unknown> {
  return {
    appName,
    readPreference: 'primary',
    family: 4,
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 120000,
  };
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
