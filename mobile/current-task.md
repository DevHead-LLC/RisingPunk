# Multi-Environment Deployment Setup

## Current State Analysis
- **Local**: localhost:5001 (working)
- **Staging**: staging-api.risingpunk.com (working via main branch → rp-staging-api EB environment)
- **Target Dev**: risingpunk.dev (needs setup - will duplicate rp-staging-api)
- **Target Prod**: risingpunk.com (needs setup - will use existing rp-staging-api)

## Environment Strategy
- **Local/Dev**: localhost:5001 + shared MongoDB (development data)
- **Staging**: api.risingpunk.dev + shared MongoDB (testing data)
- **Production**: api.risingpunk.com + separate MongoDB Atlas cluster (production data)

## GitHub Branch Strategy
- **dev branch** → NO DEPLOYMENT (local development only)
- **staging branch** → api.risingpunk.dev (testing environment)
- **prod branch** → api.risingpunk.com (production environment)
- **main branch** → NO DEPLOYMENT (completely disabled)

## Modern DevOps Promotion Strategy
- **Local/Dev** → **Staging**: PR to staging branch triggers deployment to api.risingpunk.dev
- **Staging** → **Production**: PR to prod branch triggers deployment to api.risingpunk.com
- **No direct promotion**: Each environment is isolated and tested independently
- **TestFlight Testing**: Staging environment used for Apple TestFlight testing
- **Production Release**: Prod environment used for live App Store release

## Branch Status
- ✅ **dev branch**: Already created in GitHub (no deployment)
- [ ] **staging branch**: Needs to be created (deploy to api.risingpunk.dev)
- [ ] **prod branch**: Needs to be created (deploy to api.risingpunk.com)
- [ ] **main branch**: Disable all deployment triggers

## Current AWS Elastic Beanstalk Setup
- **rp-env** (Docker) → TO BE REPLACED with duplicated rp-staging-api
- **rp-staging-api** (Node.js 22) → TO BE DUPLICATED for dev, then used for prod

## Environment Variables (from AWS EB rp-staging-api)
- CLIENT_URL: https://rising...
- CORS_ORIGINS: https://stagi...
- EMAIL_PASSWORD: xiukxevvbibru
- EMAIL_USER: robert@devh...
- ENCRYPTION_KEY: ac44553bb11...
- GOOGLE_CLIENT_ID: 2139145998...
- JWT_SECRET: stg_7c8d1b2...
- MONGODB_URI: mongodb+sr...
- NODE_ENV: staging

## Environment Variable Security Strategy
- **Dev/Staging Shared**: MONGODB_URI, GOOGLE_CLIENT_ID (same database)
- **Must Regenerate for Production**: JWT_SECRET, ENCRYPTION_KEY, EMAIL_PASSWORD, MONGODB_URI
- **Environment-Specific**: CLIENT_URL, CORS_ORIGINS, NODE_ENV
- **Production Isolation**: All credentials unique for production security

## Required Steps

### 1. MongoDB Atlas Setup
- [ ] Create new MongoDB Atlas cluster for production
- [ ] Keep existing MongoDB cluster for dev/staging (shared)
- [ ] Configure production database with proper security and access controls
- [ ] Update MONGODB_URI for production environment
- [ ] Ensure production has isolated data and credentials

### 2. AWS Elastic Beanstalk Environment Setup
- [ ] Duplicate rp-staging-api environment for api.risingpunk.dev (staging)
- [ ] Keep original rp-staging-api environment for api.risingpunk.com (production)
- [ ] Delete legacy rp-env (Docker) after verifying backups
- [ ] Configure staging environment with .env.staging variables
- [ ] Configure production environment with .env.production variables

### 3. Environment Configuration Files
- [ ] Create .env.development (PORT=5001, shared MONGODB_URI, dev credentials)
- [ ] Create .env.staging (PORT=8080, shared MONGODB_URI, staging credentials)
- [ ] Create .env.production (PORT=8080, production MONGODB_URI, production credentials)
- [ ] Update server env.ts to handle port 8080 for staging/prod
- [ ] Update mobile config.ts for environment-specific URLs
- [ ] Implement environment variable switching logic (NODE_ENV-based)
- [ ] Generate unique credentials for production (JWT_SECRET, ENCRYPTION_KEY, EMAIL_PASSWORD)
- [ ] Commit templates with placeholder values, keep real secrets in AWS EB config

### 4. Server Package Scripts
- [ ] Update server/package.json scripts for dev/staging/prod environments
- [ ] Add start:dev (NODE_ENV=development) for local development
- [ ] Add start:staging (NODE_ENV=staging) for staging environment
- [ ] Keep start:prod for production (NODE_ENV=production)
- [ ] Update documentation and CI workflows to reference new script names

### 5. Mobile Configuration Updates
- [ ] Replace __DEV__ toggle in mobile/src/config.ts with process.env.API_ENV
- [ ] Install and configure react-native-config for build-time environment injection
- [ ] Map API_ENV: dev → localhost:5001, staging → api.risingpunk.dev, prod → api.risingpunk.com
- [ ] Update mobile config.ts with API_ENV mapping for all endpoints
- [ ] Use subdomains instead of ports for better security and modern practices

