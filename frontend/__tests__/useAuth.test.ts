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
}));

const mockConfirmEmail = jest.mocked(api.confirmEmail);
const mockLogin = jest.mocked(api.login);
const mockRegister = jest.mocked(api.register);
const mockLogout = jest.mocked(api.logout);

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
        mockRegister.mockResolvedValueOnce({ email: "new@example.com" });
        const result = renderAuth();

        await act(async () => {
            await result.current.register("new@example.com", "pass456");
        });

        expect(storedEmail()).toBeNull();
        expect(result.current.user).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();
        expect(result.current.confirmationSent).toBe(true);
    });

    it("register() sets error on failure and does not flag confirmation as sent", async () => {
        mockRegister.mockRejectedValueOnce(new Error("409"));
        const result = renderAuth();

        await act(async () => {
            await result.current.register("dupe@example.com", "pass");
        });

        expect(result.current.error).toBe("This email is already in use, or something went wrong.");
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
