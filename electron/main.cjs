const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, globalShortcut, nativeTheme, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Simple .env loader if dotenv is not available
try {
  require('dotenv').config();
} catch (e) {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) process.env[key.trim()] = value.trim();
    });
  }
}
const os = require('os');

let petWindow;
let dashboardWindow;
let inputWindow;
let tray = null;

const isDev = !app.isPackaged;
// Persist settings
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let settings = { 
    shortcut: 'Alt+A', 
    autoStart: false,
    aiModel: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
    aiApiKey: '',
    customModel: '',
    inputWindowPos: null
};
try { 
    if(fs.existsSync(settingsPath)) settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsPath)) }; 
} catch(e) {}

const isDark = nativeTheme.shouldUseDarkColors;
const iconPath = path.join(__dirname, '../public/icon_moyu.png');

function saveSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    applySettings();
    
    // Broadcast updates to all windows
    if (petWindow && !petWindow.isDestroyed()) petWindow.webContents.send('settings-updated', settings);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.webContents.send('settings-updated', settings);
    if (inputWindow && !inputWindow.isDestroyed()) inputWindow.webContents.send('settings-updated', settings);
}

function applySettings() {
    globalShortcut.unregisterAll();
    if (settings.shortcut && settings.shortcut.includes('+')) {
        // 验证快捷键格式：必须包含修饰符+键
        const parts = settings.shortcut.split('+').map(p => p.trim()).filter(p => p.length > 0);
        const hasModifier = parts.some(p => ['Ctrl', 'Alt', 'Shift', 'Meta', 'CommandOrControl'].includes(p));
        const hasKey = parts.some(p => !['Ctrl', 'Alt', 'Shift', 'Meta', 'CommandOrControl'].includes(p));
        
        if (hasModifier && hasKey && parts.length >= 2) {
            try {
                const shortcut = parts.join('+');
                globalShortcut.register(shortcut, () => {
                    if (inputWindow && !inputWindow.isVisible()) {
                        const point = screen.getCursorScreenPoint();
                        inputWindow.setPosition(point.x - 200, point.y - 170);
                        inputWindow.show();
                    } else if (inputWindow) {
                        inputWindow.hide();
                    }
                });
            } catch(e) { console.error('注册快捷键失败', e); }
        }
    }
}

function createTray() {
    if (tray) return;
    // Use the icon we have. ideally 16x16 or 32x32 for tray.
    // Use dynamic icon
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
        { label: '显示/隐藏桌宠', click: () => {
            if (petWindow) {
                if (petWindow.isVisible()) petWindow.hide();
                else petWindow.show();
            }
        }},
        { label: '打开面板', click: () => {
            if (dashboardWindow) dashboardWindow.show();
            else createDashboardWindow();
        }},
        { type: 'separator' },
        { label: '退出', click: () => app.quit() }
    ]);
    tray.setToolTip('ChronoPet');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (dashboardWindow) dashboardWindow.show();
    });
}

function createPetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // 使用更大的窗口但将宠物放在中心，防止气泡截断
  const winW = 600;
  const winH = 800;

  petWindow = new BrowserWindow({
    width: winW,
    height: winH,
    // 调整坐标，使得宠物的中心点依然在右下角合适的位置
    x: width - (winW / 2) - 80, 
    y: height - (winH / 2) - 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 默认开启鼠标穿透
  petWindow.setIgnoreMouseEvents(true, { forward: true });

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  petWindow.loadURL(startUrl).catch(e => {
      console.log("加载桌宠窗口失败，3秒后重试...", e);
      setTimeout(() => petWindow.loadURL(startUrl), 3000);
  });
}

function createInputWindow() {
   if (inputWindow) return inputWindow;

   const baseHeight = 750;
   
   inputWindow = new BrowserWindow({
       width: 420,
       height: baseHeight,
       show: false,
       frame: false,
       alwaysOnTop: true,
       skipTaskbar: true,
       transparent: false,
       backgroundColor: '#00000001',
       backgroundMaterial: 'acrylic',
       vibrancy: 'under-window',
       webPreferences: {
           preload: path.join(__dirname, 'preload.cjs'),
       }
   });

   if (settings.inputWindowPos) {
       inputWindow.setPosition(settings.inputWindowPos.x, settings.inputWindowPos.y);
   }
   
   const startUrl = isDev 
    ? 'http://localhost:5173/#/record' 
    : `file://${path.join(__dirname, '../dist/index.html')}#/record`;
    
   inputWindow.loadURL(startUrl);
   
   // inputWindow.on('blur', () => {
   //     inputWindow.hide();
   // });


   inputWindow.on('moved', () => {
       const pos = inputWindow.getPosition();
       settings.inputWindowPos = { x: pos[0], y: pos[1] };
       saveSettings({}); // Save async
   });

   inputWindow.on('close', (e) => {
       e.preventDefault();
       inputWindow.hide();
   });
}

function createDashboardWindow() {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.show();
        return;
    }
    
    dashboardWindow = new BrowserWindow({
        width: 900,
        height: 650,
        show: false,
        frame: false,
        transparent: false,
        backgroundColor: '#00000001',
        backgroundMaterial: 'acrylic',
        vibrancy: 'under-window',
        minWidth: 560,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
        }
    });
    
    const startUrl = isDev 
     ? 'http://localhost:5173/#/dashboard' 
     : `file://${path.join(__dirname, '../dist/index.html')}#/dashboard`;
     
    dashboardWindow.loadURL(startUrl);

    dashboardWindow.on('close', (e) => {
        e.preventDefault();
        dashboardWindow.hide();
    });
}

