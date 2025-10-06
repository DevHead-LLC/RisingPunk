import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID } from '../config/env';

export class GoogleAuthService {
  private static client: OAuth2Client;

  static initialize(): void {
    const clientId = GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID not set. Google Sign-In will be disabled.');
      return;
    }
    
    this.client = new OAuth2Client(clientId);
  }

  static async verifyToken(idToken: string): Promise<{
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  } | null> {
    
    if (!this.client) {
      console.error('Google Auth Service not initialized');
      throw new Error('Google Auth Service not initialized');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return null;
      }

      
      return {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || '',
        picture: payload.picture
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      return null;
    }
  }

  static isEnabled(): boolean {
    return !!this.client;
  }
}
