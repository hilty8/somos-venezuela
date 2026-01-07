import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Somos Venezuela - ベネズエラ復興支援プラットフォーム",
  description: "あなたの関心が、ベネズエラへの架け橋になります。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
