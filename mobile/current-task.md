Got you. Here is the tight end-to-end plan from right now through TestFlight and then to production, optimized to avoid rework.

# Phase A: Staging API on Elastic Beanstalk

1. Create EB env

* App: risingpunk-api
* Env: rp-staging-api
* Platform: Node.js 22 on Amazon Linux 2023
* Type: Load balanced, min 1 max 1
* Domain: leave blank
* Create with Sample app

2. After create

* Configuration → Load balancer → Health check path: `/health`
* Configuration → Software → Env vars:

  * `NODE_ENV=staging`
  * `PORT=8080`
  * `MONGODB_URI=<atlas staging srv>`
  * `JWT_SECRET=<random>`

3. GitHub Actions deploy

* S3 artifacts bucket and IAM user ready
* Add repo secrets: `AWS_*`, `EB_APP_NAME`, `EB_ENV_NAME`, `EB_S3_BUCKET`
* Workflow builds `server`, zips `dist + package.json + lock + Procfile`, creates EB version, updates env
* Verify EB URL `/health` returns ok

# Phase B: TLS and Cloudflare for staging

1. ACM certificate in same region as EB

* Request DNS validation for: `staging-api.risingpunk.com`, `api.risingpunk.com`
* Add ACM CNAMEs in Cloudflare DNS
* Wait until Issued

2. Attach cert to ALB

* EB → Load balancer → add HTTPS 443 listener with ACM cert
* Keep HTTP 80 listener. Health checks on 80 are fine

3. Cloudflare DNS and security

* CNAME `staging-api` to EB CNAME
* Orange cloud on
* SSL/TLS mode Full (strict)
* Cache rule: bypass for `staging-api.risingpunk.com/*`
* Turn on WAF managed rules. Turn off features that mutate responses on this host

# Phase C: Mobile app to staging

1. Base URL for Release builds

```
export const API_URL = __DEV__
  ? 'http://192.168.x.x:5001'
  : 'https://staging-api.risingpunk.com';
```

2. Build TestFlight Build 2. Install. Smoke test login and core flows

# Phase D: Hardening and observability

* `helmet()` already in place
* Simple rate limit on auth routes
* `app.set('trust proxy', 1)` for Secure cookies behind CF+ALB
* CORS allow `https://staging-api.risingpunk.com` and later `https://api.risingpunk.com`
* CloudWatch logs enabled. Add an uptime check for `/health`
* If large payloads later, add Nginx config via `.platform` to raise limits

# Phase E: Production cut

1. Atlas prod and EB prod

* Create Atlas prod DB and user
* Clone EB env to rp-prod-api or create new
* Env vars: `NODE_ENV=production`, `MONGODB_URI=<prod>`, `JWT_SECRET=<new>`
* Deploy via a second Actions workflow that targets prod env

2. Cloudflare for prod

* CNAME `api` to prod EB CNAME
* Full (strict), bypass cache, WAF managed rules

3. App flip

* Update Release base URL to `https://api.risingpunk.com`
* Build 3 for TestFlight. Then App Store submission when ready

# Phase F: Nice to have but optional

* Hidden environment picker inside the app for quick switching
* Basic cost alarms. t3.micro is fine for now
* Sentry or Crashlytics for the app

# Success criteria

* EB staging `/health` green over HTTPS at `staging-api.risingpunk.com`
* TestFlight Build 2 talks to staging without your laptop running
* A push to main under `server/` auto deploys to staging
* Later, a tagged release deploys prod without changes to code

Tell me when your EB env is created and I will guide the ACM request and Cloudflare DNS step.
