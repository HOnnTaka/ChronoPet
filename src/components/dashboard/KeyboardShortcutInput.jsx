import React, { useState, useRef } from "react";

const KeyboardShortcutInput = ({ value, onChange, accent }) => {
  const [isListening, setIsListening] = useState(false);
  const [tempKeys, setTempKeys] = useState([]);
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (!isListening) return;
    e.preventDefault();
    e.stopPropagation();

    const keys = [];
    if (e.ctrlKey) keys.push("Ctrl");
    if (e.altKey) keys.push("Alt");
    if (e.shiftKey) keys.push("Shift");
    if (e.metaKey) keys.push("Meta");

    const key = e.key;
    if (key && !["Control", "Alt", "Shift", "Meta"].includes(key)) {
      keys.push(key.length === 1 ? key.toUpperCase() : key);
    }

    setTempKeys(keys);
  };

  const handleKeyUp = () => {
    if (!isListening) return;

    // 当松开按键时，如果有完整的组合键（修饰符+普通键），则保存
    const hasModifier = tempKeys.some((k) => ["Ctrl", "Alt", "Shift", "Meta"].includes(k));
    const hasKey = tempKeys.some((k) => !["Ctrl", "Alt", "Shift", "Meta"].includes(k));

    if (hasModifier && hasKey && tempKeys.length >= 2) {
      onChange(tempKeys.join("+"));
      setIsListening(false);
      setTempKeys([]);
      inputRef.current?.blur();
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        ref={inputRef}
        value={isListening && tempKeys.length > 0 ? tempKeys.join("+") : value}
        readOnly
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onFocus={() => {
          setIsListening(true);
          setTempKeys([]);
        }}
        onBlur={() => {
          setIsListening(false);
          setTempKeys([]);
        }}
        style={{
          width: 180,
          margin: 0,
          cursor: "pointer",
          borderColor: isListening ? accent : undefined,
          textAlign: "center",
        }}
        placeholder="点击后按组合键"
      />
      {isListening && <span style={{ fontSize: "0.8rem", color: accent, whiteSpace: "nowrap" }}>按住组合键...</span>}
    </div>
  );
};

export default KeyboardShortcutInput;
