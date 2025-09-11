# Multi-Environment Deployment Setup

## Quick Reference
- **Completed Tasks**: See [`completed-tasks.md`](./completed-tasks.md) for all completed work
- **Current Focus**: Remaining seeding implementations and production setup

## Required Steps

### 0. Pre-Migration Validation (COMPLETED)
**Status**: ✅ Current production setup is working correctly
**Validation Results**: 
- ✅ Procfile (`web: node dist/server/server.js`) works correctly in production and TestFlight
- ✅ Current GitHub Actions deployment pipeline is functional
- ✅ Current AWS EB environment (rp-staging-api) is stable
- ✅ TestFlight builds are working with current configuration

**Action**: Proceed with environment separation while preserving working components

### 1. MongoDB Atlas Setup
- [x] **MongoDB Atlas Setup** - **COMPLETED**: [Production database setup found in `completed-tasks.md`](#completed-tasks)

### 1.1. Database Migration and Seeding Strategy
**Status**: ✅ **COMPLETED** - Production database seeded with all essential operational data

**Summary**: Successfully implemented comprehensive database migration and seeding strategy with 4-category collection framework. Production cluster (RisingPunkProd M10) seeded with 19 core config docs, 25 NPCs, 2500 map cells, and 1 research feature. Environment variables configured for dev/staging/prod with react-native-config integration.

**Key Achievements**:
- ✅ **Collection Categorization**: All 15 collections analyzed and categorized (5 Category 1, 1 Category 2, 1 Category 3, 8 Category 4)
- ✅ **Production Seeding**: Complete seeding scripts executed on RisingPunkProd cluster
- ✅ **Environment Setup**: Multi-environment configuration with .env.dev/.env.staging/.env.prod
- ✅ **Documentation**: All Category 4 collections documented in db-backup-md-files/

**Detailed Implementation**: [See complete details in `completed-tasks.md` - Database Migration and Seeding Strategy - Step 1.1](#completed-tasks)


### 1.2. Seeding Scripts Update for Production Reset
**Status**: ✅ **COMPLETED** - All seeding scripts updated and verified for production reset

**Summary**: Successfully updated and verified all seeding scripts to work independently for fresh production database. Created modular seeding system with seedDatabaseComplete.js orchestrator, comprehensive logging, and idempotent operations. All essential collections (maps, research features, bot configurations, game settings) properly seeded and tested on production database.

**Key Achievements**:
- ✅ **Modular Seeding System**: Created seedCoreConfig, seedNPCs, seedMap, seedResearchFeatures scripts
- ✅ **Production Testing**: Successfully tested on completely empty RisingPunkProd database
- ✅ **Documentation**: All 15 collection schemas documented in db-backup-md-files/
- ✅ **Idempotent Operations**: Scripts handle duplicate data gracefully and can run multiple times

**Detailed Implementation**: [See complete details in `completed-tasks.md` - Seeding Scripts Update for Production Reset - Step 1.2](#completed-tasks)

### 2. AWS Elastic Beanstalk Environment Setup
**Current State**: rp-staging-api (Node.js 22) → staging-api.risingpunk.com, rp-env (Docker) → to be replaced
**Goal**: Create green environment for staging, promote current staging to production
**Environment Strategy**: Staging → api.risingpunk.dev, Production → api.risingpunk.com
**Port Strategy**: Staging (8080), Production (8081) for security isolation
**SSL Strategy**: Standard domain certificates with Cloudflare, port-specific ATS configuration

#### 2.1. Pre-Migration Inventory
**Status**: ✅ **COMPLETED** - Current configuration documented and ready for migration
**Goal**: Document current configuration and dependencies before migration

**Summary**: Complete inventory of rp-staging-api environment including Beanstalk configuration, environment variables, load balancer settings, security groups, and external dependencies. Health check verified working, no RDS managed by EB, Cloudflare domains active.

**Key Findings**:
- ✅ **Environment Variables**: All 9 variables documented (CLIENT_URL, CORS_ORIGINS, etc.)
- ✅ **Instance Configuration**: t3.micro/small, 1 min/max instances, NetworkOut scaling
- ✅ **Load Balancer**: Application Load Balancer (public, IPv4) with nginx proxy
- ✅ **Health Check**: `/health` endpoint confirmed working (`{"status":"ok","uptime":19025}`)
- ✅ **RDS Check**: No RDS managed by EB (safe to proceed with migration)
- ✅ **Cloudflare**: Both domains active with security insights enabled

**Detailed Documentation**: [See complete inventory in `completed-tasks.md` - Pre-Migration Inventory - Step 2.1](#completed-tasks)

#### 2.2. Create Green Staging Environment
**Status**: ✅ **COMPLETED** - Green staging environment created and verified
**Goal**: Create isolated staging environment for api.risingpunk.dev

**Environment Cloning Process**:
- [x] **Clone rp-staging-api**: Actions → Clone environment in EB console
- [x] **Name**: `rp-api-staging` (green environment)
- [x] **Platform**: Node.js 22 running on 64bit Amazon Linux 2023/6.6.4
- [x] **VPC/Subnets**: Same VPC/subnets as current staging
- [x] **Environment Variables**: All variables imported from rp-staging-api
- [x] **Health Check**: Green = Healthy status confirmed
- [x] **Test**: ✅ **VERIFIED** - `https://rp-api-staging.eba-zmq38tta.us-west-2.elasticbeanstalk.com/health` returns `{"status":"ok","uptime":8058}`

**Environment Details**:
- **Environment ID**: `e-zxgvmm2z4i`
- **Domain**: `rp-api-staging.eba-zmq38tta.us-west-2.elasticbeanstalk.com`
- **Platform State**: Supported
- **Health Status**: Ok
- **Environment Variables**: Identical to source environment

#### 2.3. Rename and Configure Staging Environment
**Status**: ⏳ **IN PROGRESS** - Configuring green environment as staging
**Goal**: Configure staging environment for api.risingpunk.dev with proper settings

**Staging Environment Configuration**:
- [x] **Environment Name**: Keep as `rp-api-staging` ✅
- [x] **Description**: "staging environment for the RisingPunk application" ✅
- [x] **Load Balancer**: Ports 80 and 443 confirmed ✅
- [x] **Health Check**: Working correctly ✅
- [x] **Environment Variables**: Update in AWS EB console:
  - [x] PORT=8080
  - [x] NODE_ENV=staging
  - [x] CLIENT_URL=https://api.risingpunk.dev
  - [x] CORS_ORIGINS=https://api.risingpunk.dev,http://localhost:5001
- [ ] **GitHub Actions Secrets**: Update repository secrets for new environment

**GitHub Actions Configuration Update**:
**Status**: ⚠️ **REQUIRED** - Current secrets point to old environment names
**Current Secrets**: AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, EB_APP_NAME, EB_ENV_NAME, EB_S3_BUCKET
**Required Updates**:
- [ ] **EB_ENV_NAME**: Update from `rp-staging-api` to `rp-api-staging`
- [ ] **EB_APP_NAME**: Verify it's still `risingpunk-api` (should be correct)
- [ ] **Other Secrets**: AWS credentials and S3 bucket should remain the same
- [ ] **Test Deployment**: Verify GitHub Actions can deploy to new environment

#### 2.4. SSL and DNS Configuration for Staging
**Status**: ⏳ **PENDING** - Configure SSL and DNS for api.risingpunk.dev
**Goal**: Set up SSL certificates and DNS routing for staging environment

**SSL Certificate Setup**:
- [ ] **ACM Certificate**: Request certificate for `api.risingpunk.dev` in us-west-2
- [ ] **Validation**: Add ACM CNAME validation records in Cloudflare (DNS-only/gray cloud)
- [ ] **Attach Certificate**: Attach to staging environment's load balancer :443 listener
- [ ] **Cloudflare DNS**: Create CNAME `api.risingpunk.dev` → staging EB CNAME
- [ ] **SSL Mode**: Set Cloudflare SSL mode to Full (strict)
- [ ] **HTTPS Redirect**: Configure HTTP → HTTPS redirect
- [ ] **CORS/Host Header**: Add `api.risingpunk.dev` to allowed hosts

**Health Gate**: Visit `https://api.risingpunk.dev:8080/healthz` - verify TLS, CORS, secure cookies

#### 2.5. Promote Current Staging to Production
**Status**: ⏳ **PENDING** - Configure current staging as production
**Goal**: Use current rp-staging-api as production environment for api.risingpunk.com

**Production Environment Configuration**:
- [ ] **Rename Environment**: Change rp-staging-api to `rp-production` (or keep current name)
- [ ] **Description**: Update to "Production Environment"
- [ ] **Environment Variables**: Configure for production behavior:
  - [ ] PORT=8081
  - [ ] NODE_ENV=production
  - [ ] CLIENT_URL=https://api.risingpunk.com:8081
  - [ ] CORS_ORIGINS=https://api.risingpunk.com:8081
  - [ ] JWT_SECRET=(regenerate for production)
  - [ ] ENCRYPTION_KEY=(regenerate for production)
  - [ ] MONGODB_URI=(production-specific)
- [ ] **Load Balancer**: Ensure listeners are :80 and :443

**SSL Certificate Setup**:
- [ ] **ACM Certificate**: Request certificate for `api.risingpunk.com` in us-west-2
- [ ] **Validation**: Add ACM CNAME validation records in Cloudflare
- [ ] **Attach Certificate**: Attach to production environment's load balancer :443 listener
- [ ] **Cloudflare DNS**: Point `api.risingpunk.com` to production EB CNAME
- [ ] **SSL Mode**: Set Cloudflare SSL mode to Full (strict)
- [ ] **HTTPS Redirect**: Configure HTTP → HTTPS redirect

**Health Gate**: Visit `https://api.risingpunk.com:8081/healthz` - verify TLS, production DB, secure cookies

#### 2.6. Clean Up Legacy Environment
**Status**: ⏳ **PENDING** - Remove legacy Docker environment
**Goal**: Delete rp-env (Docker) after confirming no traffic

**Legacy Environment Cleanup**:
- [ ] **Traffic Check**: Verify no traffic to rp-env (Docker) environment
- [ ] **Shared Resources**: Confirm no shared RDS/S3 marked for termination with environment
- [ ] **Backup Verification**: Ensure all data is backed up before deletion
- [ ] **Delete Environment**: Remove rp-env (Docker) environment
- [ ] **Delete Application**: Remove associated application if no other environments
- [ ] **DNS Cleanup**: Remove any Cloudflare DNS pointing to legacy environment
- [ ] **Certificate Cleanup**: Revoke ACM certificates used only by legacy environment

### 3. Environment Configuration Files
**Current State**: Using .env.local for local development, AWS EB environment variables for staging
**Goal**: Use .env.dev for local development, AWS EB environment variables for staging/production
**Environment Strategy**: Local/Dev (.env.dev), Staging (AWS EB env vars), Production (AWS EB env vars)
**Environment Variables (from AWS EB rp-staging-api)**: CLIENT_URL, CORS_ORIGINS, EMAIL_PASSWORD, EMAIL_USER, ENCRYPTION_KEY, GOOGLE_CLIENT_ID, JWT_SECRET, MONGODB_URI, NODE_ENV
**Environment Variable Security Strategy**: Local (.env.dev), Staging/Production (AWS EB environment variables)
**Environment Variable Strategy**: Local (.env.dev), Staging (AWS EB), Production (AWS EB)
**Backup Strategy**: Local backup of environment variables for recovery

- [ ] Rename .env.local to .env.dev for local development
- [ ] Update .env.dev with PORT=5001 and local development settings
- [ ] Configure AWS EB staging environment variables (PORT=8080, staging settings)
- [ ] Configure AWS EB production environment variables (PORT=8081, production settings)
- [ ] Update server env.ts to handle ports 8080 (staging) and 8081 (production)
- [ ] Update mobile config.ts for environment-specific URLs
- [ ] Implement environment variable switching logic (NODE_ENV-based)
- [ ] Generate unique credentials for production (JWT_SECRET, ENCRYPTION_KEY, EMAIL_PASSWORD)
- [ ] Create local backup of environment variables for recovery purposes

### 3.1. Environment Variable Backup and Recovery Strategy
**Current State**: .env.local exists locally, AWS EB has environment variables
**Goal**: Secure backup of all environment variables for recovery purposes
**Strategy**: Local backup of environment variables, AWS EB for staging/production
**Backup Location**: Local machine backup directory (not in repository)

**Local Environment Variable Backup**:
- [ ] Create local backup directory: `~/risingpunk-env-backups/`
- [ ] Backup current .env.local as .env.dev.backup
- [ ] Export AWS EB staging environment variables to local file
- [ ] Export AWS EB production environment variables to local file
- [ ] Create environment variable documentation file
- [ ] Store backup files in secure local directory (not in repository)
- [ ] Document backup restoration procedures

**AWS EB Environment Variable Configuration**:
- [ ] **Staging EB Environment Variables**:
  - [ ] PORT=8080
  - [ ] NODE_ENV=staging
  - [ ] MONGODB_URI=(shared with dev)
  - [ ] CLIENT_URL=https://api.risingpunk.dev:8080
  - [ ] CORS_ORIGINS=https://api.risingpunk.dev:8080,http://localhost:3000
  - [ ] JWT_SECRET=(staging-specific)
  - [ ] ENCRYPTION_KEY=(staging-specific)
  - [ ] EMAIL_USER=(staging-specific)
  - [ ] EMAIL_PASSWORD=(staging-specific)
  - [ ] GOOGLE_CLIENT_ID=(shared with dev)

- [ ] **Production EB Environment Variables**:
  - [ ] PORT=8081
  - [ ] NODE_ENV=production
  - [ ] MONGODB_URI=(production-specific)
  - [ ] CLIENT_URL=https://api.risingpunk.com:8081
  - [ ] CORS_ORIGINS=https://api.risingpunk.com:8081
  - [ ] JWT_SECRET=(production-specific, regenerated)
  - [ ] ENCRYPTION_KEY=(production-specific, regenerated)
  - [ ] EMAIL_USER=(production-specific)
  - [ ] EMAIL_PASSWORD=(production-specific)
  - [ ] GOOGLE_CLIENT_ID=(production-specific)

**Environment Variable Recovery Procedures**:
- [ ] Document how to restore .env.dev from backup
- [ ] Document how to restore AWS EB environment variables
- [ ] Create emergency environment variable restoration guide
- [ ] Test environment variable restoration process
- [ ] Store recovery procedures in secure location

### 4. Server Package Scripts
**Current State**: Has start:staging and start:prod scripts
**Goal**: Add proper dev script and update for new environment strategy
**Environment Strategy**: Dev (localhost:5001), Staging (api.risingpunk.dev:8080), Production (api.risingpunk.com:8081)
**GitHub Branch Strategy**: dev branch (local only), staging branch (deploys to staging), prod branch (deploys to production)
**Environment Variable Strategy**: Local/Dev (.env.dev), Staging (AWS EB), Production (AWS EB)
**Environment Variable Switching Logic**: Server uses dotenv-flow with NODE_ENV to load appropriate .env file
**Procfile Status**: ✅ Current Procfile (`web: node dist/server/server.js`) works correctly in production and TestFlight - DO NOT CHANGE

- [ ] Update server/package.json scripts for dev/staging/prod environments
- [ ] Add start:dev (NODE_ENV=development) for local development
- [ ] Add start:staging (NODE_ENV=staging) for staging environment
- [ ] Keep start:prod for production (NODE_ENV=production)
- [ ] Update documentation and CI workflows to reference new script names

### 5. Mobile Configuration Updates
**Current State**: Uses __DEV__ toggle for localhost vs staging-api.risingpunk.com
**Goal**: Use process.env.API_ENV for proper environment detection
**Environment Strategy**: Dev (localhost:5001), Staging (api.risingpunk.dev:8080), Production (api.risingpunk.com:8081)
**GitHub Branch Strategy**: dev branch (local builds), staging branch (TestFlight builds), prod branch (App Store builds)
**Environment Variable Strategy**: Local/Dev (.env.development), Staging (.env.staging), Production (.env.production)
**Environment Variable Switching Logic**: Mobile uses process.env.API_ENV (injected via react-native-config) for environment detection
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8081)

- [ ] Replace __DEV__ toggle in mobile/src/config.ts with process.env.API_ENV
- [ ] Install and configure react-native-config for build-time environment injection
- [ ] Map API_ENV: dev → localhost:5001, staging → api.risingpunk.dev:8080, prod → api.risingpunk.com:8081
- [ ] Update mobile config.ts with API_ENV mapping for all endpoints
- [ ] Use subdomains instead of ports for better security and modern practices

### 6. iOS App Transport Security
**Current State**: Basic ATS with NSAllowsLocalNetworking for localhost, need domain-specific config
**Goal**: Configure ATS for staging and production domains with proper port access
**Environment Strategy**: Staging (api.risingpunk.dev:8080), Production (api.risingpunk.com:8081)
**GitHub Branch Strategy**: staging branch (TestFlight testing), prod branch (App Store submission)
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8081)
**Port Strategy**: Different ports for security isolation - staging (8080), production (8081)

- [ ] Update mobile/ios/mobile/Info.plist with NSExceptionDomains for both domains
- [ ] Configure NSExceptionDomains for api.risingpunk.dev:8080 (staging)
- [ ] Configure NSExceptionDomains for api.risingpunk.com:8081 (production)
- [ ] Set NSExceptionMinimumTLSVersion to TLSv1.2 for both domains
- [ ] Set NSExceptionAllowsInsecureHTTPLoads to false (HTTPS only)
- [ ] Test on actual device to confirm HTTPS requests succeed without ATS warnings
- [ ] Build and test on device/emulator against both domains before App Store submission
- [ ] Ensure all API endpoints use HTTPS with valid certificates

### 6.1. iOS Info.plist ATS Configuration Details
**Current State**: Basic ATS with NSAllowsLocalNetworking for localhost development
**Goal**: Add domain-specific NSExceptionDomains for staging and production
**Bundle ID**: com.devheadllc.risingpunk (from Xcode project)
**Required Domains**: api.risingpunk.dev:8080 (staging), api.risingpunk.com:8081 (production)

**Info.plist Updates Required**:
- [ ] Add NSExceptionDomains dictionary under NSAppTransportSecurity
- [ ] Configure api.risingpunk.dev exception for port 8080
- [ ] Configure api.risingpunk.com exception for port 8081
- [ ] Set NSExceptionMinimumTLSVersion to TLSv1.2 for both domains
- [ ] Set NSExceptionAllowsInsecureHTTPLoads to false (HTTPS only)
- [ ] Keep NSAllowsLocalNetworking for localhost development
- [ ] Test configuration on actual iOS device

**Example NSExceptionDomains Structure**:
```xml
<key>NSExceptionDomains</key>
<dict>
    <key>api.risingpunk.dev</key>
    <dict>
        <key>NSExceptionPorts</key>
        <array>
            <dict>
                <key>NSExceptionPort</key>
                <integer>8080</integer>
                <key>NSExceptionProtocol</key>
                <string>https</string>
            </dict>
        </array>
        <key>NSExceptionMinimumTLSVersion</key>
        <string>TLSv1.2</string>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <false/>
    </dict>
    <key>api.risingpunk.com</key>
    <dict>
        <key>NSExceptionPorts</key>
        <array>
            <dict>
                <key>NSExceptionPort</key>
                <integer>8081</integer>
                <key>NSExceptionProtocol</key>
                <string>https</string>
            </dict>
        </array>
        <key>NSExceptionMinimumTLSVersion</key>
        <string>TLSv1.2</string>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <false/>
    </dict>
</dict>
```

### 7. GitHub Actions Workflows
**Current State**: Has deploy-staging.yml for main branch → staging-api.risingpunk.com
**Goal**: Create separate workflows for staging and prod branches with new domains
**Environment Strategy**: Staging branch → api.risingpunk.dev, Prod branch → api.risingpunk.com
**GitHub Branch Strategy**: dev (no deployment), staging → api.risingpunk.dev, prod → api.risingpunk.com, main (no deployment)
**Modern DevOps Promotion Strategy**: Local/Dev → Staging (PR to staging), Staging → Production (PR to prod), no direct promotion
**Branch Status**: ✅ dev/prod/staging branches already created, need to disable main branch triggers
**Current GitHub Secrets**: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, EB_APP_NAME, EB_ENV_NAME, EB_S3_BUCKET
**GitHub Secrets Strategy**: Use environment-specific secrets for staging vs production EB environments

- [ ] Create deploy-staging.yml (trigger on staging branch → api.risingpunk.dev)
- [ ] Create deploy-production.yml (trigger on prod branch → api.risingpunk.com)
- [ ] Remove main branch from existing workflow triggers
- [ ] Disable dev branch deployment (local development only)
- [ ] Update workflows to use correct EB environment secrets
- [ ] Ensure workflows are compatible with new GitHub cache service (migrated April 2025)
- [ ] Verify deployment permissions include `deployments: write` permission
- [ ] Update any fine-grained PATs for deployment capabilities
- [ ] Use macOS 15 runners if iOS builds are needed (migration completed Sep 1, 2025)

### 7.1. GitHub Secrets Management
**Current State**: Single set of secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, EB_APP_NAME, EB_ENV_NAME, EB_S3_BUCKET)
**Goal**: Environment-specific secrets for staging vs production EB environments
**Strategy**: Keep current secrets for production, add staging-specific secrets
**Current GitHub Secrets**: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, EB_APP_NAME, EB_ENV_NAME, EB_S3_BUCKET

**Production Secrets (Keep Current)**:
- [ ] Keep existing `AWS_ACCESS_KEY_ID` (for production EB)
- [ ] Keep existing `AWS_SECRET_ACCESS_KEY` (for production EB)
- [ ] Keep existing `AWS_REGION` (shared)
- [ ] Keep existing `EB_APP_NAME` (for production EB)
- [ ] Keep existing `EB_ENV_NAME` (for production EB)
- [ ] Keep existing `EB_S3_BUCKET` (for production EB)

**Staging Secrets (Add New)**:
- [ ] Add `AWS_ACCESS_KEY_ID_STAGING` (for staging EB)
- [ ] Add `AWS_SECRET_ACCESS_KEY_STAGING` (for staging EB)
- [ ] Add `EB_APP_NAME_STAGING` (for staging EB)
- [ ] Add `EB_ENV_NAME_STAGING` (for staging EB)
- [ ] Add `EB_S3_BUCKET_STAGING` (for staging EB)
- [ ] Keep `AWS_REGION` shared (same region for both environments)

**Workflow Updates**:
- [ ] Update deploy-staging.yml to use staging-specific secrets
- [ ] Update deploy-production.yml to use production-specific secrets
- [ ] Ensure both workflows use correct secret names for their respective environments

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
- [ ] Configure staging environment variables in AWS EB (PORT=8080, staging settings)
- [ ] Configure production environment variables in AWS EB (PORT=8081, production settings)
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
**API Environment Mapping**: dev (http://localhost:5001), staging (https://api.risingpunk.dev:8080), prod (https://api.risingpunk.com:8081)

- [ ] Set api.risingpunk.dev DNS records to staging environment's load balancer
- [ ] Point api.risingpunk.com to production environment's load balancer
- [ ] Ensure SSL certificates are valid for both subdomains (port 8080 for staging, port 8081 for production)
- [ ] Update CORS_ORIGINS and CLIENT_URL env vars in each EB environment
- [ ] Verify HTTPS and CORS responses from both endpoints
- [ ] Handle existing .dev domain configuration (replace current AWS app)
- [ ] Configure Cloudflare for both domains (currently only .com is properly set up)
- [ ] Ensure both staging and production ports are publicly accessible for TestFlight/App Store

### 9.1. AWS Security Groups Configuration
**Current State**: Single security group for current EB environment
**Goal**: Separate security groups for staging and production with port-specific access
**Environment Strategy**: Staging (api.risingpunk.dev:8080), Production (api.risingpunk.com:8081)
**Port Strategy**: Different ports for security isolation and easier management
**Security Group Strategy**: Environment-specific groups with minimal required access

**Staging Security Group (api.risingpunk.dev:8080)**:
- [ ] Create `risingpunk-staging-sg` security group
- [ ] Allow inbound HTTPS (443) from 0.0.0.0/0 (for public API access)
- [ ] Allow inbound HTTP (80) from 0.0.0.0/0 (for redirects)
- [ ] Allow inbound port 8080 from 0.0.0.0/0 (for staging API)
- [ ] Allow outbound HTTPS (443) to 0.0.0.0/0 (for external API calls)
- [ ] Allow outbound MongoDB Atlas access (port 27017) to staging cluster
- [ ] Tag security group: Environment=staging, Purpose=api

**Production Security Group (api.risingpunk.com:8081)**:
- [ ] Create `risingpunk-production-sg` security group  
- [ ] Allow inbound HTTPS (443) from 0.0.0.0/0 (for public API access)
- [ ] Allow inbound HTTP (80) from 0.0.0.0/0 (for redirects)
- [ ] Allow inbound port 8081 from 0.0.0.0/0 (for production API)
- [ ] Allow outbound HTTPS (443) to 0.0.0.0/0 (for external API calls)
- [ ] Allow outbound MongoDB Atlas access (port 27017) to production cluster
- [ ] Tag security group: Environment=production, Purpose=api

**Security Group Updates**:
- [ ] Update staging EB environment to use `risingpunk-staging-sg`
- [ ] Update production EB environment to use `risingpunk-production-sg`
- [ ] Remove old security group after migration is complete
- [ ] Document security group rules for future reference
- [ ] Test security group access from mobile app on both environments

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

### 13.1. Pre-Production Backup and Safety Procedures
**Goal**: Ensure dev/staging data is safely backed up before production setup
**Strategy**: Manual backup of current working database before any production changes
**Safety Net**: Complete backup allows rollback if production setup encounters issues

**Manual Backup Procedures (CRITICAL - Run Before Production Setup)**:
- [ ] **Export Dev/Staging Database**: Run complete MongoDB export of current working database
- [ ] **Backup All Collections**: Ensure maps, users, research, bots, and all game data are exported
- [ ] **Store Backup Securely**: Save backup files in AWS S3 or secure local storage
- [ ] **Verify Backup Integrity**: Test backup restoration on test environment
- [ ] **Document Backup Location**: Record where backup files are stored for future reference
- [ ] **Create Backup Schedule**: Set up ongoing backup procedures for dev/staging database

**Backup Verification Checklist**:
- [ ] Verify all collections are included in backup export
- [ ] Test backup restoration process on empty database
- [ ] Confirm backup contains all essential game data
- [ ] Document backup restoration procedures
- [ ] Store backup in multiple secure locations
- [ ] Test backup restoration before proceeding with production setup

**Emergency Rollback Procedures**:
- [ ] Document complete rollback process if production setup fails
- [ ] Create emergency database restoration procedures
- [ ] Test rollback process in staging environment
- [ ] Ensure rollback procedures are documented and accessible
- [ ] Create emergency contact procedures for critical issues

### 14. MongoDB Atlas Production Cluster Final Touches
**Current State**: Production cluster (RisingPunk-Production) created and provisioning
**Goal**: Configure production-grade monitoring, backups, and search capabilities
**Environment Strategy**: Production cluster gets full enterprise features, dev/staging keeps basic M0 features
**Cluster Status**: RisingPunk-Production (M10/M30 tier) - **PAID FEATURES AVAILABLE**

**MongoDB Atlas Alerts Setup**:
- [ ] Configure cluster health monitoring alerts
- [ ] Set up connection pool exhaustion alerts
- [ ] Configure slow query performance alerts (>100ms)
- [ ] Set up disk space usage alerts (80%+ threshold)
- [ ] Configure replica set member down alerts
- [ ] Set up index build failure alerts
- [ ] Configure backup failure alerts
- [ ] Set up security event alerts (failed logins, etc.)
- [ ] Configure email notifications for critical alerts
- [ ] Test alert system with staging environment first

**Cloud Backups Configuration**:
- [ ] Enable continuous cloud backups for production cluster
- [ ] Configure backup retention policy (7-30 days recommended)
- [ ] Set up point-in-time recovery (PITR) for production data
- [ ] Configure backup encryption at rest
- [ ] Test backup restoration process in staging environment
- [ ] Document backup restoration procedures
- [ ] Set up automated backup verification
- [ ] Configure cross-region backup replication (if needed)
- [ ] Test disaster recovery procedures
- [ ] Document backup monitoring and alerting

**Search Indexes Setup**:
- [ ] Create text search indexes for user search functionality
- [ ] Set up search indexes for research features and categories
- [ ] Configure search indexes for bot configurations and assemblies
- [ ] Set up search indexes for battle data and game state
- [ ] Create compound indexes for complex queries
- [ ] Configure search indexes for map data and territories
- [ ] Set up search indexes for financial and investment data
- [ ] Test search performance and query optimization
- [ ] Monitor search index usage and performance
- [ ] Document search index maintenance procedures

**Production Security Hardening**:
- [ ] **Network Access**: 0.0.0.0/0 already configured at project level (covers both clusters)
- [ ] **Later**: Restrict network access to AWS EB environment IPs only (replace 0.0.0.0/0)
- [ ] Enable database audit logging for production cluster
- [ ] Configure IP whitelist for production database access
- [ ] Set up database user rotation schedule
- [ ] Enable encryption in transit (TLS 1.2+)
- [ ] Configure database access monitoring
- [ ] Set up failed login attempt monitoring
- [ ] Enable database activity monitoring (DAM)
- [ ] Configure security alerts for suspicious activity
- [ ] Test security configurations in staging environment

**Performance Monitoring Setup**:
- [ ] Configure MongoDB Atlas performance monitoring
- [ ] Set up query performance monitoring and profiling
- [ ] Configure connection pool monitoring
- [ ] Set up index usage monitoring
- [ ] Configure memory and CPU usage alerts
- [ ] Set up slow operation monitoring
- [ ] Configure database lock monitoring
- [ ] Set up replication lag monitoring
- [ ] Configure shard monitoring (if using sharding)
- [ ] Test performance monitoring in staging environment

**Production Cluster Optimization**:
- [ ] Review and optimize database indexes for production queries
- [ ] Configure connection pooling for production workloads
- [ ] Set up read preferences for production traffic
- [ ] Configure write concerns for production data integrity
- [ ] Optimize database schema for production performance
- [ ] Configure database caching strategies
- [ ] Set up database maintenance windows
- [ ] Configure automatic failover testing
- [ ] Optimize database storage and compression
- [ ] Test cluster performance under load

**Documentation and Runbooks**:
- [ ] Document production cluster configuration
- [ ] Create MongoDB Atlas administration runbook
- [ ] Document backup and recovery procedures
- [ ] Create alert response procedures
- [ ] Document performance tuning procedures
- [ ] Create security incident response procedures
- [ ] Document cluster scaling procedures
- [ ] Create disaster recovery procedures
- [ ] Document monitoring and maintenance procedures
- [ ] Test all procedures in staging environment

**Production Database Testing**:
- [ ] Test production database with fresh data (no user accounts initially)
- [ ] Ensure production can handle new user registrations and data creation
- [ ] Document production database seeding process for future resets

**Production Database Reset Procedures**:
- [ ] Document complete database reset process for production
- [ ] Create emergency database restoration procedures
- [ ] Test database reset process in staging environment first
- [ ] Ensure all seeding scripts work independently
- [ ] Verify no dependencies on existing user data in seeding scripts
- [ ] Create rollback procedures if seeding fails

**Manual Backup Procedures (Dev Environment)**:
- [ ] Run manual backup of current dev/staging database before production setup
- [ ] Export all collections from dev/staging MongoDB cluster
- [ ] Store backup files in secure location (AWS S3 or local storage)
- [ ] Document backup restoration procedures
- [ ] Test backup restoration process on test environment
- [ ] Create backup schedule for ongoing dev database protection

**Seeding Scripts Advanced Testing**:
- [ ] Verify no dependencies on existing user data
- [ ] Ensure seeding scripts handle duplicate data gracefully
- [ ] Test seeding scripts in staging environment first


