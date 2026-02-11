import React, { useRef } from "react";

const InlineConfirm = ({ onConfirm, onCancel, title = "确认删除?", style = {} }) => {
  const ref = useRef(null);

  // No complex logic needed because of the overlay div

  return (
    <>
      {/* Transparent Overlay for click-outside */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 998,
          cursor: "default",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        onContextMenu={(e) => {
          e.preventDefault(); // Also close on right click? Optional.
          e.stopPropagation();
          onCancel();
        }}
      />

      {/* Popup */}
      <div
        ref={ref}
        className="win11-card"
        style={{
          position: "absolute",
          top: -45, // Default above
          right: 0,
          backgroundColor: "var(--card-bg)", // Use theme var but ensure opacity if needed
          // Override to be more opaque as requested
          background: "var(--input-bg)",
          // Actually var(--input-bg) is 0.8 opacity white in light mode.
          // Let's use a solid-ish mix or just ensure backdrop filter is strong.
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          zIndex: 999,
          borderRadius: 8,
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          whiteSpace: "nowrap",
          animation: "fadeIn 0.2s",
          minWidth: "max-content",
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{title}</span>
        <button
          onClick={onConfirm}
          className="btn danger"
          style={{
            border: "none",
            borderRadius: 4,
            padding: "2px 10px",
            fontSize: "0.75rem",
            height: 24,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          删除
        </button>
        <button
          onClick={onCancel}
          className="btn"
          style={{
            background: "transparent",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: "0.75rem",
            height: 24,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          取消
        </button>
      </div>
    </>
  );
};

export default InlineConfirm;
