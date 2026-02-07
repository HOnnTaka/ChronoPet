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
import StatsView from "../components/dashboard/StatsView";
import TimelineView from "../components/dashboard/TimelineView";
import ChatView from "../components/dashboard/ChatView";
import TagsView from "../components/dashboard/TagsView";

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

  const tagsSectionRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (view === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, view, isTyping]);

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

    const cleanups = [];

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
      cleanups.push(
        window.electronAPI.receive("new-record-saved", (record) => {
          setRecords((prev) => [record, ...prev]);
        }),
      );

      // AI Summary Response
      cleanups.push(
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
        }),
      );

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
      cleanups.push(window.electronAPI.receive("records-updated", loadRecords));
      cleanups.push(
        window.electronAPI.receive("switch-tab", (tab) => {
          setView(tab);
        }),
      );
      cleanups.push(
        window.electronAPI.receive("scroll-to-tags", () => {
          setTimeout(() => {
            tagsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }),
      );

      // AI Chat Response (Stream & Legacy)
      cleanups.push(
        window.electronAPI.receive("ai-chat-stream-v2", ({ content, start }) => {
          if (start) {
            setIsTyping(false);
            setChatMessages((prev) => [...prev, { sender: "bot", text: "" }]);
            return;
          }
          if (content) {
            setChatMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === "bot" && !last.isError) {
                return [...prev.slice(0, -1), { ...last, text: last.text + content }];
              }
              return prev;
            });
          }
        }),
      );

      cleanups.push(
        window.electronAPI.receive("ai-chat-end", () => {
          setIsTyping(false);
        }),
      );

      cleanups.push(
        window.electronAPI.receive("ai-chat-response", (result) => {
          setIsTyping(false);
          if (!result.success) {
            setChatMessages((prev) => [...prev, { sender: "bot", text: "错误: " + result.error, isError: true }]);
          }
        }),
      );
    }

    // Cleanup function
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      cleanups.forEach((fn) => fn && fn());
    };
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
      // Build Context from recent records (last 30 to include more context)
      const recentRecords = records
        .slice(0, 30) // Increased form 20 to 30
        .map((r) => {
          // Include Date in timestamp to avoid confusion about "Today" vs "Yesterday"
          const date = new Date(r.timestamp);
          const timeStr = date.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          return `[${timeStr}] ${r.task} (${r.duration}m) ${r.tags ? r.tags.join(",") : ""} ${r.desc || ""}`;
        })
        .join("\n");

      // Current Time Context
      const nowStr = new Date().toLocaleString("zh-CN", {
        weekday: "short",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const systemPrompt = `你是一个时间管理助手。今天是 ${nowStr}。\n以下是用户最近的时间线记录：\n${recentRecords}\n\n请根据这些记录回答用户的问题。如果用户问"我今天做了什么"，请只总结日期为今天的记录。保持回答简洁自然。`;

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
    const tagDurationStats = {};

    filtered.forEach((r) => {
      const duration = r.duration || 0;
      (r.tags || []).forEach((tag) => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
        tagDurationStats[tag] = (tagDurationStats[tag] || 0) + duration;
      });
    });

    return { totalRecords, totalScreenshots, totalDuration, peakHour, tasksByHour, tagStats, tagDurationStats };
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

      <div
        style={{
          flex: 1,
          overflowY: view === "chat" ? "hidden" : "auto",
          padding: view === "chat" ? 0 : "20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {view === "settings" && (
          <div
            style={{
              width: "100%",
              maxWidth: "800px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div className="win11-card" style={{ padding: 20 }}>
              <h3 className="title">通用设置</h3>
              {/* ... existing settings ... */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16, // Prevent overlap
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
          <ChatView
            chatMessages={chatMessages}
            inputMsg={inputMsg}
            setInputMsg={setInputMsg}
            isTyping={isTyping}
            handleSendChat={handleSendChat}
            chatEndRef={chatEndRef}
            accent={accent}
          />
        )}

        {view === "tags" && (
          <TagsView settings={settings} defaultTags={defaultTags} onEdit={handleEditTag} onDelete={confirmDeleteTag} />
        )}

        {view === "timeline" && (
          <TimelineView
            filteredRecords={filteredRecords}
            timeFilter={timeFilter}
            hasDateRange={hasDateRange}
            handleFilterClick={handleFilterClick}
            aiSummaryLoading={aiSummaryLoading}
            handleAiSummary={handleAiSummary}
            handleAddEvent={handleAddEvent}
            handleExport={handleExport}
            dateRange={dateRange}
            setDateRange={setDateRange}
            aiSummaryResult={aiSummaryResult}
            setAiSummaryResult={setAiSummaryResult}
            accent={accent}
            handleInsertGap={handleInsertGap}
            handleDeleteRecord={handleDeleteRecord}
            setEditingRecord={setEditingRecord}
            handleSingleAiSummary={handleSingleAiSummary}
            loadingRecordIds={loadingRecordIds}
          />
        )}

        {view === "stats" && (
          <StatsView
            view={view}
            stats={stats}
            timeFilter={timeFilter}
            handleFilterClick={handleFilterClick}
            hasDateRange={hasDateRange}
            accent={accent}
            settings={settings}
            defaultTags={defaultTags}
          />
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

      {editingTag && <TagEditModal editingTag={editingTag} setEditingTag={setEditingTag} onSave={handleSaveTag} />}
    </div>
  );
}
