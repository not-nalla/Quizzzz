import { create } from "zustand";
import {
  Classroom,
  DocumentRecord,
  ChunkPreview,
  Quiz,
  Question,
  Attempt,
  ChatMessage,
  ClassAnalytics,
  ClassroomMember,
  ActivityItem,
  GenerateQuizRequest,
  PublishQuizRequest,
  AnswerReview,
} from "@/types";
import {
  classroomApi,
  documentApi,
  quizApi,
  attemptApi,
  chatApi,
  analyticsApi,
} from "@/api/client";
import { toast } from "sonner";

interface ClassroomState {
  classrooms: Classroom[];
  selectedClassroomId: string;
  documents: DocumentRecord[];
  chunks: Record<string, ChunkPreview[]>;
  quizzes: Quiz[];
  attempts: Attempt[];
  chatMessages: Record<string, ChatMessage[]>;
  analytics: Record<string, ClassAnalytics>;
  members: Record<string, ClassroomMember[]>;
  activities: Record<string, ActivityItem[]>;
  isLoadingClassrooms: boolean;
  isLoadingQuizzes: boolean;
  isLoadingDocuments: boolean;

  lastResult: { attempt: Attempt; reviews: AnswerReview[]; resultsVisible: boolean } | null;

  setSelectedClassroomId: (id: string) => void;

  fetchClassrooms: () => Promise<void>;
  createClassroom: (data: {
    name: string;
    subject: string;
    semester: string;
    batch?: string;
    description?: string;
  }) => Promise<Classroom | null>;
  joinClassroom: (code: string, password?: string) => Promise<boolean>;

  fetchDocuments: (classroomId: string) => Promise<void>;
  uploadDocument: (
    classroomId: string,
    file: File,
    unit?: string,
    topic?: string
  ) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  getChunksForDoc: (docId: string) => ChunkPreview[];
  fetchChunks: (docId: string) => Promise<ChunkPreview[]>;

  fetchQuizzes: (classroomId: string) => Promise<void>;
  fetchQuiz: (quizId: string) => Promise<Quiz | null>;
  generateQuiz: (req: GenerateQuizRequest & { docId?: string }) => Promise<Quiz>;
  updateQuestion: (quizId: string, qId: string, updated: Partial<Question>) => Promise<void>;
  regenerateQuestion: (quizId: string, qId: string) => Promise<void>;
  deleteQuestion: (quizId: string, qId: string) => Promise<void>;
  publishQuiz: (quizId: string, settings: PublishQuizRequest) => Promise<boolean>;

  currentAttempt: Attempt | null;
  startAttempt: (quizId: string, studentId: string) => Promise<Attempt>;
  saveAnswer: (attemptId: string, qId: string, optId: string) => Promise<void>;
  recordTabSwitch: (attemptId: string) => void;
  submitAttempt: (attemptId: string) => Promise<Attempt>;

  isChatResponding: boolean;
  sendMessage: (classroomId: string, userText: string) => Promise<void>;
  fetchChatHistory: (classroomId: string) => Promise<void>;

  fetchMembers: (classroomId: string) => Promise<void>;
  fetchAnalytics: (classroomId: string) => Promise<void>;
  fetchActivity: (classroomId: string) => Promise<void>;
}

// Helper to map API classroom to frontend type
function mapClassroom(c: any): Classroom {
  return {
    id: c.id || c._id,
    name: c.name,
    subject: c.subject,
    semester: c.semester,
    batch: c.batch || "",
    description: c.description || "",
    teacherId: c.teacher_id || c.teacherId || "",
    teacherName: c.teacher_name || c.teacherName || "Instructor",
    classCode: c.class_code || c.classCode || "",
    joiningEnabled: c.joining_enabled !== false,
    chatbotEnabled: c.chatbot_enabled !== false,
    isArchived: c.is_archived || false,
    createdAt: c.created_at || new Date().toISOString(),
    memberCount: c.member_count || 0,
    quizCount: c.quiz_count || 0,
    documentCount: c.document_count || 0,
    role: c.role || "student",
  };
}

