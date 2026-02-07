import React from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";

export default function ChatView({
  chatMessages,
  inputMsg,
  setInputMsg,
  isTyping,
  handleSendChat,
  chatEndRef,
  accent,
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Chat History */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 24px 10px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {chatMessages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
              marginTop: -60,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "var(--bg-secondary)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Sparkles size={32} style={{ color: accent }} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>我是你的时间助手</h3>
            <p style={{ margin: 0, opacity: 0.7, maxWidth: 300, lineHeight: 1.5, textAlign: "center" }}>
              我可以基于你的时间线回答问题，比如"我今天上午在做什么？"
            </p>
          </div>
        )}

        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            style={{ display: "flex", gap: 12, flexDirection: msg.sender === "user" ? "row-reverse" : "row" }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: msg.sender === "user" ? accent : "var(--bg-active)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid var(--border-color)",
              }}
            >
              {msg.sender === "user" ?
                <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 600 }}>我</span>
              : <Sparkles size={18} style={{ color: accent }} />}
            </div>

            {/* Bubble */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "16px",
                  background: msg.sender === "user" ? accent : "var(--bg-secondary)",
                  color: msg.sender === "user" ? "#fff" : "var(--text-primary)",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  borderTopRightRadius: msg.sender === "user" ? 4 : 16,
                  borderTopLeftRadius: msg.sender === "bot" ? 4 : 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  userSelect: "text",
                  cursor: "text",
                }}
              >
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--bg-active)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid var(--border-color)",
              }}
            >
              <Loader2 size={18} className="spin" style={{ color: accent }} />
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "16px",
                background: "var(--bg-secondary)",
                borderTopLeftRadius: 4,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                <span
                  style={{
                    animation: "bounce 1.4s infinite ease-in-out both",
                    animationDelay: "-0.32s",
                    width: 6,
                    height: 6,
                    background: "var(--text-secondary)",
                    borderRadius: "50%",
                  }}
                ></span>
                <span
                  style={{
                    animation: "bounce 1.4s infinite ease-in-out both",
                    animationDelay: "-0.16s",
                    width: 6,
                    height: 6,
                    background: "var(--text-secondary)",
                    borderRadius: "50%",
                  }}
                ></span>
                <span
                  style={{
                    animation: "bounce 1.4s infinite ease-in-out both",
                    width: 6,
                    height: 6,
                    background: "var(--text-secondary)",
                    borderRadius: "50%",
                  }}
                ></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "20px",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "24px",
            padding: "4px 4px 4px 16px",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
            transition: "all 0.2s",
          }}
        >
          <input
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSendChat()}
            placeholder="输入消息..."
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              padding: "8px 0",
              margin: 0,
              boxShadow: "none",
              outline: "none",
            }}
          />
          <button
            className="btn primary"
            onClick={handleSendChat}
            disabled={isTyping || !inputMsg.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: inputMsg.trim() ? accent : "var(--border-color)",
              cursor: inputMsg.trim() ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`
         @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
         }
      `}</style>
    </div>
  );
}
