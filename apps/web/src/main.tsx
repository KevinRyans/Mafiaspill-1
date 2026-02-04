import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./styles/index.css"
import { ToastProvider } from "./components/ToastProvider"

const container = document.getElementById("root")
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}