app.whenReady().then(() => {
  createTray();
  createPetWindow();
  createInputWindow();
  createDashboardWindow();
  applySettings();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createPetWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (petWindow) {
        petWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
});

ipcMain.on('window-moving', (event, { dx, dy }) => {
    if (!petWindow) return;
    const pos = petWindow.getPosition();
    if (typeof dx === 'number' && typeof dy === 'number') {
        petWindow.setPosition(pos[0] + dx, pos[1] + dy);
    }
});

ipcMain.on('input-window-moving', (event, { dx, dy }) => {
    if (!inputWindow) return;
    const pos = inputWindow.getPosition();
    if (typeof dx === 'number' && typeof dy === 'number') {
        inputWindow.setPosition(pos[0] + dx, pos[1] + dy);
    }
});

ipcMain.on('pet-clicked', (event, type) => {
    if (type === 'right') {
        // 右键直接打开Dashboard
        if (dashboardWindow) {
            dashboardWindow.show();
            dashboardWindow.focus();
        }
    }
});

// 快速记录打点（带截图）
ipcMain.on('quick-record-now', async (event, { tag }) => {
    if (inputWindow) {
        let image = null;
        try {
            const { width, height } = screen.getPrimaryDisplay().size;
            const fetchWidth = width > 1920 ? width : 1920; 
            const fetchHeight = height > 1080 ? height : 1080;

            const sources = await desktopCapturer.getSources({ 
                types: ['screen'], 
                thumbnailSize: { width: fetchWidth, height: fetchHeight } 
            });
            
            const primarySource = sources[0];
            if (primarySource) {
                image = primarySource.thumbnail.toDataURL();
            }
        } catch (e) {
            console.error('Quick record capture failed', e);
        }

        // 通知记录窗口执行快速记录逻辑，附带截图
        inputWindow.webContents.send('execute-quick-record', { tag, image });
    }
});

// 打开详细记录窗口（优化位置）
ipcMain.on('open-detailed-record', () => {
    if (inputWindow) {
        const { x, y } = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint({ x, y });
        const { width: sWidth, height: sHeight, x: sX, y: sY } = display.workArea;
        
        const winW = 420;
        const winH = 600; // 调小一点默认高度，让它看起来更精致

        inputWindow.setSize(winW, winH);

        // 默认在鼠标左上角，类似右键菜单
        let newX = x - winW - 20;
        let newY = y - 50;

        // 防止溢出屏幕
        if (newX < sX) newX = x + 20; // 如果左边放不下，放右边
        if (newX + winW > sX + sWidth) newX = sX + sWidth - winW - 20;
        if (newY < sY) newY = sY + 20;
        if (newY + winH > sY + sHeight) newY = sY + sHeight - winH - 20;

        inputWindow.setPosition(Math.round(newX), Math.round(newY));
        inputWindow.show();
        inputWindow.focus();
    }
});

// 打开设置并跳转到标签页
ipcMain.on('open-settings-tags', () => {
    if (dashboardWindow) {
        dashboardWindow.show();
        dashboardWindow.focus();
        dashboardWindow.webContents.send('switch-tab', 'tags');
        // 延时一下确保 Tab 切换后再滚动或者聚焦到 Tags 区域
        setTimeout(() => {
            dashboardWindow.webContents.send('scroll-to-tags');
        }, 500);
    } else {
        createDashboardWindow();
        setTimeout(() => {
            if(dashboardWindow) {
                dashboardWindow.show();
                dashboardWindow.webContents.send('switch-tab', 'tags');
                setTimeout(() => dashboardWindow.webContents.send('scroll-to-tags'), 500);
            }
        }, 1000);
    }
});

// AI 生成图标接口
ipcMain.handle('generate-icon', async (event, { prompt, model, apiKey, stylePrompt, refImage }) => {
    try {
        const fetch = (await import('node-fetch')).default;
        
        // 默认使用 Qwen-Image-Edit 或者是 Flux
        // 注意：用户给的代码是 Qwen-Image-Edit-2511，这通常需要 image_url。
        // 如果是纯文生图，我们可能需要用 Wanx 或 Flux。
        // 但用户的 Prompt 示例 "给图中的狗..." 是编辑。
        // 而现在的需求是 "生成新标签图标"，这应该是文生图。
        // 假设 ModelScope 的此模型也支持纯文生图，或者我们使用 Flux。
        
        // 为了稳定性，我们将 prompt 包装一下以符合苹果图标风格
        // Default Style Prompt
        const defaultStyle = stylePrompt || '3D clay render, anthropomorphic, abstract, cute, retro-futuristic, apple emoji style, minimalist, white background, high quality, soft lighting';
        const fullPrompt = `concept art of a ${prompt}, ${defaultStyle}, 8k resolution`;
        
        console.log('[Generate Icon] Prompt:', fullPrompt);

        const baseUrl = 'https://api-inference.modelscope.cn/v1/images/generations';
        
        // Fix Typo: FLUX.1-dev
        const useModel = model || 'black-forest-labs/FLUX.2-dev'; // Image editing model
        
        const payload = {
            model: useModel,
            prompt: fullPrompt
            // n: 1, size: "1024x1024" - Removed to fix 400
        };
        
        // ModelScope may require pure base64 without data URI prefix
        console.log('[Generate Icon] refImage received:', refImage ? `${refImage.substring(0, 50)}...` : 'null');
        if (refImage && (useModel.includes('FLUX') || useModel.includes('Qwen'))) {
            // Strip data URI prefix if present
            let imageData = refImage;
            if (refImage.startsWith('data:')) {
                imageData = refImage.split(',')[1]; // Get pure base64
            }
            payload.image_url = [imageData];
            console.log('[Generate Icon] image_url added (base64, length:', imageData.length, ')');
        }
        
        // Use built-in key if model is Flux/SDXL and no key provided 
        let useApiKey = apiKey;
        if (!useApiKey && (useModel.includes('FLUX') || useModel.includes('stabilityai'))) {
             useApiKey = process.env.MODELSCOPE_API_KEY; 
        }

        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${useApiKey}`,
                'Content-Type': 'application/json',
                'X-ModelScope-Async-Mode': 'true', // Required
                "X-ModelScope-Task-Type": "image_generation"
            },
            body: JSON.stringify(payload)
        });
        
        let result;
        try {
            result = await response.json();
        } catch (e) {
            result = { error: await response.text() };
        }

        console.log('[Generate Icon] Response Status:', response.status);
        if (!response.ok) {
            console.error('[Generate Icon] Error Body:', JSON.stringify(result));
            throw new Error(`API Error: ${response.status} ${result.error?.message || result.message || JSON.stringify(result)}`);
        }
        
        // Handle Sync Response immediately
        const data = result;
        
        // Handle Sync Response immediately
        if (data.output || (data.data && data.data[0])) {
             const url = data.output?.url || data.data?.[0]?.url;
             if (url) {
                  const imgRes = await fetch(url);
                  const imgBuffer = await imgRes.arrayBuffer();
                  const base64 = Buffer.from(imgBuffer).toString('base64');
                  return { success: true, image: `data:image/png;base64,${base64}` };
             }
        }

        const taskId = data.task_id;
        if (!taskId) throw new Error("No Task ID returned and no sync data");
        
        // 轮询任务状态
        let attempts = 0;
        while (attempts < 60) { // 最多等待 60秒
            await new Promise(r => setTimeout(r, 1000));
            
            const taskRes = await fetch(`https://api-inference.modelscope.cn/v1/tasks/${taskId}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${useApiKey}`,
                    'X-ModelScope-Task-Type': 'image_generation' // Required for Polling
                }
            });
            
            if (taskRes.ok) {
                const taskData = await taskRes.json();
                if (taskData.task_status === 'SUCCEED') {
                    // 获取图片 URL 并转换为 Base64，方便前端存储
                    const imgUrl = taskData.output_images[0] || (taskData.output && taskData.output.renders && taskData.output.renders[0]); // Wanx support?
                    if (imgUrl) {
                        const imgRes = await fetch(imgUrl);
                        const imgBuffer = await imgRes.arrayBuffer();
                        const base64 = Buffer.from(imgBuffer).toString('base64');
                        return { success: true, image: `data:image/png;base64,${base64}` };
                    }
                } else if (taskData.task_status === 'FAILED') {
                    return { success: false, error: 'Task Failed' };
                }
            }
            attempts++;
        }
        return { success: false, error: 'Timeout' };
        
    } catch (error) {
        console.error('Icon Generation Failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.on('open-menu', () => {
    // Also popup tray menu
    if (tray) tray.popUpContextMenu();
});

