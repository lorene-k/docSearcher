import { render, screen, fireEvent } from "@testing-library/react";
import MeGate from "@/components/MeGate";

const mockRefresh = jest.fn();
let mockState: { me: unknown; error: boolean } = { me: null, error: false };
jest.mock("@/components/MeProvider", () => ({
    useMe: () => ({ ...mockState, loading: false, refresh: mockRefresh, setMe: jest.fn() }),
}));

describe("MeGate", () => {
    beforeEach(() => {
        mockRefresh.mockClear();
        mockState = { me: null, error: false };
    });

    it("renders the page once the current user is known", () => {
        mockState = { me: { email: "a@b.com" }, error: false };

        render(<MeGate>{() => <p>page content</p>}</MeGate>);

        expect(screen.queryByText("page content")).not.toBeNull();
    });

    it("explains a failed lookup instead of rendering a blank page", () => {
        mockState = { me: null, error: true };

        render(<MeGate>{() => <p>page content</p>}</MeGate>);

        expect(screen.queryByText("page content")).toBeNull();
        expect(screen.getByRole("alert").textContent).toContain("Could not load your account");
    });

    it("retries the lookup on request", () => {
        mockState = { me: null, error: true };

        render(<MeGate>{() => <p>page content</p>}</MeGate>);
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));

        expect(mockRefresh).toHaveBeenCalled();
    });
});
