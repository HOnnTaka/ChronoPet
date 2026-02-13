const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, globalShortcut, nativeTheme, shell, nativeImage, protocol } = require('electron');
const path = require('path');
const fs = require('fs');


const os = require('os');

let petWindow;
let dashboardWindow;
let inputWindow;
let tray = null;
let isQuitting = false; // 退出标识符

const isDev = !app.isPackaged;
// Persist settings
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let settings = {
    shortcut: '',
    autoStart: true,
    aiModel: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
    aiApiKey: '',
    customModel: '',
    inputWindowPos: null
};
try {
    if (fs.existsSync(settingsPath)) settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsPath)) };
} catch (e) { }

const isDark = nativeTheme.shouldUseDarkColors;
const iconPath = path.join(__dirname, '../public/icon_moyu.png');

const recordsPath = path.join(app.getPath('userData'), 'records.db');
const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

let cachedRecords = null;
let lastRecord = null; // Lightweight cache for tray icon

// Register protocol for screenshots
app.whenReady().then(() => {
    // Migration: records.json -> records.db (JSONL)
    const oldPath = path.join(app.getPath('userData'), 'records.json');
    const bakPath = oldPath + '.bak';

    let shouldMigrate = false;
    if (fs.existsSync(oldPath) || fs.existsSync(bakPath)) {
        const sourcePath = fs.existsSync(oldPath) ? oldPath : bakPath;
        if (!fs.existsSync(recordsPath)) {
            shouldMigrate = true;
        } else {
            const dbSize = fs.statSync(recordsPath).size;
            const oldSize = fs.statSync(sourcePath).size;
            // If DB is suspiciously small (e.g. less than 50% of old size AND old size is significant)
            if (oldSize > 1000 && dbSize < oldSize / 2) {
                shouldMigrate = true;
                console.log(`[Migration] DB size (${dbSize}) is way smaller than Old size (${oldSize}), re-migrating...`);
            }
        }

        if (shouldMigrate) {
            try {
                const targetOldPath = fs.existsSync(oldPath) ? oldPath : bakPath;
                const data = JSON.parse(fs.readFileSync(targetOldPath, 'utf8'));
                if (Array.isArray(data)) {
                    const content = data
                        .filter(r => r && typeof r === 'object' && r.id)
                        .map(r => JSON.stringify(r))
                        .join('\n');
                    if (content) fs.writeFileSync(recordsPath, content + '\n');
                    console.log(`[Migration] Success. Migrated ${data.length} records.`);
                }
                if (targetOldPath === oldPath) fs.renameSync(oldPath, bakPath);
            } catch (e) { console.error('[Migration] Failed', e); }
        }
    }

    protocol.registerFileProtocol('chrono-img', (request, callback) => {
        const url = request.url.replace('chrono-img://', '');
        try {
            return callback(path.join(screenshotsDir, url));
        } catch (error) {
            console.error(error);
        }
    });
});

function getRecords() {
    if (cachedRecords) return cachedRecords;
    try {
        if (!fs.existsSync(recordsPath)) {
            cachedRecords = [];
            return [];
        }
        let content = fs.readFileSync(recordsPath, 'utf8').trim();
        if (!content) {
            cachedRecords = [];
            return [];
        }

        // Emergency check: If the entire file is a JSON array (old bug)
        if (content.startsWith('[') && content.endsWith(']')) {
            try {
                const data = JSON.parse(content);
                if (Array.isArray(data)) {
                    cachedRecords = data.filter(r => r && r.id).map(r => {
                        if (!r.timestamp) r.timestamp = new Date(r.id).toISOString();
                        return r;
                    });
                    // Immediately fix the file to JSONL
                    writeRecords(cachedRecords);
                    return cachedRecords;
                }
            } catch (e) { }
        }

        cachedRecords = [];
        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const r = JSON.parse(line);
                if (Array.isArray(r)) {
                    r.forEach(item => {
                        if (item && item.id) {
                            if (!item.timestamp) item.timestamp = new Date(item.id).toISOString();
                            cachedRecords.push(item);
                        }
                    });
                } else if (r && r.id) {
                    if (!r.timestamp) r.timestamp = new Date(r.id).toISOString();
                    cachedRecords.push(r);
                }
            } catch (e) { console.error('Parse line failed', e); }
        }

        if (cachedRecords.length > 0) {
            lastRecord = cachedRecords[cachedRecords.length - 1];
        }
        return cachedRecords;
    } catch (e) {
        console.error('Read records failed', e);
        cachedRecords = [];
        return [];
    }
}

