import { renderHook, act, waitFor } from "@testing-library/react";
import { useConversations } from "@/hooks/useConversations";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => ({
    getConversations: jest.fn(),
    getConversationMessages: jest.fn(),
    createConversation: jest.fn(),
}));

const mockGetConversations = jest.mocked(api.getConversations);
const mockGetMessages = jest.mocked(api.getConversationMessages);

const message = (id: string): api.Message => ({
    id,
    conversation_id: id,
    role: "assistant",
    text: id,
    sources: [],
    created_at: "2026-01-01",
});

describe("useConversations", () => {
    beforeEach(() => jest.clearAllMocks());

    it("reports a load failure instead of showing an empty sidebar", async () => {
        mockGetConversations.mockRejectedValueOnce(new Error("500"));

        const { result } = renderHook(() => useConversations());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe("Could not load your conversations.");
    });

    it("retry clears the error and loads again", async () => {
        mockGetConversations.mockRejectedValueOnce(new Error("500"));
        const { result } = renderHook(() => useConversations());
        await waitFor(() => expect(result.current.error).not.toBe(""));

        mockGetConversations.mockResolvedValueOnce([{ id: "c1", user_id: "u1", created_at: "2026-01-01" }]);
        act(() => result.current.retry());

        await waitFor(() => expect(result.current.conversations).toHaveLength(1));
        expect(result.current.error).toBe("");
    });

    it("ignores a slow answer for a conversation that is no longer the open one", async () => {
        mockGetConversations.mockResolvedValueOnce([]);
        const { result } = renderHook(() => useConversations());
        await waitFor(() => expect(result.current.loading).toBe(false));

        let resolveSlow: (messages: api.Message[]) => void = () => {};
        mockGetMessages
            .mockImplementationOnce(() => new Promise((resolve) => (resolveSlow = resolve)))
            .mockResolvedValueOnce([message("second")]);

        await act(async () => {
            const first = result.current.selectConversation("c1");
            await result.current.selectConversation("c2");
            resolveSlow([message("first")]);
            await first;
        });

        expect(result.current.activeId).toBe("c2");
        expect(result.current.historyMessages).toEqual([message("second")]);
    });
});
