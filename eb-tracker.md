### Verified
- EB Environment > Configuration > Updates, Monitoring & Logging > Environment properties present: `CORS_ORIGINS`, `JWT_SECRET`, `MONGODB_URI`, `NODE_ENV=staging`.
- EB Environment > Service Access shows roles set: Service role `aws-elasticbeanstalk-service-role`, EC2 instance profile `aws-elasticbeanstalk-ec2-role`.
- `server/Procfile` exists (not under `server/server`) with: `web: node dist/server/server.js`.
- `.github/workflows/deploy-staging.yml` not found in repo.
- S3 bucket `elasticbeanstalk-us-west-2-211125440777` exists.
  - Block all public access: Off.
  - Object ownership: Bucket owner preferred.
  - ACL shows no public permissions; CORS empty.
  - Bucket policy set (includes account list/get, object read, EB EC2 write logs, deny delete bucket).
- Programmatic IAM user (not a role) `rp-github-deployer` exists with active access key; console access disabled; attached policy `rp-eb-deploy-policy` (customer managed).
- IAM roles present:
  - `aws-elasticbeanstalk-ec2-role` (trusted entity: ec2).
  - `aws-elasticbeanstalk-service-role` (trusted entity: elasticbeanstalk).
  - `aws-elasticbeanstalk-ec2-role` attached policies:
    - AWS managed: `AmazonEC2ContainerRegistryReadOnly`, `AmazonS3ReadOnlyAccess`, `AWSElasticBeanstalkMulticontainerDocker`, `AWSElasticBeanstalkWebTier`, `AWSElasticBeanstalkWorkerTier`.
    - Customer inline: `readAcl` (S3 list/get on EB bucket and objects), `ReadEBArtifacts` (S3 get/list on EB bucket and objects).
  - `aws-elasticbeanstalk-service-role` attached policies:
    - AWS managed: `AmazonS3ReadOnlyAccess`, `AWSElasticBeanstalkEnhancedHealth`, `AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy`.
    - Customer inline: `newPermission` (S3 list/get on EB bucket and objects), `ReadArtifactsForEB` (S3 get/list on EB bucket and objects).
  - IAM user policy `rp-eb-deploy-policy` attached to `rp-github-deployer` includes:
    - EB: `CreateApplicationVersion`, `UpdateEnvironment`, `Describe*`, `List*` on all.
    - S3: read/write on `elasticbeanstalk-us-west-2-211125440777/*` and list/get on the bucket; read/write on artifacts bucket `rp-eb-artifacts-usw2/*` plus list on that bucket.
    - CloudFormation: read on the env stack `arn:aws:cloudformation:us-west-2:211125440777:stack/awseb-e-2qegamu2wp-stack/*`.
    - Infra read-only: `ec2`, `elb`, `autoscaling`, `cloudwatch` describe/list/get.
  - GitHub Actions repository secrets exist: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `EB_APP_NAME`, `EB_ENV_NAME`, `EB_S3_BUCKET`.
  - EB env: `rp-staging-api`; platform: Node.js 22 on Amazon Linux 2023 v6.6.3 (region `us-west-2`).
  - Deploy workflow behavior: builds `server/` → zips `dist/` + runtime files; uploads to EB service bucket with `--acl bucket-owner-full-control`; creates EB ApplicationVersion per commit SHA; then `update-environment`. AppVersion shows `UNPROCESSED` immediately after create (expected).
  - EB service S3 bucket `elasticbeanstalk-us-west-2-211125440777` contains artifacts `rp-api-<sha>.zip` (~112.6 KB). Object ownership: Bucket owner preferred (ACLs enabled). Bucket ACL: only bucket owner. Bucket policy: account root list/get; EC2 role put logs to `resources/environments/logs/*`; deny delete bucket.
  - Application versions list shows Source keys like `rp-api-<sha>.zip` (links point to the EB service bucket root).
  - EB events previously showed `You do not have permission to perform 's3:GetObjectAcl'` during deploy; logs/health otherwise OK. ACLs now enabled; both roles have `s3:GetObjectAcl`.
  - 2025-08-13 deploy attempt: EB created ApplicationVersion from `rp-api-<sha>.zip`, started `update-environment`, then failed with `s3:GetObjectAcl` AccessDenied.
  - CI logs confirm upload used `--acl bucket-owner-full-control` to the EB service bucket and that the version label matches the SHA used in `update-environment`.
  - EB Health currently shows: `Incorrect application version "" (deployment 4). Expected version .` and Running version shows `-`. Sample app logs present. Interpretation: our update failed before the instance could fetch/process the new bundle (consistent with S3 `GetObjectAcl` denial), so the environment remains on the sample app.
  - For version `b331bead3340801e53f0fe32c02c1c6f96979851`, the object ACL shows Bucket owner: Object=Read, Object ACL=Read+Write (FULL_CONTROL). After saving and redeploying, EB shows Running version = that SHA and events show deployment completed successfully.
  - Environment domain `/health` returns `{ "status": "ok", "uptime": <num> }` (200). Confirms our server is running.

