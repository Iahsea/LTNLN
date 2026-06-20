import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { Toaster } from "@/components/ui/sonner";

// Font UI sans + font mono cho dữ liệu kỹ thuật (PID, IP, log, đường dẫn).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Linux System Manager",
  description: "Quản lý tiến trình, file, socket và network trên Ubuntu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // class "dark": app chỉ dùng dark mode.
    <html
      lang="vi"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <div className="flex h-full">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
