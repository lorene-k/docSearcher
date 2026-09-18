import axios, { AxiosError, AxiosProgressEvent, InternalAxiosRequestConfig } from "axios";
import type { Conversation, Document, Group, Invite, Me, Member, Message, Org, Role, Visibility } from "@/lib/model";
import * as placeholders from "@/lib/placeholders";
import { getSessionEmail, setSessionEmail } from "@/lib/session";

export type { Conversation, Document, Group, Invite, Me, Member, Message, Org, Role, Visibility };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:8000";
const api = axios.create({ baseURL: API_URL, withCredentials: true });

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<void> | null = null;

const UNAUTHENTICATED_ENDPOINTS = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/confirm", "/auth/resend"];

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableRequestConfig;
        if (
            error.response?.status !== 401 ||
            originalRequest._retried ||
            UNAUTHENTICATED_ENDPOINTS.includes(originalRequest.url ?? "")
        ) {
            throw error;
        }
        originalRequest._retried = true;

        try {
            refreshPromise ??= refresh();
            await refreshPromise;
            return api(originalRequest);
        } catch (refreshError) {
            if (typeof window !== "undefined") {
                setSessionEmail(null);
                window.location.href = "/login";
            }
            throw refreshError;
        } finally {
            refreshPromise = null;
        }
    },
);

export type Source = { filename: string; chunk_text: string; relevance?: "high" | "low" };
export type ChatResponse = { answer: string; sources: Source[] };
export type UploadResponse = { message: string; chunks_created: number };
export type AuthResponse = { email: string };
export type SignupProfile = placeholders.SignupProfile;

// The backend answers 403 only when the password was right but the address is unconfirmed
export const isEmailNotConfirmedError = (error: unknown): boolean =>
    axios.isAxiosError(error) && error.response?.status === 403;

// Backend errors carry a stable code in `detail`, which callers turn into a message
export const errorCode = (error: unknown): string => {
    if (!axios.isAxiosError(error)) return "";
    const detail: unknown = error.response?.data?.detail;
    return typeof detail === "string" ? detail : "";
};

// A route the backend has not implemented yet answers 404 (unknown path) or 405 (known path, other method)
const isNotImplemented = (error: unknown): boolean =>
    axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405);

// Calls the planned endpoint and, until it exists, answers from the local placeholder instead
const withPlaceholder = async <T>(request: () => Promise<T>, fallback: () => T): Promise<T> => {
    try {
        return await request();
    } catch (error) {
        if (!isNotImplemented(error)) throw error;
        placeholders.markUsed();
        return fallback();
    }
};

const me = (): string => getSessionEmail() ?? "";

// ── auth ─────────────────────────────────────────────────────────────────────

export const register = async (email: string, password: string, profile: SignupProfile): Promise<void> => {
    const { data } = await api.post("/auth/register", { email, password, ...profile });
    // Until the backend stores the profile and creates the org, remember them here
    if (!("org" in data)) placeholders.ensureUser(email, profile);
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
};

export const confirmEmail = async (tokenHash: string, type: string): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/confirm", { token_hash: tokenHash, type });
    return data;
};

export const resendConfirmation = async (email: string): Promise<void> => {
    await api.post("/auth/resend", { email });
};

export const refresh = async (): Promise<void> => {
    await api.post("/auth/refresh");
};

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

export const getMe = (): Promise<Me> =>
    withPlaceholder(
        async () => (await api.get("/auth/me")).data,
        () => placeholders.getMe(me()),
    );

export const updateProfile = (changes: { first_name: string; last_name: string }): Promise<Me> =>
    withPlaceholder(
        async () => (await api.patch("/auth/me", changes)).data,
        () => placeholders.updateProfile(me(), changes),
    );

export const changePassword = (currentPassword: string, newPassword: string): Promise<void> =>
    withPlaceholder(
        async () => {
            await api.post("/auth/password", { current_password: currentPassword, new_password: newPassword });
        },
        () => undefined,
    );

// Placeholder only: preview the app as another role
export const previewRole = (role: Role): Me => placeholders.setOwnRole(me(), role);

// ── organization ─────────────────────────────────────────────────────────────

export const renameOrg = (name: string): Promise<Org> =>
    withPlaceholder(
        async () => (await api.patch("/org", { name })).data,
        () => placeholders.renameOrg(me(), name),
    );

export const getMembers = (): Promise<Member[]> =>
    withPlaceholder(
        async () => (await api.get("/org/members")).data,
        () => placeholders.listMembers(me()),
    );

export const setMemberRole = (userId: string, role: "admin" | "member"): Promise<Member[]> =>
    withPlaceholder(
        async () => (await api.patch(`/org/members/${userId}`, { role })).data,
        () => placeholders.setRole(me(), userId, role),
    );

