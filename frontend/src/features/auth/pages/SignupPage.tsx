import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="w-4 h-4">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const SignupPage = () => {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const success = await register({
      name: name.trim(),
      email,
      password,
      role,
      invite_code: role === "teacher" ? inviteCode : undefined,
      roll_no: role === "student" ? rollNo : undefined,
    });
    if (success) navigate("/dashboard");
  };

  return (
    <div className="signup-content">
      <div className="signup-title-row flex items-center justify-between gap-4">
        <h1 className="font-display font-bold text-h1 text-headings tracking-tight">Create Account</h1>
        <div className="signup-role-switch flex p-1 bg-secondary rounded-full" aria-label="Account type">
          <button type="button" className={`px-4 py-1.5 rounded-full text-button font-button transition-all ${role === "student" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setRole("student")}>Student</button>
          <button type="button" className={`px-4 py-1.5 rounded-full text-button font-button transition-all ${role === "teacher" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setRole("teacher")}>Faculty</button>
        </div>
      </div>
      <p className="text-body text-muted-foreground mb-4">Register as a Student or Faculty member to get started.</p>

      <form onSubmit={handleRegister} className="signup-form space-y-3.5">
        <label className="signup-field block">
          <span className="sr-only">Full Name</span>
          <input className="font-sans text-input" placeholder="Full Name (e.g. Dr. Jane Smith)" value={name} onChange={(event) => setName(event.target.value)} required disabled={isLoading} />
        </label>
        <label className="signup-field block">
          <span className="sr-only">University Email Address</span>
          <input className="font-sans text-input" type="email" placeholder="University Email (e.g. name@university.edu)" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} />
        </label>
        <label className="signup-field signup-password-field block">
          <span className="sr-only">Password</span>
          <input className="font-sans text-input" type={showPassword ? "text" : "password"} placeholder="Create a secure password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} />
          <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((visible) => !visible)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </label>
        {role === "student" ? (
          <label className="signup-field signup-optional-field block">
            <span className="sr-only">Student ID / Roll Number</span>
            <input className="font-sans text-input font-mono tabular" placeholder="Student ID / Roll Number (optional)" value={rollNo} onChange={(event) => setRollNo(event.target.value)} disabled={isLoading} />
          </label>
        ) : (
          <label className="signup-field signup-optional-field block">
            <span className="sr-only">Faculty Access Code</span>
            <input className="font-sans text-input font-mono tabular" placeholder="Faculty Access Code (e.g. INST-STANFORD-2026)" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} required disabled={isLoading} />
          </label>
        )}
        <label className="signup-consent flex items-start gap-3 text-small font-medium text-muted-foreground">
          <input type="checkbox" className="mt-1 accent-primary" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required />
          <span className="leading-relaxed">I agree to the <a href="#terms" className="text-primary hover:underline">Terms of Service</a> and <a href="#privacy" className="text-primary hover:underline">Academic Integrity Policy</a></span>
        </label>
        <button type="submit" className="signup-submit w-full h-11 rounded-full bg-primary text-primary-foreground font-button text-button transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-95 flex items-center justify-center" disabled={isLoading || !agreed}>
          {isLoading ? <Loader2 className="signup-spinner animate-spin" /> : "Create Account"}
        </button>
      </form>

      <div className="signup-divider flex items-center gap-4 my-6 text-caption font-medium text-muted-foreground">
        <span className="flex-1 h-px bg-border"></span>
        <span>Or sign up with</span>
        <span className="flex-1 h-px bg-border"></span>
      </div>

      <button
        type="button"
        aria-label="Sign up with Google"
        onClick={() => window.google?.accounts?.id?.prompt?.()}
        className="w-full h-11 rounded-full border border-border bg-card hover:bg-secondary/60 text-foreground font-medium text-small flex items-center justify-center gap-2.5 transition-colors shadow-2xs"
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          <GoogleIcon />
        </div>
        <span>Sign up with Google</span>
      </button>

      <p className="signup-login-link text-center mt-6 text-small font-medium text-muted-foreground">
        Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
};
