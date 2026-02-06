import React, { useRef } from "react";
import { X, Plus, Target, Brain, Coffee, Clock, Sparkles, List, Layout, Send } from "lucide-react";
import InputWithClear from "./InputWithClear";

const defaultTags = [
  { name: "工作", color: "#6366f1", iconType: "preset", iconValue: "Target" },
  { name: "学习", color: "#a855f7", iconType: "preset", iconValue: "Brain" },
  { name: "摸鱼", color: "#f43f5e", iconType: "preset", iconValue: "Coffee" },
  { name: "休息", color: "#10b981", iconType: "preset", iconValue: "Clock" },
];

const EditRecordModal = ({ editingRecord, setEditingRecord, onSave, settings }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            setEditingRecord((prev) => ({
              ...prev,
              screenshots: [...(prev.screenshots || []), evt.target.result],
            }));
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  if (!editingRecord) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        background: "rgba(0,0,0,0.4)",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setEditingRecord(null);
      }}
    >
      <div
        className="win11-card"
        style={{
          width: 440,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          animation: "modalScaleIn 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
          overflow: "hidden",
          maxHeight: "85vh",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          borderRadius: 12,
          backdropFilter: "blur(20px)",
          backgroundColor: "color-mix(in srgb, var(--card-bg), transparent 15%)",
          backgroundImage:
            "linear-gradient(to bottom right, transparent, color-mix(in srgb, var(--accent), transparent 90%))",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 className="title" style={{ fontSize: "1rem", margin: 0 }}>
            {editingRecord.isNew ? "添加事件" : "编辑记录"}
          </h3>
          <button
            onClick={() => setEditingRecord(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                任务内容
              </label>
              <InputWithClear
                value={editingRecord.task}
                onChange={(e) => setEditingRecord({ ...editingRecord, task: e.target.value })}
                style={{ width: "100%" }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                时长 (分)
              </label>
              <input
                type="number"
                min="1"
                value={editingRecord.duration || 1}
                onChange={(e) => setEditingRecord({ ...editingRecord, duration: parseInt(e.target.value) || 1 })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>

          {/* Tags Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              相关标签
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags).map((tag, idx) => {
                const isSelected = (editingRecord.tags || []).includes(tag.name);
                let IconComp = Target;
                if (tag.iconValue === "Brain") IconComp = Brain;
                if (tag.iconValue === "Coffee") IconComp = Coffee;
                if (tag.iconValue === "Clock") IconComp = Clock;
                if (tag.iconValue === "Sparkles") IconComp = Sparkles;
                if (tag.iconValue === "List") IconComp = List;
                if (tag.iconValue === "Layout") IconComp = Layout;
                if (tag.iconValue === "Send") IconComp = Send;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      const currentTags = editingRecord.tags || [];
                      const newTags =
                        isSelected ? currentTags.filter((t) => t !== tag.name) : [...currentTags, tag.name];
                      setEditingRecord({ ...editingRecord, tags: newTags });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      background: isSelected ? tag.color : "rgba(128,128,128,0.05)",
                      color: isSelected ? "white" : "var(--text-primary)",
                      border: isSelected ? `1px solid ${tag.color}` : "1px solid transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    {tag.iconType === "image" ?
                      <img
                        src={tag.iconValue}
                        style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    : <IconComp size={14} />}
                    {tag.name}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              详细描述
            </label>
            <textarea
              value={editingRecord.desc || ""}
              onChange={(e) => setEditingRecord({ ...editingRecord, desc: e.target.value })}
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              相关截图
            </label>
            <div
              style={{
                borderRadius: 8,
                minHeight: 80,
                background: "var(--bg-secondary)",
                padding: 12,
                border: "1px dashed var(--border-color)",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  Array.from(files).forEach((file) => {
                    if (file.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        setEditingRecord((prev) => ({
                          ...prev,
                          screenshots: [...(prev.screenshots || []), evt.target.result],
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  });
                }
              }}
            >
              {editingRecord.screenshots &&
                editingRecord.screenshots.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "relative",
                      width: 80,
                      height: 60,
                      borderRadius: 4,
                      overflow: "hidden",
                      border: "1px solid var(--border-color)",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={img}
                      style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                      onClick={() => window.electronAPI && window.electronAPI.send("open-preview", img)}
                    />
                    <button
                      onClick={() => {
                        const newScreenshots = editingRecord.screenshots.filter((_, i) => i !== idx);
                        setEditingRecord({ ...editingRecord, screenshots: newScreenshots });
                      }}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        background: "rgba(0,0,0,0.5)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 16,
                        height: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: 10,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                multiple
                onChange={handleFileSelect}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80,
                  height: 60,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "0.7rem",
                }}
              >
                <Plus size={20} />
                <span style={{ marginTop: 4 }}>添加</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            background: "rgba(128,128,128,0.02)",
          }}
        >
          <button className="btn" onClick={() => setEditingRecord(null)} style={{ background: "var(--bg-secondary)" }}>
            取消
          </button>
          <button
            className="btn primary"
            onClick={onSave}
            style={{ background: "var(--accent)", borderColor: "transparent", padding: "6px 24px" }}
          >
            保存
          </button>
        </div>

        <style>{`
           @keyframes modalScaleIn {
             from { opacity: 0; transform: scale(0.96) translateY(10px); }
             to { opacity: 1; transform: scale(1) translateY(0); }
           }
        `}</style>
      </div>
    </div>
  );
};

export default EditRecordModal;
