import { renderHook, act, waitFor } from "@testing-library/react";
import { useDocuments } from "@/hooks/useDocuments";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => ({
    getDocuments: jest.fn(),
    deleteDocument: jest.fn(),
}));

const mockGetDocuments = api.getDocuments as jest.MockedFunction<typeof api.getDocuments>;
const mockDeleteDocument = api.deleteDocument as jest.MockedFunction<typeof api.deleteDocument>;

const renderLoaded = async () => {
    mockGetDocuments.mockResolvedValueOnce(["a.pdf", "b.pdf"]);
    const hook = renderHook(() => useDocuments());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
};

describe("useDocuments", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loads documents on mount", async () => {
        const { result } = await renderLoaded();
        expect(result.current.documents).toEqual(["a.pdf", "b.pdf"]);
        expect(result.current.error).toBe("");
    });

    it("sets an error when loading fails", async () => {
        mockGetDocuments.mockRejectedValueOnce(new Error("500"));
        const { result } = renderHook(() => useDocuments());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe("Could not load documents.");
    });

    it("removes a document once the backend confirms the delete", async () => {
        const { result } = await renderLoaded();
        mockDeleteDocument.mockResolvedValueOnce();

        await act(async () => {
            await result.current.remove("a.pdf");
        });

        expect(mockDeleteDocument).toHaveBeenCalledWith("a.pdf");
        expect(result.current.documents).toEqual(["b.pdf"]);
        expect(result.current.error).toBe("");
    });

    it("puts the document back and reports an error when the backend delete fails", async () => {
        const { result } = await renderLoaded();
        mockDeleteDocument.mockRejectedValueOnce(new Error("404"));

        let thrown: unknown;
        await act(async () => {
            await result.current.remove("a.pdf").catch((e) => { thrown = e; });
        });

        expect(thrown).toBeInstanceOf(Error);
        expect(result.current.documents).toContain("a.pdf");
        expect(result.current.documents).toHaveLength(2);
        expect(result.current.error).toBe('Could not delete "a.pdf".');
    });
});
