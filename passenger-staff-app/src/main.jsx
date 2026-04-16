import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0c1c44',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#e8b523', secondary: '#060e2a' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#060e2a' },
          },
          duration: 3500,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
