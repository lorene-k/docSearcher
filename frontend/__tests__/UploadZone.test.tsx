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

const INVALID_TYPE_MESSAGE = "Seuls les fichiers PDF sont acceptés.";
const pdf = new File(["%PDF"], "doc.pdf", { type: "application/pdf" });
const notPdf = new File(["hello"], "notes.txt", { type: "text/plain" });

const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement;

describe("UploadZone", () => {
    beforeEach(() => {
        mockUpload.mockClear();
    });

    it("rejects a non-PDF picked through the file input", () => {
        const { container } = render(<UploadZone />);

        fireEvent.change(fileInput(container), { target: { files: [notPdf] } });

        expect(mockUpload).not.toHaveBeenCalled();
        expect(screen.queryByText(INVALID_TYPE_MESSAGE)).not.toBeNull();
    });

    it("rejects a non-PDF dropped onto the zone", () => {
        render(<UploadZone />);

        fireEvent.drop(screen.getByText(/Glissez un fichier PDF ici/), { dataTransfer: { files: [notPdf] } });

        expect(mockUpload).not.toHaveBeenCalled();
        expect(screen.queryByText(INVALID_TYPE_MESSAGE)).not.toBeNull();
    });

    it("uploads a PDF and clears a previous type error", () => {
        const { container } = render(<UploadZone />);
        fireEvent.change(fileInput(container), { target: { files: [notPdf] } });

        fireEvent.change(fileInput(container), { target: { files: [pdf] } });

        expect(mockUpload).toHaveBeenCalledWith(pdf);
        expect(screen.queryByText(INVALID_TYPE_MESSAGE)).toBeNull();
    });
});
