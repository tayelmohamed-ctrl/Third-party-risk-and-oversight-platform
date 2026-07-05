import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { PlatformThemeProvider } from './context/PlatformThemeContext'
import { PerimeterProvider } from './context/PerimeterContext'
import App from './App'
import './index.css'
import './styles/platform-light.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlatformThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <PerimeterProvider>
            <App />
          </PerimeterProvider>
        </AuthProvider>
      </BrowserRouter>
    </PlatformThemeProvider>
  </React.StrictMode>,
)
