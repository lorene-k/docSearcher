import { render, screen } from "@testing-library/react";
import ChatPage from "@/app/chat/page";

jest.mock("@/components/AuthGuard", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/components/ChatWindow", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/ConversationSidebar", () => ({ __esModule: true, default: () => null }));
jest.mock("@/hooks/useConversations", () => ({
    useConversations: () => ({
        conversations: [],
        activeId: null,
        historyMessages: [],
        loading: false,
        selectConversation: jest.fn(),
        newConversation: jest.fn(),
    }),
}));

const CONFIRMED_MESSAGE = "Email confirmed. You're logged in.";

describe("ChatPage", () => {
    it("shows the email-confirmed toast after confirmation and cleans the URL", () => {
        window.history.pushState(null, "", "/chat?email_confirmed=1");

        render(<ChatPage />);

        expect(screen.queryByText(CONFIRMED_MESSAGE)).not.toBeNull();
        expect(window.location.search).toBe("");
    });

    it("shows no toast on a normal visit", () => {
        window.history.pushState(null, "", "/chat");

        render(<ChatPage />);

        expect(screen.queryByText(CONFIRMED_MESSAGE)).toBeNull();
    });
});
