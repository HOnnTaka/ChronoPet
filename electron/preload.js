import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    let validChannels = [
      'pet-clicked', 'open-menu', 'save-record', 'update-record', 
      'request-summary', 'capture-screen', 'hide-input', 'window-moving', 
      'save-settings', 'close-dashboard', 'input-window-moving', 
      'request-ai-summary', 'resize-input-window', 'open-preview', 
      'set-pinned', 'set-ignore-mouse', 'resize-pet-window', 
      'quick-record-now', 'open-detailed-record', 'update-record-parts',
      'delete-record', 'update-last-record-desc', 'open-settings-tags'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['summary-response', 'screen-captured', 'records-updated', 'ai-summary-response', 'switch-tab', 'scroll-to-tags', 'settings-updated', 'execute-quick-record'];
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  },
  invoke: (channel, data) => {
    let validChannels = ['get-records', 'get-system-colors', 'get-settings', 'generate-icon'];
    if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
    }
  }
});
