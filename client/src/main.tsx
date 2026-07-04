import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  console.warn("Unhandled promise rejection caught:", e.reason);
});

window.addEventListener("error", (e) => {
  if (e.message === "(unknown runtime error)" || !e.error) {
    e.preventDefault();
    console.warn("Runtime error caught and suppressed:", e.message);
  }
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm("A new version is available. Reload to update?")) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log("App is ready for offline use.");
      },
    });
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
