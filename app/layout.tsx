import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow Prototyper — 1915 South",
  description:
    "Describe a workflow. See it before you build it. A prototype tool for 1915 South leadership.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full" style={{ background: "var(--cream)" }}>
        {children}
      </body>
    </html>
  );
}
