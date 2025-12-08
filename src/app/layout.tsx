import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quick Poll - Create and Share Polls Instantly",
  description: "Create free polls in seconds and share them with anyone. Real-time results, no signup required. Perfect for decisions, surveys, and voting.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 min-h-[calc(100vh-4rem)] flex flex-col">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
