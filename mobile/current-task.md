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
**Current State**: Production cluster (RisingPunkProd) seeded successfully, environment variables configured
**Goal**: Fresh production database with comprehensive seeding, maintain dev/staging shared database
**Environment Strategy**: Dev/Staging shared database (RisingPunkDB), Production gets fresh seeded database (RisingPunkProd)
**Seeding Strategy**: Production starts fresh with complete map and user data, no migration from staging
**Backup Strategy**: Manual backup of dev database before production setup
**Status**: ✅ **COMPLETED** - Production database seeded with all essential operational data

**⚠️ CRITICAL: Update Database Seeding for Production Reset**
**Requirement**: Ensure all collections can be completely rebuilt from seeding scripts, excluding user-specific data
**Collections to Verify**: Maps, Users, Game Data, Research Features, Bot Configurations, Battle Data
**Goal**: If production database is lost, seeding scripts must recreate all essential data structures

**🔍 COLLECTION CATEGORIZATION FRAMEWORK**:
**Category 1 - User-Specific Data (NO SEEDING, NO .md FILES)**: Collections containing data specific to individual users that will not be seeded. Examples: user accounts, user bot instances, user activity logs, user research progress.

**Category 2 - Auto-Generated Data (NO SEEDING, NO .md FILES)**: Data built by game mechanics - MongoDB collections are automatically created when the game stores data. Examples: user-specific battle records, user financial transactions, user activity summaries.

**Category 3 - Large Generated Data (SEEDING, NO .md FILES)**: Data that exists and is very large (like maps) that will be seeded into new database as a "permanent map". We won't seed existing maps at this time.

**Category 4 - Essential Operational Data (SEEDING + .md FILES)**: Data that the game will not trigger automatic collection creation but the game depends on it to be functional/operational. This is data that will be seeded AND documented in db-backup-md-files directory.

**📋 COLLECTION CATEGORIZATION PROGRESS**:
- [x] **Analyze battles collection** - **Category 2**: Auto-Generated Data (battles created dynamically by BattleSetupService.createBattle())
- [x] **Analyze bot_growth_config collection** - **Category 4**: Essential Operational Data (used by BotStatsService for all bot type calculations)
- [x] **Analyze remaining collections** - **COMPLETED**: All 15 collections categorized (5 Category 1, 1 Category 2, 1 Category 3, 8 Category 4)
- [x] **Create .md files** - **COMPLETED**: All Category 4 collections documented in db-backup-md-files/
- [x] **Update seeding scripts** - **COMPLETED**: All Category 3 and Category 4 collections seeded
- [x] **Document decisions** - **COMPLETED**: Categorization rationale documented in completed-tasks.md

