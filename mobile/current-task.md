# Multi-Environment Deployment Setup

## Required Steps

### 1. MongoDB Atlas Setup
**Current State**: Using existing MongoDB cluster for staging (staging-api.risingpunk.com)
**Goal**: Create separate production database, keep dev/staging shared
**Environment Strategy**: Local/Dev + Staging share MongoDB, Production gets separate Atlas cluster
**Environment Variable Security Strategy**: Dev/Staging shared MONGODB_URI, Production gets unique MONGODB_URI

- [ ] Create new MongoDB Atlas cluster for production
- [ ] Keep existing MongoDB cluster for dev/staging (shared)
- [ ] Configure production database with proper security and access controls
- [ ] Update MONGODB_URI for production environment
- [ ] Ensure production has isolated data and credentials

### 2. AWS Elastic Beanstalk Environment Setup
**Current State**: rp-staging-api (Node.js 22) → staging-api.risingpunk.com, rp-env (Docker) → to be replaced
**Goal**: Duplicate rp-staging-api for staging, use original for production
**Environment Strategy**: Staging → api.risingpunk.dev, Production → api.risingpunk.com
**Current AWS EB Setup**: rp-env (Docker) → TO BE REPLACED, rp-staging-api (Node.js 22) → TO BE DUPLICATED for dev, then used for prod

- [ ] Duplicate rp-staging-api environment for api.risingpunk.dev (staging)
- [ ] Keep original rp-staging-api environment for api.risingpunk.com (production)
- [ ] Delete legacy rp-env (Docker) after verifying backups
- [ ] Configure staging environment with .env.staging variables
- [ ] Configure production environment with .env.production variables

### 3. Environment Configuration Files
**Current State**: Using dotenv-flow with NODE_ENV, mobile uses __DEV__ toggle
**Goal**: Create environment-specific configs with proper security separation
**Environment Strategy**: Local/Dev (localhost:5001), Staging (api.risingpunk.dev:8080), Production (api.risingpunk.com:8080)
**Environment Variables (from AWS EB rp-staging-api)**: CLIENT_URL, CORS_ORIGINS, EMAIL_PASSWORD, EMAIL_USER, ENCRYPTION_KEY, GOOGLE_CLIENT_ID, JWT_SECRET, MONGODB_URI, NODE_ENV
**Environment Variable Security Strategy**: Dev/Staging shared MONGODB_URI/GOOGLE_CLIENT_ID, Production regenerates JWT_SECRET/ENCRYPTION_KEY/EMAIL_PASSWORD/MONGODB_URI, Environment-specific CLIENT_URL/CORS_ORIGINS/NODE_ENV
**Environment Variable Strategy**: Local/Dev (.env.development), Staging (.env.staging), Production (.env.production)

- [ ] Create .env.development (PORT=5001, shared MONGODB_URI, dev credentials)
- [ ] Create .env.staging (PORT=8080, shared MONGODB_URI, staging credentials)
- [ ] Create .env.production (PORT=8080, production MONGODB_URI, production credentials)
- [ ] Update server env.ts to handle port 8080 for staging/prod
- [ ] Update mobile config.ts for environment-specific URLs
- [ ] Implement environment variable switching logic (NODE_ENV-based)
- [ ] Generate unique credentials for production (JWT_SECRET, ENCRYPTION_KEY, EMAIL_PASSWORD)
- [ ] Commit templates with placeholder values, keep real secrets in AWS EB config

### 4. Server Package Scripts
**Current State**: Has start:staging and start:prod scripts
**Goal**: Add proper dev script and update for new environment strategy
**Environment Strategy**: Dev (localhost:5001), Staging (api.risingpunk.dev:8080), Production (api.risingpunk.com:8080)
**GitHub Branch Strategy**: dev branch (local only), staging branch (deploys to staging), prod branch (deploys to production)
**Environment Variable Strategy**: Local/Dev (.env.development), Staging (.env.staging), Production (.env.production)
**Environment Variable Switching Logic**: Server uses dotenv-flow with NODE_ENV to load appropriate .env file

