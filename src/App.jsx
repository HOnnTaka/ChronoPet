import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Pet from "./components/Pet";
import RecordPage from "./pages/RecordPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  useEffect(() => {
    const updateTheme = (colors) => {
      if (!colors) return;

      const root = document.documentElement;
      if (colors.accent) {
        // Windows returns hex without #, so we add it.
        // If it already has #, check length or just add safely?
        // Usually from systemPreferences it comes without #.
        // Let's assume standard behavior: 'RRGGBB'
        const accent = colors.accent.startsWith("#") ? colors.accent : "#" + colors.accent;
        root.style.setProperty("--accent", accent);
      }
    };

    const init = async () => {
      if (window.electronAPI) {
        try {
          const colors = await window.electronAPI.invoke("get-system-colors");
          updateTheme(colors);
        } catch (e) {
          console.error("Failed to sync theme:", e);
        }
      }
    };

    init();

    const cleanTheme = window.electronAPI?.receive("theme-updated", (data) => {
      updateTheme(data);
    });

    return () => {
      if (cleanTheme) cleanTheme();
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Pet />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
