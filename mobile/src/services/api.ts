import { API_URL } from '../config';

export interface LoginResponse {
  token: string;
  user: {
    handle: string;
    email: string;
    level: number;
    unlockedFeatures: {
      hackRig: boolean;
    };
  };
}

export const api = {
  register: async (credentials: { email: string; handle: string; accessKey: string }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.error || 'Registration failed');
        } catch (jsonError) {
          // Handle case where response is not valid JSON
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
      }

      try {
        const data = await response.json();
        return data as LoginResponse;
      } catch (jsonError) {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      // Handle network errors (like connection refused)
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Network error: Cannot connect to server');
      }
      throw error;
    }
  },

  login: async (credentials: { handle: string; accessKey: string }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.error || 'Login failed');
        } catch (jsonError) {
          // Handle case where response is not valid JSON
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
      }

      try {
        const data = await response.json();
        return data as LoginResponse;
      } catch (jsonError) {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      // Handle network errors (like connection refused)
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Network error: Cannot connect to server');
      }
      throw error;
    }
  },
}; 