ipcMain.handle('get-system-colors', () => {
    if (process.platform === 'win32') {
        const { systemPreferences } = require('electron');
        return { accent: systemPreferences.getAccentColor() };
    }
    return { accent: '0078d4' };
});

ipcMain.on('capture-screen', async (event) => {
    try {
        const { width, height } = screen.getPrimaryDisplay().size;
        // Optimization: Use a slightly smaller size if 4K to speed up? 
        // User complained about low quality, so use full size or at least 1080p
        const fetchWidth = width > 1920 ? width : 1920; 
        const fetchHeight = height > 1080 ? height : 1080;

        const sources = await desktopCapturer.getSources({ 
            types: ['screen'], 
            thumbnailSize: { width: fetchWidth, height: fetchHeight } 
        });
        
        const primarySource = sources[0]; // Usually the first one is primary
        if (primarySource) {
            // const image = primarySource.thumbnail.toPNG(); // High quality
            // Save to temp or send directly.
            // ...
            const base64 = primarySource.thumbnail.toDataURL();
            event.reply('screen-captured', { success: true, image: base64 });
        } else {
            event.reply('screen-captured', { success: false, error: 'No screen source found.' });
        }
    } catch (e) {
        console.error(e);
        event.reply('screen-captured', { success: false, error: e.message });
    }
});

ipcMain.on('resize-input-window', (event, { height }) => {
    if (inputWindow && height && !isNaN(height)) {
        const [w, h] = inputWindow.getSize();
        const newHeight = Math.round(height);
        if (Math.abs(h - newHeight) < 2) return; // Ignore small changes to prevent feedback loop
        
        const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
        const maxHeight = Math.round(screenHeight * 0.9);
        inputWindow.setSize(w, Math.min(maxHeight, Math.max(120, newHeight)));
    }
});

const recordsPath = path.join(app.getPath('userData'), 'records.json');

function getRecords() {
    try {
        if (!fs.existsSync(recordsPath)) return [];
        return JSON.parse(fs.readFileSync(recordsPath));
    } catch { return []; }
}

ipcMain.on('save-record', (event, record) => {
    const records = getRecords();
    
    // 如果有上一条记录，且前端允许同步时长（非专注模式）
    // 强制同步上一条记录的时长为：(当前记录开始时间 - 上一条记录开始时间)
    // 这意味着"上一条事做到了现在"
    if (records.length > 0 && record.shouldSyncDuration) {
        const lastRecord = records[records.length - 1];
        
        // 计算两个开始时间之间的差值
        const currentStart = new Date(record.timestamp).getTime();
        const lastStart = new Date(lastRecord.timestamp).getTime();
        const diff = currentStart - lastStart;
        
        // 只有当时间差 > 0 (新记录在旧记录之后) 
        if (diff > 0 && diff < 86400000) { // < 24h
            const durationMins = Math.floor(diff / 60000);
            // 只要大于等于1分钟，就更新。或者如果是0分钟且diff>0也更新
            if (durationMins >= 0) {
                lastRecord.duration = durationMins;
            }
        }
    }
    
    // 清理临时字段
    delete record.shouldSyncDuration;

    records.push(record);
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    if (inputWindow) inputWindow.hide();
    
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('records-updated');
    }
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('records-updated');
    }
});

