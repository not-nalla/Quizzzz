import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Role } from "@/types";
import { authApi } from "@/api/client";
import { toast } from "sonner";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    invite_code?: string;
    roll_no?: string;
    department?: string;
  }) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
  initFromToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password });
          const { user, access_token, refresh_token } = res.data;

          localStorage.setItem("syllabusiq_access_token", access_token);
          localStorage.setItem("syllabusiq_refresh_token", refresh_token);

          const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as Role,
            department: user.department,
            rollNo: user.roll_no,
          };

          set({ user: mappedUser, isAuthenticated: true, token: access_token, isLoading: false });
          return true;
        } catch (err: any) {
          set({ isLoading: false });
          const msg = err?.response?.data?.detail || "Login failed. Please check your credentials.";
          toast.error("Login Failed", { description: msg });
          return false;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register({
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            invite_code: data.invite_code,
            roll_no: data.roll_no,
          });
          const { user, access_token, refresh_token } = res.data;

          localStorage.setItem("syllabusiq_access_token", access_token);
          localStorage.setItem("syllabusiq_refresh_token", refresh_token);

          const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as Role,
            department: user.department,
            rollNo: user.roll_no,
          };

          set({ user: mappedUser, isAuthenticated: true, token: access_token, isLoading: false });
          return true;
        } catch (err: any) {
          set({ isLoading: false });
          const msg = err?.response?.data?.detail || "Registration failed. Please try again.";
          toast.error("Registration Failed", { description: msg });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem("syllabusiq_access_token");
        localStorage.removeItem("syllabusiq_refresh_token");
        set({ user: null, isAuthenticated: false, token: null });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      initFromToken: async () => {
        const token = localStorage.getItem("syllabusiq_access_token");
        if (!token || get().isAuthenticated) return;
        try {
          const res = await authApi.getMe();
          const user = res.data;
          const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as Role,
            department: user.department,
            rollNo: user.roll_no,
          };
          set({ user: mappedUser, isAuthenticated: true, token });
        } catch {
          localStorage.removeItem("syllabusiq_access_token");
          localStorage.removeItem("syllabusiq_refresh_token");
          set({ user: null, isAuthenticated: false, token: null });
        }
      },
    }),
    {
      name: "syllabusiq-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