### Tried
- Tracking started; items above verified.
 - Validated object ACL on latest artifact and redeployed that version; deployment succeeded and environment switched to the SHA.
- **2025-08-15**: Updated S3 bucket policy to include explicit `s3:GetObjectAcl` permissions for EB service role.
- **2025-08-15**: Removed ACL verification step from CI workflow (was causing CI user permission errors).
- **2025-08-15**: Manual ACL fixes work (proving the core issue is S3 permissions), but automated deployments still fail.

### Critical Findings (2025-08-15)
- **Manual ACL fix works**: When we manually set the ACL on an S3 object to give bucket owner FULL_CONTROL, EB can deploy it successfully.
- **CI upload ACL setting inconsistent**: The `--acl bucket-owner-full-control` flag in the CI workflow is not consistently setting the correct ACL.
- **Bucket policy correctly applied**: The S3 bucket policy includes the `AllowEBServiceRoleGetObjectAcl` statement for the Elastic Beanstalk service role.
- **GitHub secrets are correct**: `EB_S3_BUCKET` is set to `elasticbeanstalk-us-west-2-211125440777` as expected.
- **The issue is not with GitHub secrets**: The problem is specifically with S3 permissions during the EB deployment phase.
- **CI user permissions limited**: `rp-github-deployer` user can list bucket contents and upload objects, but cannot read bucket policy or object ACLs. This explains why the CI verification step failed.
- **Account mismatch resolved**: Local credentials were pointing to wrong AWS account (324645618426). Now using correct account (211125440777) with `rp-github-deployer` credentials.
- **EB environment service role issue**: The environment shows no service role (null), meaning it's using the default. Configuration access shows AccessDenied to `elasticbeanstalk-env-resources-us-west-2` bucket.
- **Service role correctly configured**: EB environment is using `aws-elasticbeanstalk-service-role` as confirmed in console. Additional role `rp-aws-elasticbeanstalk-service-role` exists but is not being used.
- **Service role permissions verified**: Both inline policies (`newPermission` and `ReadArtifactsForEB`) include `s3:GetObjectAcl` permissions for the correct S3 bucket. Permissions are correctly configured.
- **ACL setting verified**: Latest uploaded object has correct ACL (Object=Read, Object ACL=Read+Write). The `--acl bucket-owner-full-control` flag is working correctly in CI.
- **CI user permissions confirmed**: `rp-github-deployer` user lacks `s3:PutObjectAcl` permissions, confirming it can only upload with ACL flags but cannot modify ACLs after upload.

### Current Status Summary (2025-08-15)
**ALL PERMISSIONS VERIFIED AND CORRECT:**
- ✅ **Bucket policy**: Includes `AllowEBServiceRoleGetObjectAcl` statement for `aws-elasticbeanstalk-service-role`
- ✅ **Service role**: Environment uses `aws-elasticbeanstalk-service-role` 
- ✅ **Inline policies**: Both `newPermission` and `ReadArtifactsForEB` include `s3:GetObjectAcl` permissions
- ✅ **ACL setting**: Latest uploaded object has correct ACL (Object=Read, Object ACL=Read+Write)
- ✅ **CI workflow**: Uses `--acl bucket-owner-full-control` (explicit ACL setting step removed due to CI user permissions)

