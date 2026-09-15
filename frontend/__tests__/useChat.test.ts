import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/useChat";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => ({
    chat: jest.fn(),
}));

const mockChat = api.chat as jest.MockedFunction<typeof api.chat>;

describe("useChat", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("initialises with empty state", () => {
        const { result } = renderHook(() => useChat());
        expect(result.current.messages).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("");
    });

    it("adds user message and bot reply on success", async () => {
        mockChat.mockResolvedValueOnce({
            answer: "Here is the answer.",
            sources: [{ filename: "doc.pdf", chunk_text: "...", relevance: "high" }],
        });

        const { result } = renderHook(() => useChat());

        await act(async () => {
            await result.current.sendMessage("What is the policy?");
        });

        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0]).toEqual({ text: "What is the policy?", sender: "user" });
        expect(result.current.messages[1].sender).toBe("bot");
        expect(result.current.messages[1].text).toBe("Here is the answer.");
        expect(result.current.messages[1].sources).toHaveLength(1);
        expect(result.current.loading).toBe(false);
    });

    it("keeps each source's relevance so the UI can show high and low confidence", async () => {
        const sources = [
            { filename: "high.pdf", chunk_text: "strong match", relevance: "high" as const },
            { filename: "low.pdf", chunk_text: "weak match", relevance: "low" as const },
        ];
        mockChat.mockResolvedValueOnce({ answer: "ok", sources });

        const { result } = renderHook(() => useChat());

        await act(async () => {
            await result.current.sendMessage("question");
        });

        expect(result.current.messages[1].sources).toEqual(sources);
    });

    it("passes conversationId to chat()", async () => {
        mockChat.mockResolvedValueOnce({ answer: "ok", sources: [] });

        const { result } = renderHook(() => useChat());

        await act(async () => {
            await result.current.sendMessage("question", "conv-123");
        });

        expect(mockChat).toHaveBeenCalledWith("question", "conv-123");
    });

    it("sets error message on API failure", async () => {
        mockChat.mockRejectedValueOnce(new Error("Network error"));

        const { result } = renderHook(() => useChat());

        await act(async () => {
            await result.current.sendMessage("question");
        });

        expect(result.current.error).toBe("Something went wrong. Please try again.");
        expect(result.current.messages).toHaveLength(1); // only user message added
        expect(result.current.loading).toBe(false);
    });

    it("clears error before each new message", async () => {
        mockChat.mockRejectedValueOnce(new Error("fail"));
        const { result } = renderHook(() => useChat());

        await act(async () => {
            await result.current.sendMessage("q1");
        });
        expect(result.current.error).toBeTruthy();

        mockChat.mockResolvedValueOnce({ answer: "ok", sources: [] });
        await act(async () => {
            await result.current.sendMessage("q2");
        });
        expect(result.current.error).toBe("");
    });

    it("sets loading to true during fetch then false after", async () => {
        let resolve!: (v: { answer: string; sources: [] }) => void;
        mockChat.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));

        const { result } = renderHook(() => useChat());

        act(() => {
            result.current.sendMessage("question");
        });
        expect(result.current.loading).toBe(true);

        await act(async () => {
            resolve({ answer: "done", sources: [] });
        });
        expect(result.current.loading).toBe(false);
    });
});
