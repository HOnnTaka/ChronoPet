import React, { useRef } from "react";
import { X, Plus, Minus, Tag, Target, Brain, Coffee, Clock, Sparkles, Save, Image as ImageIcon } from "lucide-react";
import InputWithClear from "./InputWithClear";

const defaultTags = [
  { name: "工作", color: "#6366f1", iconValue: "Target" },
  { name: "学习", color: "#a855f7", iconValue: "Brain" },
  { name: "摸鱼", color: "#f43f5e", iconValue: "Coffee" },
  { name: "休息", color: "#10b981", iconValue: "Clock" },
];

const EditRecordModal = ({ editingRecord, setEditingRecord, onSave, settings, onViewImages }) => {
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

  // Normalize duration to seconds on mount/change of editingRecord
  React.useEffect(() => {
    if (editingRecord && editingRecord.duration !== undefined) {
      const d = editingRecord.duration || 0;
      if (editingRecord.id < 1739015400000 && d <= 3600) {
        setEditingRecord((prev) => ({ ...prev, duration: d * 60 }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRecord?.id, setEditingRecord]);

  if (!editingRecord) return null;

  const accent = settings.accentColor || "var(--accent)";

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
        background: "transparent",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setEditingRecord(null);
      }}
    >
      {/* Dimmer Background Sibling */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: settings.win12Experimental ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.4)",
          pointerEvents: "none", // Let clicks pass through to container
          zIndex: -1
        }}
      />
      <div
        className={`win11-card ${settings.win12Experimental ? "liquid-modal" : ""}`}
        style={{
          width: 440,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          animation: "modalScaleIn 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
          overflow: "hidden",
          maxHeight: "90vh",
          ...(settings.win12Experimental ? {} : {
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            backgroundColor: "var(--bg-active)",
            backgroundImage: "linear-gradient(to bottom right, transparent, color-mix(in srgb, var(--accent), transparent 90%))",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.25), 0 0 0 1px inset rgba(255, 255, 255, 0.1)",
          }),
        }}
      >
        {/* Header */}
        <div
          style={{
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: settings.win12Experimental ? "none" : "1px solid var(--border-color)",
            background: settings.win12Experimental ? "transparent" : "rgba(255,255,255,0.05)",
            userSelect: "none",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 3,
                height: 16,
                borderRadius: 2,
                background: "var(--accent)",
                marginRight: 4,
              }}
            ></div>
            <span>{editingRecord.isNew ? "添加事件" : "编辑记录"}</span>
          </div>
          <button
            onClick={() => setEditingRecord(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.6,
              color: "var(--text-primary)",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {/* Main Input */}
          <InputWithClear
            value={editingRecord.task}
            onChange={(e) => setEditingRecord({ ...editingRecord, task: e.target.value })}
            placeholder="你在做什么？"
            autoFocus
            style={{ marginBottom: "12px", background: "var(--input-bg)" }}
          />

          {/* Tags Selection */}
          <div style={{ marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags).map((tag) => {
              const isSelected = (editingRecord.tags || []).includes(tag.name);
              const baseColor = tag.color || "var(--accent)";
              return (
                <span
                  key={tag.name}
                  onClick={() => {
                    const current = editingRecord.tags || [];
                    const next = isSelected ? current.filter((t) => t !== tag.name) : [...current, tag.name];
                    setEditingRecord({ ...editingRecord, tags: next });
                  }}
                  style={{
                    fontSize: "0.76rem",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: isSelected ? baseColor : "var(--bg-active)",
                    color: isSelected ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    userSelect: "none",
                    border: "1px solid",
                    borderColor: isSelected ? "transparent" : "var(--border-color)",
                    fontWeight: isSelected ? 600 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Tag size={10} style={{ opacity: isSelected ? 1 : 0.5 }} />
                  {tag.name}
                </span>
              );
            })}
          </div>

          {/* Screenshot Gallery - Same as RecordPage */}
          <div
            style={{
              marginBottom: "12px",
              border: "1px dashed var(--border-color)",
              borderRadius: "6px",
              padding: "10px",
              minHeight: "80px",
              background: "var(--input-bg)",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "center",
              justifyContent: "flex-start",
              overflow: "hidden",
              boxSizing: "border-box",
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
            {(editingRecord.screenshots || []).map((img, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid var(--border-color)",
                  width: "96px",
                  height: "60px",
                  boxSizing: "border-box",
                  cursor: "zoom-in",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
                onClick={() => {
                  if (onViewImages) onViewImages(editingRecord.screenshots, idx);
                  else if (window.electronAPI) window.electronAPI.send("open-preview", img);
                }}
              >
                <img
                  src={img}
                  alt={`截图 ${idx + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = editingRecord.screenshots.filter((_, i) => i !== idx);
                    setEditingRecord({ ...editingRecord, screenshots: next });
                  }}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    padding: 2,
                    cursor: "pointer",
                    display: "flex",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <X size={12} />
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
                width: (editingRecord.screenshots || []).length > 0 ? "80px" : "100%",
                height: (editingRecord.screenshots || []).length > 0 ? "60px" : "100%",
                display: "flex",
                flexDirection: (editingRecord.screenshots || []).length > 0 ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                border: (editingRecord.screenshots || []).length > 0 ? "1px dashed var(--border-color)" : "none",
                borderRadius: (editingRecord.screenshots || []).length > 0 ? "4px" : "0",
              }}
            >
              {(editingRecord.screenshots || []).length === 0 ?
                <>
                  <ImageIcon size={20} opacity={0.5} />
                  <span>添加记录截图</span>
                </>
                : <Plus size={20} opacity={0.5} />}
            </div>
          </div>

          {/* Description */}
          <div style={{ display: "flex", flex: 1, position: "relative" }}>
            <textarea
              rows={6}
              placeholder="添加任务详情描述..."
              value={editingRecord.desc || ""}
              onChange={(e) => setEditingRecord({ ...editingRecord, desc: e.target.value })}
              spellCheck={false}
              style={{
                resize: "none",
                flex: 1,
                width: "100%",
                background: "var(--input-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "0.9rem",
                color: "var(--text-primary)",
                fontFamily: "inherit",
              }}
            />
            {editingRecord.desc && (
              <button
                onClick={() => setEditingRecord({ ...editingRecord, desc: "" })}
                style={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Footer - Duration Controls + Action */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-color)",
            background: "rgba(255,255,255,0.03)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {/* Duration Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(255,255,255,0.03)",
              padding: "2px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              height: "32px",
            }}
          >
            <button
              className="btn"
              style={{
                padding: "0 4px",
                border: "none",
                background: "transparent",
                minWidth: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => {
                const mins = Math.round((editingRecord.duration || 0) / 60);
                setEditingRecord({ ...editingRecord, duration: Math.max(1, mins - 5) * 60 });
              }}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={Math.round((editingRecord.duration || 0) / 60)}
              onChange={(e) => {
                const mins = Math.max(1, parseInt(e.target.value) || 0);
                setEditingRecord({ ...editingRecord, duration: mins * 60 });
              }}
              style={{
                width: "35px",
                border: "none",
                padding: "0",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                outline: "none",
                margin: 0,
                background: "var(--input-bg)",
              }}
            />
            <span
              style={{
                fontSize: "0.7rem",
                opacity: 0.6,
                marginRight: 4,
                display: "flex",
                alignItems: "center",
                height: "100%",
                margin: 0,
                marginBottom: "-4px",
              }}
            >
              m
            </span>
            <button
              className="btn"
              style={{
                padding: "0 4px",
                border: "none",
                background: "transparent",
                minWidth: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => {
                const mins = Math.round((editingRecord.duration || 0) / 60);
                setEditingRecord({ ...editingRecord, duration: (mins + 5) * 60 });
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn"
              onClick={() => setEditingRecord(null)}
              style={{ background: "transparent", border: "1px solid var(--border-color)" }}
            >
              取消
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const hasTask = editingRecord.task?.trim();
                const hasTags = editingRecord.tags?.length > 0;
                const hasImages = editingRecord.screenshots?.length > 0;
                if (!hasTask && !hasTags && !hasImages) {
                  alert("请填写任务内容或选择标签");
                  return;
                }
                onSave();
              }}
              style={{ background: accent, borderColor: "transparent", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Save size={14} /> 保存
            </button>
          </div>
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