- [ ] Update server/package.json scripts for dev/staging/prod environments
- [ ] Add start:dev (NODE_ENV=development) for local development
- [ ] Add start:staging (NODE_ENV=staging) for staging environment
- [ ] Keep start:prod for production (NODE_ENV=production)
- [ ] Update documentation and CI workflows to reference new script names

### 5. Mobile Configuration Updates
**Current State**: Uses __DEV__ toggle for localhost vs staging-api.risingpunk.com
**Goal**: Use process.env.API_ENV for proper environment detection
**Environment Strategy**: Dev (localhost:5001), Staging (api.risingpunk.dev), Production (api.risingpunk.com)
**GitHub Branch Strategy**: dev branch (local builds), staging branch (TestFlight builds), prod branch (App Store builds)
**Environment Variable Strategy**: Local/Dev (.env.development), Staging (.env.staging), Production (.env.production)
**Environment Variable Switching Logic**: Mobile uses process.env.API_ENV (injected via react-native-config) for environment detection
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8080)

- [ ] Replace __DEV__ toggle in mobile/src/config.ts with process.env.API_ENV
- [ ] Install and configure react-native-config for build-time environment injection
- [ ] Map API_ENV: dev → localhost:5001, staging → api.risingpunk.dev, prod → api.risingpunk.com
- [ ] Update mobile config.ts with API_ENV mapping for all endpoints
- [ ] Use subdomains instead of ports for better security and modern practices

### 6. iOS App Transport Security
**Current State**: Need to configure ATS for new domains (api.risingpunk.dev, api.risingpunk.com)
**Goal**: Ensure HTTPS works properly for both staging and production domains
**Environment Strategy**: Staging (api.risingpunk.dev), Production (api.risingpunk.com)
**GitHub Branch Strategy**: staging branch (TestFlight testing), prod branch (App Store submission)
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8080)

- [ ] Update mobile/ios/mobile/Info.plist for NSAppTransportSecurity
- [ ] Use proper SSL certificates instead of NSExceptionDomains (modern approach)
- [ ] Test on actual device to confirm HTTPS requests succeed without ATS warnings
- [ ] Build and test on device/emulator against both domains before App Store submission
- [ ] Ensure all API endpoints use HTTPS with valid certificates

### 7. GitHub Actions Workflows
**Current State**: Has deploy-staging.yml for main branch → staging-api.risingpunk.com
**Goal**: Create separate workflows for staging and prod branches with new domains
**Environment Strategy**: Staging branch → api.risingpunk.dev, Prod branch → api.risingpunk.com
**GitHub Branch Strategy**: dev (no deployment), staging → api.risingpunk.dev, prod → api.risingpunk.com, main (no deployment)
**Modern DevOps Promotion Strategy**: Local/Dev → Staging (PR to staging), Staging → Production (PR to prod), no direct promotion
**Branch Status**: ✅ dev/prod/staging branches already created, need to disable main branch triggers

- [ ] Create deploy-staging.yml (trigger on staging branch → api.risingpunk.dev)
- [ ] Create deploy-production.yml (trigger on prod branch → api.risingpunk.com)
- [ ] Remove main branch from existing workflow triggers
- [ ] Disable dev branch deployment (local development only)
- [ ] Update workflows to use correct EB environment secrets
- [ ] Ensure workflows are compatible with new GitHub cache service (migrated April 2025)
- [ ] Verify deployment permissions include `deployments: write` permission
- [ ] Update any fine-grained PATs for deployment capabilities
- [ ] Use macOS 15 runners if iOS builds are needed (migration completed Sep 1, 2025)

