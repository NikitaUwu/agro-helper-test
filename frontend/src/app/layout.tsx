import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Помощник агронома — Plantix экспресс-диагностика',
  description:
    'Интерактивный мобильный ассистент агронома: экспресс-диагностика болезней растений по фото, справочник культур и полевой журнал проверок.',
  applicationName: 'Помощник агронома',
  keywords: ['агроном', 'растения', 'диагностика', 'фитофтороз', 'болезни растений', 'Plantix', 'полевой журнал'],
  authors: [{ name: 'Агрономическая служба' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="flex justify-center items-center min-h-screen min-h-[100dvh] bg-slate-100 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
