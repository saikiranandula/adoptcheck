import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdoptCheck",
  description: "Open-source repo due diligence before you install, fork, or ship.",
  metadataBase: new URL("https://adoptcheck.nullhype.tech"),
  openGraph: {
    title: "AdoptCheck",
    description: "Paste a GitHub repo. Get an evidence-backed adoption verdict.",
    url: "https://adoptcheck.nullhype.tech",
    siteName: "AdoptCheck",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