function writeRecords(records) {
    cachedRecords = records;
    // Always find the chronologically last record for the icon cache
    if (records.length > 0) {
        lastRecord = [...records].sort((a, b) => a.id - b.id)[records.length - 1];
    }
    // Full rewrite - using JSONL format
    const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFile(recordsPath, content, (err) => {
        if (err) console.error('Failed to rewrite records', err);
    });
}

function appendRecord(record) {
    if (!cachedRecords) getRecords();
    cachedRecords.push(record);

    // Only update lastRecord if this is 'newer' than what we have
    if (!lastRecord || record.id > lastRecord.id) {
        lastRecord = record;
    }

    // Append Only - extremely fast, no blocking
    fs.appendFile(recordsPath, JSON.stringify(record) + '\n', (err) => {
        if (err) console.error('Failed to append record', err);
    });
}

// Helper to optimize a single record (base64 -> file)
function ensureRecordOptimized(record) {
    if (record.screenshots && record.screenshots.length > 0) {
        let changed = false;
        const date = new Date(record.id || Date.now());
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const targetSubDir = path.join(screenshotsDir, dateStr);

        if (!fs.existsSync(targetSubDir)) {
            try {
                fs.mkdirSync(targetSubDir, { recursive: true });
            } catch (e) { console.error('Failed to create screenshots subdir', e); }
        }

        const newScreenshots = record.screenshots.map((img, idx) => {
            if (typeof img === 'string' && img.startsWith('data:image')) {
                try {
                    const matches = img.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                    if (!matches) return img;
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const buffer = Buffer.from(matches[2], 'base64');

                    const h = String(date.getHours()).padStart(2, '0');
                    const m = String(date.getMinutes()).padStart(2, '0');
                    const s = String(date.getSeconds()).padStart(2, '0');
                    const timeStr = `${h}${m}${s}`;
                    // Format: YYYYMMDD_HHMMSS_ID_idx.ext
                    const fileName = `${dateStr.replace(/-/g, '')}_${timeStr}_${record.id || 'new'}_${idx}.${ext}`;
                    const filePath = path.join(targetSubDir, fileName);

                    fs.writeFileSync(filePath, buffer);
                    changed = true;
                    // Store as relative path with forward slashes
                    return `chrono-img://${dateStr}/${fileName}`;
                } catch (e) {
                    console.error('Failed to save screenshot to file', e);
                    return img;
                }
            }
            return img;
        });
        if (changed) {
            return { ...record, screenshots: newScreenshots };
        }
    }
    return record;
}



// Helper to determine if a record's duration is in minutes (old) or seconds (new)
function getDurationMs(record) {
    if (!record) return 0;
    const d = record.duration || 0;
    // Migration timestamp: 2026-02-08T19:50:00Z approx
    if (record.id > 1739015400000 || d > 3600) return d * 1000;
    return d * 60000;
}

function syncAppIcon() {
    const p = getCurrentIconPath();
    const img = nativeImage.createFromPath(p);
    if (tray) tray.setImage(img);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.setIcon(img);
    if (inputWindow && !inputWindow.isDestroyed()) inputWindow.setIcon(img);
    if (petWindow && !petWindow.isDestroyed()) petWindow.setIcon(img);
}

function getCurrentIconPath() {
    // Optimization: Use lastRecord cache instead of reading whole DB
    const last = lastRecord;
    const preset = settings.petPreset || "apple";
    const appearance = settings.appearance || {};
    const overrides = appearance[preset] || {};
    const suffix = preset === "manbo" ? "_mb" : "";

    // Default to Idle icon for this preset
    let iconName = overrides["Idle"];
    if (!iconName) {
        const currentIdle = settings.petIconPath;
        if (currentIdle && currentIdle !== "icon_base.png" && currentIdle !== "icon_base_mb.png") {
            iconName = currentIdle;
        } else {
            iconName = `icon_base${suffix}.png`;
        }
    }

    if (last) {
        const now = Date.now();
        const durationS = last.id > 1739015400000 || (last.duration || 0) > 3600 ? last.duration || 0 : (last.duration || 0) * 60;
        const end = last.id + durationS * 1000;

        if (now < end || last.duration <= 1) {
            const tags = last.tags || [];
            if (tags.length > 0) {
                // Preset overrides
                if (tags.includes("工作") && overrides["工作"]) iconName = overrides["工作"];
                else if (tags.includes("学习") && overrides["学习"]) iconName = overrides["学习"];
                else if (tags.includes("休息") && overrides["休息"]) iconName = overrides["休息"];
                else if (tags.includes("摸鱼") && overrides["摸鱼"]) iconName = overrides["摸鱼"];
                // Legacy overrides
                else if (tags.includes("工作") && settings.petIconWork) iconName = settings.petIconWork;
                else if (tags.includes("学习") && settings.petIconStudy) iconName = settings.petIconStudy;
                else if (tags.includes("休息") && settings.petIconRest) iconName = settings.petIconRest;
                else if (tags.includes("摸鱼") && settings.petIconMoyu) iconName = settings.petIconMoyu;
                // Custom tags
                else {
                    const activeCustomTag = settings.tags ? settings.tags.find((t) => tags.includes(t.name)) : null;
                    if (activeCustomTag && activeCustomTag.petIcon) {
                        iconName = activeCustomTag.petIcon;
                    } else {
                        // Suffix defaults
                        if (tags.includes("学校") || tags.includes("学习")) iconName = `icon_study${suffix}.png`;
                        else if (tags.includes("工作")) iconName = `icon_work${suffix}.png`;
                        else if (tags.includes("休息")) iconName = `icon_rest${suffix}.png`;
                        else if (tags.includes("摸鱼")) iconName = `icon_moyu${suffix}.png`;
                    }
                }
            }
        }
    }

    // Ensure iconName itself respects preset if it's the default base
    if (iconName === 'icon_base.png' && settings.petPreset === 'manbo') {
        iconName = 'icon_base_mb.png';
    }

    let finalPath = path.join(__dirname, '../public', iconName);
    if (!fs.existsSync(finalPath)) finalPath = path.join(__dirname, '../public/icon_base.png');
    return finalPath;
}

