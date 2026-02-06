import React from "react";

const FilterButton = ({ id, label, activeId, hasDateRange, onClick }) => (
  <button
    className={activeId === id && !hasDateRange ? "btn primary" : "btn"}
    onClick={() => onClick(id)}
    style={
      activeId === id && !hasDateRange ?
        {
          background: "var(--accent)",
          color: "white",
          borderColor: "transparent",
        }
      : {}
    }
  >
    {label}
  </button>
);

export default FilterButton;
