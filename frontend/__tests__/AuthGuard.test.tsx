import { render, screen } from "@testing-library/react";
import AuthGuard from "@/components/AuthGuard";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ replace: mockReplace }),
}));

describe("AuthGuard", () => {
    beforeEach(() => {
        localStorage.clear();
        mockReplace.mockClear();
    });

    it("redirects to /login and renders nothing when no session is stored", () => {
        render(<AuthGuard><p>protected content</p></AuthGuard>);

        expect(mockReplace).toHaveBeenCalledWith("/login");
        expect(screen.queryByText("protected content")).toBeNull();
    });

    it("renders the protected content when a session is stored", () => {
        localStorage.setItem("user_email", "a@b.com");

        render(<AuthGuard><p>protected content</p></AuthGuard>);

        expect(screen.queryByText("protected content")).not.toBeNull();
        expect(mockReplace).not.toHaveBeenCalled();
    });
});