let saveSettingsTimeout = null;
function saveSettings(newSettings) {
    const oldSettings = { ...settings };
    settings = { ...settings, ...newSettings };

    // Asynchronous background write with debounce
    if (saveSettingsTimeout) clearTimeout(saveSettingsTimeout);
    saveSettingsTimeout = setTimeout(() => {
        fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), (err) => {
            if (err) console.error('Failed to save settings', err);
        });
    }, 500);

    // Only apply heavy OS settings IF they are explicitly IN the newSettings
    // This prevents tag edits (which send full settings) from triggering OS-level freezes
    const shortcutExplicitlyChanged = newSettings.shortcut !== undefined && oldSettings.shortcut !== settings.shortcut;
    const autoStartExplicitlyChanged = newSettings.autoStart !== undefined && oldSettings.autoStart !== settings.autoStart;

    if (shortcutExplicitlyChanged || autoStartExplicitlyChanged) {
        // Run in next tick to avoid blocking the IPC response
        setTimeout(() => {
            applySettings({
                shortcutChanged: shortcutExplicitlyChanged,
                autoStartChanged: autoStartExplicitlyChanged
            });
        }, 0);
    }

    // Broadcast updates to all windows
    if (petWindow && !petWindow.isDestroyed()) petWindow.webContents.send('settings-updated', settings);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.webContents.send('settings-updated', settings);
    if (inputWindow && !inputWindow.isDestroyed()) inputWindow.webContents.send('settings-updated', settings);

    if (autoStartExplicitlyChanged) updateTrayMenu();

    // Sync icon if tags, petIconPath or petPreset changed
    const tagsChanged = JSON.stringify(oldSettings.tags) !== JSON.stringify(settings.tags);
    const petIconChanged = newSettings.petIconPath !== undefined && oldSettings.petIconPath !== settings.petIconPath;
    const presetChanged = newSettings.petPreset !== undefined && oldSettings.petPreset !== settings.petPreset;

    if (tagsChanged || petIconChanged || presetChanged) {
        setTimeout(syncAppIcon, 100);
    }


}

function applySettings(options = { shortcutChanged: true, autoStartChanged: true }) {
    if (options.shortcutChanged) {
        globalShortcut.unregisterAll();
        if (settings.shortcut && settings.shortcut.includes('+')) {
            const parts = settings.shortcut.split('+').map(p => p.trim()).filter(p => !['', '+'].includes(p));
            if (parts.length < 2) return;
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
                } catch (e) { console.error('注册快捷键失败', e); }
            }
        }
    }

    // 处理自启动 - This is particularly slow on Windows
    if (options.autoStartChanged) {
        try {
            app.setLoginItemSettings({
                openAtLogin: !!settings.autoStart,
                path: app.getPath('exe'),
                args: isDev ? [path.resolve('.')] : []
            });
        } catch (e) {
            console.error('设置自启动失败', e);
        }
    }
}

