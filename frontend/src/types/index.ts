export type Role = "teacher" | "student";

export type QuizStatus = "draft" | "published" | "closed";
export type Difficulty = "easy" | "medium" | "hard";
export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";
export type AttemptStatus = "in_progress" | "submitted" | "auto_submitted";
export type ResultsVisibility = "immediate" | "after_deadline";
export type ActivityType = "announcement" | "quiz_published" | "document" | "joined";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  rollNo?: string;
  isApproved?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Classroom {
  id: string;
  name: string;
  subject: string;
  semester: string;
  batch?: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  classCode: string;
  joiningEnabled: boolean;
  chatbotEnabled: boolean;
  isArchived: boolean;
  createdAt: string;
  memberCount: number;
  quizCount: number;
  documentCount: number;
  role: Role;
}

export interface ClassroomMember {
  userId: string;
  name: string;
  email: string;
  role: Role;
  rollNo?: string;
  department?: string;
  joinedAt: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string;
  actor: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  classroomId: string;
  filename: string;
  fileType: string;
  unit?: string;
  topic?: string;
  status: DocumentStatus;
  pageCount: number;
  chunkCount: number;
  sizeBytes: number;
  createdAt: string;
}

export interface ChunkPreview {
  id: string;
  text: string;
  page: number;
  unit?: string;
  topic?: string;
  tokenCount: number;
}

export interface QuizOption {
  optId: string;
  text: string;
}

export interface SourceRef {
  docId: string;
  filename: string;
  page: number;
}

export interface Question {
  qId: string;
  question: string;
  options: QuizOption[];
  correctOptId: string;
  explanation: string;
  difficulty: Difficulty;
  topic: string;
  sourceChunkIds: string[];
  sourceRefs: SourceRef[];
}

export type StudentQuestion = Omit<Question, "correctOptId" | "explanation" | "sourceChunkIds" | "sourceRefs">;

export interface QuizSettings {
  startAt: string;
  deadline: string;
  durationMin: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: ResultsVisibility;
}

export interface Quiz {
  id: string;
  classroomId: string;
  classroomName: string;
  title: string;
  status: QuizStatus;
  totalMarks: number;
  questions: Question[];
  settings: QuizSettings;
  createdAt: string;
  publishedAt?: string;
  attemptCount: number;
  locked: boolean;
  questionCount?: number;
}

export interface StudentQuiz {
  id: string;
  classroomId: string;
  classroomName: string;
  title: string;
  status: QuizStatus;
  totalMarks: number;
  questionCount: number;
  settings: QuizSettings;
  createdAt: string;
  publishedAt?: string;
  attemptsUsed: number;
  attemptsAllowed: number;
  bestScore?: number;
  availability: "not_open" | "open" | "closed" | "expired";
}

export interface QuizDetailPayload {
  quiz: StudentQuiz;
  questions?: StudentQuestion[];
}

export interface AttemptAnswer {
  qId: string;
  selectedOptId: string;
  answeredAt: string;
}

export interface Attempt {
  id: string;
  quizId: string;
  classroomId: string;
  studentId: string;
  attemptNo: number;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  answers: AttemptAnswer[];
  score?: number;
  total: number;
  percentage?: number;
  tabSwitchCount: number;
  status: AttemptStatus;
}

export interface AttemptStartPayload {
  attempt: Attempt;
  quiz: StudentQuiz;
  questions: StudentQuestion[];
}

export interface AnswerReview {
  qId: string;
  question: string;
  options: QuizOption[];
  selectedOptId?: string;
  correctOptId: string;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
}

export interface AttemptResultPayload {
  attempt: Attempt;
  reviews: AnswerReview[];
  resultsVisible: boolean;
}

export interface GenerateQuizRequest {
  classroomId: string;
  title: string;
  count: number;
  difficulty: Difficulty | "mixed";
  unit?: string;
  docId?: string;
}

export interface PublishQuizRequest {
  startAt: string;
  deadline: string;
  durationMin: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: ResultsVisibility;
}

export interface Citation {
  docId: string;
  filename: string;
  page: number;
  text: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  refusal?: boolean;
  createdAt: string;
}

export interface AskRequest {
  classroomId: string;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}

export interface AskResponse {
  message: ChatMessage;
  remainingHourly: number;
}

export interface ClassAnalytics {
  classroomId: string;
  totalStudents: number;
  totalAttempts: number;
  averageScore: number;
  participationRate: number;
  quizzesPublished: number;
  documentsReady: number;
  distribution: { label: string; count: number }[];
  questionAccuracy: {
    qId: string;
    question: string;
    difficulty: Difficulty;
    correctRate: number;
    attempts: number;
  }[];
  recentResults: {
    studentName: string;
    rollNo?: string;
    quizTitle: string;
    score: number;
    total: number;
    percentage: number;
    submittedAt: string;
  }[];
}

export interface QuizGenerateProgress {
  step: string;
  done: number;
  total: number;
}
