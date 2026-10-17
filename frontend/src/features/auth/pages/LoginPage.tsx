import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi } from "@/api/client";
import { toast } from "sonner";

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="#E1306C" stroke="none" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="#1DA1F2" aria-hidden="true">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
);

export const LoginPage = () => {
  const [role] = useState<"student" | "teacher">("teacher");
  const [email, setEmail] = useState("e.vance@stanford.edu");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const success = await login(email, password);
    if (success) navigate("/dashboard");
  };

  useEffect(() => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
      callback: async ({ credential }) => {
        if (!credential) return;
        try {
          const response = await authApi.googleAuth({
            id_token: credential,
            role,
            invite_code: role === "teacher" ? "INST-STANFORD-2026" : undefined,
          });
          const { user, access_token, refresh_token } = response.data;
          localStorage.setItem("syllabusiq_access_token", access_token);
          localStorage.setItem("syllabusiq_refresh_token", refresh_token);
          const { setUser } = useAuthStore.getState();
          setUser({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as "teacher" | "student",
            department: user.department,
            rollNo: user.roll_no,
          });
          navigate("/dashboard");
        } catch (error: any) {
          toast.error("Google sign-in failed", { description: error?.response?.data?.detail || "Please try again." });
        }
      },
    });
  }, [navigate, role]);

  return (
    <div className="signup-content">
      <div className="signup-title-row">
        <h1 className="font-display font-bold text-h1 text-headings">Sign in to SyllabusIQ</h1>
      </div>
      <p className="text-body text-muted-foreground mb-3">Welcome back — enter your credentials to continue.</p>

      <form onSubmit={handleLogin} className="signup-form space-y-3">
        <label className="signup-field block">
          <span className="sr-only">Email Address</span>
          <input
            type="email"
            placeholder="Email Address"
            className="font-sans text-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isLoading}
          />
        </label>

        <label className="signup-field signup-password-field block">
          <span className="sr-only">Password</span>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="font-sans text-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isLoading}
          />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </label>

        <div className="login-options flex items-center justify-between text-small font-medium text-muted-foreground">
          <label className="login-remember flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
            <input type="checkbox" className="accent-primary" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <span>Remember me</span>
          </label>
          <Link to="/signup" className="login-forgot text-primary hover:underline">Forgot password?</Link>
        </div>

        <button type="submit" className="signup-submit w-full h-12 rounded-full bg-primary text-primary-foreground font-button text-button transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-95" disabled={isLoading}>
          {isLoading ? <Loader2 className="signup-spinner animate-spin" /> : "Sign In"}
        </button>
      </form>

      <div className="signup-divider flex items-center gap-4 my-8 text-caption font-medium text-muted-foreground">
        <span className="flex-1 h-px bg-border"></span>
        <span>Or sign in with</span>
        <span className="flex-1 h-px bg-border"></span>
      </div>

      <div className="signup-socials login-socials flex justify-center gap-3">
        <button type="button" aria-label="Sign in with Google" onClick={() => window.google?.accounts?.id?.prompt?.()} className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-slate-50 transition-colors"><GoogleIcon /></button>
        <button type="button" aria-label="Sign in with Facebook" className="login-social-facebook w-11 h-11 rounded-full border border-border flex items-center justify-center text-blue-600 font-bold hover:bg-blue-50 transition-colors">f</button>
        <button type="button" aria-label="Sign in with Instagram" className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-pink-50 transition-colors"><InstagramIcon /></button>
        <button type="button" aria-label="Sign in with Twitter" className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-blue-50 transition-colors"><TwitterIcon /></button>
        <button type="button" aria-label="Sign in with LinkedIn" className="login-social-linkedin w-11 h-11 rounded-full border border-border flex items-center justify-center bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors">in</button>
      </div>

      <p className="signup-login-link text-center mt-8 text-small font-medium text-muted-foreground">
        Don't have an account? <Link to="/signup" className="text-primary font-semibold hover:underline">Sign up</Link>
      </p>
    </div>
  );
};
