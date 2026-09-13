import { render, screen } from "@testing-library/react";
import SourceCard from "@/components/SourceCard";

describe("SourceCard", () => {
    it("labels a high-relevance source as pertinent", () => {
        render(<SourceCard source={{ filename: "a.pdf", chunk_text: "strong", relevance: "high" }} index={0} />);
        expect(screen.queryByText("pertinent")).not.toBeNull();
        expect(screen.queryByText("partiel")).toBeNull();
    });

    it("labels a low-relevance source as partiel", () => {
        render(<SourceCard source={{ filename: "b.pdf", chunk_text: "weak", relevance: "low" }} index={1} />);
        expect(screen.queryByText("partiel")).not.toBeNull();
        expect(screen.queryByText("pertinent")).toBeNull();
    });

    it("shows no relevance badge when the source has none", () => {
        render(<SourceCard source={{ filename: "c.pdf", chunk_text: "text" }} index={0} />);
        expect(screen.queryByText("pertinent")).toBeNull();
        expect(screen.queryByText("partiel")).toBeNull();
    });
});
