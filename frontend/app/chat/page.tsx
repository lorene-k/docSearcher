import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-57px)] px-6 py-6 max-w-2xl mx-auto w-full">
            <h1 className="text-lg font-semibold mb-4">Chat</h1>
            <ChatWindow />
        </div>
    );
}