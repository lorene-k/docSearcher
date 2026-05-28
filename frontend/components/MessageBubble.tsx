type Props = {
  text: string;
};

export default function MessageBubble({ text }: Props) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
