import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const rootEl = document.getElementById('root')

if (!rootEl) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:2rem" dir="rtl">
      <div>
        <h1 style="font-size:1.5rem;margin-bottom:0.5rem">خطأ في التحميل</h1>
        <p style="opacity:0.7">عنصر #root غير موجود في الصفحة.</p>
      </div>
    </div>
  `
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
