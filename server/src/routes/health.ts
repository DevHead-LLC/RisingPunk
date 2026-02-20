import { Router } from 'express';
import { MIN_APP_VERSION, RECOMMENDED_APP_VERSION } from '../config/env';

const router = Router();

function healthPayload() {
  const payload: { status: string; uptime?: number; minAppVersion?: string; recommendedAppVersion?: string } = {
    status: 'ok',
    uptime: Math.round(process.uptime()),
  };
  if (MIN_APP_VERSION) payload.minAppVersion = MIN_APP_VERSION;
  if (RECOMMENDED_APP_VERSION) payload.recommendedAppVersion = RECOMMENDED_APP_VERSION;
  return payload;
}

router.get('/', (_req, res) => {
  res.json(healthPayload());
});

router.get('/health', (_req, res) => {
  res.json(healthPayload());
});

export default router;