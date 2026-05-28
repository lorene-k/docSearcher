import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const api = axios.create({ baseURL: API_URL });

export type Source = {
    filename: string;
    chunk_text: string;
};

export type ChatResponse = {
    answer: string;
    sources: Source[];
};

export const uploadDocument = async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/upload", formData);
    return data;
};

export const chat = async (question: string): Promise<ChatResponse> => {
    const { data } = await api.post("/chat", { text: question });
    return data;
};

export const getDocuments = async (): Promise<string[]> => {
    const { data } = await api.get("/documents");
    return data;
};
