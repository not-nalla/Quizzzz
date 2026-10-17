import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen,
  Sparkles,
  UploadCloud,
  Copy,
  Check,
  Plus,
  MessageSquare,
  FileText,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { useAuthStore } from "@/store/useAuthStore";
import { useClassroomStore } from "@/store/useClassroomStore";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tabContentVariants, transitionFast } from "@/lib/motion";
import { ActivityFeed } from "../components/ActivityFeed";
import { NotesList } from "../components/NotesList";
import { QuizList } from "../components/QuizList";
import { AnalyticsTab } from "../components/AnalyticsTab";
import { RosterTab } from "../components/RosterTab";
import { CreateClassroomDialog } from "../components/CreateClassroomDialog";
import { JoinClassroomDialog } from "../components/JoinClassroomDialog";
import { UploadNotesDialog } from "../components/UploadNotesDialog";
import { GenerateQuizDialog } from "../components/GenerateQuizDialog";
import { Link } from "react-router-dom";

export const ClassroomDashboard = () => {
  const { user } = useAuthStore();
  const {
    classrooms,
    selectedClassroomId,
    setSelectedClassroomId,
    documents,
    quizzes,
    activities,
    analytics,
    members,
    isLoadingClassrooms,
    fetchClassrooms,
    fetchDocuments,
    fetchQuizzes,
    fetchMembers,
    fetchAnalytics,
    fetchActivity,
  } = useClassroomStore();

  const [activeTab, setActiveTab] = useState<"feed" | "notes" | "quizzes" | "analytics" | "roster">("quizzes");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isTeacher = user?.role === "teacher";

  // Load classrooms on mount
  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // Load classroom-specific data when selected classroom changes
  useEffect(() => {
    if (selectedClassroomId) {
      fetchDocuments(selectedClassroomId);
      fetchQuizzes(selectedClassroomId);
      fetchMembers(selectedClassroomId);
      fetchActivity(selectedClassroomId);
      fetchAnalytics(selectedClassroomId);
    }
  }, [selectedClassroomId, fetchDocuments, fetchQuizzes, fetchMembers, fetchActivity, fetchAnalytics]);

  const currentClass = classrooms.find((c) => c.id === selectedClassroomId) || classrooms[0];
  const classDocs = documents.filter((d) => d.classroomId === currentClass?.id);
  const classQuizzes = quizzes.filter((q) => q.classroomId === currentClass?.id);
  const classActivities = activities[currentClass?.id] || [];
  const classAnalytics = analytics[currentClass?.id];
  const classMembers = members[currentClass?.id] || [];

  const handleCopyCode = () => {
    if (!currentClass) return;
    navigator.clipboard.writeText(currentClass.classCode);
    setCopiedCode(true);
    toast.success("Class code copied", {
      description: `${currentClass.classCode} is on your clipboard.`,
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Loading state
  if (isLoadingClassrooms) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-body text-muted-foreground">Loading your classrooms...</p>
        </div>
      </div>
    );
  }

  // Empty state - no classrooms
  if (!isLoadingClassrooms && classrooms.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
            <div className="p-4 rounded-full bg-primary/10">
              <BookOpen className="h-10 w-10 text-primary" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-h2 text-headings tracking-tight">
                {isTeacher ? "Create your first classroom" : "Join a classroom"}
              </h2>
              <p className="text-body text-muted-foreground max-w-md leading-relaxed">
                {isTeacher
                  ? "Set up a classroom, upload your lecture notes, and let AI generate quizzes automatically."
                  : "Enter the class code provided by your instructor to access your course materials."}
              </p>
            </div>
            <div className="flex gap-3">
              {isTeacher ? (
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 font-button text-button">
                  <Plus className="h-4 w-4" /> Create Classroom
                </Button>
              ) : (
                <Button onClick={() => setJoinDialogOpen(true)} className="gap-2 font-button text-button">
                  <Plus className="h-4 w-4" /> Join with Code
                </Button>
              )}
            </div>
          </div>
        </main>
        <CreateClassroomDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        <JoinClassroomDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-6xl space-y-6">
        {/* Classroom Selector (if multiple) */}
        {classrooms.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            {classrooms.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassroomId(cls.id)}
                className={`px-3 py-1.5 text-small rounded-full border transition-all font-medium ${
                  selectedClassroomId === cls.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}

        {/* Course Header Banner */}
        {currentClass && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-caption bg-secondary/50 tabular">
                    {currentClass.semester}
                  </Badge>
                  {currentClass && currentClass.batch && (
                    <Badge variant="secondary" className="text-caption">
                      {currentClass.batch}
                    </Badge>
                  )}
                </div>

                <h1 className="font-display font-bold text-h1 text-headings tracking-tight">
                  {currentClass.name}
                </h1>

                <p className="text-body text-muted-foreground max-w-2xl leading-relaxed">
                  {currentClass.description || "Comprehensive syllabus coursework and assessment workspace."}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-small text-muted-foreground pt-1">
                  <span className="font-sans">
                    Instructor: <strong className="text-foreground font-semibold">{currentClass.teacherName}</strong>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-sans">{currentClass.subject}</span>
                  <span className="text-muted-foreground">•</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-secondary/50 hover:bg-secondary font-mono text-caption text-foreground transition-colors cursor-pointer tabular"
                    title="Copy enrollment code"
                  >
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-semibold text-primary">{currentClass.classCode}</span>
                    {copiedCode ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-2 self-start md:self-center shrink-0">
                {isTeacher ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateDialogOpen(true)}
                      className="text-small h-9 flex items-center gap-1.5 font-button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Classroom
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setUploadDialogOpen(true)}
                      className="text-small h-9 flex items-center gap-1.5 font-button"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Upload Notes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setGenerateDialogOpen(true)}
                      className="text-small h-9 flex items-center gap-1.5 shadow-xs font-button"
                    >
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                      Generate Quiz
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJoinDialogOpen(true)}
                      className="text-small h-9 flex items-center gap-1.5 font-button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Join with Code
                    </Button>
                    <Link to={`/chat/${currentClass.id}`}>
                      <Button size="sm" className="text-small h-9 flex items-center gap-1.5 shadow-xs font-button">
                        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                        Ask Doubts AI
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feature Spotlight Mini Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SpotlightCard className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5">
                <div className="text-small font-semibold text-foreground">Grounded Knowledge Base</div>
                <div className="text-caption text-muted-foreground font-mono tabular">
                  {classDocs.length} syllabus documents indexed
                </div>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-success/10 text-success">
                <Clock className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5">
                <div className="text-small font-semibold text-foreground">Authoritative Assessments</div>
                <div className="text-caption text-muted-foreground font-mono tabular">
                  {classQuizzes.length} exams • Server-synced
                </div>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5">
                <div className="text-small font-semibold text-foreground">Verified Doubts Assistant</div>
                <div className="text-caption text-muted-foreground">
                  Course-specific answers with page references
                </div>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList
            variant="line"
            className="w-full h-auto justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0"
          >
            {[
              { id: "quizzes", label: "Assessments & Quizzes", count: classQuizzes.length },
              { id: "notes", label: "Knowledge Base / Notes", count: classDocs.length },
              { id: "feed", label: "Course Activity", count: classActivities.length },
              { id: "analytics", label: "Class Analytics" },
              { id: "roster", label: "Enrolled Roster", count: classMembers.length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`relative after:hidden rounded-md px-3.5 py-2 text-nav-item font-medium data-[state=active]:text-foreground hover:bg-secondary/60 hover:text-foreground ${
                    isActive ? "" : "text-muted-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`font-mono text-caption px-1.5 py-0.5 rounded-full tabular ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <motion.span
                    layoutId="dashboard-tab-underline"
                    className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                    transition={transitionFast}
                    />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content Panes */}
          <TabsContent value="quizzes" className="pt-6">
            <motion.div variants={tabContentVariants} initial="initial" animate="animate">
              <QuizList
                quizzes={classQuizzes}
                isTeacher={isTeacher}
                onOpenGenerate={() => setGenerateDialogOpen(true)}
                selectedClassroomId={selectedClassroomId}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="notes" className="pt-6">
            <motion.div variants={tabContentVariants} initial="initial" animate="animate">
              <NotesList
                documents={classDocs}
                isTeacher={isTeacher}
                onOpenUpload={() => setUploadDialogOpen(true)}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="feed" className="pt-6">
            <motion.div variants={tabContentVariants} initial="initial" animate="animate">
              <ActivityFeed activities={classActivities} />
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics" className="pt-6">
            <motion.div variants={tabContentVariants} initial="initial" animate="animate">
              <AnalyticsTab analytics={classAnalytics} />
            </motion.div>
          </TabsContent>

          <TabsContent value="roster" className="pt-6">
            <motion.div variants={tabContentVariants} initial="initial" animate="animate">
              <RosterTab members={classMembers} isTeacher={isTeacher} classroomId={currentClass?.id || selectedClassroomId} />
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <CreateClassroomDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <JoinClassroomDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
      {currentClass && (
        <>
          <UploadNotesDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            classroomId={currentClass.id}
          />
          <GenerateQuizDialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
            onGenerated={() => setActiveTab("quizzes")}
          />
        </>
      )}
    </div>
  );
};
