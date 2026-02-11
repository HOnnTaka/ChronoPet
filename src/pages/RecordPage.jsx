import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Sparkles,
  Save,
  X,
  Tag,
  Plus,
  Check,
  Loader2,
  Clock,
  Image as ImageIcon,
  Upload,
  Pin,
  PinOff,
} from "lucide-react";

// 统一风格弹窗组件
const AlertDialog = ({ message, onClose, onConfirm, showCancel, accent, settings = {} }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: settings.win12Experimental ? "transparent" : "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: 16,
    }}
  >
    <div
      className={`win11-card ${settings.win12Experimental ? "liquid-modal" : ""}`}
      style={{
        padding: "16px 20px",
        width: 320,
        maxWidth: "90%",
        animation: "alertScaleIn 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)",
        ...(settings.win12Experimental ? {} : {
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          backgroundColor: "var(--bg-active)",
          backgroundImage: "linear-gradient(to bottom right, transparent, color-mix(in srgb, var(--accent), transparent 90%))",
        }),
      }}
    >
      <h3 className="title" style={{ marginBottom: 12, fontSize: "0.9rem" }}>
        提示
      </h3>
      <p style={{ marginBottom: 20, color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.9rem" }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {showCancel && (
          <button
            className="btn"
            onClick={onClose}
            style={{
              padding: "6px 20px",
              fontSize: "0.85rem",
              borderRadius: settings.win12Experimental ? "10px" : "6px",
            }}
          >
            取消
          </button>
        )}
        <button
          className="btn primary"
          onClick={() => {
            if (onConfirm) onConfirm();
            onClose();
          }}
          style={{
            background: accent,
            padding: "6px 20px",
            fontSize: "0.85rem",
            borderRadius: settings.win12Experimental ? "10px" : "6px",
          }}
        >
          确定
        </button>
      </div>
    </div>
    <style>{`
      @keyframes alertScaleIn {
        from { opacity: 0; transform: scale(0.96) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
    `}</style>
  </div>
);

// 带清除按钮的输入框组件
const InputWithClear = ({ value, onChange, placeholder, style, ...props }) => (
  <div style={{ position: "relative", width: "100%", ...style }}>
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: "100%", paddingRight: value ? 30 : 10, margin: 0 }}
      {...props}
    />
    {value && (
      <button
        onClick={() => onChange({ target: { value: "" } })}
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
          padding: 2,
        }}
      >
        <X size={14} />
      </button>
    )}
  </div>
);

import { APP_CONFIG } from "../config";

