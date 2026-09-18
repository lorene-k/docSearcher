// The backend keeps the real session in httpOnly cookies; this only remembers who is logged in for the UI

const SESSION_KEY = "user_email";
const SESSION_EVENT = "session-change";

// localStorage only fires "storage" for other tabs, so same-tab writes dispatch SESSION_EVENT
export const subscribeToSession = (onChange: () => void): (() => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(SESSION_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(SESSION_EVENT, onChange);
    };
};

export const getSessionEmail = (): string | null => localStorage.getItem(SESSION_KEY);

export const setSessionEmail = (email: string | null): void => {
    if (email) localStorage.setItem(SESSION_KEY, email);
    else localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
};