**DEPLOYMENT STATUS**: 
- ✅ **S3 upload phase**: Works correctly with `--acl bucket-owner-full-control`
- ❌ **EB deployment phase**: Still fails with `s3:GetObjectAcl` AccessDenied despite all permissions being correct

**INVESTIGATION IN PROGRESS**: 
- CloudTrail shows `CreateApplicationVersion` and `UpdateEnvironment` events succeed (triggered by `rp-github-deployer`)
- `s3:GetObjectAcl` events are **data events** not visible in default CloudTrail (only management events are logged)
- The `s3:GetObjectAcl` error happens **during the deployment process** after the API calls succeed
- **EC2 instance profile permissions verified**: Both inline policies (`readAcl` and `ReadEBArtifacts`) include `s3:GetObjectAcl` permissions

**BREAKTHROUGH FINDING**: The broader permissions revealed the real issue!
- **Principal**: `rp-github-deployer` (not service role or EC2 role)
- **Action**: `s3:PutObjectAcl` (not `s3:GetObjectAcl`)
- **Resource**: `resources/environments/e-2qegamu2wp/_runtime/_versions/risingpunk-api/*` (EB runtime directory, not our uploaded artifacts)

**ROOT CAUSE**: The CI user needs additional S3 permissions for the EB deployment process, not just upload permissions.

**PROGRESS**: 
- ✅ Fixed `s3:PutObjectAcl` on runtime directory
- ✅ Fixed `s3:GetBucketPolicy` on the bucket
- ✅ Fixed `s3:PutBucketPolicy` on the bucket
- ❌ Now failing on `autoscaling:SuspendProcesses` on the Auto Scaling Group

### Next Steps
1) **Add `s3:GetBucketPolicy` permission** to the `rp-github-deployer` user policy
2) **Continue adding permissions as needed** until deployment succeeds
3) **Remove the broad permission** from bucket policy once all targeted fixes are in place

4) Workflow hygiene
- Ensure the generated `Procfile` matches our server path: `web: node dist/server/server.js` (CI currently writes `web: node dist/server.js`; update it).
- Keep `aws-actions/configure-aws-credentials@v4` and `actions/setup-node@v4` (current as of Aug 2025). Ensure AWS CLI v2 is used (default on GitHub-hosted runners).

5) Manual redeploy test (console)
- In Application versions, select the latest SHA label and Deploy to `rp-staging-api`. If it immediately errors again with `GetObjectAcl`, proceed with steps 1–3 above.

### Step 1 details (console path)
1. Copy the latest version label (SHA) from EB → Application → Application versions (e.g., `b331bead...`). The artifact key format is `rp-api-<sha>.zip`.
2. Go to S3 → Buckets → `elasticbeanstalk-us-west-2-211125440777` → Objects. Use the search box to find `rp-api-<sha>.zip`.
3. Click the object → Permissions tab → Access control list (ACL) → Edit.
4. Under "Bucket owner (your AWS account)", ensure boxes are checked for:
   - Object: Read
   - Object ACL: Read, Write
   This equals FULL_CONTROL for the bucket owner.
5. Save changes.
6. Return to EB → Application → Application versions, select that SHA → Actions → Deploy → choose `rp-staging-api` → Deploy.

### Confirm it is our app (not sample)
1. In EB → Environments → `rp-staging-api`, click the Domain link.
2. Visit `/health` on that domain. Our API should return a 200 response with a simple health payload (not the HTML “Congratulations” sample page).
3. If you still see the sample HTML page, pull logs: Environments → `rp-staging-api` → Logs → Request last 100 lines, and check `/var/log/web.stdout.log` for our server start output. If absent, fix CI `Procfile` path and redeploy.

### Most likely culprit (rolling)
- Previously: S3 object ACL on uploaded artifacts likely lacked bucket owner FULL_CONTROL (triggered EB `s3:GetObjectAcl` AccessDenied). Current artifact has correct ACL and deploys.
- **2025-08-15 UPDATE**: Manual ACL fix works (proving the issue is S3 permissions), but CI/CD uploads still fail with `s3:GetObjectAcl` AccessDenied. Bucket policy was updated but permissions still not working for automated deployments.
- **Root cause analysis**: The `--acl bucket-owner-full-control` flag in CI upload is not consistently setting the correct ACL, or the bucket policy is not being applied correctly to the Elastic Beanstalk service role.
- Follow-up: Address EB event warning about Node.js version (platform default used instead of `package.json` engines); decide if we want to pin engines or ignore.

