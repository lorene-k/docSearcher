import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";
import DotField from '@/components/DotField';

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "docSearcher ",
    description: "Interrogez vos documents internes via IA",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="fr"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col bg-black text-gray-900">
                <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
                    <DotField
                        dotRadius={1.5}
                        dotSpacing={14}
                        bulgeStrength={67}
                        glowRadius={160}
                        sparkle={false}
                        waveAmplitude={0}
                        cursorRadius={500}
                        cursorForce={0.1}
                        bulgeOnly
                        gradientFrom="#A855F7"
                        gradientTo="#B497CF"
                        glowColor="#120F17"
                    />
                </div>
                <Navbar />
                <main className="flex-1">{children}</main>
            </body>
        </html>
    );
}
