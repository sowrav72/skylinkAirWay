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
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#161b22',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: '8px',
            fontFamily: '"Outfit", sans-serif',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#14b8a6', secondary: '#0d1117' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#0d1117' } },
          duration: 3000,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
