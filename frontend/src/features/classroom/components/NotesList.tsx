import React, { useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  FileText,
  Trash2,
  ExternalLink,
  Layers,
  Database,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { DocumentRecord, ChunkPreview } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChunkDrawer } from "./ChunkDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { useClassroomStore } from "@/store/useClassroomStore";

interface Props {
  documents: DocumentRecord[];
  isTeacher: boolean;
  onOpenUpload: () => void;
}

export const NotesList: React.FC<Props> = ({ documents, isTeacher, onOpenUpload }) => {
  const { deleteDocument, getChunksForDoc, fetchChunks } = useClassroomStore();
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleInspectChunks = async (doc: DocumentRecord) => {
    await fetchChunks(doc.id);
    setSelectedDoc(doc);
    setDrawerOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-h3 font-semibold text-headings">Syllabus Knowledge Base</h3>
          <p className="text-small text-muted-foreground">
            All AI quiz generation and classroom doubt queries are strictly grounded in these documents.
          </p>
        </div>

        {isTeacher && (
          <Button size="sm" onClick={onOpenUpload} className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Upload Notes
          </Button>
        )}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-3"
      >
        {documents.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Knowledge base is empty"
            description="Upload syllabus PDFs, slides, or lecture notes to power quizzes and study questions."
            actionLabel={isTeacher ? "Upload Notes" : undefined}
            onAction={isTeacher ? onOpenUpload : undefined}
          />
        ) : (
          documents.map((doc) => {
            const isReady = doc.status === "ready";
            const isProcessing = doc.status === "processing";

            return (
              <motion.div
                key={doc.id}
                variants={staggerItem}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-card text-card-foreground gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-md bg-secondary/80 border border-border mt-0.5 text-primary">
                    <FileText className="h-5 w-5" strokeWidth={1.75} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-semibold text-foreground">{doc.filename}</span>
                      <Badge
                        variant={isReady ? "success" : isProcessing ? "warning" : "destructive"}
                        className="text-caption"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                            Processing Document...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Ready
                          </span>
                        )}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground font-mono tabular">
                      {doc.unit && <span className="text-foreground font-sans font-medium">{doc.unit}</span>}
                      {doc.topic && <span>• {doc.topic}</span>}
                      <span>• {doc.pageCount} pages</span>
                      <span>• {doc.chunkCount} sections</span>
                      <span>• {formatFileSize(doc.sizeBytes)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInspectChunks(doc)}
                    className="flex items-center gap-1.5 h-8 px-2.5"
                    disabled={!isReady}
                  >
                    <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
                    View Sections
                  </Button>

                  {isTeacher && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(doc.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Chunk Drawer */}
      <ChunkDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        document={selectedDoc}
        chunks={selectedDoc ? getChunksForDoc(selectedDoc.id) : []}
      />
    </div>
  );
};
