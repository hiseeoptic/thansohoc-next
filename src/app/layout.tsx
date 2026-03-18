// src/app/layout.tsx
import type { Metadata } from 'next';
import { Quicksand } from 'next/font/google';
import './globals.css';

const quicksand = Quicksand({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-quicksand',
});

export const metadata: Metadata = {
  title: 'Mystic Numerology - Thần Số Học Master',
  description: 'Tra cứu Thần số học chuyên sâu: Đường đời, Sứ mệnh, Nội tâm, Phân tích kết nối...',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${quicksand.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}