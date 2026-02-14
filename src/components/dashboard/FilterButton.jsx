import React from "react";

const FilterButton = ({ id, label, activeId, hasDateRange, onClick, accent }) => {
  const isActive = activeId === id && !hasDateRange;
  return (
    <button
      className={isActive ? "btn primary" : "btn"}
      onClick={() => onClick(id)}
      style={{
        background: isActive ? (accent || "var(--accent)") : undefined,
        color: isActive ? "white" : undefined,
        borderColor: isActive ? "transparent" : undefined,
        userSelect: "none",
        ...(!isActive ? { background: "var(--card-bg)" } : {})
      }}
    >
      {label}
    </button>
  );
};

export default FilterButton;
