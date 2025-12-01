import { StrictMode } from 'react';
import { __experimentalStyleProvider as StyleProvider } from '@wordpress/components';
import '@wordpress/components/build-style/style.css';
import '@wordpress/block-editor/build-style/style.css';
import '@wordpress/dataviews/build-style/style.css';
import './index.css';
import App from './App';

// Suppress WordPress package warnings about Node.js modules in browser
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out externalized module warnings and deprecated size warnings
    if (
      message.includes('externalized for browser compatibility') ||
      message.includes('36px default size for wp.components.NumberControl is deprecated')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export default function ClientApp() {
  return (
    <StrictMode>
      <StyleProvider document={document}>
        <App />
      </StyleProvider>
    </StrictMode>
  );
}
