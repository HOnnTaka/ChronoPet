import React from "react";
import { X } from "lucide-react";

const InputWithClear = ({ value, onChange, placeholder, style, onClear, autoFocus, ...rest }) => (
  <div style={{ position: "relative", width: "100%" }}>
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      {...rest}
      style={{
        width: "100%",
        padding: "8px 32px 8px 12px",
        borderRadius: 6,
        border: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
        ...style,
      }}
    />
    {value && (
      <button
        onClick={() => {
          onChange({ target: { value: "" } });
          if (onClear) onClear();
        }}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
        }}
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export default InputWithClear;
