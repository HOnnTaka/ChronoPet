import React, { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Loader2,
  Sparkles,
  Target,
  Brain,
  Coffee,
  Clock,
  List,
  Layout,
  Send,
} from "lucide-react";
import InputWithClear from "./InputWithClear";
import { APP_CONFIG } from "../../config";

const TagEditModal = ({ editingTag, setEditingTag, onSave, onGenerateIcon, isGeneratingIcon }) => {
  const tagIconFileRef = useRef(null);
  const [tab, setTab] = useState("basic"); // basic | appearance

  if (!editingTag) return null;

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
        zIndex: 1100,
        background: "rgba(0,0,0,0.4)",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setEditingTag(null);
      }}
    >
      <div
        className="win11-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380, // Slightly smaller width
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          animation: "modalScaleIn 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
          overflow: "hidden",
          maxHeight: "85vh",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          borderRadius: 12, // "Not too big"
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
            {editingTag.index !== undefined ? "编辑标签" : "添加新标签"}
          </h3>
          <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 6, padding: 2 }}>
            <button
              onClick={() => setTab("basic")}
              style={{
                padding: "2px 10px",
                borderRadius: 4,
                border: "none",
                background: tab === "basic" ? "var(--card-bg)" : "transparent",
                boxShadow: tab === "basic" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                fontSize: "0.75rem",
                cursor: "pointer",
                color: tab === "basic" ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "all 0.2s",
              }}
            >
              基础
            </button>
            <button
              onClick={() => setTab("appearance")}
              disabled={!editingTag.name?.trim()}
              style={{
                padding: "2px 10px",
                borderRadius: 4,
                border: "none",
                background: tab === "appearance" ? "var(--card-bg)" : "transparent",
                boxShadow: tab === "appearance" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                fontSize: "0.75rem",
                cursor: !editingTag.name?.trim() ? "not-allowed" : "pointer",
                color: tab === "appearance" ? "var(--text-primary)" : "var(--text-secondary)",
                opacity: !editingTag.name?.trim() ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              外观
            </button>
          </div>
        </div>

        {/* Content Scrollable */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {tab === "basic" && (
            <div className="animate-fade-in">
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  标签名称
                </label>
                <InputWithClear
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  标记颜色
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {APP_CONFIG.THEME_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setEditingTag({ ...editingTag, color: c })}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: c,
                        cursor: "pointer",
                        border: editingTag.color === c ? "2px solid var(--card-bg)" : "2px solid transparent",
                        boxShadow: editingTag.color === c ? `0 0 0 2px ${c}` : "none",
                        transform: editingTag.color === c ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.2s",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label
                  style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  图标
                </label>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  {/* Toggle Type - Styled Buttons */}
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      fontSize: "0.8rem",
                      background: "rgba(128,128,128,0.1)",
                      padding: 3,
                      borderRadius: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingTag({ ...editingTag, iconType: "preset" })}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        background: editingTag.iconType !== "image" ? "var(--card-bg)" : "transparent",
                        color: editingTag.iconType !== "image" ? "var(--text-primary)" : "var(--text-secondary)",
                        boxShadow: editingTag.iconType !== "image" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        fontWeight: editingTag.iconType !== "image" ? 500 : 400,
                        transition: "all 0.2s",
                      }}
                    >
                      预设
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTag({ ...editingTag, iconType: "image" })}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        background: editingTag.iconType === "image" ? "var(--card-bg)" : "transparent",
                        color: editingTag.iconType === "image" ? "var(--text-primary)" : "var(--text-secondary)",
                        boxShadow: editingTag.iconType === "image" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        fontWeight: editingTag.iconType === "image" ? 500 : 400,
                        transition: "all 0.2s",
                      }}
                    >
                      图片
                    </button>
                  </div>
                </div>

                {editingTag.iconType !== "image" ?
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                    {APP_CONFIG.DEFAULT_ICONS.map((iconName) => {
                      let C = Target;
                      if (iconName === "Brain") C = Brain;
                      if (iconName === "Coffee") C = Coffee;
                      if (iconName === "Clock") C = Clock;
                      if (iconName === "Sparkles") C = Sparkles;
                      if (iconName === "List") C = List;
                      if (iconName === "Layout") C = Layout;
                      if (iconName === "Send") C = Send;
                      const isSelected = editingTag.iconValue === iconName;
                      return (
                        <div
                          key={iconName}
                          onClick={() => setEditingTag({ ...editingTag, iconValue: iconName })}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 8,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isSelected ? `${editingTag.color}20` : "rgba(128,128,128,0.05)",
                            color: isSelected ? editingTag.color : "var(--text-secondary)",
                            border: isSelected ? `1px solid ${editingTag.color}` : "1px solid transparent",
                            transition: "all 0.2s",
                          }}
                        >
                          <C size={18} />
                        </div>
                      );
                    })}
                  </div>
                : <div
                    onClick={() => tagIconFileRef.current?.click()}
                    style={{
                      width: "100%",
                      height: 100,
                      border: "2px dashed var(--border-color)",
                      borderRadius: 12,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      background: "var(--bg-secondary)",
                      gap: 8,
                      color: "var(--text-secondary)",
                      transition: "all 0.2s",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.background = "var(--card-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }}
                  >
                    {editingTag.iconValue ?
                      <div style={{ width: "100%", height: "100%", position: "relative" }}>
                        <img
                          src={editingTag.iconValue}
                          style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: "rgba(0,0,0,0.6)",
                            color: "white",
                            fontSize: "0.75rem",
                            padding: "4px",
                            textAlign: "center",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          点击更换
                        </div>
                      </div>
                    : <>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--card-bg)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          }}
                        >
                          <Upload size={18} color="var(--accent)" />
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>上传自定义图标</span>
                        <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>支持 PNG, JPG</span>
                      </>
                    }
                  </div>
                }
                <input
                  type="file"
                  ref={tagIconFileRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = (ev) =>
                        setEditingTag({ ...editingTag, iconValue: ev.target.result, iconType: "image" });
                      r.readAsDataURL(f);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {tab === "appearance" && (
            <div className="animate-fade-in">
              <div
                style={{
                  background: "linear-gradient(to bottom right, var(--bg-secondary), transparent)",
                  borderRadius: 12,
                  padding: 16,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      border: "2px solid var(--border-color)",
                      background: "#fff",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      position: "relative",
                    }}
                  >
                    {editingTag.petIcon ?
                      <img
                        src={editingTag.petIcon}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          // Show fallback sibling or parent background
                          e.target.parentElement.style.backgroundImage = 'url("icon_moyu.png")';
                          e.target.parentElement.style.backgroundSize = "cover";
                        }}
                      />
                    : <img
                        src="icon_base.png"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.src = "icon_moyu.png";
                        }}
                      />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>桌宠形象</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      标签激活时显示此形象
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <label
                    className="btn"
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      justifyContent: "center",
                    }}
                  >
                    <Upload size={14} style={{ marginRight: 6 }} /> 上传
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = (ev) => setEditingTag({ ...editingTag, petIcon: ev.target.result });
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                  <button
                    className="btn"
                    onClick={onGenerateIcon}
                    disabled={isGeneratingIcon}
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      background: "var(--accent)",
                      color: "#fff",
                      opacity: isGeneratingIcon ? 0.7 : 1,
                      border: "none",
                    }}
                  >
                    {isGeneratingIcon ?
                      <Loader2 size={14} className="spin" />
                    : <Sparkles size={14} style={{ marginRight: 6 }} />}
                    AI 生成
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <textarea
                  placeholder="AI 生成提示词... (例如: 戴着墨镜的酷狗)"
                  value={editingTag.aiPrompt || ""}
                  onChange={(e) => setEditingTag({ ...editingTag, aiPrompt: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    resize: "none",
                  }}
                />
              </div>
            </div>
          )}
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
          <button className="btn" onClick={() => setEditingTag(null)} style={{ background: "var(--bg-secondary)" }}>
            取消
          </button>

          <button
            className="btn primary"
            disabled={tab === "basic" && !editingTag.name?.trim()}
            onClick={
              tab === "basic" ?
                () => {
                  if (!editingTag.aiPrompt) {
                    setEditingTag((prev) => ({ ...prev, aiPrompt: prev.name }));
                  }
                  setTab("appearance");
                }
              : onSave
            }
            style={{
              background: "var(--accent)",
              borderColor: "transparent",
              padding: "6px 24px",
              opacity: tab === "basic" && !editingTag.name?.trim() ? 0.5 : 1,
              cursor: tab === "basic" && !editingTag.name?.trim() ? "not-allowed" : "pointer",
            }}
          >
            {tab === "basic" ? "下一步" : "保存"}
          </button>
        </div>

        <style>{`
           @keyframes modalScaleIn {
             from { opacity: 0; transform: scale(0.96) translateY(10px); }
             to { opacity: 1; transform: scale(1) translateY(0); }
           }
           .animate-fade-in {
             animation: fadeIn 0.3s ease;
           }
           @keyframes fadeIn {
             from { opacity: 0; transform: translateX(5px); }
             to { opacity: 1; transform: translateX(0); }
           }
        `}</style>
      </div>
    </div>
  );
};

export default TagEditModal;
