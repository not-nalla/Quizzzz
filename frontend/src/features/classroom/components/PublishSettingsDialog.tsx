import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClassroomStore } from "@/store/useClassroomStore";
import { Quiz, ResultsVisibility } from "@/types";

interface Props {
  quiz: Quiz;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

export const PublishSettingsDialog: React.FC<Props> = ({ quiz, open, onOpenChange, onPublished }) => {
  const { publishQuiz } = useClassroomStore();
  const [durationMin, setDurationMin] = useState(quiz.settings.durationMin || 25);
  const [attemptsAllowed, setAttemptsAllowed] = useState(quiz.settings.attemptsAllowed || 1);
  const [shuffleQuestions, setShuffleQuestions] = useState(quiz.settings.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(quiz.settings.shuffleOptions ?? true);
  const [showResults, setShowResults] = useState<ResultsVisibility>(quiz.settings.showResults || "immediate");
  const [deadline, setDeadline] = useState(
    quiz.settings.deadline ? quiz.settings.deadline.substring(0, 16) : new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 16)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      startAt: new Date().toISOString(),
      deadline: new Date(deadline).toISOString(),
      durationMin: Number(durationMin),
      attemptsAllowed: Number(attemptsAllowed),
      shuffleQuestions,
      shuffleOptions,
      showResults,
    };
    console.log("[PublishSettingsDialog] Submitting:", { quizId: quiz.id, payload });
    const ok = await publishQuiz(quiz.id, payload);
    console.log("[PublishSettingsDialog] Result:", ok);
    if (ok) {
      onOpenChange(false);
      toast.success("Quiz published", {
        description: `${quiz.title} is now live for the enrolled roster.`,
      });
      if (onPublished) onPublished();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
      <DialogHeader>
        <DialogTitle>Publish Quiz to Class</DialogTitle>
        <DialogDescription>
          Set quiz time limit, attempts, and deadlines for enrolled students.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="publish-duration" className="text-label font-medium text-foreground">Time Limit (Minutes)</label>
            <Input
              id="publish-duration"
              type="number"
              min={5}
              max={180}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="publish-attempts" className="text-label font-medium text-foreground">Attempts Allowed</label>
            <select
              id="publish-attempts"
              value={attemptsAllowed}
              onChange={(e) => setAttemptsAllowed(Number(e.target.value))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={1}>1 Attempt (Strict Exam)</option>
              <option value={2}>2 Attempts</option>
              <option value={3}>3 Attempts</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="publish-deadline" className="text-label font-medium text-foreground">Submission Deadline</label>
          <Input
            id="publish-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2.5 pt-2 border-t border-border" id="publish-anticheat">
          <label htmlFor="publish-anticheat" className="text-label font-semibold text-foreground block">Anti-Cheating & Integrity</label>

          <label className="flex items-center gap-2.5 text-body text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Shuffle question delivery order per student</span>
          </label>

          <label className="flex items-center gap-2.5 text-body text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Shuffle option positions (using immutable option IDs)</span>
          </label>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border">
          <label htmlFor="publish-visibility" className="text-label font-medium text-foreground">Answer Key Visibility</label>
          <select
            id="publish-visibility"
            value={showResults}
            onChange={(e) => setShowResults(e.target.value as any)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="immediate">Release score & review immediately on submit</option>
            <option value="after_deadline">Withhold answer key until deadline has elapsed</option>
          </select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Publish Live
          </Button>
        </DialogFooter>
      </form>
      </DialogContent>
    </Dialog>
  );
};
