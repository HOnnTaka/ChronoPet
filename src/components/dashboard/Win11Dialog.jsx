import React from "react";
import { X } from "lucide-react";

/**
 * Win11Dialog Component
 * A custom modal that mimics Windows 11 system dialog style.
 */
const Win11Dialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  onClose,
  isDark = true,
  confirmLabel = "确定",
  cancelLabel = "取消",
  showCancel = false,
  settings = {},
}) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes dialogIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .win11-dialog {
          animation: dialogIn 0.3s cubic-bezier(0.1, 0.9, 0.2, 1);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          border: 1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
        }
      `}</style>
      <div
        className={`win11-dialog ${settings.win12Experimental ? "win12-experimental" : ""}`}
        style={{
          width: "400px",
          maxWidth: "90%",
          background:
            settings.win12Experimental ? "var(--win12-tint)"
            : isDark ? "#2d2d2d"
            : "#ffffff",
          borderRadius: settings.win12Experimental ? "20px" : "12px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backdropFilter: settings.win12Experimental ? "saturate(200%)" : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div
          style={{
            padding: "6px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
            {title || "chronopet"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDark ? "white" : "black",
              opacity: 0.6,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e81123";
              e.currentTarget.style.opacity = 1;
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.opacity = 0.6;
              e.currentTarget.style.color = isDark ? "white" : "black";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "16px" }}>
          <div
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: isDark ? "#e0e0e0" : "#333",
            }}
          >
            {message}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "9px",
            background: isDark ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          {showCancel && (
            <button
              onClick={() => {
                if (onCancel) onCancel();
                onClose();
              }}
              style={{
                padding: "3px 16px",
                borderRadius: "6px",
                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                background: isDark ? "rgba(255,255,255,0.05)" : "white",
                color: isDark ? "white" : "black",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            style={{
              padding: "3px 16px",
              borderRadius: "6px",
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "white",
              fontSize: "0.8rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.9)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Win11Dialog;
