import { StrictMode } from 'react';
import ClientProviders from '@/src/components/ClientProviders';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/dataviews/build-style/style.css';
import '@/src/index.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <StrictMode>
          <ClientProviders>
            {children}
          </ClientProviders>
        </StrictMode>
      </body>
    </html>
  );
}
