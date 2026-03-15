import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { storage } from './lib/storage.ts'

// Hydrate the storage cache before React renders so all usePersistedState
// hooks read correct values synchronously on first render — no flash of defaults.
storage.hydrate().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
