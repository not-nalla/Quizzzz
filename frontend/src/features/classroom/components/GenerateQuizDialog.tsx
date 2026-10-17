import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle2, Cpu, Database, Loader2, AlertCircle } from "lucide-react";
import { useClassroomStore } from "@/store/useClassroomStore";
import { Difficulty } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated?: (quizId: string) => void;
}

export const GenerateQuizDialog: React.FC<Props> = ({ open, onOpenChange, onGenerated }) => {
  const { selectedClassroomId, generateQuiz, documents } = useClassroomStore();
  const [title, setTitle] = useState("Unit 1 Comprehensive Assessment");
  const [unit, setUnit] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">("mixed");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const classDocs = documents.filter((d) => d.classroomId === selectedClassroomId && d.status === "ready");

  const steps = [
    { label: "Querying Vector Index for top-K syllabus chunks...", icon: Database },
    { label: "Invoking LLM (Groq GPT-OSS) with strict JSON schema...", icon: Cpu },
    { label: "Enforcing zero-hallucination citation grounding...", icon: Sparkles },
    { label: "Synthesizing distractor options & finalizing questions...", icon: CheckCircle2 },
  ];

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroomId) return;

    setIsGenerating(true);
    setCurrentStep(0);
    setError(null);

    // Animate through steps
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 900);

    try {
      const newQuiz = await generateQuiz({
        classroomId: selectedClassroomId,
        title,
        unit: unit || undefined,
        count,
        difficulty,
        docId,
      });
      clearInterval(stepInterval);
      setIsGenerating(false);
      onOpenChange(false);
      setTitle("Unit 1 Comprehensive Assessment");
      setUnit("");
      setDocId(undefined);
      toast.success("Quiz draft generated!", {
        description: `${newQuiz.questions.length} grounded questions are ready for review.`,
      });
      if (onGenerated) onGenerated(newQuiz.id);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsGenerating(false);
      const msg = err?.response?.data?.detail || "Quiz generation failed. Please try again.";
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
            Auto-Generate Grounded Quiz (RAG)
          </DialogTitle>
          <DialogDescription>
            Generates strict syllabus-aligned multiple choice questions sourced from uploaded course notes.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="py-6 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-label font-medium">
                <span className="text-foreground">RAG Assessment Pipeline</span>
                <span className="font-mono tabular text-muted-foreground">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <Progress value={((currentStep + 1) / steps.length) * 100} />
            </div>

            <div className="space-y-3 pt-2">
              {steps.map((s, idx) => {
                const Icon = s.icon;
                const isPast = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div
                    key={s.label}
                    className={`flex items-center gap-3 text-small p-2.5 rounded-md border transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : isPast
                        ? "border-success/20 bg-success/5 text-success"
                        : "border-border text-muted-foreground opacity-50"
                    }`}
                  >
                    {isCurrent ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    )}
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleStartGeneration} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-small text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {classDocs.length === 0 && (
              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-md text-small text-warning-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                <span>No documents uploaded yet. Upload lecture notes first for best RAG-grounded quiz quality.</span>
              </div>
            )}

            {classDocs.length > 0 && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-md text-small text-foreground">
                <span className="font-semibold text-success">{classDocs.length} documents</span> available for RAG grounding.
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="gen-title" className="text-label font-medium text-foreground">Assessment Title</label>
              <Input
                id="gen-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 2 Midterm Prep"
                required
                className="text-input h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gen-unit" className="text-label font-medium text-foreground">
                Syllabus Scope / Unit Filter <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="gen-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Unit 2: Virtual Memory"
                className="text-input h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gen-doc" className="text-label font-medium text-foreground">
                Source Notes <span className="text-muted-foreground">(optional)</span>
              </label>
              <select
                id="gen-doc"
                value={docId || ""}
                onChange={(e) => setDocId(e.target.value || undefined)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All uploaded notes (whole classroom)</option>
                {classDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename}{d.unit ? ` — ${d.unit}` : ""}
                  </option>
                ))}
              </select>
              {docId && (
                <p className="text-caption text-primary mt-1">
                  Quiz will be grounded only in the selected document.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="gen-count" className="text-label font-medium text-foreground">Question Count</label>
                <select
                  id="gen-count"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gen-difficulty" className="text-label font-medium text-foreground">Difficulty Level</label>
                <select
                  id="gen-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="mixed">Mixed (Balanced curve)</option>
                  <option value="easy">Easy (Foundational)</option>
                  <option value="medium">Medium (Application)</option>
                  <option value="hard">Hard (Synthesis)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-md border border-border text-small text-muted-foreground">
              <span className="font-semibold text-foreground">Guaranteed RAG Alignment:</span> Every question includes verifiable citation links to ingested document pages with cosine confidence scores.
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate Questions
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
