import axios from "axios";

// Base API configuration
export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor: attaches Bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("syllabusiq_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handles 401 and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("syllabusiq_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post("/api/v1/auth/refresh", { refresh_token: refreshToken });
          const newAccessToken = res.data.access_token;
          localStorage.setItem("syllabusiq_access_token", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem("syllabusiq_access_token");
          localStorage.removeItem("syllabusiq_refresh_token");
        }
      }
    }
    return Promise.reject(error);
  }
);

// Typed API services
export const authApi = {
  login: (data: { email: string; password: string; role?: string }) =>
    apiClient.post("/auth/login", data),
  register: (data: { name: string; email: string; password: string; role: string; invite_code?: string; roll_no?: string }) =>
    apiClient.post("/auth/register", data),
  googleAuth: (data: { id_token: string; role?: string; invite_code?: string }) =>
    apiClient.post("/auth/google", data),
  getMe: () => apiClient.get("/auth/me"),
};

export const classroomApi = {
  list: () => apiClient.get("/classrooms"),
  get: (id: string) => apiClient.get(`/classrooms/${id}`),
  create: (data: { name: string; subject: string; semester: string; batch?: string; description?: string }) =>
    apiClient.post("/classrooms", data),
  join: (data: { class_code: string; password?: string }) =>
    apiClient.post("/classrooms/join", data),
  getMembers: (id: string) => apiClient.get(`/classrooms/${id}/members`),
  evictMember: (classroomId: string, userId: string) =>
    apiClient.delete(`/classrooms/${classroomId}/members/${userId}`),
  getFeed: (id: string) => apiClient.get(`/classrooms/${id}/feed`),
};

export const documentApi = {
  list: (classroomId: string) => apiClient.get(`/classrooms/${classroomId}/documents`),
  upload: (classroomId: string, formData: FormData) =>
    apiClient.post(`/classrooms/${classroomId}/documents/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getChunks: (docId: string) => apiClient.get(`/documents/${docId}/chunks`),
  delete: (docId: string) => apiClient.delete(`/documents/${docId}`),
};

export const quizApi = {
  list: (classroomId: string) => apiClient.get(`/classrooms/${classroomId}/quizzes`),
  get: (quizId: string) => apiClient.get(`/quizzes/${quizId}`),
  generate: (classroomId: string, data: { title: string; count: number; difficulty: string; unit?: string; docId?: string }) =>
    apiClient.post(`/classrooms/${classroomId}/quizzes/generate`, { classroom_id: classroomId, ...data }),
  updateQuestion: (quizId: string, qId: string, data: any) =>
    apiClient.put(`/quizzes/${quizId}/questions/${qId}`, data),
  regenerateQuestion: (quizId: string, qId: string) =>
    apiClient.post(`/quizzes/${quizId}/questions/${qId}/regenerate`),
  deleteQuestion: (quizId: string, qId: string) =>
    apiClient.delete(`/quizzes/${quizId}/questions/${qId}`),
  publish: (quizId: string, data: any) =>
    apiClient.post(`/quizzes/${quizId}/publish`, data),
};

export const attemptApi = {
  start: (quizId: string) => apiClient.post(`/quizzes/${quizId}/attempts/start`),
  autosave: (attemptId: string, data: { q_id: string; selected_opt_id: string }) =>
    apiClient.post(`/attempts/${attemptId}/autosave`, data),
  telemetry: (attemptId: string) =>
    apiClient.post(`/attempts/${attemptId}/telemetry`),
  submit: (attemptId: string) =>
    apiClient.post(`/attempts/${attemptId}/submit`),
};

export const chatApi = {
  ask: (classroomId: string, data: { message: string; history?: any[] }) =>
    apiClient.post(`/classrooms/${classroomId}/chat`, data),
  history: (classroomId: string) =>
    apiClient.get(`/classrooms/${classroomId}/chat/messages`),
};

export const analyticsApi = {
  get: (classroomId: string) => apiClient.get(`/classrooms/${classroomId}/analytics`),
  getExportCsvUrl: (classroomId: string) => `/api/v1/classrooms/${classroomId}/analytics/export-csv`,
};
