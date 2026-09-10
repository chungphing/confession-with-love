import type { Metadata } from "next";
import { Literata, Rubik } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Confess with Love · The Wall of Whispers",
  description: "Leave a whisper on the wall. Anonymous, sealed permanently.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${literata.variable} ${rubik.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
