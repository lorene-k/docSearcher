import axios, { AxiosError, AxiosProgressEvent, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const api = axios.create({ baseURL: API_URL, withCredentials: true });

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableRequestConfig;
        if (error.response?.status !== 401 || originalRequest._retried || originalRequest.url === "/auth/refresh") {
            throw error;
        }
        originalRequest._retried = true;

        try {
            refreshPromise ??= refresh();
            await refreshPromise;
            return api(originalRequest);
        } catch (refreshError) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("user_email");
                window.location.href = "/login";
            }
            throw refreshError;
        } finally {
            refreshPromise = null;
        }
    }
);

export type Source = { filename: string; chunk_text: string; relevance?: "high" | "low" };
export type ChatResponse = { answer: string; sources: Source[] };
export type Conversation = { id: string; user_id: string; created_at: string };
export type Message = { id: string; conversation_id: string; role: "user" | "assistant"; text: string; sources: Source[]; created_at: string };
export type UploadResponse = { message: string; chunks_created: number };
export type AuthResponse = { email: string };

export const register = async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/register", { email, password });
    return data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
};

export const refresh = async (): Promise<void> => {
    await api.post("/auth/refresh");
};

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

export const uploadDocument = async (file: File, onProgress?: (pct: number) => void): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/upload", formData, {
        onUploadProgress: (e: AxiosProgressEvent) => {
            if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
    });
    return data;
};

export const getDocuments = async (): Promise<string[]> => {
    const { data } = await api.get("/documents");
    return data;
};

export const deleteDocument = async (filename: string): Promise<void> => {
    await api.delete(`/documents/${encodeURIComponent(filename)}`);
};

export const chat = async (question: string, conversationId?: string): Promise<ChatResponse> => {
    const { data } = await api.post("/chat", { text: question, conversation_id: conversationId ?? null });
    return data;
};

export const createConversation = async (): Promise<Conversation> => {
    const { data } = await api.post("/conversations");
    return data;
};

export const getConversations = async (): Promise<Conversation[]> => {
    const { data } = await api.get("/conversations");
    return data;
};

export const getConversationMessages = async (id: string): Promise<Message[]> => {
    const { data } = await api.get(`/conversations/${id}/messages`);
    return data;
};
