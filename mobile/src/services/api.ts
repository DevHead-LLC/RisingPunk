const API_URL = 'http://localhost:3001/api';

export interface LoginResponse {
  token: string;
  user: {
    handle: string;
    email: string;
    level: number;
  };
}

export const api = {
  register: async (credentials: { email: string; handle: string; accessKey: string }) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json() as Promise<LoginResponse>;
  },

  login: async (credentials: { handle: string; accessKey: string }) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json() as Promise<LoginResponse>;
  },
}; 