import React from "react";
import { motion } from "framer-motion";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AuthPromo = ({ variant = "login" }: { variant?: "login" | "signup" }) => (
  <div className="signup-promo flex flex-col justify-between">
    <div>
      <div className="signup-brand flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white shadow-xs">
          <GraduationCap className="h-6 w-6" strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <strong className="block text-xl font-bold tracking-tight text-white leading-tight">
            SyllabusIQ
          </strong>
          <span className="block text-xs font-medium text-white/80 tracking-wide mt-0.5">
            Academic Assessment Platform
          </span>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <h1 className="text-white font-display font-bold text-h1 leading-tight tracking-tight">
          {variant === "login"
            ? "Master Your Coursework With Verified Assessments."
            : "Smarter Assessments. Deeper Understanding."}
        </h1>
        <p className="text-white/85 text-body leading-relaxed max-w-sm">
          {variant === "login"
            ? "Sign in to access syllabus-grounded quizzes, exact lecture page citations, and real-time study analytics."
            : "Create your student or faculty profile to join university courses, take integrity-first exams, and clear doubts instantly."}
        </p>
      </div>
    </div>

    {/* Feature trust highlights */}
    <div className="mt-8 pt-6 border-t border-white/20 space-y-3">
      <div className="flex items-center gap-2.5 text-white/90 text-small">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-white" strokeWidth={2.2} />
        <span>Grounded directly in uploaded course materials</span>
      </div>
      <div className="flex items-center gap-2.5 text-white/90 text-small">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-white" strokeWidth={2.2} />
        <span>Timed assessments with verified answer keys</span>
      </div>
      <div className="flex items-center gap-2.5 text-white/90 text-small">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-white" strokeWidth={2.2} />
        <span>Instant doubt assistant citing exact textbook pages</span>
      </div>
    </div>
  </div>
);

export const AuthLayout = ({ children, className, variant = "login" }: { children: React.ReactNode; className?: string; variant?: "login" | "signup" }) => (
  <main className={variant === "signup" ? "signup-page" : "auth-page"}>
    <section className="signup-shell" aria-label={variant === "signup" ? "SyllabusIQ create account" : "SyllabusIQ sign in"}>
      <AuthPromo variant={variant} />
      <div className={cn("signup-form-panel", className)}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="signup-form-wrap"
        >
          {children}
        </motion.div>
      </div>
    </section>
  </main>
);
