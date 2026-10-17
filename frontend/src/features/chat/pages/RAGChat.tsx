import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Sparkles,
  FileText,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { useAuthStore } from "@/store/useAuthStore";
import { useClassroomStore } from "@/store/useClassroomStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/Markdown";
import { ChunkDrawer } from "@/features/classroom/components/ChunkDrawer";
import { ChatMessage, Citation, ChunkPreview, Classroom } from "@/types";

export const RAGChat = () => {
  const { classId } = useParams<{ classId: string }>();
  const {
    classrooms,
    selectedClassroomId,
    setSelectedClassroomId,
    chatMessages,
    sendMessage,
    isChatResponding,
    getChunksForDoc,
    fetchChatHistory,
    fetchDocuments,
    fetchClassrooms,
    fetchChunks,
  } = useClassroomStore();

  const { user } = useAuthStore();

  const currentClassId = classId || selectedClassroomId || "";
  const currentClass = classrooms.find((c) => c.id === currentClassId) || classrooms[0];

  const messages: ChatMessage[] = chatMessages[currentClassId] || [];
  const [inputText, setInputText] = useState("");

  // Citation inspector drawer
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false);
  const [selectedCitationChunks, setSelectedCitationChunks] = useState<ChunkPreview[]>([]);
  const [selectedCitationDocName, setSelectedCitationDocName] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (classId && classId !== selectedClassroomId) {
      setSelectedClassroomId(classId);
    }
  }, [classId, selectedClassroomId, setSelectedClassroomId]);

  // Load chat history on mount
  useEffect(() => {
    if (currentClassId && messages.length === 0) {
      fetchChatHistory(currentClassId);
      fetchDocuments(currentClassId);
    }
    // Fetch classrooms if not loaded
    if (classrooms.length === 0) {
      fetchClassrooms();
    }
  }, [currentClassId, classrooms.length, fetchClassrooms, fetchChatHistory, fetchDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatResponding]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isChatResponding || !currentClassId) return;

    const query = inputText;
    setInputText("");
    await sendMessage(currentClassId, query);
  };

  const handleCitationClick = async (citation: Citation) => {
    const rawChunks = getChunksForDoc(citation.docId);
    if (rawChunks.length > 0) {
      setSelectedCitationChunks(rawChunks);
    } else {
      const fetchedChunks = await fetchChunks(citation.docId);
      if (fetchedChunks.length > 0) {
        setSelectedCitationChunks(fetchedChunks);
      } else {
        setSelectedCitationChunks([
          {
            id: `chk_cit_${Date.now()}`,
            page: citation.page,
            text: citation.text,
            tokenCount: Math.ceil(citation.text.length / 4),
          },
        ]);
      }
    }
    setSelectedCitationDocName(citation.filename);
    setCitationDrawerOpen(true);
  };

  // Dynamic suggested questions based on uploaded context
  const suggestedQuestions = [
    "What are the main topics covered in the uploaded notes?",
    "Explain the key concepts from the course material.",
    "What is covered in the first chapter/unit?",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-4xl flex flex-col space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-h2 font-display font-semibold text-headings">
                  Classroom Doubt Assistant
                </h1>
                <Badge variant="success" className="text-caption font-medium">
                  Course Verified
                </Badge>
              </div>
              <p className="text-small text-muted-foreground">
                {currentClass?.name || "Course"} • References uploaded lecture materials
              </p>
            </div>
          </div>
        </div>

        {/* Chat message stream */}
        <div
          className="flex-1 rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4 overflow-y-auto min-h-[400px] max-h-[500px] flex flex-col"
          role="log"
          aria-live="polite"
          aria-label="Conversation with the doubt assistant"
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="text-h3 font-display font-semibold text-headings">
                Course Study Assistant
              </h3>
              <p className="text-small text-muted-foreground max-w-md">
                Ask any question about your course concepts. The assistant references your uploaded lecture notes and cites exact document pages.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const isRefusal = msg.refusal;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 text-caption text-muted-foreground mb-1 px-1">
                    <span>{isUser ? (user?.name || "You") : "SyllabusIQ Assistant"}</span>
                    <span>•</span>
                    <span className="font-mono tabular">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div
                    className={`rounded-lg p-4 max-w-3xl text-chat ${
                      isUser
                        ? "bg-secondary text-foreground rounded-tr-xs border border-border"
                        : isRefusal
                        ? "bg-warning/10 border border-warning/30 text-warning rounded-tl-xs"
                        : "bg-card border border-border text-foreground rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {isRefusal && (
                      <div className="flex items-center gap-1.5 font-semibold text-warning mb-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Out of Syllabus Scope</span>
                      </div>
                    )}

                    {isUser ? (
                      <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</div>
                    ) : (
                      <Markdown content={msg.content} />
                    )}

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                        <span className="text-caption font-medium text-muted-foreground block">
                          Verified course sources:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleCitationClick(c)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="View source reference excerpt"
                            >
                              <FileText className="h-3 w-3" strokeWidth={1.75} />
                              <span>{c.filename} • Page {c.page}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isChatResponding && (
            <div className="flex items-start gap-2 pt-2">
              <div className="rounded-lg p-3 bg-card border border-border text-small text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Searching course materials and generating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="space-y-1.5">
          <span className="text-caption font-medium text-muted-foreground block">
            Suggested queries:
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(q)}
                className="text-small font-medium px-3 py-1 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat input */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Ask a doubt about course concepts
          </label>
          <Input
            id="chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a doubt about course concepts..."
            className="flex-1 text-input h-10"
            disabled={isChatResponding}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!inputText.trim() || isChatResponding}
            className="h-10 px-4 flex items-center gap-1.5 text-button font-button"
          >
            {isChatResponding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span>Ask</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>
      </main>

      {/* Citation Inspector Drawer */}
      <ChunkDrawer
        open={citationDrawerOpen}
        onOpenChange={setCitationDrawerOpen}
        document={null}
        chunks={selectedCitationChunks}
      />
    </div>
  );
};