function updateTrayMenu() {
    if (!tray) return;

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '打开面板',
            click: () => {
                if (dashboardWindow && !dashboardWindow.isDestroyed()) {
                    dashboardWindow.show();
                    dashboardWindow.focus();
                } else {
                    createDashboardWindow();
                }
            }
        },
        {
            label: '显示/隐藏桌宠',
            click: () => {
                if (!petWindow || petWindow.isDestroyed()) {
                    createPetWindow();
                } else {
                    if (petWindow.isVisible()) {
                        petWindow.hide();
                    } else {
                        petWindow.showInactive();
                    }
                    petWindow.setSkipTaskbar(true); // Ensure it stays hidden from taskbar
                }
            }
        },
        { type: 'separator' },
        {
            label: '开机自启动',
            type: 'checkbox',
            checked: !!settings.autoStart,
            click: (menuItem) => {
                saveSettings({ autoStart: menuItem.checked });
            }
        },
        { type: 'separator' },
        {
            label: '关于 ChronoPet',
            click: () => {
                const { dialog } = require('electron');
                dialog.showMessageBox({
                    type: 'info',
                    title: '关于',
                    message: `ChronoPet v${app.getVersion()}`,
                    detail: 'AI 驱动的时间管理助手',
                    buttons: ['确定']
                });
            }
        },
        {
            label: '退出',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}

function createTray() {
    if (tray) return;
    const image = nativeImage.createFromPath(getCurrentIconPath());
    tray = new Tray(image);
    tray.setToolTip('ChronoPet');
    updateTrayMenu();

    tray.on('click', () => {
        if (dashboardWindow && !dashboardWindow.isDestroyed()) {
            dashboardWindow.show();
            dashboardWindow.focus();
        } else {
            createDashboardWindow();
        }
    });
}

function createPetWindow() {
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.showInactive();
        petWindow.setSkipTaskbar(true);
        return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    const winW = 600;
    const winH = 800;

    petWindow = new BrowserWindow({
        width: winW,
        height: winH,
        x: width - (winW / 2) - 80,
        y: height - (winH / 2) - 100,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        show: false, // Don't show immediately
        skipTaskbar: true,
        hasShadow: false,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    petWindow.setIgnoreMouseEvents(true, { forward: true });

    // Use a higher level for alwaysOnTop to stay above most windows on Windows
    petWindow.setAlwaysOnTop(true, 'screen-saver');

    petWindow.once('ready-to-show', () => {
        petWindow.showInactive();
        petWindow.setSkipTaskbar(true); // Force hide from taskbar
        // Re-assert always on top on show
        petWindow.setAlwaysOnTop(true, 'screen-saver');
    });

    petWindow.on('closed', () => {
        petWindow = null;
    });

    const startUrl = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    petWindow.loadURL(startUrl).catch(e => {
        console.log("加载桌宠窗口失败，3秒后重试...", e);
        setTimeout(() => {
            if (petWindow && !petWindow.isDestroyed()) {
                petWindow.loadURL(startUrl);
            }
        }, 3000);
    });
}

function createInputWindow() {
    if (inputWindow) return inputWindow;

    inputWindow = new BrowserWindow({
        width: 420,
        height: 480,
        show: false,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: false,
        backgroundColor: '#00000001',
        backgroundMaterial: 'acrylic',
        vibrancy: 'under-window',
        icon: iconPath,
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
    inputWindow.setAlwaysOnTop(true, 'screen-saver');

    inputWindow.on('show', () => {
        inputWindow.setAlwaysOnTop(true, 'screen-saver');
    });
    inputWindow.on('moved', () => {
        const pos = inputWindow.getPosition();
        settings.inputWindowPos = { x: pos[0], y: pos[1] };
        saveSettings({});
    });

    inputWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            inputWindow.hide();
        }
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
        icon: getCurrentIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
        }
    });

    const startUrl = isDev
        ? 'http://localhost:5173/#/dashboard'
        : `file://${path.join(__dirname, '../dist/index.html')}#/dashboard`;

    dashboardWindow.loadURL(startUrl);

    dashboardWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            dashboardWindow.hide();
        }
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // If user tries to run a second instance, focus our main window or show pet window
        if (dashboardWindow && !dashboardWindow.isDestroyed()) {
            if (dashboardWindow.isMinimized()) dashboardWindow.restore();
            dashboardWindow.show();
            dashboardWindow.focus();
        } else if (petWindow && !petWindow.isDestroyed()) {
            petWindow.showInactive();
        }
    });

    app.whenReady().then(() => {
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.chronopet.app');
        }
        createTray();
        createPetWindow();
        createInputWindow();
        createDashboardWindow();
        applySettings();
    });
}