export default function RecordPage() {
  const [task, setTask] = useState("");
  const [desc, setDesc] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [accent, setAccent] = useState("#0078d4");
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [settings, setSettings] = useState({ aiModel: "moonshotai/Kimi-K2.5", aiApiKey: "", customModel: "" });
  const [pinned, setPinned] = useState(true);
  const [duration, setDuration] = useState(0); // Default 0 for 'Now'
  const [timingMode, setTimingMode] = useState(null); // null | 'retro' | 'timer'

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.send("set-pinned", pinned);
  }, [pinned]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  const [alertConfig, setAlertConfig] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.invoke("get-records").then(setRecords);
    }
  }, []);
  const [aiStatus, setAiStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const [isFocused, setIsFocused] = useState(true);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const fetchData = useCallback(async () => {
    if (window.electronAPI) {
      // Use concurrent fetches for performance
      const [colors, s] = await Promise.all([
        window.electronAPI.invoke("get-system-colors"),
        window.electronAPI.invoke("get-settings"),
      ]);

      if (colors?.accent) {
        const hex = "#" + colors.accent;
        setAccent(hex);
        document.documentElement.style.setProperty("--accent", hex);
      }

      if (s) {
        setSettings(s);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await fetchData();
    })();
    return () => {
      mounted = false;
    };
  }, [fetchData]);

  useEffect(() => {
    let mounted = true;
    // fetchData is called via another effect or manually if needed
    // fetchData(); removed to fix lint

    const handlePaste = (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (mounted) setScreenshots((prev) => [...prev, evt.target.result]);
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && window.electronAPI) {
        window.electronAPI.send("hide-input");
      }
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);

    const onScreenCaptured = async (result) => {
      const img =
        result && result.success ? result.image
          : typeof result === "string" ? result
            : null;
      if (mounted && img) {
        setScreenshots((prev) => [...prev, img]);

        // Refresh settings to ensure we have the latest API Key
        let currentSettings = settingsRef.current;
        if (window.electronAPI) {
          const s = await window.electronAPI.invoke("get-settings");
          if (s) {
            setSettings(s);
            currentSettings = s;
          }
        }

        // 如果是等待AI分析的截图，立即触发AI请求
        if (window._pendingAiAnalysis) {
          window._pendingAiAnalysis = false;
          setAiLoading(true);
          setAiStatus("loading");

          // Remove header prefix if present (data:image/png;base64,)
          const base64 = img.replace(/^data:image\/\w+;base64,/, "");
          if (window.electronAPI) {
            window.electronAPI.send("request-ai-summary", {
              image: base64,
              model: currentSettings.aiModel,
              apiKey: currentSettings.aiApiKey,
              customModel: currentSettings.customModel,
            });
          }
        }
      }
    };

    let removeCaptureListener = null;
    let removeAiListener = null;
    let removeRecordsUpdateListener = null;
    let removeQuickRecord = null;
    let removeThemeListener = null;
    let removeSettingsListener = null;

    if (window.electronAPI) {
      removeThemeListener = window.electronAPI.receive("theme-updated", (data) => {
        if (data.accent) setAccent("#" + data.accent);
      });
      removeSettingsListener = window.electronAPI.receive("settings-updated", (s) => {
        if (s) setSettings(s);
      });

      removeCaptureListener = window.electronAPI.receive("screen-captured", onScreenCaptured);
      removeAiListener = window.electronAPI.receive("ai-summary-response", (result) => {
        setAiLoading(false);
        if (result.success) {
          let lines = result.summary.split("\n").filter((l) => l.trim());

          if (lines.length > 0) {
            const taskName = lines[0].trim();
            setTask((prev) => (prev ? prev + " / " + taskName : taskName));
            if (lines.length > 1) {
              const newDesc = lines.slice(1).join("\n");
              setDesc((prev) => (prev ? prev + "\n\n" + newDesc : newDesc));
            }
            setAiStatus("success");
            setTimeout(() => setAiStatus("idle"), 2000);
          }
        } else {
          setAiStatus("error");
          setTimeout(() => setAiStatus("idle"), 2000);
        }
      });
      removeRecordsUpdateListener = window.electronAPI.receive("records-updated", fetchData);

      removeQuickRecord = window.electronAPI.receive("execute-quick-record", ({ tag, image }) => {
        // Immediate Quick Save
        const record = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          task: tag,
          desc: "快速记录",
          tags: [tag],
          screenshots: image ? [image] : [],
          duration: 0, // 0 means active/unlimited
        };
        window.electronAPI.send("save-record", record);
      });
    }

    return () => {
      mounted = false;
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
      if (removeCaptureListener) removeCaptureListener();
      if (removeThemeListener) removeThemeListener();
      if (removeRecordsUpdateListener) removeRecordsUpdateListener();
      if (removeAiListener) removeAiListener();
      if (removeRecordsUpdateListener) removeRecordsUpdateListener();
      if (removeQuickRecord) removeQuickRecord();
      if (removeSettingsListener) removeSettingsListener();
    };
  }, [fetchData]); // Added fetchData to dependency array

  // 自动调整窗口大小
  // Auto-resize removed
  useEffect(() => { }, []);

  const handleMouseDown = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.closest(".no-drag")) return;
    setIsDragging(true);
    dragStart.current = { x: e.screenX, y: e.screenY };
    if (window.electronAPI) window.electronAPI.send("input-window-moving", { isMoving: true });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging && window.electronAPI) {
        const dx = e.screenX - dragStart.current.x;
        const dy = e.screenY - dragStart.current.y;
        window.electronAPI.send("input-window-moving", { dx, dy });
        dragStart.current = { x: e.screenX, y: e.screenY };
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (window.electronAPI) window.electronAPI.send("input-window-moving", { isMoving: false });
  }, []);

  // 自动调整窗口高度
  useEffect(() => {
    if (!window.electronAPI) return;

    const observer = new ResizeObserver((entries) => {
      // Prevent resize loop during drag
      if (isDraggingRef.current) return;

      for (let entry of entries) {
        // 获取内容实际高度并发送给主进程
        const height = entry.target.scrollHeight;
        if (Math.abs(height - window.innerHeight) < 4) return; // Prevent micro-adjustments loop
        window.electronAPI.send("resize-input-window", { height: height }); // Removed +2 to stop growth loop
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleScreenshot = () => {
    if (window.electronAPI) {
      window.electronAPI.send("capture-screen");
    }
  };

  const handleAI = () => {
    // 所有模型均需要用户提供 API Key
    if (!settings.aiApiKey) {
      setAlertConfig({ message: "请先在面板的设置中配置 ModelScope API 密钥" });
      return;
    }

    // 设置加载状态
    setAiLoading(true);
    setAiStatus("loading");

    // 每次都先截图，然后分析（追加模式）
    if (window.electronAPI) {
      window.electronAPI.send("capture-screen");
      window._pendingAiAnalysis = true;
    }
  };

  const handleSave = () => {
    if (!task.trim() && selectedTags.length === 0 && screenshots.length === 0) {
      setAlertConfig({ message: "请填写任务内容或选择标签" });
      return;
    }

    const finalDurationS = Math.max(1, duration * 60);
    let startId = Date.now();
    let isFocusMode = timingMode === "timer";

    if (timingMode === "retro") {
      startId = Date.now() - duration * 60 * 1000;
    }

    const record = {
      id: startId,
      timestamp: new Date(startId).toISOString(),
      isFocus: isFocusMode,
      task: task.trim() || (selectedTags.length > 0 ? selectedTags.join(" ") : "未命名任务"),
      desc: desc.trim(),
      tags: selectedTags,
      duration: timingMode ? finalDurationS : 0, // 0 for "Start Now" unlimited
      screenshots: screenshots,
    };

    const performSave = () => {
      if (window.electronAPI) {
        window.electronAPI.send("save-record", record);
      }
      setTask("");
      setDesc("");
      setScreenshots([]);
      setSelectedTags([]);
    };

    // Overlap detection
    const currentDurationS = record.duration;
    const currentEnd = record.id + currentDurationS * 1000;

    const hasOverlap = records.some((r) => r.id > record.id && r.id < currentEnd);

    if (hasOverlap) {
      setAlertConfig({
        message: "该任务的时长覆盖了后续的任务，确定要保存吗？",
        showCancel: true,
        onConfirm: performSave,
      });
    } else {
      performSave();
    }
  };

  const removeScreenshot = (index) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const openPreview = (img) => {
    // 通过IPC打开预览窗口
    if (window.electronAPI) {
      window.electronAPI.send("open-preview", img);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            setScreenshots((prev) => [...prev, evt.target.result]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`win-container ${isFocused ? "" : "inactive"} ${settings.win12Experimental ? "liquid-ui" : ""}`}
    >
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          borderBottom: settings.win12Experimental ? "none" : "1px solid var(--border-color)",
          background:
            settings.win12Experimental ? "transparent"
              : isFocused ? "rgba(255,255,255,0.05)"
                : "transparent",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.85rem",
            color: isFocused ? "var(--text-primary)" : "var(--text-secondary)",
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
              background: isFocused ? "var(--accent)" : "transparent",
              marginRight: 4,
            }}
          ></div>
          <span>{APP_CONFIG.APP_NAME} 记录</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            className="no-drag"
            onClick={() => setPinned(!pinned)}
            title={pinned ? "取消固定 (允许隐藏)" : "固定窗口 (保持最前)"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: pinned ? 1 : 0.4,
              color: "var(--text-primary)",
              marginRight: 8,
              padding: 4,
            }}
          >
            {pinned ?
              <Pin size={16} />
              : <PinOff size={16} />}
          </button>
          <button
            className="no-drag"
            onClick={() => window.electronAPI.send("hide-input")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.6,
              color: "var(--text-primary)",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden", // Prevent horizontal scroll
        }}
      >
        <InputWithClear
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="你在做什么？"
          autoFocus
          className="no-drag"
          accent={accent}
          style={{ marginBottom: "12px" }}
        />

        <div style={{ marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }} className="no-drag">
          {(settings.tags && settings.tags.length > 0 ?
            settings.tags
            : [
              { name: "工作", color: "#6366f1" },
              { name: "学习", color: "#a855f7" },
              { name: "摸鱼", color: "#f43f5e" },
              { name: "休息", color: "#10b981" },
            ]
          ).map((tag) => {
            const isSelected = selectedTags.includes(tag.name);
            const baseColor = tag.color || "var(--accent)";
            return (
              <span
                key={tag.name}
                onClick={() => toggleTag(tag.name)}
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

          <div style={{ position: "relative" }}>
            <span
              onClick={() => window.electronAPI && window.electronAPI.send("open-settings-tags")}
              title="管理标签"
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "transparent",
                border: "1px dashed var(--border-color)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 2,
                userSelect: "none",
              }}
            >
              <Plus size={10} /> 标签
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }} className="no-drag">
          <button className="btn" onClick={handleScreenshot}>
            <Camera size={14} style={{ color: accent }} /> 截图
          </button>
          <button
            className="btn"
            onClick={handleAI}
            disabled={aiLoading}
            style={{
              background:
                aiStatus === "success" ? `color-mix(in srgb, ${accent} 20%, transparent)`
                  : aiStatus === "error" ? "rgba(239, 68, 68, 0.2)"
                    : undefined,
              borderColor:
                aiStatus === "success" ? accent
                  : aiStatus === "error" ? "rgba(239, 68, 68, 0.5)"
                    : undefined,
            }}
          >
            {aiStatus === "loading" ?
              <>
                <Loader2 size={14} style={{ color: accent, animation: "spin 1s linear infinite" }} /> 分析中...
              </>
              : aiStatus === "success" ?
                <>
                  <Check size={14} style={{ color: accent }} /> 完成
                </>
                : aiStatus === "error" ?
                  <>
                    <X size={14} style={{ color: "#ef4444" }} /> 失败
                  </>
                  : <>
                    <Sparkles size={14} style={{ color: accent }} /> AI识别
                  </>
            }
          </button>
        </div>

        <div
          className="no-drag"
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
                  reader.onload = (evt) => setScreenshots((prev) => [...prev, evt.target.result]);
                  reader.readAsDataURL(file);
                }
              });
            }
          }}
        >
          {screenshots.map((img, idx) => (
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
              onClick={() => openPreview(img)}
            >
              <img
                src={img}
                alt={`截图 ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeScreenshot(idx);
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
              width: screenshots.length > 0 ? "80px" : "100%",
              height: screenshots.length > 0 ? "60px" : "100%",
              display: "flex",
              flexDirection: screenshots.length > 0 ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              border: screenshots.length > 0 ? "1px dashed var(--border-color)" : "none",
              borderRadius: screenshots.length > 0 ? "4px" : "0",
            }}
          >
            {screenshots.length === 0 ?
              <>
                <ImageIcon size={20} opacity={0.5} />
                <span>粘贴、拖入或点击上传图片</span>
              </>
              : <Plus size={20} opacity={0.5} />}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          <textarea
            rows={5}
            placeholder="添加详情..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            spellCheck={false}
            className="no-drag"
            style={{ resize: "none", flex: 1, width: "100%" }}
          />
          {desc && (
            <button
              onClick={() => setDesc("")}
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

      {/* Fixed Footer for Actions */}
      <div
        className="no-drag"
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-color)",
          background:
            settings.win12Experimental ? "rgba(255,255,255,0.02)"
              : isFocused ? "var(--bg-active)"
                : "var(--bg-inactive)",
          display: "flex",
          justifyContent: "space-between", // Maybe add more controls later?
          alignItems: "center",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.03)",
              padding: "2px",
              borderRadius: "8px 0px 0px 8px",
              border: "1px solid var(--border-color)",
              borderRight: "none",
              height: "32px",
            }}
          >
            <button
              onClick={() => setTimingMode(timingMode === "retro" ? null : "retro")}
              className="no-drag"
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: timingMode === "retro" ? accent : "transparent",
                color: timingMode === "retro" ? "#fff" : "var(--text-secondary)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              补记
            </button>
            <button
              onClick={() => setTimingMode(timingMode === "timer" ? null : "timer")}
              className="no-drag"
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                background: timingMode === "timer" ? accent : "transparent",
                color: timingMode === "timer" ? "#fff" : "var(--text-secondary)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              计时
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(255,255,255,0.03)",
              padding: "0 2px 0 10px",
              borderRadius: "0 6px 6px 0",
              border: "1px solid var(--border-color)",
              borderLeft: "none",
              height: "32px",
              opacity: timingMode ? 1 : 0.5,
              pointerEvents: timingMode ? "auto" : "none",
              transition: "opacity 0.2s",
            }}
          >
            <button
              className="btn no-drag"
              style={{
                padding: "0",
                border: "none",
                background: "transparent",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: 0,
                cursor: timingMode ? "pointer" : "not-allowed",
              }}
              onClick={() => setDuration(Math.max(0, duration - 5))}
              disabled={!timingMode}
            >
              -
            </button>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(0, parseInt(e.target.value) || 0))}
              className="no-drag"
              disabled={!timingMode}
              style={{
                width: "30px",
                border: "none",
                padding: "0",
                margin: 0,
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "-1px",
                background: "transparent",
                cursor: timingMode ? "text" : "not-allowed",
              }}
            />
            <span
              style={{
                fontSize: "0.7rem",
                opacity: 0.6,
                display: "flex",
                alignItems: "center",
                height: "100%",
                marginBottom: "-4px",
              }}
            >
              m
            </span>
            <button
              className="btn no-drag"
              style={{
                padding: "0 4px",
                border: "none",
                background: "transparent",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: timingMode ? "pointer" : "not-allowed",
              }}
              onClick={() => setDuration(duration + 5)}
              disabled={!timingMode}
            >
              +
            </button>
          </div>
        </div>

        <button className="btn primary" onClick={handleSave} style={{ background: accent }}>
          <Save size={14} /> 保存
        </button>
      </div>

      {alertConfig && (
        <AlertDialog
          message={alertConfig.message}
          onClose={() => setAlertConfig(null)}
          onConfirm={alertConfig.onConfirm}
          showCancel={alertConfig.showCancel}
          accent={accent}
          settings={settings}
        />
      )}
    </div>
  );
}
