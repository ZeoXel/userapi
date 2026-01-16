import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USERAPI Gateway",
  description: "透传网关 · 单 Key 入口 · 多厂商分发",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