app.on('before-quit', () => {
    isQuitting = true;
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
    if (!petWindow || petWindow.isDestroyed()) return;
    const pos = petWindow.getPosition();
    const size = petWindow.getSize();
    const { x, y } = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint({ x, y });
    const workArea = display.workArea;

    let newX = pos[0] + dx;
    let newY = pos[1] + dy;

    // Ball is centered in 600x800 window. Avatar is 72px.
    // Center of window is (300, 400). Avatar radius is 36px.
    const ballCenterX = newX + 300;
    const ballCenterY = newY + 400;
    const ballRadius = 36;

    // Limit: Ball cannot be dragged out of screen by more than half its size.
    // This means ball center must be within screen boundaries.
    if (ballCenterX < workArea.x) newX = workArea.x - 300;
    if (ballCenterX > workArea.x + workArea.width) newX = workArea.x + workArea.width - 300;
    if (ballCenterY < workArea.y) newY = workArea.y - 400;
    if (ballCenterY > workArea.y + workArea.height) newY = workArea.y + workArea.height - 400;

    petWindow.setPosition(Math.round(newX), Math.round(newY));
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

        // Only capture if setting is enabled (default true)
        if (settings.quickRecordScreenshot !== false) {
            try {
                const sources = await desktopCapturer.getSources({
                    types: ['screen'],
                    thumbnailSize: { width: 1920, height: 1080 }
                });

                const primarySource = sources[0];
                if (primarySource) {
                    image = primarySource.thumbnail.toDataURL();
                }
            } catch (e) {
                console.error('Quick record capture failed', e);
            }
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
        const winH = 480; // 更精简的高度

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
            if (dashboardWindow) {
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
    const isDark = nativeTheme.shouldUseDarkColors;
    if (process.platform === 'win32') {
        const { systemPreferences } = require('electron');
        return { accent: systemPreferences.getAccentColor(), isDark };
    }
    return { accent: '0078d4', isDark };
});

nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    let accent = '0078d4';
    if (process.platform === 'win32') {
        const { systemPreferences } = require('electron');
        accent = systemPreferences.getAccentColor();
    }

    const themeData = { isDark, accent };

    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('theme-updated', themeData);
    }
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('theme-updated', themeData);
    }
    if (inputWindow && !inputWindow.isDestroyed()) {
        inputWindow.webContents.send('theme-updated', themeData);
    }
});

ipcMain.on('capture-screen', async (event, options = {}) => {
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
            const date = new Date();
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const targetSubDir = path.join(screenshotsDir, dateStr);

            if (!fs.existsSync(targetSubDir)) {
                fs.mkdirSync(targetSubDir, { recursive: true });
            }

            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            const s = String(date.getSeconds()).padStart(2, '0');
            const timeStr = `${h}${m}${s}`;
            const fileName = `manual_${dateStr.replace(/-/g, '')}_${timeStr}.png`;
            const filePath = path.join(targetSubDir, fileName);

            const buffer = primarySource.thumbnail.toPNG();
            fs.writeFileSync(filePath, buffer);

            const fileUrl = `file://${filePath}`;
            const base64 = primarySource.thumbnail.toDataURL();

            event.reply('screen-captured', {
                success: true,
                image: options.saveToFile ? fileUrl : base64,
                base64: base64,
                path: filePath
            });
        } else {
            event.reply('screen-captured', { success: false, error: 'No screen source found.' });
        }
    } catch (e) {
        console.error(e);
        event.reply('screen-captured', { success: false, error: e.message });
    }
});

// Cleanup screenshots
ipcMain.handle('cleanup-screenshots', async () => {
    try {
        const screenshotsBaseDir = path.join(app.getPath('userData'), 'screenshots');

        // 1. Delete files
        if (fs.existsSync(screenshotsBaseDir)) {
            const rmDir = (dir) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const p = path.join(dir, file);
                    if (fs.statSync(p).isDirectory()) {
                        rmDir(p);
                        try { fs.rmdirSync(p); } catch (e) { }
                    } else {
                        try { fs.unlinkSync(p); } catch (e) { }
                    }
                }
            };
            rmDir(screenshotsBaseDir);
        }

        // 2. IMPORTANT: Update database to remove references, otherwise UI is 'ineffective'
        const records = getRecords();
        const updatedRecords = records.map(r => ({ ...r, screenshots: [] }));
        writeRecords(updatedRecords);

        // 3. Notify windows
        if (dashboardWindow && !dashboardWindow.isDestroyed()) {
            dashboardWindow.webContents.send('records-updated');
        }

        return { success: true };
    } catch (e) {
        console.error('Cleanup failed', e);
        return { success: false, error: e.message };
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

ipcMain.on('save-record', (event, record) => {
    // Check if previous record was "unlimited" (duration 0 or 1)
    let records = getRecords();
    if (records.length > 0) {
        // Find the record with the maximum ID (chronologically latest)
        let last = records.reduce((prev, current) => (prev.id > current.id) ? prev : current);
        // If it was a 'Start Now' task (unlimited), close it ONLY if the new task starts AFTER it
        if ((last.duration === 0 || last.duration === 1) && record.id > last.id) {
            last.duration = Math.max(1, Math.floor((record.id - last.id) / 1000));
            writeRecords(records); // Requires rewrite because we modified a record
        }
    }

    const optimized = ensureRecordOptimized(record);
    appendRecord(optimized); // Fast append for the new one!
    if (inputWindow) inputWindow.hide();

    setTimeout(syncAppIcon, 100);

    // Broadcast update and specific new record
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('records-updated');
        dashboardWindow.webContents.send('new-record-saved', optimized);
    }
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('records-updated');
    }
});

