import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confession Grid",
  description: "Buy a cell. Confess. Set it free.",
};

const THEME_SCRIPT = `(function(){try{var k="cw-color-mode";var s=localStorage.getItem(k);var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
