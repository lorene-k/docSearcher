import SourceCard from "@/components/SourceCard";
import type { Source } from "@/lib/api";

type Props = {
    text: string;
    role: "user" | "assistant";
    sources?: Source[];
    isTyping?: boolean;
};

export default function MessageBubble({ text, role, sources, isTyping }: Props) {
    const isUser = role === "user";

    return (
        <div className={`animate-fade-slide-in flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[95%] rounded-lg px-4 py-3 text-base ${
                    isUser ? "bg-gray-300 text-black" : "bg-gray-100 text-gray-800"
                }`}
            >
                {isTyping ? (
                    <div className="flex h-4 items-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap">{text}</p>
                )}
                {sources && sources.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                        <p className="text-xs font-medium tracking-wide uppercase opacity-60">Sources</p>
                        {sources.map((source, i) => (
                            <SourceCard key={source.filename + i} source={source} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
