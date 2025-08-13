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
  - EB events previously showed `You do not have permission to perform 's3:GetObjectAcl'` during deploy; logs/health otherwise OK. ACLs now enabled; both roles have `s3:GetObjectAcl`.

### Tried
- Tracking started; items above verified.

### To‑try
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

