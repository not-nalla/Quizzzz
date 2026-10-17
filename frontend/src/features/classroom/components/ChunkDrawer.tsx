import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { FileText, Database, Hash, Sparkles } from "lucide-react";
import { ChunkPreview, DocumentRecord } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: DocumentRecord | null;
  chunks: ChunkPreview[];
}

export const ChunkDrawer: React.FC<Props> = ({ open, onOpenChange, document, chunks }) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-h3 font-semibold">
            {document?.filename || "Course Sections"}
          </SheetTitle>
          <SheetDescription className="text-small">
            Document excerpts and topics ({chunks.length} sections)
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
        {chunks.length === 0 ? (
          <div className="text-center py-8 text-small text-muted-foreground border border-dashed border-border rounded-lg p-6">
            <p>No processed sections available yet for this document.</p>
          </div>
        ) : (
          chunks.map((chk, idx) => (
            <div
              key={chk.id}
              className="rounded-lg border border-border bg-background p-4 space-y-2.5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between text-caption">
                <div className="flex items-center gap-1.5 font-mono tabular text-caption text-muted-foreground">
                  <Hash className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                  <span>Section #{idx + 1}</span>
                  <span>•</span>
                  <span>Page {chk.page}</span>
                </div>
              </div>

              {chk.topic && (
                <div className="text-label font-semibold text-foreground">
                  {chk.unit ? `${chk.unit}: ` : ""}{chk.topic}
                </div>
              )}

              <p className="text-small text-muted-foreground leading-relaxed font-sans bg-secondary/30 p-2.5 rounded border border-border/60">
                {chk.text}
              </p>

              <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Verified reference material</span>
              </div>
            </div>
          ))
        )}
      </div>
      </SheetContent>
    </Sheet>
  );
};
