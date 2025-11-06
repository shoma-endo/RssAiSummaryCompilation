import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RSS AI Summary - Settings',
  description: 'Configure RSS feed processing and Lark integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
