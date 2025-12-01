'use client';

import { StrictMode } from 'react';
import { __experimentalStyleProvider as StyleProvider } from '@wordpress/components';
import { ComponentTreeProvider } from '../src/ComponentTreeContext';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/dataviews/build-style/style.css';
import '../src/index.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <StrictMode>
          <StyleProvider document={typeof window !== 'undefined' ? document : undefined}>
            <ComponentTreeProvider>
              {children}
            </ComponentTreeProvider>
          </StyleProvider>
        </StrictMode>
      </body>
    </html>
  );
}
