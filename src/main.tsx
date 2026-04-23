import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error logging — surfaces the offending file in production.
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[GlobalError]", e.message, e.filename, `${e.lineno}:${e.colno}`, e.error);
});
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[UnhandledRejection]", e.reason);
});

// Guard: never register service workers inside iframes or Lovable preview hosts.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewHost || isInIframe) {
  // Unregister any existing service workers AND clear caches in preview/iframe contexts.
  // A previously-registered SW from an old build can serve stale HTML and cause
  // the dreaded "white screen" after a deploy. We clear it defensively.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    }).catch(() => {});
  }
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
} else if ("serviceWorker" in navigator) {
  // Production: register the auto-generated service worker
  window.addEventListener("load", () => {
    import("virtual:pwa-register").then(({ registerSW }) => {
      registerSW({ immediate: true });
    }).catch(() => {
      // virtual module unavailable in dev — ignore
    });
  });
}

// Mount with defensive try/catch so a sync render error still surfaces in console
// instead of leaving a blank #root.
try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element in index.html");
  createRoot(rootEl).render(<App />);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[main] Fatal mount error:", err);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0b10;color:#e6e7ea;font-family:Inter,sans-serif;padding:24px;text-align:center;">
        <div style="max-width:480px;">
          <h1 style="font-size:22px;margin-bottom:8px;">No se pudo iniciar la aplicación</h1>
          <p style="font-size:14px;opacity:0.7;margin-bottom:20px;">Recarga la página. Si el problema persiste, limpia la caché del navegador.</p>
          <button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;background:linear-gradient(135deg,#1e90ff,#8a4dff);color:#fff;border:none;font-size:14px;cursor:pointer;">Recargar</button>
        </div>
      </div>`;
  }
}