ipcMain.on('update-record', (event, updatedRecord) => {
    let records = getRecords();
    records = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('records-updated');
    }
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('records-updated');
    }
});

// 部分更新记录（如 AI 识别后更新任务名和描述）
ipcMain.on('update-record-parts', (event, { id, task, desc }) => {
    let records = getRecords();
    records = records.map(r => {
        if (r.id === id) {
            return {
                ...r,
                task: task || r.task,
                desc: desc || r.desc
            };
        }
        return r;
    });
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('records-updated');
    }
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('records-updated');
    }
});

ipcMain.on('update-last-record-desc', (event, summary) => {
    const records = getRecords();
    if (records.length > 0) {
        const lines = summary.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
            const taskName = lines[0].trim();
            const newDesc = lines.length > 1 ? lines.slice(1).join('\n') : '';
            
            const lastIdx = records.length - 1;
            records[lastIdx].task = taskName || records[lastIdx].task;
            records[lastIdx].desc = newDesc || records[lastIdx].desc;
            
            fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
            
            if (dashboardWindow && !dashboardWindow.isDestroyed()) {
                dashboardWindow.webContents.send('records-updated');
            }
            if (petWindow && !petWindow.isDestroyed()) {
                petWindow.webContents.send('records-updated');
            }
        }
    }
});

ipcMain.on('hide-input', () => {
    if (inputWindow) inputWindow.hide();
});



ipcMain.on('set-pinned', (event, pinned) => {
    if (inputWindow) {
        inputWindow.setAlwaysOnTop(pinned); 
    }
});

ipcMain.handle('get-records', () => getRecords());

ipcMain.handle('get-settings', () => settings);
ipcMain.on('save-settings', (e, newSettings) => saveSettings(newSettings));
ipcMain.on('close-dashboard', () => {
    if (dashboardWindow) dashboardWindow.hide();
});

// 预览窗口变量
let previewWindow = null;

ipcMain.on('open-preview', (event, imageUrl) => {
    try {
        if (!imageUrl) return;
        
        // Handle Base64 images
        if (imageUrl.startsWith('data:')) {
            const matches = imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                const tempPath = path.join(os.tmpdir(), `preview_${Date.now()}.${ext}`);
                
                fs.writeFile(tempPath, buffer, (err) => {
                    if (err) {
                        console.error('Failed to save preview image:', err);
                        return; 
                    }
                    shell.openPath(tempPath);
                });
            }
        } 
        // Handle local paths or URLs
        else {
             shell.openPath(imageUrl).then(errorMessage => {
                 if (errorMessage) {
                     console.log('openPath failed:', errorMessage, 'trying openExternal');
                     shell.openExternal(imageUrl);
                 }
             });
        }
    } catch (e) {
        console.error('Open preview error:', e);
    }
});


// AI Summary - 仅支持 ModelScope
// 内置模型列表（使用内置 API key）
const BUILTIN_MODELS = ['moonshotai/Kimi-K2.5', 'Qwen/Qwen3-VL-235B-A22B-Instruct'];
const BUILTIN_API_KEY = process.env.MODELSCOPE_API_KEY;

