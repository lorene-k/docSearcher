import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Organization - docSearcher",
};

export default function OrgLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
