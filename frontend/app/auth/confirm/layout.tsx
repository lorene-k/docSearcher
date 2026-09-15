import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Confirm email - docSearcher",
};

export default function ConfirmLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