### Cross‑check vs guidance (Aug 2025)
- IAM policies: EB service role and EC2 role both include `s3:GetObjectAcl` via inline policies; CI user policy currently does not include `s3:GetObjectAcl` on EB bucket (not required for EB processing but noted).
- Bucket policy: no explicit Deny for `GetObjectAcl`; only Deny `DeleteBucket`.
- Object Ownership: `Bucket owner preferred` (ACLs enabled) — valid; retrieving ACLs should work if object ACL grants owner.
- Permissions boundary: not set on roles.
- Credentials: CI uses `rp-github-deployer` (confirmed in logs) in account `211125440777`.
- Add `.github/workflows/deploy-staging.yml` to deploy to EB (use AWS credentials action and EB deploy step; ensure IAM perms for `elasticbeanstalk:*` and `s3:PutObject` to the EB bucket).
- Reconfirm IAM policies on service role and instance profile match EB docs (enhanced health, managed updates, S3 access).
- If deployments fail on upload, confirm our CI role can write to `s3://elasticbeanstalk-us-west-2-211125440777/*` and call `CreateApplicationVersion` and `UpdateEnvironment`.
- Capture and review full JSON for `rp-eb-deploy-policy`; ensure at minimum: `elasticbeanstalk:CreateApplicationVersion`, `elasticbeanstalk:UpdateEnvironment`, `elasticbeanstalk:Describe*`, `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` on the EB bucket, and `iam:PassRole` only if we ever change roles via updates.
- Set GitHub Secrets for the workflow: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (from `rp-github-deployer`), `AWS_REGION=us-west-2`, `EB_APPLICATION_NAME`, `EB_ENVIRONMENT_NAME`, `EB_S3_BUCKET=elasticbeanstalk-us-west-2-211125440777`.
- Confirm Node.js platform stack version in EB and whether our build produces `dist` during deploy; if not, add a build step.
- Record EB Application name and Environment name exactly as shown in console for use in workflow.
- Note the EB platform (Node.js platform branch/version) and Node runtime so we can align build and engines.
- For the two roles above, confirm attached managed policies align with EB defaults (e.g., EC2 role includes web tier + enhanced health; service role includes enhanced health + managed updates); capture exact policy ARNs in this doc.
- Confirm the artifacts bucket `rp-eb-artifacts-usw2` exists and is referenced by the CI workflow (or switch to the EB service bucket consistently).
- Add GitHub workflow to upload bundle to the artifacts or EB bucket and call `CreateApplicationVersion` + `UpdateEnvironment` using `rp-github-deployer` secrets.
- Validate `EB_S3_BUCKET` matches the bucket we intend to upload to (either `rp-eb-artifacts-usw2` or `elasticbeanstalk-us-west-2-211125440777`).
 - Trigger a fresh deploy so the artifact is created after ACLs were enabled; expect the prior `GetObjectAcl` error to clear.
 - If any error persists, check CloudTrail for `GetObjectAcl` `AccessDenied` to see which principal and key were used.
 - Inspect ACL on latest object: `aws s3api get-object-acl --bucket elasticbeanstalk-us-west-2-211125440777 --key rp-api-<sha>.zip` and ensure a grant of `FULL_CONTROL` exists for the bucket owner canonical ID.
 - If missing, set explicitly: `aws s3api put-object-acl --bucket elasticbeanstalk-us-west-2-211125440777 --key rp-api-<sha>.zip --acl bucket-owner-full-control` and retry `update-environment`.
 - Add explicit bucket policy Allow for service role to `s3:GetObjectAcl` on `arn:aws:s3:::elasticbeanstalk-us-west-2-211125440777/*` to remove ambiguity.
 - Reconfirm the EB environment is using service role `aws-elasticbeanstalk-service-role` (same ARN we edited) in Environment → Configuration → Service access.

