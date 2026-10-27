import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from './App.jsx';
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
let isMounted = false;

function renderApp() {
  if (isMounted) return;
  const rootElement = document.getElementById("root");
  if (rootElement) {
    isMounted = true;
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  }
}

if (typeof document !== "undefined") {
  // 1. Eksekusi langsung jika elemen #root sudah siap di halaman
  renderApp();

  // 2. Pasang pendengar peristiwa sebagai jaminan ekstra jika skrip dipanggil di head
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderApp);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("load", renderApp);
  }
}

