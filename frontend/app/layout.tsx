import './globals.css';

export const metadata = {
  title: 'ガチャシュミレーター',
  description: 'ガチャ機能のシミュレーションアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja"><body>{children}</body></html>
  );
}