export const API_URL = 'http://localhost:3001';

export interface LoginResponse {
  token: string;
  user: {
    handle: string;
    email: string;
    level: number;
  };
}

export type BotType = 'breacher' | 'guardian' | 'phreak';

export interface BotCounts {
  breacher: number;
  guardian: number;
  phreak: number;
}

export const api = {
  register: async (credentials: { email: string; handle: string; accessKey: string }) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    return response.json() as Promise<LoginResponse>;
  },

  login: async (credentials: { handle: string; accessKey: string }) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json() as Promise<LoginResponse>;
  },
};

export const updateBotCount = async (
  token: string,
  botType: BotType,
  quantity: number
): Promise<BotCounts> => {
  try {
    const response = await fetch(`${API_URL}/api/army/update-bots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ botType, quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update bot count');
    }

    return await response.json();
  } catch (error) {
    console.error('Update bot count error:', error);
    throw error;
  }
};

export const getArmyStatus = async (token: string): Promise<BotCounts> => {
  try {
    const response = await fetch(`${API_URL}/api/army/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch army status');
    }

    return await response.json();
  } catch (error) {
    console.error('Get army status error:', error);
    throw error;
  }
}; 