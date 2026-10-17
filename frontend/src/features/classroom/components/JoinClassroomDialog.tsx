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

export const JoinClassroomDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { joinClassroom } = useClassroomStore();
  const [classCode, setClassCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) return;

    setIsLoading(true);
    const success = await joinClassroom(classCode.trim());
    setIsLoading(false);

    if (success) {
      onOpenChange(false);
      setClassCode("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll in Classroom</DialogTitle>
          <DialogDescription>
            Enter the unique course code provided by your instructor to join the classroom.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="join-class-code" className="text-label font-medium text-foreground">Class Code</label>
            <Input
              id="join-class-code"
              placeholder="Enter class enrollment code"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              required
              className="font-mono tabular text-input h-9"
              disabled={isLoading}
              autoFocus
            />
            <p className="text-caption text-muted-foreground">
              Ask your instructor for the class enrollment code.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!classCode.trim() || isLoading}>
              {isLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Joining...</> : "Join Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
