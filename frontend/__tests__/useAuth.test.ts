import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import * as api from "@/lib/api";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

// Mock api
jest.mock("@/lib/api", () => ({
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    confirmEmail: jest.fn(),
}));

const mockConfirmEmail = api.confirmEmail as jest.MockedFunction<typeof api.confirmEmail>;
const mockLogin = api.login as jest.MockedFunction<typeof api.login>;
const mockRegister = api.register as jest.MockedFunction<typeof api.register>;
const mockLogout = api.logout as jest.MockedFunction<typeof api.logout>;

// localStorage mock
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, val: string) => { store[key] = val; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useAuth", () => {
    beforeEach(() => {
        localStorageMock.clear();
        mockPush.mockClear();
        jest.clearAllMocks();
    });

    it("initialises with null user when localStorage is empty", () => {
        const { result } = renderHook(() => useAuth());
        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("");
    });

    it("restores session from localStorage on mount", () => {
        localStorageMock.setItem("user_email", "alice@example.com");

        const { result } = renderHook(() => useAuth());
        expect(result.current.user).toEqual({ email: "alice@example.com" });
    });

    it("login() saves email, sets user, redirects to /chat", async () => {
        mockLogin.mockResolvedValueOnce({ email: "bob@example.com" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.login("bob@example.com", "password123");
        });

        expect(localStorageMock.getItem("user_email")).toBe("bob@example.com");
        expect(result.current.user).toEqual({ email: "bob@example.com" });
        expect(mockPush).toHaveBeenCalledWith("/chat");
        expect(result.current.loading).toBe(false);
    });

    it("login() sets error on failure", async () => {
        mockLogin.mockRejectedValueOnce(new Error("401"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.login("bad@example.com", "wrong");
        });

        expect(result.current.error).toBe("Invalid email or password.");
        expect(result.current.user).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("register() does not create a session or redirect on success, and flags confirmation as sent", async () => {
        mockRegister.mockResolvedValueOnce({ email: "new@example.com" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.register("new@example.com", "pass456");
        });

        expect(localStorageMock.getItem("user_email")).toBeNull();
        expect(result.current.user).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();
        expect(result.current.confirmationSent).toBe(true);
    });

    it("register() sets error on failure and does not flag confirmation as sent", async () => {
        mockRegister.mockRejectedValueOnce(new Error("409"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.register("dupe@example.com", "pass");
        });

        expect(result.current.error).toBe("This email is already in use, or something went wrong.");
        expect(result.current.confirmationSent).toBe(false);
    });

    it("confirmEmail() stores the session and reports success for a valid link", async () => {
        mockConfirmEmail.mockResolvedValueOnce({ email: "new@example.com" });

        const { result } = renderHook(() => useAuth());

        let confirmed = false;
        await act(async () => {
            confirmed = await result.current.confirmEmail("pkce_abc", "email");
        });

        expect(mockConfirmEmail).toHaveBeenCalledWith("pkce_abc", "email");
        expect(confirmed).toBe(true);
        expect(localStorageMock.getItem("user_email")).toBe("new@example.com");
        expect(result.current.user).toEqual({ email: "new@example.com" });
    });

    it("confirmEmail() reports failure and creates no session for an invalid link", async () => {
        mockConfirmEmail.mockRejectedValueOnce(new Error("400"));

        const { result } = renderHook(() => useAuth());

        let confirmed = true;
        await act(async () => {
            confirmed = await result.current.confirmEmail("used", "email");
        });

        expect(confirmed).toBe(false);
        expect(localStorageMock.getItem("user_email")).toBeNull();
        expect(result.current.user).toBeNull();
    });

    it("logout() calls the backend, clears localStorage, redirects to /login", async () => {
        localStorageMock.setItem("user_email", "user@example.com");
        mockLogout.mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.logout();
        });

        expect(mockLogout).toHaveBeenCalled();
        expect(localStorageMock.getItem("user_email")).toBeNull();
        expect(result.current.user).toBeNull();
        expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("logout() still clears local session if the backend call fails", async () => {
        localStorageMock.setItem("user_email", "user@example.com");
        mockLogout.mockRejectedValueOnce(new Error("network error"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.logout();
        });

        expect(localStorageMock.getItem("user_email")).toBeNull();
        expect(result.current.user).toBeNull();
        expect(mockPush).toHaveBeenCalledWith("/login");
    });
});
