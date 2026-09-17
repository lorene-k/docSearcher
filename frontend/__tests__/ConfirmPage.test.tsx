import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConfirmPage from "@/app/auth/confirm/page";

let mockSearch = "";
jest.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockConfirmEmail = jest.fn();
const mockResendConfirmation = jest.fn();
let mockConfirmationResent = false;
jest.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({
        confirmEmail: mockConfirmEmail,
        resendConfirmation: mockResendConfirmation,
        confirmationResent: mockConfirmationResent,
        loading: false,
        error: "",
    }),
}));

describe("ConfirmPage", () => {
    beforeEach(() => {
        mockConfirmEmail.mockReset();
        mockResendConfirmation.mockReset();
        mockConfirmationResent = false;
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
            </StrictMode>,
        );

        expect(screen.queryByText("Confirming your email")).not.toBeNull();
        await waitFor(() =>
            expect(consoleError).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining("navigation") }),
            ),
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

    it("asks for a new link with the address typed into the expired-link card", async () => {
        mockSearch = "";
        render(<ConfirmPage />);

        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
        fireEvent.click(screen.getByRole("button", { name: "Send a new link" }));

        expect(mockResendConfirmation).toHaveBeenCalledWith("new@example.com");
    });

    it("replaces the form with a confirmation once a new link has been sent", () => {
        mockSearch = "";
        mockConfirmationResent = true;

        render(<ConfirmPage />);

        expect(screen.queryByRole("button", { name: "Send a new link" })).toBeNull();
        expect(screen.queryByText("A new confirmation link is on its way. Check your email.")).not.toBeNull();
    });
});
