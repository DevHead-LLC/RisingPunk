import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } from '../config/env';

export class AppleAuthService {
  private static client: jwksClient.JwksClient;
  private static isInitialized = false;

  static initialize(): void {
    const clientId = APPLE_CLIENT_ID;
    
    
    if (!clientId) {
      console.error('APPLE_CLIENT_ID not set. Apple Sign-In will be disabled.');
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
      return null;
    }

    try {
      
      // Decode the token header to get the key ID
      const decodedHeader = jwt.decode(idToken, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string') {
        return null;
      }

      const { kid } = decodedHeader.header;
      if (!kid) {
        return null;
      }


      // Get the public key from Apple's JWKS
      const key = await this.client.getSigningKey(kid);
      const publicKey = key.getPublicKey();


      // Verify the token
      const decoded = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: APPLE_CLIENT_ID,
        issuer: 'https://appleid.apple.com',
      }) as any;


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
      console.error('Apple token verification failed:', error);
      return null;
    }
  }
}
