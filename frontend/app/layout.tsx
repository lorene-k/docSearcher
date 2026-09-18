import type { Metadata } from "next";
import { Jost } from "next/font/google";
import MeProvider from "@/components/MeProvider";
import Navbar from "@/components/Navbar";
import "./globals.css";

// Futura is not a web font; Jost is a close geometric fallback for machines without it
const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "docSearcher",
    description: "Ask questions about your team's documents",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${jost.variable} h-full antialiased`}>
            <body className="flex min-h-full flex-col">
                <MeProvider>
                    <Navbar />
                    <main className="flex flex-1 flex-col">{children}</main>
                </MeProvider>
            </body>
        </html>
    );
}
