import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/api", () => ({
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    confirmEmail: jest.fn(),
    resendConfirmation: jest.fn(),
    isEmailNotConfirmedError: jest.fn(),
    errorCode: jest.fn(),
}));

const mockErrorCode = jest.mocked(api.errorCode);

const mockConfirmEmail = jest.mocked(api.confirmEmail);
const mockResendConfirmation = jest.mocked(api.resendConfirmation);
const mockIsEmailNotConfirmedError = jest.mocked(api.isEmailNotConfirmedError);
const mockLogin = jest.mocked(api.login);
const mockRegister = jest.mocked(api.register);
const mockLogout = jest.mocked(api.logout);

const PROFILE = { first_name: "Ada", last_name: "Lovelace", org_name: "Analytical Engines" };

const renderAuth = (): { current: ReturnType<typeof useAuth> } => renderHook(() => useAuth()).result;

const storedEmail = (): string | null => localStorage.getItem("user_email");

describe("useAuth", () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    it("initialises with null user when localStorage is empty", () => {
        const result = renderAuth();
        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("");
    });

    it("restores session from localStorage on mount", () => {
        localStorage.setItem("user_email", "alice@example.com");

        const result = renderAuth();
        expect(result.current.user).toEqual({ email: "alice@example.com" });
    });

    it("login() saves email, sets user, redirects to /chat", async () => {
        mockLogin.mockResolvedValueOnce({ email: "bob@example.com" });
        const result = renderAuth();

        await act(async () => {
            await result.current.login("bob@example.com", "password123");
        });

        expect(storedEmail()).toBe("bob@example.com");
        expect(result.current.user).toEqual({ email: "bob@example.com" });
        expect(mockPush).toHaveBeenCalledWith("/chat");
        expect(result.current.loading).toBe(false);
    });

    it("login() sets error on failure", async () => {
        mockLogin.mockRejectedValueOnce(new Error("401"));
        const result = renderAuth();

        await act(async () => {
            await result.current.login("bad@example.com", "wrong");
        });

        expect(result.current.error).toBe("Invalid email or password.");
        expect(result.current.user).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("register() does not create a session or redirect on success, and flags confirmation as sent", async () => {
        mockRegister.mockResolvedValueOnce();
        const result = renderAuth();

        await act(async () => {
            await result.current.register("new@example.com", "pass456", PROFILE);
        });
        expect(mockRegister).toHaveBeenCalledWith("new@example.com", "pass456", PROFILE);
        await act(async () => {});

        expect(storedEmail()).toBeNull();
        expect(result.current.user).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();
        expect(result.current.confirmationSent).toBe(true);
    });

    it.each([
        ["email_exists", "This email already has an account. Log in instead."],
        ["weak_password", "Password must be at least 6 characters."],
        ["email_invalid", "That email address is not valid."],
        ["rate_limited", "Too many attempts. Wait a minute and try again."],
        ["signup_disabled", "New accounts are disabled at the moment."],
        ["registration_failed", "Could not create the account. Try again in a moment."],
        ["", "Could not create the account. Try again in a moment."],
    ])("register() reports %s as its own message", async (code, message) => {
        mockRegister.mockRejectedValueOnce(new Error(code || "network"));
        mockErrorCode.mockReturnValueOnce(code);
        const result = renderAuth();

        await act(async () => {
            await result.current.register("dupe@example.com", "pass", PROFILE);
        });

        expect(result.current.error).toBe(message);
        expect(result.current.confirmationSent).toBe(false);
    });

    it("confirmEmail() stores the session and reports success for a valid link", async () => {
        mockConfirmEmail.mockResolvedValueOnce({ email: "new@example.com" });
        const result = renderAuth();

        let confirmed = false;
        await act(async () => {
            confirmed = await result.current.confirmEmail("pkce_abc", "email");
        });

        expect(mockConfirmEmail).toHaveBeenCalledWith("pkce_abc", "email");
        expect(confirmed).toBe(true);
        expect(storedEmail()).toBe("new@example.com");
        expect(result.current.user).toEqual({ email: "new@example.com" });
    });

    it("confirmEmail() reports failure and creates no session for an invalid link", async () => {
        mockConfirmEmail.mockRejectedValueOnce(new Error("400"));
        const result = renderAuth();

        let confirmed = true;
        await act(async () => {
            confirmed = await result.current.confirmEmail("used", "email");
        });

        expect(confirmed).toBe(false);
        expect(storedEmail()).toBeNull();
        expect(result.current.user).toBeNull();
    });

    it("login() flags an unconfirmed address instead of blaming the password", async () => {
        mockLogin.mockRejectedValueOnce(new Error("403"));
        mockIsEmailNotConfirmedError.mockReturnValueOnce(true);
        const result = renderAuth();

        await act(async () => {
            await result.current.login("new@example.com", "password123");
        });

        expect(result.current.needsConfirmation).toBe(true);
        expect(result.current.error).toBe("Confirm your email address before logging in.");
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("resendConfirmation() asks the backend for a new link and reports it was sent", async () => {
        mockResendConfirmation.mockResolvedValueOnce();
        const result = renderAuth();

        await act(async () => {
            await result.current.resendConfirmation("new@example.com");
        });

        expect(mockResendConfirmation).toHaveBeenCalledWith("new@example.com");
        expect(result.current.confirmationResent).toBe(true);
        expect(result.current.error).toBe("");
    });

    it("resendConfirmation() reports a failure without claiming a link was sent", async () => {
        mockResendConfirmation.mockRejectedValueOnce(new Error("429"));
        const result = renderAuth();

        await act(async () => {
            await result.current.resendConfirmation("new@example.com");
        });

        expect(result.current.confirmationResent).toBe(false);
        expect(result.current.error).toBe("Could not send a new link. Try again in a minute.");
    });

    describe("logout()", () => {
        beforeEach(() => {
            localStorage.setItem("user_email", "user@example.com");
        });

        it("calls the backend, clears localStorage, redirects to /login", async () => {
            mockLogout.mockResolvedValueOnce(undefined);
            const result = renderAuth();

            await act(async () => {
                await result.current.logout();
            });

            expect(mockLogout).toHaveBeenCalled();
            expect(storedEmail()).toBeNull();
            expect(result.current.user).toBeNull();
            expect(mockPush).toHaveBeenCalledWith("/login");
        });

        it("still clears local session if the backend call fails", async () => {
            mockLogout.mockRejectedValueOnce(new Error("network error"));
            const result = renderAuth();

            await act(async () => {
                await result.current.logout();
            });

            expect(storedEmail()).toBeNull();
            expect(result.current.user).toBeNull();
            expect(mockPush).toHaveBeenCalledWith("/login");
        });
    });
});
