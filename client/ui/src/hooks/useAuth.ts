import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  username: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    username: null,
  });

  useEffect(() => {
    // Check for existing session via /api/v1/auth/me
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          return res.json() as Promise<{ id: string; username: string }>;
        }
        throw new Error('Not authenticated');
      })
      .then((user) => {
        setState({
          isAuthenticated: true,
          isLoading: false,
          userId: user.id,
          username: user.username,
        });
      })
      .catch(() => {
        setState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          username: null,
        });
      });
  }, []);

  return state;
}
