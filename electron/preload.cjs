const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    let validChannels = [
      'pet-clicked', 'open-menu', 'save-record', 'update-record', 
      'request-summary', 'capture-screen', 'hide-input', 'window-moving', 
      'save-settings', 'close-dashboard', 'input-window-moving', 
      'request-ai-summary', 'resize-input-window', 'open-preview', 
      'set-pinned', 'set-ignore-mouse', 'resize-pet-window', 
      'quick-record-now', 'open-detailed-record', 'update-record-parts',
      'delete-record', 'update-last-record-desc', 'open-settings-tags',
      'ai-chat', 'show-image-context-menu', 'open-external', 'stop-current-record',
      'open-folder', 'sync-app-icon'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = [
      'summary-response', 'screen-captured', 'records-updated', 
      'ai-summary-response', 'switch-tab', 'scroll-to-tags', 
      'settings-updated', 'execute-quick-record',
      'ai-chat-stream-v2', 'ai-chat-response', 'ai-chat-end',
      'theme-updated',
      // Legacy channels kept for safety but v2 preferred for streaming
      'ai-chat-stream'
    ];
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  },
  invoke: (channel, data) => {
    let validChannels = ['get-records', 'get-system-colors', 'get-settings', 'generate-icon', 'cleanup-screenshots', 'select-audio-file'];
    if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
    }
  }
});
