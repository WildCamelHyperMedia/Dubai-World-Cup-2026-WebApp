import { useState, useEffect } from "react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setShow(true);
    };
    const goOnline = () => {
      setIsOffline(false);
      setTimeout(() => setShow(false), 2000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    if (!navigator.onLine) {
      setIsOffline(true);
      setShow(true);
    }

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      data-testid="status-offline-indicator"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center py-2 px-4 text-sm font-medium transition-all duration-300"
      style={{
        backgroundColor: isOffline ? "#B91C1C" : "#15803D",
        color: "#FFFFFF",
      }}
    >
      <span className="mr-2">
        {isOffline ? "⚡" : "✓"}
      </span>
      {isOffline
        ? "You are offline — cached content is still available"
        : "Back online"}
    </div>
  );
}
