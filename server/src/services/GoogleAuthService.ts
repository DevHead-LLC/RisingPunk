import { OAuth2Client } from 'google-auth-library';

export class GoogleAuthService {
  private static client: OAuth2Client;

  static initialize(): void {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    console.log('🔵 GSI Server: Initializing Google Auth Service');
    console.log('🔵 GSI Server: GOOGLE_CLIENT_ID found:', !!clientId);
    console.log('🔵 GSI Server: GOOGLE_CLIENT_ID value:', clientId);
    
    if (!clientId) {
      console.warn('🔴 GSI Server: GOOGLE_CLIENT_ID not set. Google Sign-In will be disabled.');
      return;
    }
    
    this.client = new OAuth2Client(clientId);
    console.log('🔵 GSI Server: Google Auth Service initialized successfully');
  }

  static async verifyToken(idToken: string): Promise<{
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  } | null> {
    console.log('🔵 GSI Server: Verifying Google token');
    console.log('🔵 GSI Server: Token length:', idToken?.length);
    
    if (!this.client) {
      console.error('🔴 GSI Server: Google Auth Service not initialized');
      throw new Error('Google Auth Service not initialized');
    }

    try {
      console.log('🔵 GSI Server: Calling Google OAuth2Client.verifyIdToken');
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      console.log('🔵 GSI Server: Token verification successful, getting payload');
      const payload = ticket.getPayload();
      if (!payload) {
        console.log('🔴 GSI Server: No payload in verified token');
        return null;
      }

      console.log('🔵 GSI Server: Token payload extracted successfully');
      console.log('🔵 GSI Server: User email:', payload.email);
      console.log('🔵 GSI Server: User name:', payload.name);
      
      return {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || '',
        picture: payload.picture
      };
    } catch (error) {
      console.error('🔴 GSI Server: Google token verification failed:', error);
      return null;
    }
  }

  static isEnabled(): boolean {
    return !!this.client;
  }
}
