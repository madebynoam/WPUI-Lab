import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { privateApis as themePrivateApis } from '@wordpress/theme'
import { unlock } from './utils/lock-unlock'

const { ThemeProvider } = unlock(themePrivateApis)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider color={{ primary: '#3858e9' }} isRoot>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