export const transferOwnership = (userId: string): Promise<Member[]> =>
    withPlaceholder(
        async () => (await api.post("/org/transfer", { user_id: userId })).data,
        () => placeholders.transferOwnership(me(), userId),
    );

export const removeMember = (userId: string): Promise<Member[]> =>
    withPlaceholder(
        async () => (await api.delete(`/org/members/${userId}`)).data,
        () => placeholders.removeMember(me(), userId),
    );

export const getInvites = (): Promise<Invite[]> =>
    withPlaceholder(
        async () => (await api.get("/org/invites")).data,
        () => placeholders.listInvites(me()),
    );

export const createInvite = (email: string): Promise<Invite[]> =>
    withPlaceholder(
        async () => (await api.post("/org/invites", { email })).data,
        () => placeholders.createInvite(me(), email),
    );

export const revokeInvite = (inviteId: string): Promise<Invite[]> =>
    withPlaceholder(
        async () => (await api.delete(`/org/invites/${inviteId}`)).data,
        () => placeholders.revokeInvite(me(), inviteId),
    );

export const getMyInvites = (): Promise<Invite[]> =>
    withPlaceholder(
        async () => (await api.get("/invites")).data,
        () => placeholders.listMyInvites(me()),
    );

export const acceptInvite = (inviteId: string): Promise<Me> =>
    withPlaceholder(
        async () => (await api.post(`/invites/${inviteId}/accept`)).data,
        () => placeholders.acceptInvite(me(), inviteId),
    );

export const declineInvite = (inviteId: string): Promise<void> =>
    withPlaceholder(
        async () => {
            await api.delete(`/invites/${inviteId}`);
        },
        () => placeholders.declineInvite(me(), inviteId),
    );

// ── groups ───────────────────────────────────────────────────────────────────

export const getGroups = (): Promise<Group[]> =>
    withPlaceholder(
        async () => (await api.get("/org/groups")).data,
        () => placeholders.listGroups(me()),
    );

export const createGroup = (name: string): Promise<Group[]> =>
    withPlaceholder(
        async () => (await api.post("/org/groups", { name })).data,
        () => placeholders.createGroup(me(), name),
    );

export const renameGroup = (groupId: string, name: string): Promise<Group[]> =>
    withPlaceholder(
        async () => (await api.patch(`/org/groups/${groupId}`, { name })).data,
        () => placeholders.renameGroup(me(), groupId, name),
    );

export const deleteGroup = (groupId: string): Promise<Group[]> =>
    withPlaceholder(
        async () => (await api.delete(`/org/groups/${groupId}`)).data,
        () => placeholders.deleteGroup(me(), groupId),
    );

export const setGroupMembers = (groupId: string, memberIds: string[]): Promise<Group[]> =>
    withPlaceholder(
        async () => (await api.put(`/org/groups/${groupId}/members`, { member_ids: memberIds })).data,
        () => placeholders.setGroupMembers(me(), groupId, memberIds),
    );

// ── documents ────────────────────────────────────────────────────────────────

export type UploadOptions = { visibility: Visibility; groupId: string | null };

export const uploadDocument = async (
    file: File,
    options: UploadOptions,
    onProgress?: (pct: number) => void,
): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", options.visibility);
    if (options.groupId) formData.append("group_id", options.groupId);
    const { data } = await api.post("/upload", formData, {
        onUploadProgress: (e: AxiosProgressEvent) => {
            if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
    });
    // Until the backend stores visibility, remember it here
    if (!("visibility" in data)) placeholders.rememberDocument(me(), file.name, options.visibility, options.groupId);
    return data;
};

// Today the backend returns bare filenames; once it returns document objects they pass straight through
export const getDocuments = async (): Promise<Document[]> => {
    const { data } = await api.get<(string | Document)[]>("/documents");
    const filenames = data.filter((item): item is string => typeof item === "string");
    if (filenames.length < data.length) return data.filter((item): item is Document => typeof item !== "string");
    placeholders.markUsed();
    return placeholders.describeDocuments(me(), filenames);
};

export const deleteDocument = async (document: Document): Promise<void> => {
    await api.delete(`/documents/${encodeURIComponent(document.filename)}`);
    placeholders.forgetDocument(document.filename);
};

export const setDocumentVisibility = (
    document: Document,
    visibility: Visibility,
    groupId: string | null,
): Promise<void> =>
    withPlaceholder(
        async () => {
            await api.patch(`/documents/${encodeURIComponent(document.id)}`, { visibility, group_id: groupId });
        },
        () => placeholders.setDocumentVisibility(me(), document.filename, visibility, groupId),
    );

// ── chat ─────────────────────────────────────────────────────────────────────

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
