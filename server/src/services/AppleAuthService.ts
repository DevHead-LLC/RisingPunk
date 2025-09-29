import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } from '../config/env';

export class AppleAuthService {
  private static client: jwksClient.JwksClient;
  private static isInitialized = false;

  static initialize(): void {
    const teamId = APPLE_TEAM_ID;
    const keyId = APPLE_KEY_ID;
    const clientId = APPLE_CLIENT_ID;
    
    console.log('🍎 ASI Server: Initializing Apple Auth Service');
    console.log('🍎 ASI Server: APPLE_TEAM_ID found:', !!teamId);
    console.log('🍎 ASI Server: APPLE_KEY_ID found:', !!keyId);
    console.log('🍎 ASI Server: APPLE_CLIENT_ID found:', !!clientId);
    
    if (!teamId || !keyId || !clientId) {
      console.warn('🔴 ASI Server: Apple Sign-In environment variables not set. Apple Sign-In will be disabled.');
      return;
    }
    
    this.client = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
    
    this.isInitialized = true;
    console.log('🍎 ASI Server: Apple Auth Service initialized successfully');
  }

  static isEnabled(): boolean {
    return this.isInitialized && !!this.client;
  }

  static async verifyToken(idToken: string): Promise<{
    appleId: string;
    email?: string;
    name?: string;
  } | null> {
    if (!this.isEnabled()) {
      console.log('🔴 ASI Server: Apple Auth Service not initialized');
      return null;
    }

    try {
      console.log('🍎 ASI Server: Verifying Apple token');
      
      // Decode the token header to get the key ID
      const decodedHeader = jwt.decode(idToken, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string') {
        console.log('🔴 ASI Server: Invalid token format');
        return null;
      }

      const { kid } = decodedHeader.header;
      if (!kid) {
        console.log('🔴 ASI Server: No key ID in token header');
        return null;
      }

      console.log('🍎 ASI Server: Token key ID:', kid);

      // Get the public key from Apple's JWKS
      const key = await this.client.getSigningKey(kid);
      const publicKey = key.getPublicKey();

      console.log('🍎 ASI Server: Got public key from Apple JWKS');

      // Verify the token
      const decoded = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: APPLE_CLIENT_ID,
        issuer: 'https://appleid.apple.com',
      }) as any;

      console.log('🍎 ASI Server: Token verified successfully');
      console.log('🍎 ASI Server: Token subject (Apple ID):', decoded.sub);
      console.log('🍎 ASI Server: Token email:', decoded.email);

      // Extract user information
      const appleId = decoded.sub;
      const email = decoded.email || undefined;
      const name = decoded.name ? `${decoded.name.firstName || ''} ${decoded.name.lastName || ''}`.trim() : undefined;

      return {
        appleId,
        email,
        name,
      };
    } catch (error) {
      console.error('🔴 ASI Server: Apple token verification failed:', error);
      return null;
    }
  }
}
