import { Request, Response, NextFunction } from 'express';
import { ActivityAggregationService } from '../services/ActivityAggregationService';

interface AuthenticatedRequest {
  user?: { _id: string };
  path: string;
  method: string;
  headers: any;
  connection: any;
  socket: any;
}

interface LoggingData {
  userId: string; // Always required now
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  endpoint: string;
  method: string;
  action: string;
  gameAction?: {
    type: 'battle' | 'movement' | 'purchase' | 'login' | 'logout' | 'api_call';
    details?: any;
  };
}

const getClientIP = (req: AuthenticatedRequest): string => {
  // Check for forwarded IP from proxy/load balancer
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  // Check for real IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }
  
  // Fallback to connection IP
  return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
};

const getDeviceId = (req: AuthenticatedRequest): string => {
  // Check for device ID in headers (set by mobile app)
  const deviceId = req.headers['x-device-id'];
  if (deviceId) {
    return Array.isArray(deviceId) ? deviceId[0] : deviceId;
  }
  
  // Fallback to user agent hash for web clients
  const userAgent = req.headers['user-agent'] || 'unknown';
  return Buffer.from(userAgent).toString('base64').substring(0, 16);
};

const determineGameAction = (req: AuthenticatedRequest): { type: 'battle' | 'movement' | 'purchase' | 'login' | 'logout' | 'api_call'; details?: any } | undefined => {
  const path = req.path;
  const method = req.method;
  
  // Login/logout actions
  if (path.includes('/auth/login') && method === 'POST') {
    return { type: 'login' };
  }
  if (path.includes('/auth/logout') && method === 'POST') {
    return { type: 'logout' };
  }
  
  // Battle actions
  if (path.includes('/battle') && method === 'POST') {
    return { type: 'battle', details: { action: 'battle_action' } };
  }
  
  // Movement actions
  if (path.includes('/player-position') && method === 'POST') {
    return { type: 'movement', details: { action: 'position_update' } };
  }
  
  // Purchase actions (future)
  if (path.includes('/purchase') && method === 'POST') {
    return { type: 'purchase', details: { action: 'item_purchase' } };
  }
  
  // General API calls
  return { type: 'api_call', details: { endpoint: path, method } };
};

const determineAction = (req: AuthenticatedRequest): string => {
  const path = req.path;
  const method = req.method;
  
  if (path.includes('/auth')) return 'authentication';
  if (path.includes('/battle')) return 'battle_management';
  if (path.includes('/map')) return 'map_interaction';
  if (path.includes('/bots')) return 'bot_management';
  if (path.includes('/balance')) return 'balance_check';
  if (path.includes('/research')) return 'research_management';
  
  return 'general_api';
};

export const activityLogging = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Skip logging for health checks and non-API routes
    if (req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/documents/')) {
      next();
      return;
    }
    
    // Allow authentication endpoints through (login, register, refresh)
    if (req.path.startsWith('/api/auth/')) {
      next();
      return;
    }
    
    // For protected routes, we need to log AFTER the response is sent
    // because the auth middleware runs after this middleware
    const originalSend = res.send;
    res.send = function(data) {
      // Log activity after response is sent
      setTimeout(async () => {
        try {
          if (req.user?._id) {
            // Add to aggregation service instead of individual logs
            ActivityAggregationService.addActivity({
              userId: req.user._id,
              ipAddress: getClientIP(req),
              deviceId: getDeviceId(req),
              userAgent: req.headers['user-agent'] || 'unknown',
              endpoint: req.path,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('❌ Post-response activity logging error:', error);
        }
      }, 0);
      
      return originalSend.call(this, data);
    };
  } catch (error) {
    console.error('❌ Activity logging setup error:', error);
  }
  
  next();
};