ipcMain.on('update-record', (event, updatedRecord) => {
    let records = getRecords();
    const optimized = ensureRecordOptimized(updatedRecord);
    records = records.map(r => r.id === optimized.id ? optimized : r);
    writeRecords(records);
    setTimeout(syncAppIcon, 100);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('records-updated');
    }
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('records-updated');
    }
});

ipcMain.on('delete-record', (event, recordId) => {
    let records = getRecords();
    records = records.filter(r => r.id !== recordId);
    writeRecords(records);
    syncAppIcon();
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('records-updated');
    }
    if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('records-updated');
    }
});

// 停止当前记录（固定时长为当前已过时长，进入空闲状态）
ipcMain.on('stop-current-record', (event) => {
    let records = getRecords();
    if (records.length > 0) {
        const last = records[records.length - 1];
        const now = Date.now();
        // Heuristic for duration unit
        const durationS = last.id > 1739015400000 || (last.duration || 0) > 3600 ? last.duration || 0 : (last.duration || 0) * 60;
        const currentEnd = last.id + durationS * 1000;

        // Correct duration to current elapsed seconds
        const elapsedSeconds = Math.max(1, Math.round((now - last.id) / 1000));

        if (now < currentEnd || !last.duration) {
            last.duration = elapsedSeconds;
            writeRecords(records); // Requires full rewrite because it modifies existing line
        }

        // Always sync icon and notify windows when stopping, even if time already passed
        setTimeout(syncAppIcon, 100);

        if (dashboardWindow && !dashboardWindow.isDestroyed()) {
            dashboardWindow.webContents.send('records-updated');
        }
        if (petWindow && !petWindow.isDestroyed()) {
            petWindow.webContents.send('records-updated');
        }
    }
});

