import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClassroomStore } from "@/store/useClassroomStore";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateClassroomDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { createClassroom } = useClassroomStore();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("Fall 2026");
  const [batch, setBatch] = useState("Batch 2026");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject) return;

    setIsLoading(true);
    const classroom = await createClassroom({ name, subject, semester, batch, description });
    setIsLoading(false);

    if (classroom) {
      onOpenChange(false);
      setName("");
      setSubject("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Academic Classroom</DialogTitle>
          <DialogDescription>
            Establish a new syllabus-grounded classroom space for your university cohort.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="create-class-name" className="text-label font-medium text-foreground">Course Title & Code</label>
            <Input
              id="create-class-name"
              placeholder="e.g. CS401: Advanced Operating Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-input h-9"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="create-class-subject" className="text-label font-medium text-foreground">Subject Domain</label>
              <Input
                id="create-class-subject"
                placeholder="e.g. Operating Systems"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="text-input h-9"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-class-semester" className="text-label font-medium text-foreground">Semester</label>
              <Input
                id="create-class-semester"
                placeholder="e.g. Fall 2026"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="text-input h-9"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="create-class-batch" className="text-label font-medium text-foreground">Cohort / Batch</label>
            <Input
              id="create-class-batch"
              placeholder="e.g. UG Batch 2026 - Section A"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="text-input h-9"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="create-class-description" className="text-label font-medium text-foreground">Syllabus Scope / Description</label>
            <textarea
              id="create-class-description"
              className="w-full rounded-md border border-input bg-background p-2.5 text-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Outline units covered, textbook references, and assessment policies..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Creating...</> : "Create Classroom"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
