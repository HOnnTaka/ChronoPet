import React, { useState } from "react";
import { Edit2, Trash2, Sparkles, Loader2, Image as ImageIcon } from "lucide-react";
import InlineConfirm from "./InlineConfirm";

/**
 * RecordCard Component
 * Balanced layout: Spacious but efficient. Uses right side for actions/media.
 */
const RecordCard = ({ record, accent, onDelete, onEdit, onAiSummary, loadingAi }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      className="win11-card record-card"
      style={{
        flex: 1,
        padding: "12px 18px", // Increased padding for breathing room
        background: "var(--card-bg)",
        animation: "fadeIn 0.3s ease-out",
        position: "relative",
        marginBottom: 0,
        border: "1px solid var(--border-color)",
        transition: "all 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)",
        display: "flex",
        gap: 16, // Consistent gap between left and right
        userSelect: "text", // Enable text selection
        cursor: "auto",
      }}
    >
      <style>{`
        .record-card:hover {
          background: color-mix(in srgb, var(--card-bg), var(--accent) 2%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-color: color-mix(in srgb, var(--border-color), var(--accent) 20%);
        }
        .action-btn {
          opacity: 0.6;
          transition: all 0.2s;
          padding: 4px;
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .record-card:hover .action-btn {
          opacity: 1;
        }
        .action-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .action-btn.delete:hover {
          background: rgba(209, 52, 56, 0.1);
          color: #d13438;
        }
        .action-btn.ai {
          color: #7c3aed;
          opacity: 0.8;
        }
        .action-btn.ai:hover {
          background: rgba(124, 58, 237, 0.1);
        }
      `}</style>

      {/* LEFT CONTENT: Information */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Title */}
        <div
          style={{
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            color: "var(--text-primary)",
            lineHeight: 1.3,
          }}
          onClick={() => onEdit(record)}
        >
          {record.task}
        </div>

        {/* Description */}
        {record.desc && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              whiteSpace: "pre-wrap",
              cursor: "pointer",
              lineHeight: 1.5, // Better readability
            }}
            onClick={() => onEdit(record)}
          >
            {record.desc}
          </div>
        )}

        {/* Tags */}
        {record.tags && record.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: record.desc ? 2 : 0 }}>
            {record.tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ color: accent, marginRight: 4 }}>#</span>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT CONTENT: Interaction & Media */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between", // Spread top/bottom
          gap: 8,
          minWidth: "80px", // Reserve some width
        }}
      >
        {/* Actions Row */}
        <div style={{ display: "flex", gap: 2, position: "relative" }}>
          {showDeleteConfirm && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 10,
                marginTop: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                minWidth: "160px",
              }}
            >
              <InlineConfirm
                onConfirm={() => {
                  onDelete(record);
                  setShowDeleteConfirm(false);
                }}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            </div>
          )}

          {record.screenshots && record.screenshots.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAiSummary(record);
              }}
              disabled={loadingAi}
              title="AI 总结"
              className="action-btn ai"
              style={{ border: "none", background: "transparent", cursor: "pointer" }}
            >
              {loadingAi ?
                <Loader2 size={15} className="spin" />
              : <Sparkles size={15} />}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(record);
            }}
            className="action-btn"
            title="编辑"
            style={{ border: "none", background: "transparent", cursor: "pointer" }}
          >
            <Edit2 size={15} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="action-btn delete"
            title="删除"
            style={{ border: "none", background: "transparent", cursor: "pointer" }}
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Screenshots Stack (Bottom Right) */}
        {record.screenshots && record.screenshots.length > 0 && (
          <div style={{ display: "flex", gap: "6px" }}>
            {record.screenshots.slice(0, 2).map((img, idx) => (
              <div
                key={idx}
                className="group"
                style={{
                  borderRadius: "6px",
                  overflow: "hidden",
                  width: "56px",
                  height: "36px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  position: "relative",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
                onClick={() => window.electronAPI && window.electronAPI.send("open-preview", img)}
              >
                <img
                  src={img}
                  alt="截图"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {idx === 1 && record.screenshots.length > 2 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: "bold",
                    }}
                  >
                    +{record.screenshots.length - 2}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordCard;
