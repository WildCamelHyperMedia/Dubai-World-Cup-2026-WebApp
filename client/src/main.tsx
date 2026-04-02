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

createRoot(document.getElementById("root")!).render(<App />);