### 8. AWS Elastic Beanstalk Environment Management
**Current State**: rp-staging-api (Node.js 22) → staging-api.risingpunk.com, rp-env (Docker) → to be replaced
**Goal**: Duplicate rp-staging-api for staging, use original for production
**Environment Strategy**: Staging → api.risingpunk.dev, Production → api.risingpunk.com
**GitHub Branch Strategy**: staging branch deploys to staging EB, prod branch deploys to production EB
**Modern DevOps Promotion Strategy**: Each environment isolated and tested independently, no direct promotion
**Branch Status**: ✅ dev/prod/staging branches ready for EB environment mapping
**Current AWS EB Setup**: rp-env (Docker) → TO BE REPLACED, rp-staging-api (Node.js 22) → TO BE DUPLICATED for dev, then used for prod
**Environment Variables (from AWS EB rp-staging-api)**: CLIENT_URL, CORS_ORIGINS, EMAIL_PASSWORD, EMAIL_USER, ENCRYPTION_KEY, GOOGLE_CLIENT_ID, JWT_SECRET, MONGODB_URI, NODE_ENV
**Environment Variable Security Strategy**: Dev/Staging shared MONGODB_URI/GOOGLE_CLIENT_ID, Production regenerates JWT_SECRET/ENCRYPTION_KEY/EMAIL_PASSWORD/MONGODB_URI, Environment-specific CLIENT_URL/CORS_ORIGINS/NODE_ENV
**Environment Variable Switching Logic**: AWS EB sets environment variables directly in EB configuration, Production gets new JWT_SECRET/ENCRYPTION_KEY

- [ ] Clone rp-staging-api to risingpunk-staging environment for api.risingpunk.dev
- [ ] Keep original rp-staging-api environment for api.risingpunk.com (production)
- [ ] Delete legacy rp-env (Docker) after verifying backups
- [ ] Configure staging environment variables in EB
- [ ] Configure production environment variables in EB
- [ ] Use latest Amazon Linux 2023 platform (updated Aug 20, 2025)
- [ ] Integrate with AWS Secrets Manager and Parameter Store for secure secrets
- [ ] Ensure environments use latest Node.js platform version with security updates

### 9. DNS and SSL Configuration
**Current State**: Cloudflare configured for both domains, only .com properly set up
**Goal**: Point domains to correct EB environments with proper SSL
**Environment Strategy**: Staging → api.risingpunk.dev, Production → api.risingpunk.com
**GitHub Branch Strategy**: staging branch deploys to .dev domain, prod branch deploys to .com domain
**Modern DevOps Promotion Strategy**: Staging for TestFlight testing, Production for App Store release
**Branch Status**: ✅ dev/prod/staging branches ready for domain configuration
**Current AWS EB Setup**: rp-env (Docker) → TO BE REPLACED, rp-staging-api (Node.js 22) → TO BE DUPLICATED for dev, then used for prod
**Environment Variables (from AWS EB rp-staging-api)**: CLIENT_URL, CORS_ORIGINS, EMAIL_PASSWORD, EMAIL_USER, ENCRYPTION_KEY, GOOGLE_CLIENT_ID, JWT_SECRET, MONGODB_URI, NODE_ENV
**Environment Variable Security Strategy**: Environment-specific CLIENT_URL/CORS_ORIGINS/NODE_ENV for each domain
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8080)

- [ ] Set api.risingpunk.dev DNS records to staging environment's load balancer
- [ ] Point api.risingpunk.com to production environment's load balancer
- [ ] Ensure SSL certificates are valid for both subdomains (port 8080 accessible)
- [ ] Update CORS_ORIGINS and CLIENT_URL env vars in each EB environment
- [ ] Verify HTTPS and CORS responses from both endpoints
- [ ] Handle existing .dev domain configuration (replace current AWS app)
- [ ] Configure Cloudflare for both domains (currently only .com is properly set up)
- [ ] Ensure both staging and production ports are publicly accessible for TestFlight/App Store

### 10. Monitoring and Alerting Setup
**Current State**: No monitoring setup for EB environments
**Goal**: Implement comprehensive monitoring and alerting for all environments
**Environment Strategy**: Monitor both staging (api.risingpunk.dev) and production (api.risingpunk.com)
**GitHub Branch Strategy**: Monitor deployments from staging and prod branches
**Modern DevOps Promotion Strategy**: Monitor each environment independently, alert on promotion failures
**Branch Status**: ✅ dev/prod/staging branches ready for monitoring setup
**Current AWS EB Setup**: rp-env (Docker) → TO BE REPLACED, rp-staging-api (Node.js 22) → TO BE DUPLICATED for dev, then used for prod