function mapQuiz(q: any): Quiz {
  return {
    id: q.id || q._id,
    classroomId: q.classroom_id || q.classroomId,
    classroomName: q.classroom_name || q.classroomName || "",
    title: q.title,
    status: q.status,
    totalMarks: q.total_marks || q.totalMarks || 0,
    questions: (q.questions || []).map((ques: any): Question => ({
      qId: ques.q_id || ques.qId,
      question: ques.question,
      options: (ques.options || []).map((opt: any) => ({
        optId: opt.opt_id || opt.optId,
        text: opt.text,
      })),
      correctOptId: ques.correct_opt_id || ques.correctOptId,
      explanation: ques.explanation || "",
      difficulty: ques.difficulty || "medium",
      topic: ques.topic || "",
      sourceChunkIds: ques.source_chunk_ids || ques.sourceChunkIds || [],
      sourceRefs: (ques.source_refs || ques.sourceRefs || []).map((ref: any) => ({
        docId: ref.doc_id || ref.docId,
        filename: ref.filename,
        page: ref.page,
      })),
    })),
    attemptCount: q.attempt_count || q.attemptCount || 0,
    locked: q.locked || false,
    createdAt: q.created_at || q.createdAt || new Date().toISOString(),
    publishedAt: q.published_at || q.publishedAt,
    questionCount: q.question_count || q.questions?.length || 0,
    settings: {
      startAt: q.settings?.start_at || q.settings?.startAt || new Date().toISOString(),
      deadline: q.settings?.deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
      durationMin: q.settings?.duration_min || q.settings?.durationMin || 25,
      attemptsAllowed: q.settings?.attempts_allowed || q.settings?.attemptsAllowed || 1,
      shuffleQuestions: q.settings?.shuffle_questions !== false,
      shuffleOptions: q.settings?.shuffle_options !== false,
      showResults: q.settings?.show_results || q.settings?.showResults || "immediate",
    },
  };
}

function mapDocument(d: any): DocumentRecord {
  return {
    id: d.id || d._id,
    classroomId: d.classroom_id || d.classroomId,
    filename: d.filename,
    fileType: d.file_type || d.fileType || "application/pdf",
    unit: d.unit || "",
    topic: d.topic || "",
    status: d.status || "ready",
    pageCount: d.page_count || d.pageCount || 1,
    chunkCount: d.chunk_count || d.chunkCount || 0,
    sizeBytes: d.size_bytes || d.sizeBytes || 0,
    createdAt: d.created_at || d.createdAt || new Date().toISOString(),
  };
}

