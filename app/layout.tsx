import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "경로 계산기",
  description: "주소 여러 개의 최단경로를 계산합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
