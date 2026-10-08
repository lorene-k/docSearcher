import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import MeProvider from "@/components/MeProvider";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const ebGaramond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "docSearcher",
    description: "Ask questions about your team's documents",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${inter.variable} ${ebGaramond.variable} h-full antialiased`}>
            <body className="flex min-h-full flex-col">
                <MeProvider>
                    <Navbar />
                    <main className="flex flex-1 flex-col">{children}</main>
                </MeProvider>
            </body>
        </html>
    );
}