- [ ] Configure CloudWatch for log aggregation on all EB environments
- [ ] Set up CloudWatch metrics for response times, error rates, and throughput
- [ ] Configure alarms for key indicators:
  - [ ] Response errors (4xx/5xx status codes)
  - [ ] CPU utilization thresholds (80%+)
  - [ ] Memory utilization thresholds (85%+)
  - [ ] Database connection failures
  - [ ] High response latency (>2 seconds)
  - [ ] Environment health status changes
- [ ] Set up SNS topics for alert notifications
- [ ] Configure email/SMS notifications for critical alerts
- [ ] Document escalation procedures for triggered alerts
- [ ] Create runbooks for common alert scenarios
- [ ] Test alerting system with staging environment

### 11. iOS App Store Preparation
**Current State**: iOS app needs configuration for new environments
**Goal**: Prepare iOS app for App Store submission with proper environment handling
**Environment Strategy**: Support staging (api.risingpunk.dev) and production (api.risingpunk.com)
**GitHub Branch Strategy**: staging branch (TestFlight), prod branch (App Store)
**Modern DevOps Promotion Strategy**: Staging for TestFlight testing, Production for App Store release
**Branch Status**: ✅ dev/prod/staging branches ready for iOS configuration
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8080)

- [ ] Update iOS configuration for production environment
- [ ] Ensure proper environment handling in mobile app
- [ ] Configure for App Store submission via Apple App Connect
- [ ] Test ATS configuration on device/emulator for both domains
- [ ] Ensure App Store compliance requirements are met
- [ ] Test all environments before App Store submission

### 12. iOS Deployment Automation
**Current State**: No automated iOS deployment
**Goal**: Automate iOS builds and uploads for TestFlight and App Store
**Environment Strategy**: Staging builds (TestFlight), Production builds (App Store)
**GitHub Branch Strategy**: staging branch → TestFlight, prod branch → App Store
**Modern DevOps Promotion Strategy**: Automated promotion from staging to production via branch PRs
**Branch Status**: ✅ dev/prod/staging branches ready for automated iOS deployment
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8080)

- [ ] Create deploy-ios.yml GitHub Actions workflow for automated iOS builds
- [ ] Configure workflow to build with API_ENV=staging for TestFlight releases
- [ ] Configure workflow to build with API_ENV=prod for App Store releases
- [ ] Integrate Fastlane or Xcode command-line tools for build upload
- [ ] Set up GitHub secrets for Apple credentials:
  - [ ] APPLE_ID (Apple Developer account email)
  - [ ] APPLE_PASSWORD (App-specific password)
  - [ ] APPLE_TEAM_ID (Developer team ID)
  - [ ] IOS_DISTRIBUTION_CERTIFICATE (Base64 encoded .p12 file)
  - [ ] IOS_DISTRIBUTION_PROVISIONING_PROFILE (Base64 encoded .mobileprovision file)
- [ ] Configure automatic TestFlight upload on staging branch merges
- [ ] Configure automatic App Store upload on prod branch merges
- [ ] Test automated iOS deployment pipeline

### 13. Testing and Validation
**Current State**: Need to test all environments and deployment pipelines
**Goal**: Validate complete multi-environment setup works correctly
**Environment Strategy**: Test all three environments (dev, staging, production)
**GitHub Branch Strategy**: Test deployments from staging and prod branches
**Modern DevOps Promotion Strategy**: Validate promotion flow from dev → staging → production
**Branch Status**: ✅ dev/prod/staging branches ready for testing and validation
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8080)

- [ ] Test local environment (localhost:5001)
- [ ] Test staging environment (api.risingpunk.dev:8080) - TestFlight testing
- [ ] Test production environment (api.risingpunk.com:8080) - App Store testing
- [ ] Validate all API endpoints work correctly in each environment
- [ ] Test mobile app connectivity to all environments
- [ ] Verify database connections and data integrity
- [ ] Test deployment pipelines for staging and prod branches
- [ ] Validate SSL certificates and HTTPS functionality
- [ ] Test CORS configuration for all domains
- [ ] Verify TestFlight builds work with staging environment


