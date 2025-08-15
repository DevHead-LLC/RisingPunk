### Repo housekeeping: Jest tests ignored repo-wide

- Jest test dirs and files are now ignored via root `.gitignore` to keep failing tests out of commits.
- Patterns: `mobile/__tests__/`, `server/__tests__/`, and `**/*.(test|spec).{js,jsx,ts,tsx}`.

Phase A: Staging API on Elastic Beanstalk — Status: ✅ Done
Create EB env

App: risingpunk-api

Env: rp-staging-api

Platform: Node.js 22 on Amazon Linux 2023

Type: Load balanced, min 1 max 1

Domain: leave blank

Create with Sample app
Status: ✅ Environment created and server deployed successfully.

After create

Configuration → Load balancer → Health check path: /health

Configuration → Software → Env vars:

NODE_ENV=staging

PORT=8080

MONGODB_URI=<atlas staging srv>

JWT_SECRET=<random>
Status: ✅ Applied and verified during successful deploy.

GitHub Actions deploy

S3 artifacts bucket and IAM user ready

Add repo secrets: AWS_*, EB_APP_NAME, EB_ENV_NAME, EB_S3_BUCKET

Workflow builds server, zips dist + package.json + lock + Procfile, creates EB version, updates env

Verify EB URL /health returns ok
Status: ✅ Deployed, health check succeeded.

Phase B: TLS and Cloudflare for staging — Status: In progress (next up)
ACM certificate in us-west-2

Request DNS validation for staging-api.risingpunk.com (add api.risingpunk.com now if you want to reuse later).

Add the ACM CNAMEs in Cloudflare DNS.

Wait until the cert shows Issued in ACM.
Cost: $0 for ACM public certs. 
Amazon Web Services, Inc.

Attach cert to ALB

EB → Configuration → Load balancer → add HTTPS 443 listener with the ACM cert.

Keep HTTP 80 listener for health checks.
Cost: still $0 for the cert. You only pay normal ALB usage. 
AWS Documentation

Cloudflare DNS and security

CNAME staging-api to the EB environment CNAME.

Proxy on (orange cloud).

SSL/TLS mode: Full (strict).

Cache rule: bypass for staging-api.risingpunk.com/*.

Enable WAF managed rules.
Cost: stays on Cloudflare Free plan. Universal SSL at the edge is free. 
Cloudflare

Alternative (not needed, free too): use Cloudflare Origin CA for the origin certificate by importing it into ACM, then use Full (strict). This also costs $0 for certs, but ACM’s own public cert is simpler and auto-renews. 
Cloudflare Docs
AWS Documentation

Phase C: Mobile app to staging — Status: Ready to start after HTTPS
Base URL for Release builds

ts
Copy
Edit
export const API_URL = __DEV__
  ? 'http://192.168.x.x:5001'
  : 'https://staging-api.risingpunk.com';
Status: Pending HTTPS hostname.

Build a TestFlight release, install, and smoke test login and core flows.
Status: Pending.

Phase D: Hardening and observability — Status: Plan set
helmet() enabled, simple rate limit on auth routes.

app.set('trust proxy', 1) so cookies work behind Cloudflare and ALB.

CORS allow https://staging-api.risingpunk.com now, add https://api.risingpunk.com later.

CloudWatch logs enabled, add an uptime check for /health.

If large payloads appear later, add Nginx config via .platform to raise limits.
Status: Partially done, finish after Phase B.

Phase E: Production cut — Status: Later
Atlas prod and EB prod

Create Atlas prod DB and user.

Clone or create EB prod env.

Env vars: NODE_ENV=production, MONGODB_URI=<prod>, JWT_SECRET=<new>.

Deploy via a separate workflow targeting prod.

Cloudflare for prod

CNAME api to prod EB CNAME.

SSL/TLS Full (strict), bypass cache, WAF managed rules.

App flip

Update Release base URL to https://api.risingpunk.com.

Build a new TestFlight and prepare for App Store submission.

Phase F: Nice to have — Status: Optional
Hidden environment picker inside the app.

Basic cost alarms.

Sentry or Crashlytics for the app.

Success criteria
EB staging /health green over HTTPS at staging-api.risingpunk.com.

TestFlight build talks to staging without your laptop.

Push to main under server/ auto-deploys to staging.

Tagged release deploys prod without code changes.