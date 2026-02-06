import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Calendar,
  BarChart2,
  MessageCircle,
  Send,
  Settings,
  X,
  Trash2,
  Edit2,
  Plus,
  Clock,
  Share2,
  Zap,
  RefreshCw,
  Smartphone,
  ChevronRight,
  Target,
  Brain,
  Coffee,
  Sparkles,
  Layout,
  List,
  Upload,
  TrendingUp,
  Image as ImageIcon,
  Tag,
  Download,
  Check,
  Loader2,
} from "lucide-react";
import { APP_CONFIG } from "../config";

// 带清除按钮的输入框组件
import InputWithClear from "../components/dashboard/InputWithClear";
import TabButton from "../components/dashboard/TabButton";

import KeyboardShortcutInput from "../components/dashboard/KeyboardShortcutInput";
import FilterButton from "../components/dashboard/FilterButton";
import EditRecordModal from "../components/dashboard/EditRecordModal";
import TagEditModal from "../components/dashboard/TagEditModal";
import RecordCard from "../components/dashboard/RecordCard";
import TagList from "../components/dashboard/TagList";

const LiveClock = () => {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
};

const LiveDuration = ({ start }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, now - start);
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

export default function DashboardPage() {
  const [view, setView] = useState("timeline");
  const [records, setRecords] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [accent, setAccent] = useState("#0078d4"); // 默认蓝色
  const [settings, setSettings] = useState({
    shortcut: "",
    autoStart: false,
    aiModel: "moonshotai/Kimi-K2.5",
    imageModel: APP_CONFIG.DEFAULT_IMAGE_MODEL, // Default Image Model
    aiApiKey: "",
    customModel: "",
    tags: [],
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [timeFilter, setTimeFilter] = useState("today");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [isFocused, setIsFocused] = useState(true);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState("");
  const [loadingRecordIds, setLoadingRecordIds] = useState(new Set());
  const [editingTag, setEditingTag] = useState(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const tagsSectionRef = useRef(null);

  const getFilteredRecords = useCallback(() => {
    let filtered = [...records];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        const d = new Date(r.timestamp);
        return d >= start && d <= end;
      });
    } else if (timeFilter !== "all") {
      if (timeFilter === "today") {
        filtered = filtered.filter((r) => new Date(r.timestamp) >= today);
      } else if (timeFilter === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter((r) => {
          const d = new Date(r.timestamp);
          return d >= yesterday && d < today;
        });
      } else if (timeFilter === "week") {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((r) => new Date(r.timestamp) >= weekAgo);
      } else if (timeFilter === "month") {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((r) => new Date(r.timestamp) >= monthAgo);
      }
    }

    return filtered;
  }, [records, dateRange, timeFilter]);

  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    // Listen for system color changes
    if (window.electronAPI) {
      window.electronAPI.invoke("get-system-colors").then((c) => {
        if (c && c.accent) {
          const hex = "#" + c.accent;
          setAccent(hex);
          document.documentElement.style.setProperty("--accent", hex);
        }
      });

      // Listen for new records from main process
      window.electronAPI.receive("new-record-saved", (record) => {
        setRecords((prev) => [record, ...prev]);
      });

      // AI Summary Response
      window.electronAPI.receive("ai-summary-response", (result) => {
        setAiSummaryLoading(false);

        if (result.recordId) {
          // 处理单个记录的 AI 总结
          setLoadingRecordIds((prev) => {
            const next = new Set(prev);
            next.delete(result.recordId);
            return next;
          });

          if (result.success) {
            // 解析输出内容（第一行标题，第二行描述）
            const lines = result.summary.split("\n").filter((l) => l.trim());
            if (lines.length > 0) {
              const taskName = lines[0].trim();
              const newDesc = lines.length > 1 ? lines.slice(1).join("\n") : "";

              window.electronAPI.send("update-record-parts", {
                id: result.recordId,
                task: taskName,
                desc: newDesc,
              });
            }
          } else {
            alert("单个事件总结失败: " + result.error);
          }
        } else {
          // 处理全局总结
          if (result.success) {
            setAiSummaryResult(result.summary);
          } else {
            alert("AI总结失败: " + result.error);
          }
        }
      });
      window.electronAPI.invoke("get-settings").then((s) => {
        if (s) setSettings(s);
      });
    }

    const loadRecords = async () => {
      if (window.electronAPI) {
        const data = await window.electronAPI.invoke("get-records");
        setRecords(data ? data.reverse() : []);
      }
    };
    loadRecords();

    if (window.electronAPI) {
      window.electronAPI.receive("records-updated", loadRecords);
      window.electronAPI.receive("switch-tab", (tab) => {
        setView(tab);
      });
      window.electronAPI.receive("scroll-to-tags", () => {
        setTimeout(() => {
          tagsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      });

      // AI Chat Response
      window.electronAPI.receive("ai-chat-response", (result) => {
        setIsTyping(false);
        if (result.success) {
          setChatMessages((prev) => [...prev, { sender: "bot", text: result.reply }]);
        } else {
          setChatMessages((prev) => [...prev, { sender: "bot", text: "错误: " + result.error, isError: true }]);
        }
      });
    }
  }, []);

  // 监听粘贴事件，仅在编辑弹窗打开时处理
  useEffect(() => {
    const handlePaste = (e) => {
      if (!editingRecord) return;

      const items = (e.clipboardData || e.originalEvent.clipboardData).items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (evt) => {
            setEditingRecord((prev) => ({
              ...prev,
              screenshots: [...(prev.screenshots || []), evt.target.result],
            }));
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [editingRecord]);

  const saveSettings = (newSet) => {
    const up = { ...settings, ...newSet };
    setSettings(up);
    if (window.electronAPI) window.electronAPI.send("save-settings", up);
  };

  const handleSendChat = () => {
    if (!inputMsg.trim()) return;
    const msg = inputMsg;
    const newHistory = [...chatMessages, { sender: "user", text: msg }];
    setChatMessages(newHistory);
    setInputMsg("");
    setIsTyping(true);

    if (window.electronAPI) {
      // Build Context from recent records (last 20)
      const recentRecords = records
        .slice(0, 20)
        .map((r) => {
          const time = new Date(r.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
          return `[${time}] ${r.task} (${r.duration}m) ${r.tags ? r.tags.join(",") : ""} ${r.desc || ""}`;
        })
        .join("\n");

      const systemPrompt = `你是一个时间管理助手。以下是用户最近的时间线记录：\n${recentRecords}\n\n请根据这些记录回答用户的问题。如果用户问"我今天做了什么"，请总结上述记录。保持回答简洁自然。`;

      // Convert chat history to API format
      // We limit history to last 10 messages to save tokens
      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...newHistory.slice(-10).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
      ];

      window.electronAPI.send("ai-chat", {
        messages: apiMessages,
        model: settings.aiModel,
        apiKey: settings.aiApiKey,
      });
    }
  };

  const handleAddEvent = () => {
    setEditingRecord({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      task: "",
      desc: "",
      duration: 30,
      tags: [],
      screenshots: [],
      isNew: true,
    });
  };

  const handleInsertGap = (startTime) => {
    setEditingRecord({
      id: startTime,
      timestamp: new Date(startTime).toISOString(),
      task: "",
      desc: "",
      duration: 30,
      tags: [],
      screenshots: [],
      isNew: true,
    });
  };

  const handleSaveEdit = () => {
    if (window.electronAPI && editingRecord) {
      if (editingRecord.isNew) {
        const recordToSave = { ...editingRecord };
        delete recordToSave.isNew;
        window.electronAPI.send("save-record", recordToSave);
      } else {
        window.electronAPI.send("update-record", editingRecord);
      }
      setEditingRecord(null);
    }
  };

  const handleDeleteRecord = (record) => {
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    if (window.electronAPI) {
      window.electronAPI.send("delete-record", record.id);
    }
  };

  // confirmDelete removed as RecordCard handles confirmation

  const handleFilterClick = (id) => {
    setTimeFilter(id);
    setDateRange({ start: "", end: "" });
  };

  const handleAiSummary = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      alert("当前范围内无记录可总结");
      return;
    }

    const context = filtered
      .map((r) => {
        const time = new Date(r.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        return `[${time}] ${r.task}${r.desc ? ": " + r.desc : ""}`;
      })
      .join("\n");

    setAiSummaryLoading(true);
    if (window.electronAPI) {
      window.electronAPI.send("request-ai-summary", {
        text: context,
        model: settings.aiModel,
        apiKey: settings.aiApiKey,
        customModel: settings.customModel,
      });
    }
  };

  const handleSingleAiSummary = (record) => {
    if (!record.screenshots || record.screenshots.length === 0) return;

    setLoadingRecordIds((prev) => new Set(prev).add(record.id));
    if (window.electronAPI) {
      window.electronAPI.send("request-ai-summary", {
        image: record.screenshots[0],
        recordId: record.id,
        model: settings.aiModel,
        apiKey: settings.aiApiKey,
        customModel: settings.customModel,
      });
    }
  };

  const handleExport = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      alert("暂无数据可导出");
      return;
    }
    const exportData = filtered.map((r) => ({
      时间: new Date(r.timestamp).toLocaleString("zh-CN"),
      任务: r.task,
      时长: `${r.duration || 0}分钟`,
      标签: (r.tags || []).join(", "),
      详情: r.desc || "",
    }));

    let csvContent = "\uFEFF";
    csvContent += Object.keys(exportData[0]).join(",") + "\n";
    exportData.forEach((row) => {
      csvContent +=
        Object.values(row)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chronopet_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStats = useCallback(() => {
    const filtered = getFilteredRecords();
    const totalRecords = filtered.length;
    const totalScreenshots = filtered.reduce(
      (sum, r) => sum + ((r.screenshots?.length || 0) + (r.screenshot ? 1 : 0)),
      0,
    );
    const totalDuration = filtered.reduce((sum, r) => sum + (r.duration || 0), 0);

    const tasksByHour = {};
    filtered.forEach((r) => {
      const hour = new Date(r.timestamp).getHours();
      tasksByHour[hour] = (tasksByHour[hour] || 0) + 1;
    });
    const peakHour =
      Object.keys(tasksByHour).length > 0 ?
        Object.keys(tasksByHour).reduce((a, b) => (tasksByHour[a] > tasksByHour[b] ? a : b), 0)
      : 0;

    const tagStats = {};
    filtered.forEach((r) => {
      (r.tags || []).forEach((tag) => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      });
    });

    return { totalRecords, totalScreenshots, totalDuration, peakHour, tasksByHour, tagStats };
  }, [getFilteredRecords]);

  const filteredRecords = useMemo(() => getFilteredRecords(), [getFilteredRecords]);
  const stats = useMemo(() => getStats(), [getStats]);
  const hasDateRange = Boolean(dateRange.start);

  // Tags Management Logic
  const handleSaveTag = () => {
    if (!editingTag || !editingTag.name.trim()) return;

    // Prevent editing default tags
    const defaultNames = ["工作", "学习", "摸鱼", "休息"];
    if (
      defaultNames.includes(editingTag.name) ||
      (editingTag.index !== undefined && defaultNames.includes(currentTags[editingTag.index]?.name))
    ) {
      alert("系统默认标签不可修改");
      return;
    }

    const newTags = [...(settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags)];

    if (editingTag.index !== undefined && editingTag.index !== null) {
      // Edit existing
      newTags[editingTag.index] = {
        name: editingTag.name,
        color: editingTag.color,
        iconType: editingTag.iconType,
        iconValue: editingTag.iconValue,
        icon: editingTag.icon,
        petIcon: editingTag.petIcon, // Save petIcon
      };
    } else {
      // Add new
      newTags.push({
        name: editingTag.name,
        color: editingTag.color || "#6366f1",
        iconType: editingTag.iconType || "preset",
        iconValue: editingTag.iconValue || "Target",
        petIcon: editingTag.petIcon, // Save petIcon
      });
    }
    saveSettings({ tags: newTags });
    setEditingTag(null);
  };

  const handleGeneratePetIcon = async () => {
    if (!editingTag) return;
    setIsGeneratingIcon(true);

    try {
      // Fetch base image for Image-to-Image
      let refImage = editingTag.petIcon;
      if (!refImage) {
        try {
          const r = await fetch("icon_base.png");
          const b = await r.blob();
          refImage = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(b);
          });
        } catch (e) {
          console.error("Failed to load base icon", e);
        }
      }

      console.log("[Generate Icon] refImage present:", !!refImage, refImage ? refImage.substring(0, 50) : "null");

      const result = await window.electronAPI.invoke("generate-icon", {
        prompt: editingTag.aiPrompt || "cute apple character",
        stylePrompt: APP_CONFIG.DEFAULT_STYLE_PROMPT,
        model: settings.imageModel || APP_CONFIG.DEFAULT_IMAGE_MODEL,
        refImage: refImage,
      });
      if (result.success) {
        setEditingTag((prev) => ({ ...prev, petIcon: result.image }));
      } else {
        console.error("生成失败:", result.error);
        // Show error in UI instead of blocking alert
      }
    } catch (e) {
      console.error("生成出错:", e);
    }
    setIsGeneratingIcon(false);
  };

  const handleDeleteTag = (index) => {
    const tags = settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags;
    if (["工作", "学习", "摸鱼", "休息"].includes(tags[index].name)) {
      alert("系统默认标签不可删除");
      return;
    }
    // TagList handles confirmation UI now, so we just delete.
    const newTags = [...tags];
    newTags.splice(index, 1);
    saveSettings({ tags: newTags });
  };

  /* const handleGenerateIcon = ... */

  const handleEditTag = (tag, index) => {
    setEditingTag({ ...tag, index });
  };

  const confirmDeleteTag = (tag, index) => {
    handleDeleteTag(index);
  };

  const defaultTags = [
    { name: "工作", color: "#6366f1", iconType: "preset", iconValue: "Target" },
    { name: "学习", color: "#a855f7", iconType: "preset", iconValue: "Brain" },
    { name: "摸鱼", color: "#f43f5e", iconType: "preset", iconValue: "Coffee" },
    { name: "休息", color: "#10b981", iconType: "preset", iconValue: "Clock" },
  ];

  const currentTags = settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags;

  return (
    <div
      className={`win-container ${isFocused ? "" : "inactive"}`}
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          height: "40px",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--border-color)",
          justifyContent: "space-between",
          WebkitAppRegion: "drag",
          background: isFocused ? "rgba(255,255,255,0.05)" : "transparent",
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
          <span>{APP_CONFIG.APP_NAME} 面板</span>
        </div>
        <div style={{ display: "flex", gap: 10, WebkitAppRegion: "no-drag" }}>
          <button
            className="btn"
            style={{ padding: 4, border: "none", background: "transparent" }}
            onClick={() => {
              if (window.electronAPI) window.electronAPI.send("close-dashboard");
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "0 16px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          background: isFocused ? "rgba(255,255,255,0.03)" : "transparent",
        }}
      >
        <TabButton id="timeline" label="时间线" icon={Calendar} activeId={view} onClick={setView} accent={accent} />
        <TabButton id="stats" label="统计" icon={BarChart2} activeId={view} onClick={setView} accent={accent} />
        <TabButton id="chat" label="对话" icon={MessageCircle} activeId={view} onClick={setView} accent={accent} />
        <TabButton id="tags" label="标签" icon={Tag} activeId={view} onClick={setView} accent={accent} />
        <TabButton id="settings" label="设置" icon={Settings} activeId={view} onClick={setView} accent={accent} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {view === "settings" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="win11-card" style={{ padding: 20 }}>
              <h3 className="title">通用设置</h3>
              {/* ... existing settings ... */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>全局快捷键</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>快速唤出记录窗口</div>
                </div>
                <KeyboardShortcutInput
                  value={settings.shortcut}
                  onChange={(v) => saveSettings({ shortcut: v })}
                  accent={accent}
                />
              </div>
            </div>

            <div className="win11-card" style={{ padding: 20 }}>
              <h3 className="title">AI 配置</h3>

              {/* Chat Model */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>对话模型 (用于总结与对话)</div>
                <select
                  value={settings.aiModel || "moonshotai/Kimi-K2.5"}
                  onChange={(e) => saveSettings({ aiModel: e.target.value })}
                  style={{ width: "100%", margin: 0, padding: "10px 14px" }}
                >
                  <option value="moonshotai/Kimi-K2.5">Moonshot Kimi K2.5 (内置)</option>
                  <option value="Qwen/Qwen3-VL-235B-A22B-Instruct">Qwen3 VL 235B Instruct (内置)</option>
                </select>
              </div>

              {/* Image Model */}
              <div>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>绘图模型 (用于生成图标)</div>
                <select
                  value={settings.imageModel || APP_CONFIG.DEFAULT_IMAGE_MODEL}
                  onChange={(e) => saveSettings({ imageModel: e.target.value })}
                  style={{ width: "100%", margin: 0, padding: "10px 14px" }}
                >
                  <option value="black-forest-labs/FLUX.2-dev">FLUX.2-dev (图像编辑, 内置)</option>
                  <option value="black-forest-labs/FLUX.1-dev">FLUX.1-dev (文本生成, 内置)</option>
                  <option value="stabilityai/stable-diffusion-xl-base-1.0">Stable Diffusion XL (内置)</option>
                  <option value="Qwen/Qwen-Image-Edit-2511">Qwen-Image-Edit-2511 (内置)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {view === "chat" && (
          <div
            style={{ maxWidth: "700px", margin: "0 auto", height: "100%", display: "flex", flexDirection: "column" }}
          >
            <div
              className="win11-card"
              style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}
            >
              {/* Chat History */}
              <div
                style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}
              >
                {chatMessages.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: 40 }}>
                    <Sparkles size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <p>我是你的时间助手，基于你的时间线回答问题。</p>
                    <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                      试着问："我今天上午在做什么？" 或 "总结今天的活动"
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: msg.sender === "user" ? accent : "var(--bg-secondary)",
                        color: msg.sender === "user" ? "white" : "var(--text-primary)",
                        fontSize: "0.95rem",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        borderTopRightRadius: msg.sender === "user" ? 2 : 12,
                        borderTopLeftRadius: msg.sender === "bot" ? 2 : 12,
                        border: msg.isError ? "1px solid #ef4444" : "none",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "var(--bg-secondary)",
                        borderRadius: 12,
                        borderTopLeftRadius: 2,
                      }}
                    >
                      <Loader2 size={16} className="spin" style={{ color: "var(--text-secondary)" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div
                style={{ padding: 16, borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder="输入消息..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: "0.95rem",
                    }}
                  />
                  <button
                    className="btn primary"
                    onClick={handleSendChat}
                    disabled={isTyping || !inputMsg.trim()}
                    style={{ background: accent, padding: "0 20px" }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "tags" && (
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: 20 }}>
            <TagList
              tags={settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags}
              settings={settings}
              onEdit={handleEditTag}
              onDelete={confirmDeleteTag}
            />
          </div>
        )}

        {view === "timeline" && (
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            {/* 筛选栏 - 两行布局 */}
            <div className="win11-card" style={{ padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                {/* 快捷筛选按钮 */}
                <div style={{ display: "flex", gap: 6 }}>
                  <FilterButton
                    id="all"
                    label="全部"
                    activeId={timeFilter}
                    hasDateRange={hasDateRange}
                    onClick={handleFilterClick}
                    accent={accent}
                  />
                  <FilterButton
                    id="today"
                    label="今天"
                    activeId={timeFilter}
                    hasDateRange={hasDateRange}
                    onClick={handleFilterClick}
                    accent={accent}
                  />
                  <FilterButton
                    id="yesterday"
                    label="昨天"
                    activeId={timeFilter}
                    hasDateRange={hasDateRange}
                    onClick={handleFilterClick}
                    accent={accent}
                  />
                  <FilterButton
                    id="week"
                    label="本周"
                    activeId={timeFilter}
                    hasDateRange={hasDateRange}
                    onClick={handleFilterClick}
                    accent={accent}
                  />
                  <FilterButton
                    id="month"
                    label="本月"
                    activeId={timeFilter}
                    hasDateRange={hasDateRange}
                    onClick={handleFilterClick}
                    accent={accent}
                  />
                </div>
                {/* 操作按钮组 */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={handleAiSummary}
                    disabled={aiSummaryLoading}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(124, 58, 237, 0.1)",
                      borderColor: "rgba(124, 58, 237, 0.3)",
                      color: "#7c3aed",
                    }}
                  >
                    {aiSummaryLoading ?
                      <Loader2 size={14} className="spin" />
                    : <Sparkles size={14} />}
                    {aiSummaryLoading ? "总结中..." : "AI 总结"}
                  </button>
                  <button
                    className="btn primary"
                    onClick={handleAddEvent}
                    style={{ padding: "6px 12px", background: "var(--accent)", borderColor: "transparent" }}
                  >
                    <Plus size={14} /> 添加事件
                  </button>
                  <button className="btn" onClick={handleExport} title="导出CSV" style={{ padding: "6px 12px" }}>
                    <Download size={14} style={{ color: "var(--accent)" }} /> 导出
                  </button>
                </div>
              </div>
              {/* 日期范围选择 */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>日期范围:</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  style={{
                    margin: 0,
                    padding: "6px 10px",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 4,
                    width: 130,
                  }}
                />
                <span style={{ color: "var(--text-secondary)" }}>至</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  style={{
                    margin: 0,
                    padding: "6px 10px",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 4,
                    width: 130,
                  }}
                />
                {(dateRange.start || dateRange.end) && (
                  <button
                    className="btn"
                    onClick={() => setDateRange({ start: "", end: "" })}
                    title="清除日期范围"
                    style={{ padding: "6px 10px" }}
                  >
                    <X size={14} /> 清除
                  </button>
                )}
              </div>
            </div>

            {filteredRecords.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>暂无记录</div>
            )}

            {aiSummaryResult && (
              <div
                className="win11-card"
                style={{
                  padding: 20,
                  marginBottom: 24,
                  background: "rgba(124, 58, 237, 0.05)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  position: "relative",
                  animation: "fadeIn 0.4s ease-out",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    color: "#7c3aed",
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={18} />
                  <span>AI 阶段性总结</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiSummaryResult);
                        alert("已复制到剪贴板");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.8rem",
                      }}
                    >
                      <Check size={14} /> 复制
                    </button>
                    <button
                      onClick={() => setAiSummaryResult("")}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div
                  style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}
                >
                  {aiSummaryResult}
                </div>
              </div>
            )}
            <div style={{ position: "relative", paddingLeft: "8px", paddingTop: "24px" }}>
              {/* Vertical Timeline Line */}
              <div
                style={{
                  position: "absolute",
                  left: "38px",
                  top: "10px",
                  bottom: "10px",
                  width: "2px",
                  background: "var(--border-color)",
                  zIndex: 0,
                  opacity: 0.6,
                }}
              ></div>

              {filteredRecords.map((r, index) => {
                const nextRecord = filteredRecords[index + 1];
                let gapElement = null;

                if (nextRecord) {
                  const currentStart = r.id;
                  const nextEnd = nextRecord.id + (nextRecord.duration || 1) * 60000;
                  const gapMs = currentStart - nextEnd;
                  const gapMins = Math.floor(gapMs / 60000);

                  if (gapMins > 5) {
                    gapElement = (
                      <div
                        key={`gap-${r.id}`}
                        style={{
                          display: "flex",
                          margin: "8px 0 24px 60px",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            padding: "10px 16px",
                            background: "rgba(128, 128, 128, 0.04)",
                            border: "1px dashed var(--border-color)",
                            borderRadius: "8px",
                            color: "var(--text-secondary)",
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <Clock size={14} opacity={0.6} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                              ❓ 未记录时段：{gapMins} 分钟
                            </span>
                            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                              {new Date(nextEnd).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} -{" "}
                              {new Date(currentStart).toLocaleTimeString("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <button
                            className="btn primary"
                            onClick={() => handleInsertGap(nextEnd)}
                            style={{
                              padding: "4px 12px",
                              fontSize: "0.8rem",
                              background: "var(--accent)",
                              borderColor: "transparent",
                            }}
                          >
                            <Plus size={14} style={{ marginRight: 4 }} /> 补录
                          </button>
                        </div>
                      </div>
                    );
                  }
                }

                const handleUpdateRecord = (updatedRecord) => {
                  if (window.electronAPI) window.electronAPI.send("update-record", updatedRecord);
                };

                return (
                  <React.Fragment key={r.id}>
                    <div
                      style={{ display: "flex", gap: "16px", marginBottom: "24px", position: "relative", zIndex: 1 }}
                    >
                      {/* Timeline Node */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: "60px",
                          marginTop: "-24px",
                        }}
                      >
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            background: accent,
                            border: "3px solid var(--bg-active)",
                            boxShadow: `0 0 0 2px ${accent}`,
                            marginTop: "6px",
                          }}
                        ></div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                            marginTop: "8px",
                            fontWeight: 600,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          {index === 0 && (
                            <span style={{ fontSize: "0.7rem", color: accent, fontWeight: 700 }}>当前正在</span>
                          )}
                          {index === 0 ?
                            <LiveClock />
                          : new Date(r.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "white",
                            background: accent,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginTop: "6px",
                            fontWeight: 600,
                            minWidth: "32px",
                            textAlign: "center",
                          }}
                        >
                          {index === 0 ?
                            <LiveDuration start={r.id} />
                          : (r.duration || 1) + "m"}
                        </div>
                      </div>

                      {/* Record Card */}
                      <RecordCard
                        record={r}
                        accent={accent}
                        onDelete={handleDeleteRecord}
                        onUpdate={handleUpdateRecord}
                        onAiSummary={handleSingleAiSummary}
                        loadingAi={loadingRecordIds.has(r.id)}
                      />
                    </div>
                    {gapElement}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {view === "chat" && (
          <div
            style={{ height: "100%", display: "flex", flexDirection: "column", maxWidth: "600px", margin: "0 auto" }}
          >
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "var(--text-secondary)" }}>开始对话...</div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    background: msg.sender === "user" ? "var(--accent)" : "var(--card-bg)",
                    color: msg.sender === "user" ? "#fff" : "var(--text-primary)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    maxWidth: "80%",
                    boxShadow: "var(--shadow)",
                    fontSize: "0.95rem",
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {isTyping && (
                <div
                  style={{ alignSelf: "flex-start", padding: 8, color: "var(--text-secondary)", fontSize: "0.8rem" }}
                >
                  正在输入...
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 10, padding: "16px 0 0 0" }}>
              <input
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="输入消息..."
                style={{ margin: 0 }}
              />
              <button
                className="btn primary"
                onClick={handleSendChat}
                style={{ background: "var(--accent)", borderColor: "transparent" }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {view === "stats" && (
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
              <FilterButton
                id="all"
                label="全部"
                activeId={timeFilter}
                hasDateRange={hasDateRange}
                onClick={handleFilterClick}
                accent={accent}
              />
              <FilterButton
                id="today"
                label="今天"
                activeId={timeFilter}
                hasDateRange={hasDateRange}
                onClick={handleFilterClick}
                accent={accent}
              />
              <FilterButton
                id="yesterday"
                label="昨天"
                activeId={timeFilter}
                hasDateRange={hasDateRange}
                onClick={handleFilterClick}
                accent={accent}
              />
              <FilterButton
                id="week"
                label="本周"
                activeId={timeFilter}
                hasDateRange={hasDateRange}
                onClick={handleFilterClick}
                accent={accent}
              />
              <FilterButton
                id="month"
                label="本月"
                activeId={timeFilter}
                hasDateRange={hasDateRange}
                onClick={handleFilterClick}
                accent={accent}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="win11-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <TrendingUp size={20} style={{ color: accent }} />
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>总记录数</div>
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: 300 }}>{stats.totalRecords}</div>
              </div>
              <div className="win11-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <Clock size={20} style={{ color: accent }} />
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>总时长</div>
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: 300 }}>
                  {(stats.totalDuration / 60).toFixed(1)}
                  <span style={{ fontSize: "1rem", marginLeft: 4 }}>小时</span>
                </div>
              </div>
              <div className="win11-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <ImageIcon size={20} style={{ color: accent }} />
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>截图数</div>
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: 300 }}>{stats.totalScreenshots}</div>
              </div>
              <div className="win11-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <Clock size={20} style={{ color: accent }} />
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>高峰时段</div>
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: 300 }}>{stats.peakHour}:00</div>
              </div>
            </div>

            <div className="win11-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 className="title" style={{ marginBottom: 16 }}>
                时间分布
              </h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150 }}>
                {Array.from({ length: 24 }, (_, i) => {
                  const count = stats.tasksByHour[i] || 0;
                  const maxCount = Math.max(...Object.values(stats.tasksByHour), 1);
                  const height = (count / maxCount) * 100;
                  return (
                    <div
                      key={i}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${height}%`,
                          background:
                            count > 0 ?
                              `linear-gradient(to top, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent))`
                            : "var(--border-color)",
                          borderRadius: "2px 2px 0 0",
                          transition: "all 0.3s",
                          minHeight: count > 0 ? "4px" : "2px",
                        }}
                        title={`${i}:00 - ${count}条记录`}
                      ></div>
                      {i % 3 === 0 && <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{i}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {editingRecord && (
        <EditRecordModal
          editingRecord={editingRecord}
          setEditingRecord={setEditingRecord}
          onSave={handleSaveEdit}
          settings={settings}
        />
      )}

      {editingTag && (
        <TagEditModal
          editingTag={editingTag}
          setEditingTag={setEditingTag}
          onSave={handleSaveTag}
          onGenerateIcon={handleGeneratePetIcon}
          isGeneratingIcon={isGeneratingIcon}
        />
      )}
    </div>
  );
}
