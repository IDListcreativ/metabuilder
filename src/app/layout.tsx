import type { Metadata } from 'next';
import '@/styles/tailwind.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: 'MetaBuilder — AI App Builder',
  description: 'Generate, refine, export, and deploy React applications using natural language prompts.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

<script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fmetabuilde7640back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.17" />
<script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></head>
      <body className="bg-zinc-950 text-zinc-100 font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgba(24,24,27,0.95)',
                border: '1px solid rgba(167,139,250,0.25)',
                color: '#f4f4f5',
                backdropFilter: 'blur(12px)',
                fontFamily: 'DM Sans, sans-serif',
              },
            }}
            richColors
          />
        </ThemeProvider>
      </body>
    </html>
  );
}