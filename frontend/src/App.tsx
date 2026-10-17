import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SmoothScrollProvider } from "@/providers/SmoothScrollProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { ClassroomDashboard } from "@/features/classroom/pages/ClassroomDashboard";
import { QuizRunner } from "@/features/quiz/pages/QuizRunner";
import { RAGChat } from "@/features/chat/pages/RAGChat";
import { NotFoundPage } from "@/features/misc/pages/NotFoundPage";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token, initFromToken } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (token && !isAuthenticated) {
      initFromToken();
    }
  }, [token, isAuthenticated, initFromToken]);

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

const RedirectIfAuthed = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <RedirectIfAuthed>
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        </RedirectIfAuthed>
      }
    />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
          <AuthLayout variant="signup">
            <SignupPage />
          </AuthLayout>
          </RedirectIfAuthed>
      }
    />
    <Route
      path="/dashboard"
      element={
        <RequireAuth>
          <ClassroomDashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/quiz/:id"
      element={
        <RequireAuth>
          <QuizRunner />
        </RequireAuth>
      }
    />
    <Route
      path="/chat/:classId"
      element={
        <RequireAuth>
          <RAGChat />
        </RequireAuth>
      }
    />
    <Route
      path="/chat"
      element={
        <RequireAuth>
          <RAGChat />
        </RequireAuth>
      }
    />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <SmoothScrollProvider>
          <TooltipProvider delayDuration={200}>
            <Router>
              <AppRoutes />
            </Router>
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </SmoothScrollProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
