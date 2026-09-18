type Props = { title: string; lead?: string; children?: React.ReactNode };

export default function PageHeader({ title, lead, children }: Props) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="page-title">{title}</h1>
                {lead && <p className="page-lead">{lead}</p>}
            </div>
            {children}
        </div>
    );
}
