import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { useClassroomStore } from "@/store/useClassroomStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroomId: string;
}

export const UploadNotesDialog: React.FC<Props> = ({ open, onOpenChange, classroomId }) => {
  const { uploadDocument } = useClassroomStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [unit, setUnit] = useState("Unit 1");
  const [topic, setTopic] = useState("Course Notes");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !classroomId) return;

    setIsUploading(true);
    try {
      await uploadDocument(classroomId, selectedFile, unit, topic);
      onOpenChange(false);
      setSelectedFile(null);
      setUnit("Unit 1");
      setTopic("Course Notes");
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Syllabus Courseware</DialogTitle>
          <DialogDescription>
            Upload course notes, slides, or syllabus materials. Content is indexed for automated quiz creation and instant doubt clearing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload Drop Zone */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-secondary/30 cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              onChange={handleFileDrop}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-card rounded-full border border-border shadow-xs text-primary">
                {selectedFile ? (
                  <CheckCircle2 className="h-6 w-6 text-success" strokeWidth={1.75} />
                ) : (
                  <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
                )}
              </div>
              <div>
                {selectedFile ? (
                  <>
                    <p className="text-body font-semibold text-foreground flex items-center gap-1.5 justify-center">
                      <FileText className="h-3.5 w-3.5" />
                      {selectedFile.name}
                    </p>
                    <p className="text-caption text-muted-foreground font-mono tabular mt-0.5">{formatBytes(selectedFile.size)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-body font-semibold text-foreground">Click to browse or drag & drop</p>
                    <p className="text-caption text-muted-foreground mt-0.5">PDF, DOCX, PPTX, or TXT (Max 20MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="upload-unit" className="text-label font-medium text-foreground">Syllabus Unit Tag</label>
              <Input
                id="upload-unit"
                placeholder="e.g. Unit 1"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="text-input h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="upload-topic" className="text-label font-medium text-foreground">Topic / Chapter</label>
              <Input
                id="upload-topic"
                placeholder="e.g. Process Scheduling"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="text-input h-9"
              />
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-md border border-border text-small text-muted-foreground">
            <span className="font-semibold text-foreground">Course Alignment: </span>
            Content is organized with page citations so all generated questions and answers are traceable.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!selectedFile || isUploading}>
              {isUploading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Uploading...</>
              ) : (
                "Upload & Process"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
