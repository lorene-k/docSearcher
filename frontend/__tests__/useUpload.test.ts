import { renderHook, act } from "@testing-library/react";
import { useUpload } from "@/hooks/useUpload";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => ({
    uploadDocument: jest.fn(),
}));

const mockUploadDocument = jest.mocked(api.uploadDocument);
const pdf = new File(["%PDF"], "doc.pdf", { type: "application/pdf" });

type UploadResult = { current: ReturnType<typeof useUpload> };

const renderAfterFailedUpload = async (): Promise<UploadResult> => {
    mockUploadDocument.mockRejectedValueOnce(new Error("500"));
    const { result } = renderHook(() => useUpload());
    await act(async () => {
        await result.current.upload(pdf);
    });
    return result;
};

describe("useUpload", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("walks through the upload steps and reports chunks created", async () => {
        mockUploadDocument.mockImplementationOnce(async (_file, onProgress) => {
            onProgress?.(100);
            return { message: "file uploaded", chunks_created: 7 };
        });
        const { result } = renderHook(() => useUpload());

        await act(async () => {
            const pending = result.current.upload(pdf);
            await jest.advanceTimersByTimeAsync(600);
            await pending;
        });

        expect(mockUploadDocument).toHaveBeenCalledWith(pdf, expect.any(Function));
        expect(result.current.step).toBe("done");
        expect(result.current.progress).toBe(100);
        expect(result.current.chunksCreated).toBe(7);
        expect(result.current.errorMessage).toBe("");
    });

    it("moves to the error step with a message when the upload fails", async () => {
        const result = await renderAfterFailedUpload();

        expect(result.current.step).toBe("error");
        expect(result.current.errorMessage).toBe("Something went wrong during the upload.");
    });

    it("reset returns to a clean idle state", async () => {
        const result = await renderAfterFailedUpload();

        act(() => result.current.reset());

        expect(result.current.step).toBe("idle");
        expect(result.current.errorMessage).toBe("");
        expect(result.current.progress).toBe(0);
    });
});
