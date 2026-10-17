import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

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
          <button type="button" className={`px-4 py-1.5 rounded-full text-button font-button transition-all ${role === "teacher" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setRole("teacher")}>Teacher</button>
        </div>
      </div>
      <form onSubmit={handleRegister} className="signup-form space-y-4">
        <label className="signup-field block">
          <span className="sr-only">Full Name</span>
          <input className="font-sans text-input" placeholder="Full Name" value={name} onChange={(event) => setName(event.target.value)} required disabled={isLoading} />
        </label>
        <label className="signup-field block">
          <span className="sr-only">Email Address</span>
          <input className="font-sans text-input" type="email" placeholder="Email Address" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} />
        </label>
        <label className="signup-field signup-password-field block">
          <span className="sr-only">Password</span>
          <input className="font-sans text-input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} />
          <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((visible) => !visible)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </label>
        {role === "student" ? (
          <label className="signup-field signup-optional-field block">
            <span className="sr-only">Roll Number</span>
            <input className="font-sans text-input font-mono tabular" placeholder="Roll Number (optional)" value={rollNo} onChange={(event) => setRollNo(event.target.value)} disabled={isLoading} />
          </label>
        ) : (
          <label className="signup-field signup-optional-field block">
            <span className="sr-only">Institutional Invite Code</span>
            <input className="font-sans text-input font-mono tabular" placeholder="Institutional Invite Code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} required disabled={isLoading} />
          </label>
        )}
        <label className="signup-consent flex items-start gap-3 text-small font-medium text-muted-foreground">
          <input type="checkbox" className="mt-1 accent-primary" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required />
          <span className="leading-relaxed">I agree to the <a href="#terms" className="text-primary hover:underline">terms of service</a> and <a href="#privacy" className="text-primary hover:underline">privacy policy</a></span>
        </label>
        <button type="submit" className="signup-submit w-full h-12 rounded-full bg-primary text-primary-foreground font-button text-button transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-95" disabled={isLoading || !agreed}>
          {isLoading ? <Loader2 className="signup-spinner animate-spin" /> : "Sign Up"}
        </button>
      </form>
      <div className="signup-divider flex items-center gap-4 my-8 text-caption font-medium text-muted-foreground">
        <span className="flex-1 h-px bg-border"></span>
        <span>Or sign up with</span>
        <span className="flex-1 h-px bg-border"></span>
      </div>
      <div className="signup-socials flex justify-center gap-3">
        <button type="button" aria-label="Sign up with Google" className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-slate-50 transition-colors">G</button>
        <button type="button" aria-label="Sign up with Facebook" className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-blue-50 transition-colors">f</button>
        <button type="button" aria-label="Sign up with Instagram" className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-pink-50 transition-colors">◎</button>
        <button type="button" aria-label="Sign up with Twitter" className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-blue-50 transition-colors">♥</button>
        <button type="button" aria-label="Sign up with LinkedIn" className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-blue-700 text-white transition-colors">in</button>
      </div>
      <p className="signup-login-link text-center mt-8 text-small font-medium text-muted-foreground">
        Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
};
