import { render, screen, fireEvent } from "@testing-library/react";
import UploadZone from "@/components/UploadZone";

const mockUpload = jest.fn();
jest.mock("@/hooks/useUpload", () => ({
    useUpload: () => ({
        step: "idle",
        progress: 0,
        chunksCreated: 0,
        errorMessage: "",
        upload: mockUpload,
        reset: jest.fn(),
    }),
}));

const OPTIONS = { visibility: "org" as const, groupId: null };
const INVALID_TYPE_MESSAGE = "Only PDF files are accepted.";
const pdf = new File(["%PDF"], "doc.pdf", { type: "application/pdf" });
const notPdf = new File(["hello"], "notes.txt", { type: "text/plain" });

const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement;

describe("UploadZone", () => {
    beforeEach(() => {
        mockUpload.mockClear();
    });

    it("rejects a non-PDF picked through the file input", () => {
        const { container } = render(<UploadZone options={OPTIONS} />);

        fireEvent.change(fileInput(container), { target: { files: [notPdf] } });

        expect(mockUpload).not.toHaveBeenCalled();
        expect(screen.queryByText(INVALID_TYPE_MESSAGE)).not.toBeNull();
    });

    it("rejects a non-PDF dropped onto the zone", () => {
        render(<UploadZone options={OPTIONS} />);

        fireEvent.drop(screen.getByText(/Drop a PDF here/), { dataTransfer: { files: [notPdf] } });

        expect(mockUpload).not.toHaveBeenCalled();
        expect(screen.queryByText(INVALID_TYPE_MESSAGE)).not.toBeNull();
    });

    it("uploads a PDF and clears a previous type error", () => {
        const { container } = render(<UploadZone options={OPTIONS} />);
        fireEvent.change(fileInput(container), { target: { files: [notPdf] } });

        fireEvent.change(fileInput(container), { target: { files: [pdf] } });

        expect(mockUpload).toHaveBeenCalledWith(pdf, OPTIONS);
        expect(screen.queryByText(INVALID_TYPE_MESSAGE)).toBeNull();
    });
});
