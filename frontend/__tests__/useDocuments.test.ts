import { renderHook, act, waitFor } from "@testing-library/react";
import { useDocuments } from "@/hooks/useDocuments";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => ({
    getDocuments: jest.fn(),
    deleteDocument: jest.fn(),
}));

const mockGetDocuments = jest.mocked(api.getDocuments);

const doc = (filename: string): api.Document => ({
    id: filename,
    filename,
    visibility: "org",
    uploader_id: "u1",
    uploader_name: "Ada",
    group_id: null,
    group_name: null,
    created_at: "2026-01-01T00:00:00Z",
});
const A = doc("a.pdf");
const B = doc("b.pdf");
const mockDeleteDocument = jest.mocked(api.deleteDocument);

type DocumentsResult = { current: ReturnType<typeof useDocuments> };

const renderUntilLoaded = async (): Promise<DocumentsResult> => {
    const { result } = renderHook(() => useDocuments());
    await waitFor(() => expect(result.current.loading).toBe(false));
    return result;
};

const renderWithTwoDocuments = (): Promise<DocumentsResult> => {
    mockGetDocuments.mockResolvedValueOnce([A, B]);
    return renderUntilLoaded();
};

describe("useDocuments", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("loads documents on mount", async () => {
        const result = await renderWithTwoDocuments();
        expect(result.current.documents).toEqual([A, B]);
        expect(result.current.error).toBe("");
    });

    it("sets an error when loading fails", async () => {
        mockGetDocuments.mockRejectedValueOnce(new Error("500"));
        const result = await renderUntilLoaded();
        expect(result.current.error).toBe("Could not load documents.");
    });

    it("removes a document once the backend confirms the delete", async () => {
        const result = await renderWithTwoDocuments();
        mockDeleteDocument.mockResolvedValueOnce();

        await act(async () => {
            await result.current.remove(A);
        });

        expect(mockDeleteDocument).toHaveBeenCalledWith(A);
        expect(result.current.documents).toEqual([B]);
        expect(result.current.error).toBe("");
    });

    it("puts the document back and reports an error when the backend delete fails", async () => {
        const result = await renderWithTwoDocuments();
        mockDeleteDocument.mockRejectedValueOnce(new Error("404"));

        let thrown: unknown;
        await act(async () => {
            await result.current.remove(A).catch((error: unknown) => {
                thrown = error;
            });
        });

        expect(thrown).toBeInstanceOf(Error);
        expect(result.current.documents).toContainEqual(A);
        expect(result.current.documents).toHaveLength(2);
        expect(result.current.error).toBe('Could not delete "a.pdf".');
    });
});
