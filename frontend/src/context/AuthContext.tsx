
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../services/api";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  date_joined: string;
}

interface TokenResponse {
  access: string;
  refresh: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    const response = await api.get<User>("users/me/");
    setUser(response.data);
    return response.data;
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await api.post<TokenResponse>(
        "token/",
        {
          username,
          password,
        }
      );

      localStorage.setItem(
        "access_token",
        response.data.access
      );

      localStorage.setItem(
        "refresh_token",
        response.data.refresh
      );

      try {
        await fetchCurrentUser();
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [fetchCurrentUser, clearSession]
  );

  const logout = useCallback(() => {
    clearSession();
    window.location.assign("/login");
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    const initializeSession = async () => {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (!accessToken && !refreshToken) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        await fetchCurrentUser();
      } catch {
        clearSession();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      active = false;
    };
  }, [fetchCurrentUser, clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
}