ipcMain.on('request-ai-summary', async (event, data) => {
    const { text, screenshot, image, apiKey, model } = data;
    const imgData = screenshot || image;
    const useModel = model || 'moonshotai/Kimi-K2.5';
    
    console.log('[AI] Request Data Keys:', Object.keys(data));
    console.log('[AI] imgData present:', !!imgData, 'Length:', imgData ? imgData.length : 0);

    const isBuiltinModel = BUILTIN_MODELS.includes(useModel);
    const useApiKey = isBuiltinModel ? BUILTIN_API_KEY : apiKey;
    
    if (!useApiKey) {
        return event.reply('ai-summary-response', { 
            success: false, 
            error: '自定义模型需要提供 API 密钥，请在设置中配置' 
        });
    }

    if (!text && !imgData) {
        return event.reply('ai-summary-response', { 
            success: false, 
            error: '未包含有效的截图或文本内容' 
        });
    }
    
    try {
        let messages = [];
        let actualModel = useModel;
        
        // 如果有截图，使用视觉模型分析
        if (imgData) {
            // 如果当前模型不是视觉模型，且不是 Kimi K2.5 (它也是视觉模型)，则切换
            const isVisionName = useModel.toLowerCase().includes('vl') || useModel.toLowerCase().includes('vision');
            const isWhitelisted = useModel.includes('Kimi-K2.5'); // User confirmed Kimi is vision
            
            if (!isVisionName && !isWhitelisted) {
                actualModel = 'Qwen/Qwen3-VL-235B-A22B-Instruct';
                console.log('[AI] 自动切换到视觉模型:', actualModel);
            }
            
            const base64Image = imgData.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
            console.log('[AI] 截图大小:', Math.round(base64Image.length / 1024), 'KB');
            messages = [{
                role: 'user',
                content: [

                    { type: 'text', text: '请以第一人称（"我..."）分析截图内容。第一行：仅输出核心活动名称（不超过6个字，无标点，如"编写代码"、"浏览视频"）。第二行：输出一段自然的详情描述（约30-50字，口吻自然，不要包含标签）。' },
                    { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                ]
            }];
        } else {
            // 纯文本总结
            messages = [{
                role: 'user',
                content: `请用第一人称中文简洁总结以下内容（不超过100字）：\n\n${text}`
            }];
        }
        
        console.log('[AI] 发送请求到 ModelScope, 模型:', actualModel);
        
        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${useApiKey}`
            },
            body: JSON.stringify({
                model: actualModel,
                messages: messages,
                max_tokens: 500
            })
        });
        
        const result = await response.json();
        console.log('[AI] API 响应:', JSON.stringify(result).substring(0, 500));
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${result.error?.message || result.message || JSON.stringify(result)}`);
        }
        
        if (result.error) {
            throw new Error(result.error.message || JSON.stringify(result.error));
        }
        
        const summary = result.choices?.[0]?.message?.content || '识别失败';
        console.log('[AI] 识别成功:', summary.substring(0, 100));
        event.reply('ai-summary-response', { ...data, success: true, summary });
    } catch (error) {
        console.error('[AI] 错误:', error);
        event.reply('ai-summary-response', { ...data, success: false, error: 'AI服务异常: ' + error.message });
    }
});

// 通用 AI 对话接口
ipcMain.on('ai-chat', async (event, data) => {
    const { messages, apiKey, model } = data;
    const useModel = model || 'moonshotai/Kimi-K2.5';
    
    const isBuiltinModel = BUILTIN_MODELS.includes(useModel);
    const useApiKey = isBuiltinModel ? BUILTIN_API_KEY : apiKey;
    
    if (!useApiKey) {
        return event.reply('ai-chat-response', { 
            success: false, 
            error: '需要 API 密钥' 
        });
    }

    try {
        const fetch = (await import('node-fetch')).default;
        console.log('[AI Chat] Stream Request Model:', useModel);
        
        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${useApiKey}`,
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify({
                model: useModel,
                messages: messages,
                stream: true, // Enable Streaming
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        if (!response.body) throw new Error('No response body');

        // Initial empty message to confirm connection
        event.reply('ai-chat-stream-v2', { content: '', start: true });

        // Stream reader
        for await (const chunk of response.body) {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.substring(6);
                    if (jsonStr === '[DONE]') continue;
                    try {
                        const json = JSON.parse(jsonStr);
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) {
                            event.reply('ai-chat-stream-v2', { content });
                        }
                    } catch (e) {
                        // ignore incomplete JSON chunks
                    }
                }
            }
        }
        
        event.reply('ai-chat-end', { success: true });

    } catch (error) {
        console.error('[AI Chat] Error:', error);
        event.reply('ai-chat-response', { success: false, error: 'Chat Error: ' + error.message });
        event.reply('ai-chat-end', { success: false });
    }
});
