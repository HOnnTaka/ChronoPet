import React from "react";

const TabButton = ({ id, label, icon: Icon, activeId, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 0",
      border: "none",
      background: "transparent",
      borderBottom: activeId === id ? "2px solid var(--accent)" : "2px solid transparent",
      color: activeId === id ? "var(--text-primary)" : "var(--text-secondary)",
      cursor: "pointer",
      transition: "all 0.2s",
      fontWeight: activeId === id ? 500 : 400,
    }}
  >
    <Icon size={16} style={{ color: activeId === id ? "var(--accent)" : "var(--text-secondary)" }} />
    <span>{label}</span>
  </button>
);

export default TabButton;