export const useClassroomStore = create<ClassroomState>((set, get) => ({
  classrooms: [],
  selectedClassroomId: "",
  documents: [],
  chunks: {},
  quizzes: [],
  attempts: [],
  chatMessages: {},
  analytics: {},
  members: {},
  activities: {},
  isLoadingClassrooms: false,
  isLoadingQuizzes: false,
  isLoadingDocuments: false,
  currentAttempt: null,
  isChatResponding: false,
  lastResult: null,

  setSelectedClassroomId: (id: string) => set({ selectedClassroomId: id }),

  fetchClassrooms: async () => {
    set({ isLoadingClassrooms: true });
    try {
      const res = await classroomApi.list();
      const cls = (res.data || []).map(mapClassroom);
      set({
        classrooms: cls,
        selectedClassroomId: cls.length > 0 ? cls[0].id : "",
        isLoadingClassrooms: false,
      });
    } catch (err: any) {
      set({ isLoadingClassrooms: false });
      const msg = err?.response?.data?.detail || "Failed to load classrooms.";
      toast.error("Error", { description: msg });
    }
  },

  createClassroom: async (data) => {
    try {
      const res = await classroomApi.create(data);
      const newClass = mapClassroom(res.data);
      set((state) => ({
        classrooms: [newClass, ...state.classrooms],
        selectedClassroomId: newClass.id,
      }));
      toast.success("Classroom created!", { description: `Class code: ${newClass.classCode}` });
      return newClass;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to create classroom.";
      toast.error("Error", { description: msg });
      return null;
    }
  },

  joinClassroom: async (code: string) => {
    try {
      const res = await classroomApi.join({ class_code: code });
      const newClass = mapClassroom(res.data);
      set((state) => ({
        classrooms: state.classrooms.some((c) => c.id === newClass.id)
          ? state.classrooms.map((c) => c.id === newClass.id ? newClass : c)
          : [newClass, ...state.classrooms],
        selectedClassroomId: newClass.id,
      }));
      toast.success("Joined classroom!", { description: newClass.name });
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Invalid class code.";
      toast.error("Error", { description: msg });
      return false;
    }
  },

  fetchDocuments: async (classroomId: string) => {
    set({ isLoadingDocuments: true });
    try {
      const res = await documentApi.list(classroomId);
      const docs = (res.data || []).map(mapDocument);
      set((state) => ({
        documents: [
          ...state.documents.filter((d) => d.classroomId !== classroomId),
          ...docs,
        ],
        isLoadingDocuments: false,
      }));
    } catch {
      set({ isLoadingDocuments: false });
    }
  },

  uploadDocument: async (classroomId, file, unit, topic) => {
    const formData = new FormData();
    formData.append("file", file);
    if (unit) formData.append("unit", unit);
    if (topic) formData.append("topic", topic);

    // Optimistic UI
    const tempId = `temp_${Date.now()}`;
    const tempDoc: DocumentRecord = {
      id: tempId,
      classroomId,
      filename: file.name,
      fileType: file.type || "application/pdf",
      unit: unit || "Unit 1",
      topic: topic || "Course Notes",
      status: "processing",
      pageCount: 0,
      chunkCount: 0,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ documents: [tempDoc, ...state.documents] }));

    try {
      const res = await documentApi.upload(classroomId, formData);
      const doc = mapDocument(res.data);
      set((state) => ({
        documents: state.documents.map((d) => d.id === tempId ? doc : d),
      }));
      toast.success("Document uploaded & indexed!", {
        description: `${doc.chunkCount} semantic chunks ready for RAG.`,
      });
    } catch (err: any) {
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== tempId),
      }));
      const msg = err?.response?.data?.detail || "Document upload failed.";
      toast.error("Upload Failed", { description: msg });
    }
  },

  deleteDocument: async (docId: string) => {
    try {
      await documentApi.delete(docId);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== docId),
      }));
      toast.success("Document deleted.");
    } catch {
      toast.error("Failed to delete document.");
    }
  },

  getChunksForDoc: (docId: string) => {
    return get().chunks[docId] || [];
  },

  fetchQuizzes: async (classroomId: string) => {
    set({ isLoadingQuizzes: true });
    try {
      const res = await quizApi.list(classroomId);
      const qzs = (res.data || []).map(mapQuiz);
      set((state) => ({
        quizzes: [
          ...state.quizzes.filter((q) => q.classroomId !== classroomId),
          ...qzs,
        ],
        isLoadingQuizzes: false,
      }));
    } catch {
      set({ isLoadingQuizzes: false });
    }
  },

  fetchQuiz: async (quizId: string) => {
    try {
      const res = await quizApi.get(quizId);
      const quiz = mapQuiz(res.data);
      set((state) => ({
        quizzes: state.quizzes.some((q) => q.id === quiz.id)
          ? state.quizzes.map((q) => (q.id === quiz.id ? quiz : q))
          : [quiz, ...state.quizzes],
      }));
      return quiz;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to load quiz.";
      toast.error("Error", { description: msg });
      return null;
    }
  },

  fetchChunks: async (docId: string) => {
    const existing = get().chunks[docId];
    if (existing && existing.length > 0) return existing;
    try {
      const res = await documentApi.getChunks(docId);
      const chunks = (res.data || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        page: c.page,
        unit: c.unit,
        topic: c.topic,
        tokenCount: c.token_count,
      }));
      set((state) => ({
        chunks: { ...state.chunks, [docId]: chunks },
      }));
      return chunks;
    } catch {
      return [];
    }
  },

  generateQuiz: async (req: GenerateQuizRequest & { docId?: string }) => {
    try {
      const res = await quizApi.generate(req.classroomId, {
        title: req.title,
        count: req.count,
        difficulty: req.difficulty,
        unit: req.unit,
        docId: req.docId,
      });
      const newQuiz = mapQuiz(res.data);
      set((state) => ({
        quizzes: [newQuiz, ...state.quizzes],
      }));
      return newQuiz;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Quiz generation failed.";
      toast.error("Generation Failed", { description: msg });
      throw err;
    }
  },

  updateQuestion: async (quizId, qId, updated) => {
    // Optimistic update
    set((state) => ({
      quizzes: state.quizzes.map((q) => {
        if (q.id !== quizId) return q;
        return {
          ...q,
          questions: q.questions.map((ques) => (ques.qId === qId ? { ...ques, ...updated } : ques)),
        };
      }),
    }));
    try {
      await quizApi.updateQuestion(quizId, qId, updated);
    } catch {
      toast.error("Failed to update question.");
    }
  },

  regenerateQuestion: async (quizId, qId) => {
    try {
      const res = await quizApi.regenerateQuestion(quizId, qId);
      const q = res.data.question;
      const mappedQuestion: Question = {
        qId: q.q_id || q.qId,
        question: q.question,
        options: (q.options || []).map((opt: any) => ({
          optId: opt.opt_id || opt.optId,
          text: opt.text,
        })),
        correctOptId: q.correct_opt_id || q.correctOptId,
        explanation: q.explanation || "",
        difficulty: q.difficulty || "medium",
        topic: q.topic || "",
        sourceChunkIds: q.source_chunk_ids || q.sourceChunkIds || [],
        sourceRefs: (q.source_refs || q.sourceRefs || []).map((ref: any) => ({
          docId: ref.doc_id || ref.docId,
          filename: ref.filename,
          page: ref.page,
        })),
      };
      set((state) => ({
        quizzes: state.quizzes.map((quiz) => {
          if (quiz.id !== quizId) return quiz;
          return {
            ...quiz,
            questions: quiz.questions.map((ques) => (ques.qId === qId ? mappedQuestion : ques)),
          };
        }),
      }));
      toast.success("Question regenerated.");
    } catch {
      toast.error("Failed to regenerate question.");
    }
  },

  deleteQuestion: async (quizId, qId) => {
    try {
      await quizApi.deleteQuestion(quizId, qId);
      set((state) => ({
        quizzes: state.quizzes.map((q) => {
          if (q.id !== quizId) return q;
          const filtered = q.questions.filter((ques) => ques.qId !== qId);
          return { ...q, questions: filtered, totalMarks: filtered.length * 10 };
        }),
      }));
      toast.success("Question deleted.");
    } catch {
      toast.error("Failed to delete question.");
    }
  },

  publishQuiz: async (quizId, settings) => {
    console.log("[publishQuiz] Called with:", { quizId, settings });
    try {
      const res = await quizApi.publish(quizId, settings);
      console.log("[publishQuiz] Success response:", res.data);
      set((state) => ({
        quizzes: state.quizzes.map((q) => {
          if (q.id !== quizId) return q;
          return { ...q, status: "published" as const, publishedAt: new Date().toISOString(), settings: { ...q.settings, ...settings } };
        }),
      }));
      toast.success("Quiz published to students!");
      return true;
    } catch (err: any) {
      console.error("[publishQuiz] Error:", err);
      const msg = err?.response?.data?.detail || err?.message || "Failed to publish quiz.";
      toast.error("Publish Failed", { description: msg });
      return false;
    }
  },

  startAttempt: async (quizId: string, studentId: string) => {
    const res = await attemptApi.start(quizId);
    const data = res.data;
    const attempt: Attempt = {
      id: data.id || data.attempt_id,
      quizId,
      classroomId: get().selectedClassroomId,
      studentId,
      attemptNo: data.attempt_no || 1,
      startedAt: data.started_at || new Date().toISOString(),
      expiresAt: data.expires_at || new Date(Date.now() + 25 * 60000).toISOString(),
      answers: (data.answers || []).map((a: any) => ({
        qId: a.q_id || a.qId,
        selectedOptId: a.selected_opt_id || a.selectedOptId,
        answeredAt: a.answered_at || a.answeredAt || new Date().toISOString(),
      })),
      score: undefined,
      total: data.total || 100,
      percentage: undefined,
      tabSwitchCount: data.tab_switch_count || 0,
      status: "in_progress",
    };
    set({ currentAttempt: attempt });
    return attempt;
  },

  saveAnswer: async (attemptId: string, qId: string, optId: string) => {
    set((state) => {
      if (!state.currentAttempt || state.currentAttempt.id !== attemptId) return state;
      const existing = state.currentAttempt.answers.filter((a) => a.qId !== qId);
      return {
        currentAttempt: {
          ...state.currentAttempt,
          answers: [...existing, { qId, selectedOptId: optId, answeredAt: new Date().toISOString() }],
        },
      };
    });
    try {
      await attemptApi.autosave(attemptId, { q_id: qId, selected_opt_id: optId });
    } catch {
      // Silent - autosave is best-effort
    }
  },

  recordTabSwitch: (attemptId: string) => {
    set((state) => {
      if (!state.currentAttempt || state.currentAttempt.id !== attemptId) return state;
      return {
        currentAttempt: {
          ...state.currentAttempt,
          tabSwitchCount: state.currentAttempt.tabSwitchCount + 1,
        },
      };
    });
    // Fire telemetry API (non-blocking)
    attemptApi.telemetry(attemptId).catch(() => {});
  },

  submitAttempt: async (attemptId: string) => {
    const res = await attemptApi.submit(attemptId);
    const data = res.data;
    const a = data.attempt;
    const finalizedAttempt: Attempt = {
      id: a.id,
      quizId: a.quiz_id,
      classroomId: a.classroom_id,
      studentId: a.student_id,
      attemptNo: a.attempt_no,
      startedAt: a.started_at,
      expiresAt: a.expires_at,
      submittedAt: a.submitted_at,
      answers: (a.answers || []).map((ans: any) => ({
        qId: ans.q_id || ans.qId,
        selectedOptId: ans.selected_opt_id || ans.selectedOptId,
        answeredAt: ans.answered_at || ans.answeredAt || new Date().toISOString(),
      })),
      score: a.score,
      total: a.total,
      percentage: a.percentage,
      tabSwitchCount: a.tab_switch_count || 0,
      status: a.status,
    };
    const reviews: AnswerReview[] = (data.reviews || []).map((r: any) => ({
      qId: r.q_id || r.qId,
      question: r.question,
      options: (r.options || []).map((opt: any) => ({
        optId: opt.opt_id || opt.optId,
        text: opt.text,
      })),
      selectedOptId: r.selected_opt_id,
      correctOptId: r.correct_opt_id,
      explanation: r.explanation,
      topic: r.topic,
      difficulty: r.difficulty,
    }));
    const resultsVisible = data.results_visible ?? true;
    set((s) => ({
      currentAttempt: finalizedAttempt,
      attempts: [finalizedAttempt, ...s.attempts.filter((att) => att.id !== attemptId)],
      lastResult: { attempt: finalizedAttempt, reviews, resultsVisible },
    }));
    return finalizedAttempt;
  },

  sendMessage: async (classroomId: string, userText: string) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const existing = state.chatMessages[classroomId] || [];
      return {
        chatMessages: { ...state.chatMessages, [classroomId]: [...existing, userMsg] },
        isChatResponding: true,
      };
    });

    try {
      const history = (get().chatMessages[classroomId] || [])
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await chatApi.ask(classroomId, { message: userText, history });
      const msg = res.data.message;

      const assistantMsg: ChatMessage = {
        id: msg.id,
        role: "assistant",
        content: msg.content,
        refusal: msg.refusal || false,
        citations: (msg.citations || []).map((c: any) => ({
          docId: c.doc_id,
          filename: c.filename,
          page: c.page,
          text: c.text,
          score: c.score,
        })),
        createdAt: msg.created_at || new Date().toISOString(),
      };

      set((state) => {
        const existing = state.chatMessages[classroomId] || [];
        return {
          chatMessages: { ...state.chatMessages, [classroomId]: [...existing, assistantMsg] },
          isChatResponding: false,
        };
      });
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        refusal: false,
        createdAt: new Date().toISOString(),
      };
      set((state) => {
        const existing = state.chatMessages[classroomId] || [];
        return {
          chatMessages: { ...state.chatMessages, [classroomId]: [...existing, errMsg] },
          isChatResponding: false,
        };
      });
    }
  },

  fetchChatHistory: async (classroomId: string) => {
    try {
      const res = await chatApi.history(classroomId);
      const msgs: ChatMessage[] = (res.data || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        refusal: m.refusal || false,
        citations: (m.citations || []).map((c: any) => ({
          docId: c.doc_id,
          filename: c.filename,
          page: c.page,
          text: c.text,
          score: c.score,
        })),
        createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      }));
      set((state) => ({
        chatMessages: { ...state.chatMessages, [classroomId]: msgs },
      }));
    } catch {
      // Silent fail - history is non-critical
    }
  },

  fetchMembers: async (classroomId: string) => {
    try {
      const res = await classroomApi.getMembers(classroomId);
      const members = (res.data || []).map((m: any) => ({
        userId: m.user_id || m.userId || m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        rollNo: m.roll_no || m.rollNo,
        joinedAt: m.joined_at || m.joinedAt || new Date().toISOString(),
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=2563eb&color=fff&size=40`,
      }));
      set((state) => ({ members: { ...state.members, [classroomId]: members } }));
    } catch {
      // Silent
    }
  },

  fetchAnalytics: async (classroomId: string) => {
    try {
      const res = await analyticsApi.get(classroomId);
      set((state) => ({ analytics: { ...state.analytics, [classroomId]: res.data } }));
    } catch {
      // Silent
    }
  },

  fetchActivity: async (classroomId: string) => {
    try {
      const res = await classroomApi.getFeed(classroomId);
      const acts = (res.data || []).map((a: any) => ({
        id: a.id || a._id,
        type: a.type,
        title: a.title,
        detail: a.detail,
        actor: a.actor,
        createdAt: a.created_at || a.createdAt || new Date().toISOString(),
      }));
      set((state) => ({ activities: { ...state.activities, [classroomId]: acts } }));
    } catch {
      // Silent
    }
  },
}));