// 部分更新记录（如 AI 识别后更新任务名和描述）
ipcMain.on('update-record-parts', (event, { id, task, desc, tags }) => {
    let records = getRecords();
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
        const updated = { ...records[index] };
        if (task !== undefined) updated.task = task;
        if (desc !== undefined) updated.desc = desc;
        if (tags !== undefined) updated.tags = tags;
        updated.aiSummary = true;

        records[index] = ensureRecordOptimized(updated);
        writeRecords(records);
        setTimeout(syncAppIcon, 100);
        if (dashboardWindow && !dashboardWindow.isDestroyed()) {
            dashboardWindow.webContents.send('records-updated');
        }
        if (petWindow && !petWindow.isDestroyed()) {
            petWindow.webContents.send('records-updated');
        }
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

ipcMain.on('resize-input-window', (event, { width, height }) => {
    if (inputWindow && !inputWindow.isDestroyed()) {
        // Use setBounds to adjust size while maintaining position
        const bounds = inputWindow.getBounds();
        inputWindow.setBounds({
            x: bounds.x,
            y: bounds.y,
            width: width || bounds.width,
            height: Math.ceil(height)
        });
    }
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

ipcMain.on('show-image-context-menu', (event, imageUrl) => {
    try {
        if (!imageUrl) return;

        // Helper to show menu for a path
        const showMenuForPath = (filePath) => {
            const menu = Menu.buildFromTemplate([
                {
                    label: '打开文件位置',
                    click: () => shell.showItemInFolder(filePath)
                },
                {
                    label: '使用系统默认软件打开',
                    click: () => shell.openPath(filePath)
                },
                { type: 'separator' },
                {
                    label: '复制图片',
                    click: () => {
                        const { clipboard, nativeImage } = require('electron');
                        try {
                            const img = nativeImage.createFromDataURL(imageUrl);
                            clipboard.writeImage(img);
                        } catch (e) {
                            console.error('Failed to copy image to clipboard', e);
                            // Fallback to text if image fails
                            clipboard.writeText(imageUrl);
                        }
                    }
                }
            ]);
            menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
        };

        if (imageUrl.startsWith('data:')) {
            const matches = imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                const tempPath = path.join(os.tmpdir(), `chrono_preview_${Date.now()}.${ext}`);

                fs.writeFile(tempPath, buffer, (err) => {
                    if (!err) showMenuForPath(tempPath);
                });
            }
        } else if (imageUrl.startsWith('chrono-img://')) {
            const fileName = imageUrl.replace('chrono-img://', '');
            const filePath = path.join(screenshotsDir, fileName);
            showMenuForPath(filePath);
        } else if (imageUrl.startsWith('file://')) {
            const filePath = imageUrl.replace('file://', '');
            showMenuForPath(filePath);
        } else if (fs.existsSync(imageUrl)) {
            showMenuForPath(imageUrl);
        }
    } catch (e) {
        console.error('Context menu error:', e);
    }
});

ipcMain.on('open-preview', (event, imageUrl) => {
    try {
        if (!imageUrl) return;
        if (imageUrl.startsWith('data:')) {
            const matches = imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                const tempPath = path.join(os.tmpdir(), `preview_${Date.now()}.${ext}`);
                fs.writeFile(tempPath, buffer, (err) => {
                    if (!err) shell.openPath(tempPath);
                });
            }
        } else {
            let targetPath = imageUrl;
            if (imageUrl.startsWith('chrono-img://')) {
                const fileName = imageUrl.replace('chrono-img://', '');
                targetPath = path.join(screenshotsDir, fileName);
            }
            shell.openPath(targetPath).then(errorMessage => {
                if (errorMessage) shell.openExternal(targetPath);
            });
        }
    } catch (e) {
        console.error('Open preview error:', e);
    }
});


// AI Summary - 仅支持 ModelScope

ipcMain.on('request-ai-summary', async (event, data) => {
    const { text, screenshot, image, apiKey, model } = data;
    const imgData = screenshot || image;
    const useModel = model || 'moonshotai/Kimi-K2.5';

    console.log('[AI] Request Data Keys:', Object.keys(data));
    console.log('[AI] imgData present:', !!imgData, 'Length:', imgData ? imgData.length : 0);

    const useApiKey = apiKey;

    if (!useApiKey) {
        return event.reply('ai-summary-response', {
            ...data,
            success: false,
            error: '缺少 API 密钥，请在面板的设置中配置 ModelScope API 密钥'
        });
    }

    if (!text && !imgData) {
        return event.reply('ai-summary-response', {
            ...data,
            success: false,
            error: '未包含有效的截图或文本内容'
        });
    }

    try {
        let messages = [];
        let actualModel = useModel;

        // 如果有截图，使用视觉模型分析
        if (imgData) {
            // 如果当前模型不是视觉模型，则切换
            const isVisionName = useModel.toLowerCase().includes('vl') || useModel.toLowerCase().includes('vision');
            const isWhitelisted = useModel.includes('Kimi-K2.5'); // User confirmed Kimi is vision

            if (!isVisionName && !isWhitelisted) {
                actualModel = 'Qwen/Qwen3-VL-235B-A22B-Instruct';
                console.log('[AI] 自动切换到视觉模型:', actualModel);
            }

            let base64Image = '';
            if (imgData.startsWith('chrono-img://')) {
                const fileName = imgData.replace('chrono-img://', '');
                const filePath = path.join(screenshotsDir, fileName);
                if (fs.existsSync(filePath)) {
                    base64Image = fs.readFileSync(filePath).toString('base64');
                }
            } else {
                base64Image = imgData.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
            }

            if (!base64Image) throw new Error('无法读取图片数据');
            console.log('[AI] 截图大小:', Math.round(base64Image.length / 1024), 'KB');
            messages = [{
                role: 'user',
                content: [

                    { type: 'text', text: '请以第一人称分析截图内容，不需要包含“我正在”。第一行：仅输出核心活动名称（不超过6个字，无标点，如"编写代码"、"浏览视频"）。第二行：输出一段自然的详情描述（约30-50字，口吻自然，不要包含标签）。' },
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
        event.reply('ai-summary-response', { ...data, success: true, summary, aiSummary: true });
    } catch (error) {
        console.error('[AI] 错误:', error);
        event.reply('ai-summary-response', { ...data, success: false, error: 'AI服务异常: ' + error.message });
    }
});

// 批量总结接口 - 合并请求以节省额度并绕过限制


ipcMain.handle('check-for-updates', async () => {
    try {
        const currentVersion = app.getVersion();
        const fetch = (await import('node-fetch')).default;
        // GitHub API: Get latest release
        const repo = 'HOnnTaka/ChronoPet'; // Based on your workspace info
        const url = `https://api.github.com/repos/${repo}/releases/latest`;

        console.log('[Updater] Checking updates from:', url);
        const response = await fetch(url, {
            headers: { 'User-Agent': 'ChronoPet-App' }
        });

        if (response.status === 404) {
            console.log('[Updater] Latest release not found, trying releases list for pre-releases...');
            // Try getting list of releases (includes pre-releases)
            const releasesUrl = `https://api.github.com/repos/${repo}/releases`;
            const releasesRes = await fetch(releasesUrl, { headers: { 'User-Agent': 'ChronoPet-App' } });

            if (releasesRes.ok) {
                const releases = await releasesRes.json();
                if (Array.isArray(releases) && releases.length > 0) {
                    // Use the first one (most recent, even if pre-release)
                    const data = releases[0];
                    console.log('[Updater] Found pre-release:', data.tag_name);
                    return processReleaseData(data, currentVersion);
                } else {
                    console.log('[Updater] Releases list is empty or not an array:', JSON.stringify(releases));
                }
            } else {
                console.log('[Updater] Failed to fetch releases list:', releasesRes.status);
            }
            return { success: false, error: 'GitHub 仓库未找到任何 Release (包括 Pre-release)', currentVersion };
        }

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status}`);
        }

        const data = await response.json();
        return processReleaseData(data, currentVersion);

    } catch (e) {
        console.error('[Updater] Check failed', e);
        return { success: false, error: e.message, currentVersion: app.getVersion() };
    }
});

function processReleaseData(data, currentVersion) {
    const latestTag = data.tag_name;
    const latestVersion = latestTag.replace(/^v/, '').split('-')[0];

    const v1 = currentVersion.split('.').map(Number);
    const v2 = latestVersion.split('.').map(Number);

    let updateAvailable = false;
    for (let i = 0; i < 3; i++) {
        const a = v1[i] || 0;
        const b = v2[i] || 0;
        if (a < b) { updateAvailable = true; break; }
        if (a > b) { break; }
    }

    // Find .exe asset for Windows in-app download
    let exeUrl = null;
    if (data.assets && Array.isArray(data.assets)) {
        const exeAsset = data.assets.find(a => a.name.endsWith('.exe') && !a.name.includes('blockmap'));
        if (exeAsset) exeUrl = exeAsset.browser_download_url;
    }

    return {
        success: true,
        updateAvailable,
        currentVersion,
        latestVersion: latestTag,
        latestTag,
        releaseNotes: data.body,
        downloadUrl: data.html_url,
        exeUrl
    };
}

ipcMain.on('start-download-update', async (event, { url, fileName }) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const tempPath = path.join(os.tmpdir(), fileName || 'ChronoPet-Update.exe');

        console.log('[Updater] Starting download:', url, 'to', tempPath);

        const response = await fetch(url, {
            headers: { 'User-Agent': 'ChronoPet-App' }
        });

        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

        const totalSize = parseInt(response.headers.get('content-length'), 10);
        let downloadedSize = 0;
        const fileStream = fs.createWriteStream(tempPath);

        response.body.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize) {
                const progress = Math.round((downloadedSize / totalSize) * 100);
                event.reply('download-progress', { progress, status: 'downloading' });
            }
        });

        response.body.pipe(fileStream);

        fileStream.on('finish', () => {
            console.log('[Updater] Download finished');
            event.reply('download-progress', { progress: 100, status: 'completed', path: tempPath });
            // Automatically trigger install after a short delay
            setTimeout(() => {
                shell.openPath(tempPath);
                app.quit();
            }, 1000);
        });

        fileStream.on('error', (err) => {
            throw err;
        });

    } catch (e) {
        console.error('[Updater] Download error:', e);
        event.reply('download-progress', { status: 'error', error: e.message });
    }
});


// 通用 AI 对话接口
ipcMain.on('ai-chat', async (event, data) => {
    const { messages, apiKey, model } = data;
    const useModel = model || 'moonshotai/Kimi-K2.5';

    const useApiKey = apiKey;

    if (!useApiKey) {
        return event.reply('ai-chat-response', {
            success: false,
            error: '缺少 API 密钥，请在设置中配置 ModelScope API 密钥'
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

ipcMain.on('open-external', (event, url) => {
    if (url && typeof url === 'string') {
        shell.openExternal(url);
    }
});

ipcMain.on('open-folder', () => {
    try {
        if (fs.existsSync(screenshotsDir)) {
            shell.openPath(screenshotsDir);
        } else {
            shell.openPath(app.getPath('userData'));
        }
    } catch (e) {
        shell.openPath(app.getPath('userData'));
    }
});

ipcMain.handle('select-audio-file', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg', 'm4a'] }
        ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.on('sync-app-icon', () => {
    syncAppIcon();
});
