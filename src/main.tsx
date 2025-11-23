import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { privateApis as themePrivateApis } from '@wordpress/theme'
import { unlock } from './utils/lock-unlock'

// Suppress WordPress package warnings about Node.js modules in browser
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

const { ThemeProvider } = unlock(themePrivateApis)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider color={{ primary: '#3858e9' }} isRoot>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
