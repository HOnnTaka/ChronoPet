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
        position: "relative",
      }}
    />
    {value && (
      <button
        type="button"
        onClick={() => {
          onChange({ target: { value: "" } });
          if (onClear) onClear();
        }}
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-75%)",
          background: "transparent",
          border: "none",
          width: 24,
          height: 24,
          borderRadius: 4,
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(128,128,128,0.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export default InputWithClear;
