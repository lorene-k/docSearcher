import { render, screen } from "@testing-library/react";
import SourceCard from "@/components/SourceCard";

describe("SourceCard", () => {
    it("labels a high-relevance source as relevant", () => {
        render(<SourceCard source={{ filename: "a.pdf", chunk_text: "strong", relevance: "high" }} index={0} />);
        expect(screen.queryByText("relevant")).not.toBeNull();
        expect(screen.queryByText("partial")).toBeNull();
    });

    it("labels a low-relevance source as partial", () => {
        render(<SourceCard source={{ filename: "b.pdf", chunk_text: "weak", relevance: "low" }} index={1} />);
        expect(screen.queryByText("partial")).not.toBeNull();
        expect(screen.queryByText("relevant")).toBeNull();
    });

    it("shows no relevance badge when the source has none", () => {
        render(<SourceCard source={{ filename: "c.pdf", chunk_text: "text" }} index={0} />);
        expect(screen.queryByText("relevant")).toBeNull();
        expect(screen.queryByText("partial")).toBeNull();
    });
});
