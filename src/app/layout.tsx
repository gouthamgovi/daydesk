import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DayDesk',
  description: 'Personal task tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme/mode attributes before hydration so we don't flash the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('daydesk-theme') || 'light';
                  var mode = localStorage.getItem('daydesk-mode') || 'normal';
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.setAttribute('data-mode', mode);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
