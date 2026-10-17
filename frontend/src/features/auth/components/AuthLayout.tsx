import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AuthPromo = ({ showScene = true }: { showScene?: boolean }) => (
  <div className="signup-promo">
    <div className="signup-brand"><strong>5</strong><span>Minute<br />School<small>Study Online, Learn Online</small></span></div>
    <h1>Learn From World's<br />Best Instructors<br />Around The World.</h1>
    {showScene && (
      <div className="signup-scene" aria-hidden="true">
        <span className="scene-planet">●</span><span className="scene-rocket">▲</span><span className="scene-book">◇</span>
        <div className="scene-desk"><div className="scene-screen" /><div className="scene-person"><i /><b /><em /></div><div className="scene-leg scene-leg-left" /><div className="scene-leg scene-leg-right" /></div>
      </div>
    )}
  </div>
);

export const AuthLayout = ({ children, className, variant = "login" }: { children: React.ReactNode; className?: string; variant?: "login" | "signup" }) => (
  <main className={variant === "signup" ? "signup-page" : "auth-page"}>
    <section className="signup-shell" aria-label={variant === "signup" ? "SyllabusIQ create account" : "SyllabusIQ sign in"}>
      <AuthPromo showScene={variant === "signup"} />
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
