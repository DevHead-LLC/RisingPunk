import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID } from '../config/env';

export class GoogleAuthService {
  private static client: OAuth2Client;
  private static allowedClientIds: string[];

  static initialize(): void {
    const clientId = GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID not set. Google Sign-In will be disabled.');
      return;
    }
    
    this.client = new OAuth2Client(clientId);
    
    // Allow iOS, Android, and Web client IDs
    this.allowedClientIds = [
      clientId, // iOS client ID (existing)
      '213914599866-kp888124r46si64s764mvft70649sbh4.apps.googleusercontent.com', // Android client ID
      '213914599866-t8gaip17no3h323d71njchb4hbs3csco.apps.googleusercontent.com' // Web client ID
    ];
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

    // Try each allowed client ID until one works
    for (const clientId of this.allowedClientIds) {
      try {
        const ticket = await this.client.verifyIdToken({
          idToken,
          audience: clientId
        });

        const payload = ticket.getPayload();
        if (!payload) {
          continue; // Try next client ID
        }

        return {
          googleId: payload.sub,
          email: payload.email!,
          name: payload.name || '',
          picture: payload.picture
        };
      } catch (error) {
        // Try next client ID
        continue;
      }
    }

    console.error('Google token verification failed with all client IDs');
    return null;
  }

  static isEnabled(): boolean {
    return !!this.client;
  }
}
