import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Content Production Director',
  description: 'Sistem yang mengubah ide menjadi paket produksi konten visual terstruktur',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}