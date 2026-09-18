import { fireEvent, render, screen } from "@testing-library/react";
import ChatPage from "@/app/chat/page";

jest.mock("@/components/AuthGuard", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/components/ChatWindow", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/ConversationSidebar", () => ({
    __esModule: true,
    default: ({ onSelect }: { onSelect: (id: string) => void }) => (
        <button onClick={() => onSelect("c2")}>open c2</button>
    ),
}));
const mockSelectConversation = jest.fn();
jest.mock("@/hooks/useConversations", () => ({
    useConversations: () => ({
        conversations: [],
        activeId: null,
        historyMessages: [],
        loading: false,
        selectConversation: mockSelectConversation,
        newConversation: jest.fn(),
    }),
}));
const mockReset = jest.fn();
jest.mock("@/hooks/useChat", () => ({
    useChat: () => ({ messages: [], loading: false, error: "", sendMessage: jest.fn(), reset: mockReset }),
}));

const CONFIRMED_MESSAGE = "Email confirmed. You're logged in.";

describe("ChatPage", () => {
    it("shows the email-confirmed toast after confirmation and cleans the URL", () => {
        window.history.pushState(null, "", "/chat?email_confirmed=1");

        render(<ChatPage />);

        expect(screen.queryByText(CONFIRMED_MESSAGE)).not.toBeNull();
        expect(window.location.search).toBe("");
    });

    it("forgets the messages sent so far when another conversation is opened", () => {
        window.history.pushState(null, "", "/chat");
        render(<ChatPage />);

        fireEvent.click(screen.getByText("open c2"));

        expect(mockReset).toHaveBeenCalled();
        expect(mockSelectConversation).toHaveBeenCalledWith("c2");
    });

    it("shows no toast on a normal visit", () => {
        window.history.pushState(null, "", "/chat");

        render(<ChatPage />);

        expect(screen.queryByText(CONFIRMED_MESSAGE)).toBeNull();
    });
});