### 6. iOS App Transport Security
- [ ] Update mobile/ios/mobile/Info.plist for NSAppTransportSecurity
- [ ] Use proper SSL certificates instead of NSExceptionDomains (modern approach)
- [ ] Test on actual device to confirm HTTPS requests succeed without ATS warnings
- [ ] Build and test on device/emulator against both domains before App Store submission
- [ ] Ensure all API endpoints use HTTPS with valid certificates

### 7. GitHub Actions Workflows
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
- [ ] Clone rp-staging-api to risingpunk-staging environment for api.risingpunk.dev
- [ ] Keep original rp-staging-api environment for api.risingpunk.com (production)
- [ ] Delete legacy rp-env (Docker) after verifying backups
- [ ] Configure staging environment variables in EB
- [ ] Configure production environment variables in EB
- [ ] Use latest Amazon Linux 2023 platform (updated Aug 20, 2025)
- [ ] Integrate with AWS Secrets Manager and Parameter Store for secure secrets
- [ ] Ensure environments use latest Node.js platform version with security updates

### 9. DNS and SSL Configuration
- [ ] Set api.risingpunk.dev DNS records to staging environment's load balancer
- [ ] Point api.risingpunk.com to production environment's load balancer
- [ ] Ensure SSL certificates are valid for both subdomains (port 8080 accessible)
- [ ] Update CORS_ORIGINS and CLIENT_URL env vars in each EB environment
- [ ] Verify HTTPS and CORS responses from both endpoints
- [ ] Handle existing .dev domain configuration (replace current AWS app)
- [ ] Configure Cloudflare for both domains (currently only .com is properly set up)
- [ ] Ensure both staging and production ports are publicly accessible for TestFlight/App Store

### 10. Monitoring and Alerting Setup
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
- [ ] Update iOS configuration for production environment
- [ ] Ensure proper environment handling in mobile app
- [ ] Configure for App Store submission via Apple App Connect
- [ ] Test ATS configuration on device/emulator for both domains
- [ ] Ensure App Store compliance requirements are met
- [ ] Test all environments before App Store submission

### 12. iOS Deployment Automation
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

## Environment Variable Strategy
- **Local/Dev**: Use .env.development (localhost:5001)
- **Staging**: Use .env.staging (api.risingpunk.dev:8080) 
- **Production**: Use .env.production (api.risingpunk.com:8080)

## Environment Variable Switching Logic
- **Server**: Uses dotenv-flow with NODE_ENV to load appropriate .env file
- **Mobile**: Uses process.env.API_ENV (injected via react-native-config) for environment detection
- **AWS EB**: Environment variables set directly in EB configuration
- **Security**: Production gets new JWT_SECRET, ENCRYPTION_KEY, and other sensitive variables

## API Environment Mapping
- **dev**: http://localhost:5001 (or emulator IP)
- **staging**: https://api.risingpunk.dev:8080 (TestFlight testing)
- **prod**: https://api.risingpunk.com:8080 (App Store production)

## Implementation Priority Order
1. **Environment Configuration Files** (foundation)
2. **MongoDB Atlas Production Setup** (database separation)
3. **Server Package Scripts** (environment handling)
4. **Mobile Configuration Updates** (react-native-config)
5. **AWS EB Environment Setup** (infrastructure)
6. **GitHub Actions Workflows** (CI/CD)
7. **DNS and SSL Configuration** (domain setup)
8. **Monitoring and Alerting Setup** (operational visibility)
9. **iOS App Transport Security** (mobile security)
10. **iOS App Store Preparation** (manual setup)
11. **iOS Deployment Automation** (automated CI/CD)
12. **Testing and Validation** (quality assurance)

## Modern DevOps Promotion Strategy Details
- **Local Development**: Work on dev branch, test locally
- **Staging Promotion**: PR to staging branch → auto-deploy to api.risingpunk.dev + TestFlight build
- **Production Promotion**: PR to prod branch → auto-deploy to api.risingpunk.com + App Store build
- **TestFlight Testing**: Automated upload to TestFlight with staging environment
- **App Store Release**: Automated upload to App Store with production environment

## Critical Success Factors
- All environments must be tested before App Store submission
- Production environment must have separate, secure credentials
- Both domains must have proper SSL and CORS configuration
- Mobile app must work seamlessly across all environments
- Deployment pipelines must be reliable and automated
- iOS builds must be automated for both TestFlight and App Store
- Apple credentials must be securely stored in GitHub secrets
- Monitoring and alerting must be configured for operational visibility
- Escalation procedures must be documented and tested

## Recent Platform Updates (August 2025)
- **AWS Elastic Beanstalk**: Use latest Amazon Linux 2023 platform (updated Aug 20, 2025)
- **AWS Elastic Beanstalk**: Use latest Amazon Linux 2 platform (updated Aug 22, 2025)
- **AWS Elastic Beanstalk**: Integrate with AWS Secrets Manager and Parameter Store (March 2025)
- **GitHub Actions**: Ensure compatibility with new cache service (migrated April 2025)
- **GitHub Actions**: Verify `deployments: write` permission for deployment operations
- **GitHub Actions**: macOS runners migrated to macOS 15 (completed Sep 1, 2025)
- **Node.js**: Use latest supported platform version for optimal performance and security
