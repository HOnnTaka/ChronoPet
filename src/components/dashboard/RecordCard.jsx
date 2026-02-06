import React, { useState, useEffect } from "react";
import { Edit2, Trash2, Sparkles, Loader2, Save, X, Clock, Check } from "lucide-react";
import InlineConfirm from "./InlineConfirm";

/**
 * RecordCard Component
 * Handles display and inline editing of a single record.
 *
 * Props:
 * - record: The record object
 * - accent: Accent color
 * - onDelete: Callback(record)
 * - onUpdate: Callback(updatedRecord)
 * - onAiSummary: Callback(record)
 * - loadingAi: boolean
 */
const RecordCard = ({ record, accent, onDelete, onUpdate, onAiSummary, loadingAi }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit State
  const [task, setTask] = useState(record.task);
  const [desc, setDesc] = useState(record.desc || "");
  const [duration, setDuration] = useState(record.duration || 1);
  const [tags, setTags] = useState(record.tags || []);

  // Reset state when record or edit mode changes
  useEffect(() => {
    if (isEditing) {
      setTask(record.task);
      setDesc(record.desc || "");
      setDuration(record.duration || 1);
      setTags(record.tags || []);
    }
  }, [isEditing, record]);

  const handleSave = () => {
    const updated = {
      ...record,
      task,
      desc,
      duration: parseInt(duration),
      tags,
    };
    onUpdate(updated);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div
      className="win11-card"
      style={{
        flex: 1,
        padding: "16px",
        background: "var(--card-bg)",
        animation: "fadeIn 0.3s ease-out",
        position: "relative",
        marginBottom: 0,
      }}
    >
      {/* CARD HEADER: Task & Duration or Edit Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          marginBottom: "8px",
        }}
      >
        <div style={{ flex: 1 }}>
          {isEditing ?
            <div style={{ animation: "fadeIn 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {/* Compact Task Input */}
                <input
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="modern-input"
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--border-color)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                  }}
                />
                {/* Compact Duration Control */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "var(--bg-secondary)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  <Clock size={14} style={{ color: "var(--text-secondary)" }} />
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    style={{
                      width: 40,
                      border: "none",
                      background: "transparent",
                      fontSize: "0.9rem",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>m</span>
                </div>
              </div>
            </div>
          : <>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "1.05rem",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
                onClick={() => setIsEditing(true)}
              >
                {record.task}
              </div>
              {/* Tags Display */}
              {record.tags && record.tags.length > 0 && (
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {record.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 10px",
                        borderRadius: "4px",
                        background: accent,
                        color: "white",
                        fontWeight: 600,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          }
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", marginLeft: "12px", alignItems: "center", position: "relative" }}>
          {/* Delete Confirmation Popup */}
          {showDeleteConfirm && (
            <InlineConfirm
              onConfirm={() => {
                onDelete(record);
                setShowDeleteConfirm(false);
              }}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          )}

          {isEditing ?
            <>
              <button
                onClick={handleSave}
                style={{
                  background: accent,
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  padding: "6px",
                  color: "white",
                }}
                title="Save"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancel}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  padding: "6px",
                  color: "var(--text-primary)",
                }}
                title="Cancel"
              >
                <X size={16} />
              </button>
            </>
          : <>
              {record.screenshots && record.screenshots.length > 0 && (
                <button
                  onClick={() => onAiSummary(record)}
                  disabled={loadingAi}
                  title="AI 总结此事件"
                  style={{
                    background: "rgba(124, 58, 237, 0.1)",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "all 0.2s",
                    opacity: loadingAi ? 0.7 : 1,
                  }}
                >
                  {loadingAi ?
                    <Loader2 size={12} className="spin" />
                  : <Sparkles size={12} />}
                  <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>总结</span>
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.6,
                  padding: "4px",
                  color: "var(--text-primary)",
                }}
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  opacity: 0.6,
                  padding: "4px",
                  color: "#d13438",
                }}
              >
                <Trash2 size={14} />
              </button>
            </>
          }
        </div>
      </div>

      {/* DESCRIPTION */}
      {isEditing ?
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="modern-input"
          rows={3}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: 6,
            border: "1px solid var(--border-color)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: "0.9rem",
            marginBottom: "12px",
            resize: "vertical",
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
          placeholder="Add description..."
        />
      : record.desc && (
          <div
            style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              marginBottom: "12px",
              whiteSpace: "pre-wrap",
              cursor: "pointer",
              lineHeight: 1.5,
            }}
            onClick={() => setIsEditing(true)}
          >
            {record.desc}
          </div>
        )
      }

      {/* SCREENSHOTS */}
      {record.screenshots && record.screenshots.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {record.screenshots.map((img, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                overflow: "hidden",
                width: "120px",
                height: "80px",
                background: "rgba(0,0,0,0.05)",
              }}
            >
              <img
                src={img}
                alt={`截图 ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  cursor: "pointer",
                }}
                onClick={() => window.electronAPI && window.electronAPI.send("open-preview", img)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordCard;
