import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ConfirmPage from "@/app/auth/confirm/page";

let mockSearch = "";
jest.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockConfirmEmail = jest.fn();
jest.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ confirmEmail: mockConfirmEmail }),
}));

describe("ConfirmPage", () => {
    beforeEach(() => {
        mockConfirmEmail.mockReset();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("shows the invalid-link message without calling the backend when the link has no token", () => {
        mockSearch = "";

        render(<ConfirmPage />);

        expect(screen.queryByText("Invalid or expired link")).not.toBeNull();
        expect(mockConfirmEmail).not.toHaveBeenCalled();
    });

    it("sends the single-use token exactly once, even under StrictMode, then navigates to the chat", async () => {
        mockSearch = "token_hash=pkce_abc&type=email";
        mockConfirmEmail.mockResolvedValue(true);
        // jsdom cannot navigate, so the redirect to /chat shows up as a "navigation" console error
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

        render(
            <StrictMode>
                <ConfirmPage />
            </StrictMode>
        );

        expect(screen.queryByText("Confirming your email")).not.toBeNull();
        await waitFor(() =>
            expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("navigation") }))
        );
        expect(mockConfirmEmail).toHaveBeenCalledTimes(1);
        expect(mockConfirmEmail).toHaveBeenCalledWith("pkce_abc", "email");
    });

    it("shows the invalid-link message when the backend rejects the token", async () => {
        mockSearch = "token_hash=used&type=email";
        mockConfirmEmail.mockResolvedValue(false);

        render(<ConfirmPage />);

        expect(await screen.findByText("Invalid or expired link")).not.toBeNull();
    });
});
