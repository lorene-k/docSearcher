const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
};

export const chat = async (question: string): Promise<ChatResponse> => {
    const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question }),
    });
    if (!res.ok) throw new Error("Chat request failed");
    return res.json();
};

export const getDocuments = async (): Promise<string[]> => {
    const res = await fetch(`${API_URL}/documents`);
    if (!res.ok) throw new Error("Failed to fetch documents");
    return res.json();
};
