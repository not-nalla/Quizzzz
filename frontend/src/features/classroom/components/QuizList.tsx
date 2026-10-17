import React, { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  RefreshCw,
  RotateCcw,
  Play,
  ArrowRight,
  ExternalLink,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Quiz, Question, Difficulty, DocumentRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublishSettingsDialog } from "./PublishSettingsDialog";
import { ChunkDrawer } from "./ChunkDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { useClassroomStore } from "@/store/useClassroomStore";

interface Props {
  quizzes: Quiz[];
  isTeacher: boolean;
  onOpenGenerate: () => void;
  selectedClassroomId: string;
}

export const QuizList: React.FC<Props> = ({ quizzes, isTeacher, onOpenGenerate, selectedClassroomId }) => {
  const navigate = useNavigate();
  const { 
    updateQuestion, 
    regenerateQuestion, 
    deleteQuestion, 
    getChunksForDoc, 
    fetchChunks,
    fetchQuizzes,
    documents 
  } = useClassroomStore();
  const [activePublishQuiz, setActivePublishQuiz] = useState<Quiz | null>(null);
  const [sourceChunkDrawerOpen, setSourceChunkDrawerOpen] = useState(false);
  const [selectedSourceDocId, setSelectedSourceDocId] = useState<string>("");
  const [expandedDrafts, setExpandedDrafts] = useState<Record<string, boolean>>({
    qz_os_deadlocks: true,
  });

  const toggleDraft = (quizId: string) => {
    setExpandedDrafts((prev) => ({ ...prev, [quizId]: !prev[quizId] }));
  };

  const handleOpenSourceChunk = async (docId: string) => {
    await fetchChunks(docId);
    setSelectedSourceDocId(docId);
    setSourceChunkDrawerOpen(true);
  };

  const difficultyVariant = (diff: Difficulty) => {
    switch (diff) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-h3 font-semibold text-headings">Course Assessments</h3>
          <p className="text-small text-muted-foreground">
            {isTeacher
              ? "Author and review syllabus-aligned quizzes using RAG draft workbenches."
              : "Timed, server-authoritative assessments grounded in your course materials."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isTeacher && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchQuizzes(selectedClassroomId)}
              className="h-8 px-2.5 flex items-center gap-1.5"
              title="Refresh quiz list"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              Refresh
            </Button>
          )}

          {isTeacher && (
            <Button size="sm" onClick={onOpenGenerate} className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              Generate Quiz (RAG)
            </Button>
          )}
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {quizzes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No assessments yet"
            description="Generate a syllabus-aligned quiz draft from your indexed notes, review the questions, then publish it to the roster."
            actionLabel={isTeacher ? "Generate Quiz" : undefined}
            onAction={isTeacher ? onOpenGenerate : undefined}
          />
        ) : (
          quizzes.map((quiz) => {
            const isDraft = quiz.status === "draft";
            const isPublished = quiz.status === "published";
            const isExpanded = isDraft ? expandedDrafts[quiz.id] ?? true : false;

            return (
              <motion.div
                key={quiz.id}
                variants={staggerItem}
                className="rounded-lg border border-border bg-card text-card-foreground shadow-xs overflow-hidden transition-colors"
              >
                {/* Header banner */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-muted/20">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-h4 font-semibold text-headings">{quiz.title}</span>
                      <Badge variant={isDraft ? "warning" : "default"} className="text-caption">
                        {quiz.status}
                      </Badge>
                      {quiz.locked && (
                        <span className="flex items-center gap-1 text-caption text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Locked (Attempts Active)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground font-mono tabular">
                      <span>{quiz.questionCount ?? quiz.questions.length} Questions</span>
                      <span>• {quiz.totalMarks} Total Marks</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {quiz.settings.durationMin} mins
                      </span>
                      {quiz.publishedAt && (
                        <span>
                          • Deadline: {new Date(quiz.settings.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isTeacher ? (
                      <>
                        {isDraft ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleDraft(quiz.id)}
                              className="h-8 px-2.5"
                            >
                              {isExpanded ? (
                                <span className="flex items-center gap-1">
                                  <ChevronUp className="h-3.5 w-3.5" /> Collapse Draft
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <ChevronDown className="h-3.5 w-3.5" /> Edit Draft ({quiz.questions.length})
                                </span>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setActivePublishQuiz(quiz)}
                              className="h-8 px-3"
                            >
                              Publish Assessment
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-caption font-mono tabular text-muted-foreground">
                              {quiz.attemptCount} submissions
                            </span>
                            <Link to={`/quiz/${quiz.id}?preview=true`}>
                              <Button variant="outline" size="sm" className="h-8">
                                Preview Exam
                              </Button>
                            </Link>
                          </div>
                        )}
                      </>
                    ) : (
                      // Student action
                      <Link to={`/quiz/${quiz.id}`}>
                        <Button size="sm" className="h-8 flex items-center gap-1.5">
                          <Play className="h-3 w-3 fill-current" />
                          Start Assessment
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Teacher Draft Review Workbench (QZ-3 Specification) */}
                {isTeacher && isDraft && isExpanded && (
                  <div className="p-4 sm:p-6 space-y-6 bg-background/50">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="text-label font-semibold text-foreground">
                        Draft Question Review Workbench
                      </div>
                      <span className="text-small text-muted-foreground">
                        Review AI generated questions and verify citations before publishing
                      </span>
                    </div>

                    <div className="space-y-5">
                      {quiz.questions.map((q, idx) => (
                        <div
                          key={q.qId}
                          className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-3.5 relative hover:border-primary/40 transition-colors"
                        >
                          {/* Question header info */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono tabular text-caption text-primary px-2 py-0.5 rounded bg-primary/10">
                                Question {idx + 1}
                              </span>
                              <Badge variant={difficultyVariant(q.difficulty)} className="text-caption">
                                {q.difficulty}
                              </Badge>
                              {q.topic && (
                                <span className="text-caption text-muted-foreground">
                                  {q.topic}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => regenerateQuestion(quiz.id, q.qId)}
                                className="h-7 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                                title="Regenerate question using alternate prompt temperature"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Regenerate
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  deleteQuestion(quiz.id, q.qId);
                                  toast.info("Question removed", {
                                    description: "The draft has been updated.",
                                  });
                                }}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Delete question"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Question Stem Textarea */}
                          <div className="space-y-1">
                            <label htmlFor={`quiz-stem-${quiz.id.replace(/_/g, "-")}-${q.qId.replace(/_/g, "-")}`} className="text-label font-medium text-muted-foreground">
                              Question Stem
                            </label>
                            <textarea
                              id={`quiz-stem-${quiz.id.replace(/_/g, "-")}-${q.qId.replace(/_/g, "-")}`}
                              value={q.question}
                              onChange={(e) =>
                                updateQuestion(quiz.id, q.qId, { question: e.target.value })
                              }
                              rows={2}
                              className="w-full rounded-md border border-input bg-background p-2.5 text-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>

                          {/* Options */}
                          <div className="space-y-2">
                            <label htmlFor={`quiz-options-${quiz.id.replace(/_/g, "-")}-${q.qId.replace(/_/g, "-")}`} className="text-label font-medium text-muted-foreground">
                              Options (Click radio to select correct answer)
                            </label>
                            <div className="grid gap-2" id={`quiz-options-${quiz.id.replace(/_/g, "-")}-${q.qId.replace(/_/g, "-")}`}>
                              {q.options.map((opt, optIdx) => {
                                const isCorrect = q.correctOptId === opt.optId;
                                return (
                                  <div
                                    key={opt.optId}
                                    onClick={() =>
                                      updateQuestion(quiz.id, q.qId, { correctOptId: opt.optId })
                                    }
                                    className={`flex items-center gap-3 p-2.5 rounded-md border text-option cursor-pointer transition-colors ${
                                      isCorrect
                                        ? "border-success/40 bg-success/10 text-foreground font-medium"
                                        : "border-border bg-background hover:bg-accent/40 text-muted-foreground"
                                    }`}
                                  >
                                    <div
                                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        isCorrect
                                          ? "border-success bg-success text-white"
                                          : "border-muted-foreground/40"
                                      }`}
                                    >
                                      {isCorrect && <CheckCircle2 className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="font-mono tabular text-caption text-muted-foreground shrink-0">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <span className="flex-1 text-option">{opt.text}</span>
                                    {isCorrect && (
                                      <Badge variant="success" className="text-caption">
                                        Correct Key
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Explanation Box */}
                          <div className="space-y-1">
                            <label htmlFor={`quiz-explanation-${quiz.id.replace(/_/g, "-")}-${q.qId.replace(/_/g, "-")}`} className="text-label font-medium text-muted-foreground">
                              Pedagogical Explanation
                            </label>
                            <div className="bg-muted/40 p-3 rounded-md text-body text-muted-foreground leading-relaxed border border-border/60" id={`quiz-explanation-${quiz.id.replace(/_/g, "-")}-${q.qId.replace(/_/g, "-")}`}>
                              {q.explanation}
                            </div>
                          </div>

                          {/* Source Citation Drawer Trigger */}
                          {q.sourceRefs && q.sourceRefs.length > 0 && (
                            <div className="pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSourceChunk(q.sourceRefs[0].docId)}
                                className="h-7 px-2.5 text-primary border-primary/30 hover:bg-primary/5 flex items-center gap-1.5"
                              >
                                <FileText className="h-3 w-3" strokeWidth={1.75} />
                                <span>
                                  View Source Chunk (Doc: {q.sourceRefs[0].filename}, Page {q.sourceRefs[0].page})
                                </span>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={() => setActivePublishQuiz(quiz)} size="sm">
                        Publish This Assessment ({quiz.questions.length} Questions)
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Publish Settings Dialog */}
      {activePublishQuiz && (
        <PublishSettingsDialog
          quiz={activePublishQuiz}
          open={!!activePublishQuiz}
          onOpenChange={(open) => !open && setActivePublishQuiz(null)}
          onPublished={() => fetchQuizzes(selectedClassroomId)}
        />
      )}

      {/* Source Citation Chunk Drawer */}
      <ChunkDrawer
        open={sourceChunkDrawerOpen}
        onOpenChange={setSourceChunkDrawerOpen}
        document={documents.find((d) => d.id === selectedSourceDocId) || null}
        chunks={selectedSourceDocId ? getChunksForDoc(selectedSourceDocId) : []}
      />
    </div>
  );
};
