import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../services/api";

export type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  date_joined: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

type TokenResponse = {
  access: string;
  refresh: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchCurrentUser(token: string): Promise<User> {
  const response = await api.get<User>("users/me/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function login(username: string, password: string) {
    const response = await api.post<TokenResponse>("token/", {
      username,
      password,
    });

    const { access, refresh } = response.data;

    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);

    try {
      const currentUser = await fetchCurrentUser(access);
      setUser(currentUser);
    } catch (error) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      throw error;
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(token);

        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
