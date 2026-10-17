import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flag,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Send,
  HelpCircle,
  FileText,
  RotateCcw,
  Check,
  Award,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useClassroomStore } from "@/store/useClassroomStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ChunkDrawer } from "@/features/classroom/components/ChunkDrawer";
import { Question, AnswerReview, Attempt } from "@/types";
import { toast } from "sonner";

export const QuizRunner = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const {
    quizzes,
    fetchQuiz,
    startAttempt,
    saveAnswer,
    recordTabSwitch,
    submitAttempt,
    currentAttempt,
    getChunksForDoc,
    fetchChunks,
    lastResult,
  } = useClassroomStore();

  const quiz = quizzes.find((q) => q.id === id);
  const questions: Question[] = quiz?.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [tabWarnings, setTabWarnings] = useState(0);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalPercentage, setFinalPercentage] = useState<number | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [resultReviews, setResultReviews] = useState<AnswerReview[]>([]);
  const [resultsVisible, setResultsVisible] = useState(false);

  // Source citation drawer in review view
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false);
  const [activeCitationDocId, setActiveCitationDocId] = useState<string>("");

  const attemptRef = useRef<Attempt | null>(null);
  const isSubmittingRef = useRef(false);
  const attemptStartedRef = useRef(false);
  const quizLoadedRef = useRef(false);

  // Load quiz on direct route load - only once per id
  useEffect(() => {
    if (id && !quizLoadedRef.current && (!quiz || questions.length === 0)) {
      quizLoadedRef.current = true;
      setLoadingQuiz(true);
      fetchQuiz(id).finally(() => setLoadingQuiz(false));
    }
  }, [id, fetchQuiz]);

  // Initialize attempt - only runs when quiz data is ready
  useEffect(() => {
    if (!quiz || isPreview || !user || loadingQuiz) return;
    if (attemptStartedRef.current || attemptRef.current) return;

    // Check quiz availability before starting
    const now = new Date();
    const startAt = new Date(quiz.settings.startAt);
    const deadline = new Date(quiz.settings.deadline);
    
    if (now < startAt) {
      setStartError(`Assessment opens on ${startAt.toLocaleString()}`);
      return;
    }
    if (now > deadline) {
      setStartError("Assessment deadline has passed.");
      return;
    }
    if (quiz.status !== "published") {
      setStartError("Assessment is not currently open.");
      return;
    }

    attemptStartedRef.current = true;
    const initAttempt = async () => {
      setLoadingAttempt(true);
      setStartError(null);
      try {
        const attempt = await startAttempt(quiz.id, user.id);
        attemptRef.current = attempt;
        setSecondsRemaining(Math.max(0, Math.floor((Date.parse(attempt.expiresAt) - Date.now()) / 1000)));
        setLastSavedTime(new Date().toLocaleTimeString());
      } catch (err: any) {
        // Don't reset attemptStartedRef on error - prevents infinite retry loop
        // Just show error and stop
        const msg = err?.response?.data?.detail || "Failed to start attempt.";
        setStartError(msg);
        toast.error("Cannot Start Assessment", { description: msg });
      } finally {
        setLoadingAttempt(false);
      }
    };
    initAttempt();
  }, [quiz, isPreview, user, loadingQuiz]);

  // Server-authoritative countdown timer
  useEffect(() => {
    if (isSubmitted || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, secondsRemaining]);

  // Auto-submit exactly when the countdown reaches zero
  useEffect(() => {
    if (!isSubmitted && secondsRemaining === 0) {
      finalizeSubmission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsRemaining, isSubmitted]);

  // Telemetry Tab Switch tracking (PRD ATT-6) — single source: visibilitychange only
  useEffect(() => {
    if (isSubmitted || isPreview) return;

    let wasHidden = false;
    const handleVisibilityChange = () => {
      if (document.hidden && !wasHidden) {
        wasHidden = true;
        setTabWarnings((prev) => prev + 1);
        if (attemptRef.current) {
          recordTabSwitch(attemptRef.current.id);
        }
      }
      if (!document.hidden) {
        wasHidden = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSubmitted, isPreview, recordTabSwitch]);

  // Sync lastResult from store when submission completes
  useEffect(() => {
    if (lastResult && isSubmitted) {
      setResultReviews(lastResult.reviews);
      setResultsVisible(lastResult.resultsVisible);
      setFinalScore(lastResult.attempt.score ?? 0);
      setFinalPercentage(lastResult.attempt.percentage ?? 0);
    }
  }, [lastResult, isSubmitted]);

  const handleSelectOption = (qId: string, optId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optId }));
    if (attemptRef.current) {
      saveAnswer(attemptRef.current.id, qId, optId);
      setLastSavedTime(new Date().toLocaleTimeString());
    }
  };

  const toggleFlag = (qId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const finalizeSubmission = useCallback(async () => {
    if (isSubmittingRef.current || !attemptRef.current) return;
    isSubmittingRef.current = true;
    try {
      const result = await submitAttempt(attemptRef.current.id);
      setFinalScore(result.score ?? 0);
      setFinalPercentage(result.percentage ?? 0);
      setIsSubmitted(true);
      setConfirmSubmitOpen(false);

      if ((result.percentage ?? 0) >= 80) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Submission failed. Please try again.";
      toast.error("Submission Failed", { description: msg });
    } finally {
      isSubmittingRef.current = false;
    }
  }, [submitAttempt]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = secondsRemaining < 300; // < 5 minutes
  const currentQ = questions[currentIndex];
  const marksPerQuestion = quiz
    ? Math.max(1, Math.round((quiz.totalMarks || questions.length) / (questions.length || 1)))
    : 1;

  if (!quiz || questions.length === 0) {
    if (loadingQuiz || loadingAttempt) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-caption text-muted-foreground">Loading assessment...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-caption text-muted-foreground">Quiz not found or contains no questions.</p>
          <Link to="/dashboard">
            <Button size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (startError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <h2 className="text-h2 font-display font-semibold text-headings">Cannot Start Assessment</h2>
            <p className="text-caption text-muted-foreground">{startError}</p>
          </div>
          <Link to="/dashboard">
            <Button size="sm">Back to Course Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-caption text-muted-foreground">Please log in to take this assessment.</p>
          <Link to="/login">
            <Button size="sm">Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Submitted / Results View
  if (isSubmitted) {
    const showImmediate = quiz.settings.showResults === "immediate";

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <header className="h-14 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-button">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Course
              </Button>
            </Link>
            <span className="text-h4 font-display font-semibold text-headings">{quiz.title}</span>
          </div>
          <Badge variant="success" className="text-caption">
            Submission Finalized
          </Badge>
        </header>

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-8">
          {/* Result Card */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center space-y-4 shadow-xs">
            <div className="h-12 w-12 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
              <Award className="h-6 w-6" strokeWidth={2} />
            </div>

            <div className="space-y-1">
              <h2 className="text-h2 font-display font-semibold text-headings">
                Assessment Evaluated
              </h2>
              <p className="text-body text-muted-foreground">
                Server-synchronized answers processed and recorded against your student profile.
              </p>
            </div>

            {showImmediate ? (
              <div className="flex justify-center items-center gap-8 py-4 border-y border-border my-4">
                <div className="text-center">
                  <span className="text-caption text-muted-foreground block font-medium">Final Score</span>
                  <span className="text-stat font-display font-bold tabular text-primary">
                    <AnimatedCounter value={finalScore ?? 0} /> / {quiz.totalMarks}
                  </span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-center">
                  <span className="text-caption text-muted-foreground block font-medium">Accuracy</span>
                  <span className="text-stat font-display font-bold tabular text-headings">
                    <AnimatedCounter value={finalPercentage ?? 0} suffix="%" />
                  </span>
                </div>
                {tabWarnings > 0 && (
                  <>
                    <div className="h-10 w-px bg-border" />
                    <div className="text-center">
                      <span className="text-caption text-muted-foreground block font-medium">Tab Switches</span>
                      <span className="text-h2 font-display font-semibold tabular text-destructive">
                        {tabWarnings}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 bg-muted/40 rounded-lg text-body text-muted-foreground max-w-md mx-auto">
                <p className="font-semibold text-foreground mb-1">Answer Key Withheld</p>
                Per course policy, detailed solutions and grades will be released following the submission deadline:{" "}
                <span className="font-mono tabular text-foreground">{new Date(quiz.settings.deadline).toLocaleString()}</span>.
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <Link to="/dashboard">
                <Button size="sm">Return to Course Dashboard</Button>
              </Link>
            </div>
          </div>

          {/* Solutions & Citations Review (if results visible) */}
          {showImmediate && resultReviews.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-h3 font-display font-semibold text-headings">
                  Grounded Question Review & Solutions
                </h3>
                <span className="text-caption text-muted-foreground font-mono tabular">
                  {resultReviews.length} questions
                </span>
              </div>

              <div className="space-y-5">
                {resultReviews.map((review, idx) => {
                  const isCorrect = review.selectedOptId === review.correctOptId;

                  return (
                    <div
                      key={review.qId}
                      className={`rounded-lg border p-5 space-y-4 bg-card ${
                        isCorrect ? "border-success/30" : "border-destructive/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-small font-mono tabular font-semibold text-muted-foreground">
                          Question {idx + 1}
                        </span>
                        <Badge variant={isCorrect ? "success" : "destructive"} className="text-caption">
                          {isCorrect
                            ? `Correct (+${marksPerQuestion} pts)`
                            : "Incorrect (0 pts)"}
                        </Badge>
                      </div>

                      <p className="text-question font-semibold text-headings leading-relaxed">
                        {review.question}
                      </p>

                      <div className="grid gap-2">
                        {review.options.map((opt) => {
                          const isThisCorrect = opt.optId === review.correctOptId;
                          const isThisStudent = opt.optId === review.selectedOptId;

                          return (
                            <div
                              key={opt.optId}
                              className={`p-3 rounded-md border text-option flex items-center justify-between ${
                                isThisCorrect
                                  ? "border-success/40 bg-success/10 text-foreground font-medium"
                                  : isThisStudent && !isThisCorrect
                                  ? "border-destructive/40 bg-destructive/10 text-destructive line-through"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              <span>{opt.text}</span>
                              {isThisCorrect && (
                                <Badge variant="success" className="text-caption">
                                  Correct Key
                                </Badge>
                              )}
                              {isThisStudent && !isThisCorrect && (
                                <Badge variant="destructive" className="text-caption">
                                  Your Choice
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="p-3 bg-muted/40 rounded-md text-small text-muted-foreground leading-relaxed border border-border/60">
                        <strong className="text-foreground block mb-1">Pedagogical Explanation:</strong>
                        {review.explanation}
                      </div>

                      {/* Source Citation */}
                      {review.topic && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // We need to find the sourceRef from the original question
                            const originalQ = questions.find((q) => q.qId === review.qId);
                            if (originalQ?.sourceRefs?.length) {
                              setActiveCitationDocId(originalQ.sourceRefs[0].docId);
                              setCitationDrawerOpen(true);
                            }
                          }}
                          className="text-button h-7 px-2.5 text-primary border-primary/30 hover:bg-primary/5 flex items-center gap-1.5"
                        >
                          <FileText className="h-3 w-3" strokeWidth={1.75} />
                          <span>View Source Citation (Topic: {review.topic})</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {showImmediate && resultReviews.length === 0 && !resultsVisible && (
            <div className="p-4 bg-muted/40 rounded-lg text-body text-muted-foreground max-w-md mx-auto">
              <p className="font-semibold text-foreground mb-1">Answer Key Withheld</p>
              Per course policy, detailed solutions and grades will be released following the submission deadline:{" "}
              <span className="font-mono tabular text-foreground">{new Date(quiz.settings.deadline).toLocaleString()}</span>.
            </div>
          )}
        </main>

        <ChunkDrawer
          open={citationDrawerOpen}
          onOpenChange={setCitationDrawerOpen}
          document={null}
          chunks={activeCitationDocId ? getChunksForDoc(activeCitationDocId) : []}
        />
      </div>
    );
  }

  // Live Exam Runner View (Design 7.1)
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Telemetry Warning Toast Banner if tab switch triggered */}
      {tabWarnings > 0 && (
        <div
          role="alert"
          className="bg-destructive text-destructive-foreground px-4 py-2 text-small font-medium flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Integrity Warning: Focus loss or tab switch detected ({tabWarnings} incident{tabWarnings > 1 ? "s" : ""}). This event is logged in server telemetry.
            </span>
          </div>
          <span className="font-mono tabular text-caption opacity-90 hidden sm:inline">ATT-6 Telemetry</span>
        </div>
      )}

      {/* Persistent Exam Header (Design.md 7.1) */}
      <header className="min-h-14 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 py-2 flex items-center justify-between gap-3 sticky top-0 z-40">
        {/* Left: Course Name + Quiz Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-caption text-muted-foreground leading-none truncate hidden sm:block">
              {quiz.classroomName}
            </span>
            <span className="text-h4 font-display font-semibold text-headings leading-tight truncate">
              {quiz.title}
            </span>
          </div>
        </div>

        {/* Center: Server-synced countdown timer */}
        <div className="flex items-center shrink-0">
          <div
            role="timer"
            aria-label="Time remaining"
            className={`flex items-center gap-2 px-3 py-1 rounded-md border font-mono text-timer tabular font-bold transition-colors ${
              isLowTime
                ? "border-destructive text-destructive bg-destructive/10 animate-pulse"
                : "border-border text-foreground bg-secondary/60"
            }`}
          >
            <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Right: Autosave status indicator + Finish */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div
            className="flex items-center gap-1.5 text-caption text-muted-foreground font-mono tabular"
            aria-live="polite"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            <span className="hidden sm:inline">Saved at {lastSavedTime || "--:--:--"}</span>
            <span className="sr-only">Answers saved at {lastSavedTime}</span>
          </div>

          <Button
            size="sm"
            onClick={() => setConfirmSubmitOpen(true)}
            className="text-button h-8 px-3.5 bg-primary text-primary-foreground font-semibold"
          >
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Main Runner Body */}
      <div className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Question Area (Left 3 cols) */}
        <div className="md:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-border bg-card p-6 sm:p-7 space-y-6 shadow-xs"
            >
              {/* Question metadata */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular text-small font-bold text-primary px-2.5 py-1 rounded bg-primary/10">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <Badge variant="outline" className="text-caption">
                    {currentQ.difficulty}
                  </Badge>
                  {currentQ.topic && (
                    <span className="text-caption text-muted-foreground font-medium hidden sm:inline">
                      {currentQ.topic}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleFlag(currentQ.qId)}
                  aria-pressed={!!flaggedQuestions[currentQ.qId]}
                  className={`flex items-center gap-1.5 text-button px-2.5 py-1 rounded border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    flaggedQuestions[currentQ.qId]
                      ? "border-warning/40 bg-warning/10 text-warning font-medium"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Flag className="h-3 w-3" strokeWidth={1.75} />
                  <span>{flaggedQuestions[currentQ.qId] ? "Flagged for Review" : "Flag"}</span>
                </button>
              </div>

              {/* Question Stem */}
              <div
                id="question-stem"
                className="text-question font-semibold text-headings leading-relaxed"
              >
                {currentQ.question}
              </div>

              {/* Options as full-width interactive cards (Design.md 7.1) */}
              <div
                className="space-y-3 pt-2"
                role="radiogroup"
                aria-labelledby="question-stem"
              >
                {currentQ.options.map((opt, optIndex) => {
                  const isSelected = selectedAnswers[currentQ.qId] === opt.optId;

                  return (
                    <button
                      type="button"
                      key={opt.optId}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectOption(currentQ.qId, opt.optId)}
                      className={`w-full text-left p-4 rounded-lg border text-option flex items-start gap-3.5 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary text-foreground font-medium"
                          : "border-border bg-background hover:bg-secondary/40 text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={2.5} />}
                      </div>

                      <div className="flex-1 flex items-start gap-2">
                        <span className="font-mono tabular text-caption font-semibold text-muted-foreground" aria-hidden="true">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <span className="leading-relaxed">{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stepper Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              className="text-button h-9 gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </Button>

            <div className="flex items-center gap-2">
              {currentIndex < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                  className="text-button h-9 gap-1.5"
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setConfirmSubmitOpen(true)}
                  className="text-button h-9 gap-1.5 bg-primary text-primary-foreground font-semibold"
                >
                  Review & Submit <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigation Drawer / Grid (Right 1 col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h4 className="text-label font-medium text-foreground">
              Question Navigator
            </h4>

            {/* Numerical pill grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!selectedAnswers[q.qId];
                const isCurrent = idx === currentIndex;
                const isFlagged = flaggedQuestions[q.qId];

                let pillStyle = "border-border text-muted-foreground bg-background hover:bg-secondary";
                if (isCurrent) {
                  pillStyle = "border-primary bg-primary text-primary-foreground font-bold shadow-xs";
                } else if (isFlagged) {
                  pillStyle = "border-warning bg-warning/10 text-warning font-medium";
                } else if (isAnswered) {
                  pillStyle = "border-success/40 bg-success/10 text-success font-medium";
                }

                return (
                  <button
                    key={q.qId}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-md border text-small font-mono tabular transition-colors flex items-center justify-center cursor-pointer ${pillStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-3 border-t border-border text-caption text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-xs border border-success/40 bg-success/10" />
                <span>Answered ({Object.keys(selectedAnswers).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-xs border border-warning bg-warning/10" />
                <span>Flagged ({Object.values(flaggedQuestions).filter(Boolean).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-xs border border-border bg-background" />
                <span>Unanswered ({questions.length - Object.keys(selectedAnswers).length})</span>
              </div>
            </div>
          </div>

          {/* Exam Rules Card */}
          <div className="p-4 rounded-xl border border-border bg-secondary/30 text-small text-muted-foreground space-y-2 font-sans">
            <span className="font-semibold text-foreground block">Zero-Trust Environment</span>
            <p className="text-small leading-relaxed">
              Timing is computed by the server backend. Answers are autosaved per selection. Do not switch tabs or exit fullscreen.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before Final Submit */}
      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Assessment Submission</DialogTitle>
          <DialogDescription>
            Are you ready to submit your attempt? Answers will be locked and cannot be amended.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2 text-small">
          <div className="flex justify-between p-2 rounded bg-secondary/40 border border-border font-mono tabular">
            <span>Answered:</span>
            <strong className="text-foreground">{Object.keys(selectedAnswers).length} of {questions.length}</strong>
          </div>
          <div className="flex justify-between p-2 rounded bg-secondary/40 border border-border font-mono tabular">
            <span>Unanswered:</span>
            <strong className="text-muted-foreground">{questions.length - Object.keys(selectedAnswers).length}</strong>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setConfirmSubmitOpen(false)}>
            Continue Exam
          </Button>
          <Button size="sm" onClick={finalizeSubmission}>
            Finalize & Submit
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
