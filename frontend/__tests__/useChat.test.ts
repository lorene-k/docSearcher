import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/useChat";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => ({
    chat: jest.fn(),
}));

const mockChat = jest.mocked(api.chat);

type ChatResult = { current: ReturnType<typeof useChat> };

const renderChat = (): ChatResult => renderHook(() => useChat()).result;

const send = async (result: ChatResult, question: string, conversationId?: string): Promise<void> => {
    await act(async () => {
        await result.current.sendMessage(question, conversationId);
    });
};

describe("useChat", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("initialises with empty state", () => {
        const result = renderChat();
        expect(result.current.messages).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("");
    });

    it("adds user message and bot reply on success", async () => {
        mockChat.mockResolvedValueOnce({
            answer: "Here is the answer.",
            sources: [{ filename: "doc.pdf", chunk_text: "...", relevance: "high" }],
        });
        const result = renderChat();

        await send(result, "What is the policy?");

        const [userMessage, botMessage] = result.current.messages;
        expect(result.current.messages).toHaveLength(2);
        expect(userMessage).toEqual({ text: "What is the policy?", role: "user" });
        expect(botMessage.role).toBe("assistant");
        expect(botMessage.text).toBe("Here is the answer.");
        expect(botMessage.sources).toHaveLength(1);
        expect(result.current.loading).toBe(false);
    });

    it("keeps each source's relevance so the UI can show high and low confidence", async () => {
        const sources = [
            { filename: "high.pdf", chunk_text: "strong match", relevance: "high" as const },
            { filename: "low.pdf", chunk_text: "weak match", relevance: "low" as const },
        ];
        mockChat.mockResolvedValueOnce({ answer: "ok", sources });
        const result = renderChat();

        await send(result, "question");

        expect(result.current.messages[1].sources).toEqual(sources);
    });

    it("passes conversationId to chat()", async () => {
        mockChat.mockResolvedValueOnce({ answer: "ok", sources: [] });
        const result = renderChat();

        await send(result, "question", "conv-123");

        expect(mockChat).toHaveBeenCalledWith("question", "conv-123");
    });

    it("sets error message on API failure and keeps only the user message", async () => {
        mockChat.mockRejectedValueOnce(new Error("Network error"));
        const result = renderChat();

        await send(result, "question");

        expect(result.current.error).toBe("Something went wrong. Please try again.");
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.loading).toBe(false);
    });

    it("clears error before each new message", async () => {
        mockChat.mockRejectedValueOnce(new Error("fail"));
        const result = renderChat();

        await send(result, "q1");
        expect(result.current.error).toBeTruthy();

        mockChat.mockResolvedValueOnce({ answer: "ok", sources: [] });
        await send(result, "q2");
        expect(result.current.error).toBe("");
    });

    it("reset forgets the messages and the error", async () => {
        mockChat.mockRejectedValueOnce(new Error("fail"));
        const result = renderChat();
        await send(result, "q1");

        act(() => result.current.reset());

        expect(result.current.messages).toEqual([]);
        expect(result.current.error).toBe("");
    });

    it("sets loading to true during fetch then false after", async () => {
        let resolveChat!: (response: { answer: string; sources: [] }) => void;
        mockChat.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveChat = resolve;
                }),
        );
        const result = renderChat();

        act(() => {
            result.current.sendMessage("question");
        });
        expect(result.current.loading).toBe(true);

        await act(async () => {
            resolveChat({ answer: "done", sources: [] });
        });
        expect(result.current.loading).toBe(false);
    });
});