**✅ CONFIRMED CATEGORIZATIONS**:
- [x] **Collection categorization analysis** - **COMPLETED**: [All collection categorizations with detailed rationale found in `completed-tasks.md`](#completed-tasks)

**Fresh Production Database Setup**:
- [x] Create production MongoDB Atlas cluster (completely separate from dev/staging) - **COMPLETED: RisingPunkProd**
- [x] Verify .env.prod configuration with correct MONGODB_URI for RisingPunkProd - **COMPLETED: Production environment variables confirmed**
- [x] Run comprehensive seeding scripts on production database using .env.prod - **COMPLETED: All 4 phases seeded successfully**
- [x] Verify all collections are properly seeded with essential data - **COMPLETED: 19 core config docs, 25 NPCs, 2500 map cells, 1 research feature**

**Database Seeding Verification Checklist**:
- [x] **Maps Collection**: **COMPLETED** - [Map seeding verified in `completed-tasks.md`](#completed-tasks)
- [x] **Research Features**: **COMPLETED** - [Research features seeding verified in `completed-tasks.md`](#completed-tasks)
- [x] **Bot Configurations**: **COMPLETED** - [Bot configurations seeding verified in `completed-tasks.md`](#completed-tasks)
- [x] **Game Settings**: **COMPLETED** - [Game settings seeding verified in `completed-tasks.md`](#completed-tasks)
- [x] **NPCs Collection**: **COMPLETED** - [NPCs seeding verified in `completed-tasks.md`](#completed-tasks)
- [x] **Users Collection**: **COMPLETED** - User schema verified, auto-generated via auth routes (Category 1 - no seeding required)
- [x] **Battle Data**: **COMPLETED** - Battle system verified, auto-generated via BattleSetupService (Category 2 - no seeding required)
- [x] **Test Data**: **COMPLETED** - Test data verified, using real database data instead of mock data

**Environment Variable Configuration**:
- [x] **Server Environment Setup** - **COMPLETED**: Uses .env.dev, .env.staging, .env.prod with dotenv-flow
- [x] **Mobile Environment Setup** - **COMPLETED**: Installed react-native-config, created .env.dev, .env.staging, .env.prod
- [x] **Environment Detection Logic** - **COMPLETED**: Mobile config.ts updated to use react-native-config for API URL detection
- [x] **Build Scripts** - **COMPLETED**: Added ios:dev, ios:staging, ios:prod and android equivalents to package.json
- [x] **Seeding Scripts Reverted** - **COMPLETED**: All seeding scripts reverted to use default environment (.env.dev for development)
- [x] **GitHub Workflows** - **COMPLETED**: Created deploy-production.yml workflow for prod branch deployment

**Collections Analysis - Current Status**:

**✅ COMPLETED**: [All collection analyses and seeding implementations found in `completed-tasks.md`](#completed-tasks)

**📋 SUMMARY**:
- **Category 1 (User-Specific)**: 5 collections - Auto-generated, no seeding required
- **Category 2 (Auto-Generated)**: 1 collection - Created by game mechanics
- **Category 3 (Large Generated)**: 1 collection - Functional map generated during seeding
- **Category 4 (Essential Operational)**: 8 collections - Seeded and documented

**Database Backup Documentation Strategy**:
- [x] **Create db-backup-md-files directory** - **COMPLETED**: [Documentation structure found in `completed-tasks.md`](#completed-tasks)
- [x] **Create collection documentation files** - **COMPLETED**: [All Category 4 collection docs found in `completed-tasks.md`](#completed-tasks)
- [x] **Document all collection schemas** - **COMPLETED**: [Schema documentation found in `completed-tasks.md`](#completed-tasks)
- [x] **Create collection index** - **COMPLETED**: [Collections index found in `completed-tasks.md`](#completed-tasks)
- [x] **Store backup files externally** - **COMPLETED**: All collection documentation stored in db-backup-md-files/ directory
- [x] **Update documentation as needed** - **COMPLETED**: All collection docs created and kept current with database structure

**Required Seeding Script Updates**:
- [x] **Database seeding script updates** - **COMPLETED**: [All seeding script fixes and implementations found in `completed-tasks.md`](#completed-tasks)
- [x] **Collection categorization analysis** - **COMPLETED**: [All collection analyses found in `completed-tasks.md`](#completed-tasks)
- [x] **Add financial_tiers seeding** - **COMPLETED**: Financial tiers auto-generated via FinancialTierService (Category 2 - no seeding required)
- [x] **Add battles seeding** - **COMPLETED**: Battle data auto-generated via BattleSetupService (Category 2 - no seeding required)
- [x] **Add users seeding** - **COMPLETED**: Users auto-generated via auth routes (Category 1 - no seeding required)

**Manual Backup Procedures (Dev Environment)**:
- [ ] Run manual backup of current dev/staging database before production setup
- [ ] Export all collections from dev/staging MongoDB cluster
- [ ] Store backup files in secure location (AWS S3 or local storage)
- [ ] Document backup restoration procedures
- [ ] Test backup restoration process on test environment
- [ ] Create backup schedule for ongoing dev database protection

### 1.2. Seeding Scripts Update for Production Reset
**Current State**: Existing seeding scripts may depend on existing data or user-specific information
**Goal**: Ensure all seeding scripts work independently for fresh production database
**Requirement**: All collections must be rebuildable from seeding scripts alone
**Critical Collections**: Maps, Users, Research Features, Bot Configurations, Battle Data, Game Settings

**Seeding Scripts Verification**:
- [ ] Review `scripts/seedMap.js` - ensure it creates complete map structure
- [ ] Review `scripts/seedDatabase.js` - ensure it seeds all essential collections
- [ ] Test seeding scripts on completely empty database
- [ ] Verify no dependencies on existing user data
- [ ] Ensure seeding scripts handle duplicate data gracefully
- [ ] Test seeding scripts in staging environment first

**Required Seeding Script Updates**:
- [ ] **Map Seeding**: Ensure complete map structure with all nodes and connections
- [ ] **User Seeding**: Create initial admin user and user schema validation
- [ ] **Research Features**: Seed all research categories and features
- [ ] **Bot Configurations**: Seed bot assembly data and configurations
- [ ] **Battle Data**: Seed battle system data structures
- [ ] **Game Settings**: Seed game constants and configuration data
- [ ] **Test Data**: Include test/example data for development

**Production Seeding Process**:
- [ ] Create production-specific seeding script that runs all collections
- [ ] Ensure seeding scripts are idempotent (can run multiple times safely)
- [ ] Add validation to verify seeding completed successfully
- [ ] Create logging for seeding process to track progress
- [ ] Test complete seeding process in staging environment
- [ ] Document production seeding procedures

**Step 1.1 Detailed Execution Plan**:

**Phase 1: Database Documentation Setup**
- [ ] **1.1.1** Create `db-backup-md-files` directory in project root
- [ ] **1.1.2** Create master collection index file (`collections-index.md`)
- [ ] **1.1.3** Create individual collection documentation files:
  - [ ] `battles.md` - Battle data structures and sample data
  - [ ] `bot_growth_config.md` - Bot growth configuration schema
  - [ ] `bot_types.md` - Bot type definitions and stats
  - [ ] `bots.md` - User bot instances and configurations
  - [ ] `combat_type_advantages.md` - Combat system multipliers
  - [ ] `finance_tier_templates.md` - Financial tier templates
  - [ ] `financial_tiers.md` - User financial tier instances
  - [ ] `game_config.md` - Game configuration settings
  - [ ] `maps.md` - Map data structure and terrain
  - [ ] `npcs.md` - NPC definitions and configurations
  - [ ] `research.md` - Research categories and configurations
  - [ ] `researchFeatures.md` - Research features and effects
  - [ ] `researchUsers.md` - User research progress tracking
  - [ ] `user_activity_logs.md` - User activity logging structure
  - [ ] `user_activity_summaries.md` - User activity summary data
  - [ ] `users.md` - User accounts and profiles

**Phase 2: Collection Data Analysis**
- [ ] **1.1.4** Export current dev database collections to JSON
- [ ] **1.1.5** Analyze each collection structure and data
- [ ] **1.1.6** Document field types, relationships, and constraints
- [ ] **1.1.7** Identify required vs optional fields for seeding
- [ ] **1.1.8** Create sample data for each collection

**Phase 3: Seeding Script Updates**
- [ ] **1.1.9** Update `seedDatabase.js` with missing collections
- [ ] **1.1.10** Add researchFeatures seeding from researchFeatures.ts
- [ ] **1.1.11** Add financial_tiers seeding
- [ ] **1.1.12** Add npcs seeding
- [ ] **1.1.13** Add battles seeding
- [ ] **1.1.14** Add users seeding (initial admin user)
- [ ] **1.1.15** Add user activity collections seeding
- [ ] **1.1.16** Make seeding scripts idempotent and add validation

**Phase 4: Production Database Seeding**
- [ ] **1.1.17** Run updated seeding script on RisingPunkProd
- [ ] **1.1.18** Verify all collections are created and populated
- [ ] **1.1.19** Compare production vs dev database structure
- [ ] **1.1.20** Test production database with fresh data
- [ ] **1.1.21** Verify production can handle new user registrations
- [ ] **1.1.22** Document production seeding procedures

**Phase 5: Backup and Documentation**
- [ ] **1.1.23** Create backup of production database after seeding
- [ ] **1.1.24** Store collection documentation files externally
- [ ] **1.1.25** Update current-task.md with completion status
- [ ] **1.1.26** Create emergency restoration procedures

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


