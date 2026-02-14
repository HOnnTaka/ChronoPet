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
import ImageGallery from "../components/dashboard/ImageGallery";
import Win11Dialog from "../components/dashboard/Win11Dialog";
import pkg from "../../package.json";

const BUILTIN_MODELS = ["moonshotai/Kimi-K2.5", "Qwen/Qwen3-VL-235B-A22B-Instruct"];

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
  const [galleryState, setGalleryState] = useState({ open: false, images: [], index: 0 });
  const [dialog, setDialog] = useState({
    open: false,
    title: "",
    message: "",
    showCancel: false,
    onConfirm: null,
  });
  const [isDark, setIsDark] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const showCustomAlert = useCallback((title, message, options = {}) => {
    setDialog({
      open: true,
      title,
      message,
      showCancel: options.showCancel || false,
      onConfirm: options.onConfirm || null,
      type: options.type || "primary",
    });
  }, []);

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
    } else if (timeFilter !== "all" && timeFilter !== "custom") {
      if (timeFilter === "today") {
        filtered = filtered.filter((r) => {
          // 记录开始时间在今天
          if (new Date(r.timestamp) >= today) return true;
          // 或者记录的结束时间在今天（跨零点的任务）
          if (r.duration > 0) {
            const d = r.duration || 0;
            const dMs = (r.id > 1739015400000 || d > 3600) ? d * 1000 : d * 60000;
            const endTime = r.id + dMs;
            if (endTime >= today.getTime()) return true;
          }
          return false;
        });
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

  // Watchdog for AI loading state
  useEffect(() => {
    if (aiSummaryLoading && loadingRecordIds.size === 0) {
      const t = setTimeout(() => setAiSummaryLoading(false), 500);
      return () => clearTimeout(t);
    }
  }, [loadingRecordIds.size, aiSummaryLoading]);

  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    const cleanups = [];

    // Listen for system color changes
    if (window.electronAPI) {
      window.electronAPI.invoke("get-system-colors").then((c) => {
        if (c) {
          if (c.accent) setAccent("#" + c.accent);
          if (c.isDark !== undefined) setIsDark(c.isDark);
        }
      });

      cleanups.push(
        window.electronAPI.receive("theme-updated", (data) => {
          if (data.accent) setAccent("#" + data.accent);
          if (data.isDark !== undefined) setIsDark(data.isDark);
        }),
      );

      // Listen for new records from main process
      cleanups.push(
        window.electronAPI.receive("new-record-saved", (record) => {
          setRecords((prev) => [...prev, record].sort((a, b) => b.id - a.id));
        }),
      );

      // AI Summary Response
      cleanups.push(
        window.electronAPI.receive("ai-summary-response", (result) => {
          if (result.recordId) {
            // 处理单个记录的 AI 总结
            setLoadingRecordIds((prev) => {
              const next = new Set(prev);
              next.delete(result.recordId);
              // 只有当待处理列表真正为空时负责关闭状态
              return next;
            });

            if (result.success) {
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
              showCustomAlert("AI总结失败", result.error || "AI 服务异常，请检查 API 密钥是否正确");
            }
          } else {
            setAiSummaryLoading(false);
            if (result.success) {
              setAiSummaryResult(result.summary);
            } else {
              showCustomAlert("AI总结失败", result.error);
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
        setRecords(data ? data.sort((a, b) => b.id - a.id) : []);
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
        window.electronAPI.receive("settings-updated", (newSettings) => {
          setSettings(newSettings);
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
          if (result && !result.success) {
            setChatMessages((prev) => [...prev, { sender: "bot", text: "错误: " + (result.error || "未知错误"), isError: true }]);
          }
        }),
      );

      cleanups.push(
        window.electronAPI.receive('download-progress', (data) => {
          if (data.status === 'downloading') {
            setDownloadProgress(data.progress);
          } else if (data.status === 'completed') {
            setDownloadProgress(100);
            setIsUpdating(false);
          } else if (data.status === 'error') {
            setDownloadProgress(null);
            setIsUpdating(false);
            showCustomAlert("下载失败", data.error || "下载过程中出现错误");
          }
        })
      );
    }

    // Cleanup function
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      cleanups.forEach((fn) => fn && fn());
    };
  }, [showCustomAlert]);

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

  const saveSettings = useCallback((newSet) => {
    // 1. Update local UI state immediately for responsiveness
    setSettings((prev) => ({ ...prev, ...newSet }));

    // 2. ONLY send the delta to main process to prevent heavy OS operations
    if (window.electronAPI) {
      window.electronAPI.send("save-settings", newSet);
    }
  }, []);

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
          const d = r.duration || 0;
          const isSeconds = r.id > 1739015400000 || d > 1200; // 1200m is 20h, unlikely for old records
          const durationLabel = isSeconds ? `${Math.round(d / 60)}m` : `${d}m`;
          return `[${timeStr}] ${r.task} (${durationLabel}) ${r.tags ? r.tags.join(",") : ""} ${r.desc || ""}`;
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

  const handleInsertGap = (startTime, durationS) => {
    setEditingRecord({
      id: startTime,
      timestamp: new Date(startTime).toISOString(),
      task: "",
      desc: "",
      duration: durationS !== undefined ? durationS : 1800, // Defualt to gap duration or 30m
      tags: [],
      screenshots: [],
      isNew: true,
    });
  };

  const handleSaveEdit = () => {
    if (window.electronAPI && editingRecord) {
      // Overlap Detection Logic
      const currentStart = editingRecord.id;
      const getDurationS = (r) =>
        r.id > 1739015400000 || (r.duration || 0) > 3600 ? r.duration || 0 : (r.duration || 0) * 60;
      const currentDurationS = getDurationS(editingRecord);
      const currentEnd = currentStart + currentDurationS * 1000;

      // Check if this record overlaps with any LATER record
      const overlappingRecord = records.find((r) => {
        if (r.id === editingRecord.id) return false; // Ignore self
        return r.id > currentStart && r.id < currentEnd;
      });

      const performSave = () => {
        if (editingRecord.isNew) {
          const recordToSave = { ...editingRecord };
          delete recordToSave.isNew;
          window.electronAPI.send("save-record", recordToSave);
        } else {
          // 乐观更新本地状态，确保截图同步即时反映
          setRecords((prev) =>
            prev.map((r) => r.id === editingRecord.id ? { ...editingRecord } : r)
          );
          window.electronAPI.send("update-record", editingRecord);
        }
        setEditingRecord(null);
      };

      if (overlappingRecord) {
        showCustomAlert("时间冲突提醒", "该任务的时长可能覆盖了后续已有的任务，确定要强制保存吗？", {
          showCancel: true,
          onConfirm: performSave,
        });
      } else {
        performSave();
      }
    }
  };

  const handleDeleteRecord = useCallback((record) => {
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    if (window.electronAPI) {
      window.electronAPI.send("delete-record", record.id);
    }
  }, []);

  // confirmDelete removed as RecordCard handles confirmation

  const handleFilterClick = useCallback((id) => {
    setTimeFilter(id);
    setDateRange({ start: "", end: "" });
  }, []);

  const handleAiSummary = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      showCustomAlert("提示", "当前范围内无记录可总结");
      return;
    }

    if (!settings.aiApiKey) {
      showCustomAlert("API 密钥缺失", "使用 AI 功能需要在设置中配置 ModelScope API 密钥");
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

    if (!settings.aiApiKey) {
      showCustomAlert("API 密钥缺失", "请先在设置中配置 ModelScope API 密钥");
      return;
    }

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
      showCustomAlert("导出提示", "暂无数据可导出");
      return;
    }

    const formatDur = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h > 0 ? h + "小时" : ""}${m}分${s}秒`;
    };

    const exportData = filtered.map((r) => {
      const startTime = new Date(r.timestamp);
      // Heuristic for duration unit
      const durationS = r.id > 1739015400000 || (r.duration || 0) > 3600 ? r.duration || 0 : (r.duration || 0) * 60;
      const endTime = new Date(startTime.getTime() + durationS * 1000);

      const fTime = (d) => d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const fDate = (d) => d.toLocaleDateString("zh-CN");

      return {
        日期: fDate(startTime),
        开始时间: fTime(startTime),
        结束时间: fTime(endTime),
        持续时长: formatDur(durationS),
        记录任务: r.task || "未命名",
        具体标签: (r.tags || []).join("; "),
        详细说明: (r.desc || "").replace(/\n/g, " "),
      };
    });

    let csvContent = "\uFEFF"; // UTF-8 BOM
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
    a.download = `ChronoPet_Data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const defaultTags = useMemo(
    () => [
      { name: "工作", color: "#6366f1", iconType: "preset", iconValue: "Target" },
      { name: "学习", color: "#a855f7", iconType: "preset", iconValue: "Brain" },
      { name: "摸鱼", color: "#f43f5e", iconType: "preset", iconValue: "Coffee" },
      { name: "休息", color: "#10b981", iconType: "preset", iconValue: "Clock" },
    ],
    [],
  );

  const getStats = useCallback(() => {
    const filtered = getFilteredRecords();
    const totalRecords = filtered.length;
    const totalScreenshots = filtered.reduce(
      (sum, r) => sum + ((r.screenshots?.length || 0) + (r.screenshot ? 1 : 0)),
      0,
    );

    const getDurationS = (record) => {
      if (!record) return 0;
      const d = record.duration || 0;
      if (record.id > 1739015400000 || d > 3600) return d;
      return d * 60;
    };

    const totalDurationS = filtered.reduce((sum, r) => sum + getDurationS(r), 0);

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
    const tagDurationStatsS = {};

    filtered.forEach((r) => {
      const durationS = getDurationS(r);
      (r.tags || []).forEach((tag) => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
        tagDurationStatsS[tag] = (tagDurationStatsS[tag] || 0) + durationS;
      });
    });

    return {
      totalRecords,
      totalScreenshots,
      totalDuration: totalDurationS / 60, // UI expects minutes for some legacy calcs, or we adjust UI
      totalDurationS,
      peakHour,
      tasksByHour,
      tagStats,
      tagDurationStats: Object.fromEntries(Object.entries(tagDurationStatsS).map(([k, v]) => [k, v / 60])),
    };
  }, [getFilteredRecords]);

  const filteredRecords = useMemo(() => getFilteredRecords(), [getFilteredRecords]);
  const stats = useMemo(() => getStats(), [getStats]);
  const hasDateRange = Boolean(dateRange.start);

  // Tags Management Logic
  const handleSaveTag = useCallback(() => {
    if (!editingTag || !editingTag.name.trim()) return;

    if (editingTag.isIdle) {
      const preset = settings.petPreset || "apple";
      const appearance = settings.appearance || {};
      const currentPresetOverride = appearance[preset] || {};

      const newAppearance = {
        ...appearance,
        [preset]: {
          ...currentPresetOverride,
          Idle: editingTag.petIcon,
        },
      };
      saveSettings({ appearance: newAppearance });
      setEditingTag(null);
      // Notify pet window to refresh
      if (window.electronAPI) window.electronAPI.send("sync-app-icon");
      return;
    }

    // For default tags, only allow updating the pet icon
    const defaultNames = ["工作", "学习", "摸鱼", "休息"];
    if (
      defaultNames.includes(editingTag.name) ||
      (editingTag.index !== undefined && defaultNames.includes(settings.tags?.[editingTag.index]?.name))
    ) {
      const preset = settings.petPreset || "apple";
      const appearance = settings.appearance || {};
      const currentPresetOverride = appearance[preset] || {};

      const newAppearance = {
        ...appearance,
        [preset]: {
          ...currentPresetOverride,
          [editingTag.name]: editingTag.petIcon,
        },
      };

      saveSettings({ appearance: newAppearance });

      setEditingTag(null);
      if (window.electronAPI) window.electronAPI.send("sync-app-icon");
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
        petIcon: editingTag.petIcon,
      };
    } else {
      // Add new
      newTags.push({
        name: editingTag.name,
        color: editingTag.color || "#6366f1",
        iconType: editingTag.iconType || "preset",
        iconValue: editingTag.iconValue || "Target",
        petIcon: editingTag.petIcon,
      });
    }
    saveSettings({ tags: newTags });
    setEditingTag(null);
  }, [editingTag, settings.tags, settings.petPreset, settings.appearance, saveSettings, defaultTags]);

  const handleDeleteTag = useCallback(
    (index) => {
      const tags = settings.tags && settings.tags.length > 0 ? settings.tags : defaultTags;
      if (["工作", "学习", "摸鱼", "休息"].includes(tags[index].name)) {
        showCustomAlert("操作限制", "系统默认标签不可删除");
        return;
      }
      const newTags = [...tags];
      newTags.splice(index, 1);
      saveSettings({ tags: newTags });
    },
    [settings.tags, saveSettings, defaultTags, showCustomAlert], // Actually this one STILL USES IT on 693
  );

  const handleEditTag = useCallback((tag, index) => {
    setEditingTag({ ...tag, index });
  }, []);

  const confirmDeleteTag = (tag, index) => {
    handleDeleteTag(index);
  };

  const isAnyModalOpen = Boolean(editingTag || editingRecord || galleryState.open || dialog.open);

  return (
    <div
      className={`win-container ${(isFocused && !isAnyModalOpen) ? "" : "inactive"} ${settings.win12Experimental ? "liquid-ui" : ""}`}
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
          background:
            settings.win12Experimental ? "transparent"
              : isFocused ? "rgba(255,255,255,0.05)"
                : "transparent",
          userSelect: "none",
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
          background:
            settings.win12Experimental ? "transparent"
              : isFocused ? "rgba(255,255,255,0.03)"
                : "transparent",
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
            className="animate-page"
            style={{
              width: "100%",
              maxWidth: "800px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div className="win11-card" style={{ padding: "0 20px 20px 20px" }}>
              <h3 className="title">通用设置</h3>
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

              {/* Auto Start */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>开机自启动</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    登录 Windows 后自动运行 ChronoPet
                  </div>
                </div>
                <label className="win-toggle">
                  <input
                    type="checkbox"
                    checked={!!settings.autoStart}
                    onChange={(e) => saveSettings({ autoStart: e.target.checked })}
                  />
                  <span className="win-toggle-slider"></span>
                </label>
              </div>

              {/* Win12 Experimental */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>流光 UI 模式 (实验性)</div>
                </div>
                <label className="win-toggle">
                  <input
                    type="checkbox"
                    checked={!!settings.win12Experimental}
                    onChange={(e) => saveSettings({ win12Experimental: e.target.checked })}
                  />
                  <span className="win-toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* 记录与提醒 */}
            <div className="win11-card" style={{ padding: "0 20px 20px 20px" }}>
              <h3 className="title">记录与提醒</h3>

              {/* Quick Record Screenshot Toggle */}
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
                  <div style={{ fontWeight: 500 }}>快速记录自动截图</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    点击悬浮球标签快速记录时是否截取当前屏幕
                  </div>
                </div>
                <label className="win-toggle">
                  <input
                    type="checkbox"
                    checked={settings.quickRecordScreenshot !== false}
                    onChange={(e) => saveSettings({ quickRecordScreenshot: e.target.checked })}
                  />
                  <span className="win-toggle-slider"></span>
                </label>
              </div>

              {/* Timer Audio Toggle */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: settings.timerEndAudioEnabled !== false ? 16 : 0,
                  paddingBottom: settings.timerEndAudioEnabled !== false ? 16 : 0,
                  borderBottom: settings.timerEndAudioEnabled !== false ? "1px solid var(--border-color)" : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>计时结束播放音频</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    计时及补记时长结束时播放提示音
                  </div>
                </div>
                <label className="win-toggle">
                  <input
                    type="checkbox"
                    checked={settings.timerEndAudioEnabled !== false}
                    onChange={(e) => saveSettings({ timerEndAudioEnabled: e.target.checked })}
                  />
                  <span className="win-toggle-slider"></span>
                </label>
              </div>

              {/* Audio Selector */}
              {settings.timerEndAudioEnabled !== false && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, marginRight: 16 }}>
                    <div style={{ fontWeight: 500 }}>提示音路径</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                      {settings.timerEndAudioPath || "默认 (manbo.wav)"}
                    </div>
                  </div>
                  <button
                    className="btn"
                    onClick={async () => {
                      const path = await window.electronAPI.invoke("select-audio-file");
                      if (path) saveSettings({ timerEndAudioPath: path });
                    }}
                  >
                    选择文件
                  </button>
                </div>
              )}
            </div>

            <div className="win11-card" style={{ padding: "0 20px 20px 20px" }}>
              <h3 className="title">AI 配置</h3>

              {/* API Key */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>AI API 密钥 (ModelScope / OpenAI / Kimi)</div>
                <div style={{ position: "relative" }}>
                  <input
                    type="password"
                    defaultValue={settings.aiApiKey || ""}
                    onBlur={(e) => saveSettings({ aiApiKey: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveSettings({ aiApiKey: e.target.value });
                        e.target.blur();
                      }
                    }}
                    placeholder="输入您的 API Key 以启用 AI 功能"
                    style={{ width: "100%", margin: 0, padding: "10px 14px", paddingRight: "40px" }}
                  />
                </div>
                <div style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  推荐注册 ModelScope 获取免费 Token:{" "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (window.electronAPI)
                        window.electronAPI.send("open-external", "https://modelscope.cn/my/access/token");
                    }}
                    style={{ color: accent, textDecoration: "none" }}
                  >
                    注册指引 &rsaquo;
                  </a>
                </div>
              </div>

              {/* Chat Model */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>对话模型 (用于总结与对话)</div>
                <select
                  value={settings.aiModel || "moonshotai/Kimi-K2.5"}
                  onChange={(e) => saveSettings({ aiModel: e.target.value })}
                  style={{ width: "100%", margin: 0, padding: "10px 14px" }}
                >
                  <option value="moonshotai/Kimi-K2.5">Moonshot Kimi K2.5</option>
                  <option value="Qwen/Qwen3-VL-235B-A22B-Instruct">Qwen3 VL 235B Instruct</option>
                  <option value="deepseek-ai/DeepSeek-V3">DeepSeek V3</option>
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
                  <option value="black-forest-labs/FLUX.2-dev">FLUX.2-dev (图像编辑)</option>
                  <option value="black-forest-labs/FLUX.1-dev">FLUX.1-dev (文本生成)</option>
                  <option value="stabilityai/stable-diffusion-xl-base-1.0">Stable Diffusion XL</option>
                </select>
              </div>
            </div>

            <div className="win11-card" style={{ padding: "0 20px 20px 20px" }}>
              <h3 className="title">存储与清理</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>清理截图数据</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    删除所有保存在本地的截图文件以释放空间。
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => window.electronAPI && window.electronAPI.send("open-folder")}>
                    打开文件夹
                  </button>
                  <button
                    className="btn"
                    style={{ color: "#ef4444", borderColor: "#ef4444" }}
                    onClick={() => {
                      showCustomAlert("清理确认", "确定要删除所有截图吗？此操作不可撤销。", {
                        showCancel: true,
                        onConfirm: async () => {
                          const res = await window.electronAPI.invoke("cleanup-screenshots");
                          if (res.success) showCustomAlert("清理成功", "所有截图已清理完成");
                          else showCustomAlert("清理失败", res.error);
                        },
                      });
                    }}
                  >
                    立即清理
                  </button>
                </div>
              </div>
            </div>

            {/* 关于与更新 */}
            <div className="win11-card" style={{ padding: "0 20px 20px 20px" }}>
              <h3 className="title">关于与更新</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 500 }}>ChronoPet</div>
                  <div id="app-version-label" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    当前版本: {window.electronAPI ? `v${pkg.version}` : "Unknown"}
                  </div>
                  {isUpdating && (
                    <div style={{ marginTop: 12, width: 200 }}>
                      <div style={{ fontSize: "0.75rem", marginBottom: 6, display: "flex", justifyContent: "space-between", color: "var(--accent)" }}>
                        <span style={{ fontWeight: 600 }}>正在下载更新...</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div style={{ height: 6, background: "var(--border-color)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border-color)" }}>
                        <div
                          style={{
                            height: "100%",
                            background: "var(--accent)",
                            width: `${downloadProgress}%`,
                            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: "0 0 10px color-mix(in srgb, var(--accent), transparent 50%)"
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "0.7rem", marginTop: 4, color: "var(--text-secondary)", opacity: 0.8 }}>
                        {downloadProgress === 100 ? "准备安装，请稍候..." : "请勿关闭软件"}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="btn"
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    const originalContent = btn.innerHTML;
                    btn.innerText = "检查中...";
                    btn.disabled = true;
                    try {
                      if (window.electronAPI) {
                        const res = await window.electronAPI.invoke("check-for-updates");

                        // Update version label if we got it
                        if (res.currentVersion) {
                          const label = document.getElementById("app-version-label");
                          if (label) label.innerText = `当前版本: v${res.currentVersion}`;
                        }

                        if (res.success) {
                          if (res.updateAvailable) {
                            const hasExe = !!res.exeUrl;
                            showCustomAlert(
                              "发现新版本",
                              `最新版本: ${res.latestTag}\n\n${hasExe ? "是否现在开始软件内更新？" : "建议前往 GitHub 下载最新版。"}`,
                              {
                                showCancel: true,
                                onConfirm: () => {
                                  if (hasExe) {
                                    setIsUpdating(true);
                                    setDownloadProgress(0);
                                    window.electronAPI.send("start-download-update", {
                                      url: res.exeUrl,
                                      fileName: `ChronoPet-Setup-${res.latestTag}.exe`
                                    });
                                  } else {
                                    if (window.electronAPI) window.electronAPI.send("open-external", res.downloadUrl);
                                  }
                                },
                              },
                            );
                          } else {
                            showCustomAlert("已经是最新版", `当前版本: v${res.currentVersion} 是最新的。`);
                          }
                        } else {
                          showCustomAlert("检查更新失败", res?.error || "未知错误");
                        }
                      }
                    } catch (err) {
                      showCustomAlert("检查失败", err.message);
                    } finally {
                      btn.innerHTML = originalContent;
                      btn.disabled = false;
                    }
                  }}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <RefreshCw size={14} style={{ marginRight: 6 }} />
                  检查更新
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "chat" && (
          <div className="animate-page" style={{ flex: 1, height: "100%" }}>
            <ChatView
              chatMessages={chatMessages}
              inputMsg={inputMsg}
              setInputMsg={setInputMsg}
              isTyping={isTyping}
              handleSendChat={handleSendChat}
              chatEndRef={chatEndRef}
              accent={accent}
            />
          </div>
        )}

        {view === "tags" && (
          <div className="animate-page" style={{ width: "100%" }}>
            <TagsView
              settings={settings}
              defaultTags={defaultTags}
              onEdit={handleEditTag}
              onDelete={confirmDeleteTag}
              onSaveSettings={saveSettings}
              showCustomAlert={showCustomAlert}
            />
          </div>
        )}

        {view === "timeline" && (
          <div className="animate-page" style={{ width: "100%" }}>
            <TimelineView
              filteredRecords={filteredRecords}
              timeFilter={timeFilter}
              hasDateRange={hasDateRange}
              handleFilterClick={handleFilterClick}
              aiSummaryLoading={aiSummaryLoading}
              handleAiSummary={handleAiSummary}
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
              onViewImages={(images, index) => setGalleryState({ open: true, images, index })}
              settings={settings}
            />
          </div>
        )}

        {view === "stats" && (
          <div className="animate-page" style={{ width: "100%" }}>
            <StatsView
              view={view}
              stats={stats}
              timeFilter={timeFilter}
              handleFilterClick={handleFilterClick}
              hasDateRange={hasDateRange}
              dateRange={dateRange}
              setDateRange={setDateRange}
              accent={accent}
              settings={settings}
              defaultTags={defaultTags}
            />
          </div>
        )}
      </div>

      <Win11Dialog
        open={dialog.open}
        title={dialog.title}
        message={dialog.message}
        showCancel={dialog.showCancel}
        onConfirm={dialog.onConfirm}
        onClose={() => setDialog({ ...dialog, open: false })}
        isDark={isDark}
        settings={settings}
        type={dialog.type || "primary"}
      />

      {editingRecord && (
        <EditRecordModal
          editingRecord={editingRecord}
          setEditingRecord={setEditingRecord}
          onSave={handleSaveEdit}
          settings={settings}
          onViewImages={(images, index) => setGalleryState({ open: true, images, index })}
        />
      )}

      {editingTag && (
        <TagEditModal
          editingTag={editingTag}
          setEditingTag={setEditingTag}
          onSave={handleSaveTag}
          settings={settings}
        />
      )}

      {galleryState.open && (
        <ImageGallery
          images={galleryState.images}
          initialIndex={galleryState.index}
          onClose={() => setGalleryState({ open: false, images: [], index: 0 })}
        />
      )}
    </div>
  );
}
