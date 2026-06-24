import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Livetube",
  description: "Private YouTube content and streaming operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
