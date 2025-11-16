import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import https from 'node:https'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow() {
  win = new BrowserWindow({
    width: 360,
    height: 420,
    minWidth: 300,
    minHeight: 300,
    maxWidth: 800,
    maxHeight: 1000,
    alwaysOnTop: true,
    resizable: true,
    frame: false,          // frameless for widget feel
    titleBarStyle: 'hiddenInset',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Handle window close - hide instead of quit
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })
}

function createTray() {
  // Create a simple tray icon - Electron Tray doesn't support SVG
  // Create a minimal 16x16 pixel image for the tray
  // Using a simple base64 encoded 1x1 transparent PNG as fallback
  // On macOS, this will show as a small dot in the menu bar
  let trayIcon: Electron.NativeImage
  
  try {
    // Try to create a simple icon from a data URL (1x1 transparent PNG)
    // This is a minimal valid PNG that will work as a placeholder
    const emptyIconData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    trayIcon = nativeImage.createFromDataURL(`data:image/png;base64,${emptyIconData}`)
    
    // Resize to 16x16 for tray (macOS standard size)
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
  } catch (error) {
    console.warn('Could not create tray icon, using empty fallback:', error)
    // Last resort: use empty icon
    trayIcon = nativeImage.createEmpty()
  }
  
  tray = new Tray(trayIcon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Widget',
      click: () => {
        if (win) {
          win.show()
        } else {
          createWindow()
        }
      },
    },
    {
      label: 'Hide Widget',
      click: () => {
        win?.hide()
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  
  tray.setToolTip('TakeBridge Widget')
  tray.setContextMenu(contextMenu)
  
  // Toggle window visibility on tray icon click
  tray.on('click', () => {
    if (win) {
      if (win.isVisible()) {
        win.hide()
      } else {
        win.show()
      }
    } else {
      createWindow()
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Don't quit - keep the app running in the tray
  // The user can quit from the tray menu
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else if (win) {
    win.show()
  }
})

// Handle app quit
app.on('before-quit', () => {
  isQuitting = true
})

// IPC handlers
ipcMain.handle('run-task', async (_event, payload: { task: string; baseUrl: string; userId: string }) => {
  const { task, baseUrl, userId } = payload
  console.log('Got task from widget:', task)
  console.log('Using orchestrator URL:', baseUrl)
  console.log('Using user ID:', userId)
  
  const body: any = {
    task: task,
    enable_code_execution: false,
    // Optionally attach tool_constraints, worker overrides, etc.
  }
  
  // Only include controller if you have a running controller service
  // For now, omit it to see if orchestrator can work without it
  // If your orchestrator requires a controller, you'll need to:
  // 1. Start the controller service, or
  // 2. Provide proper controller config with authentication
  // body.controller = {
  //   base_url: "http://127.0.0.1:5000",
  //   // Add any required auth headers/credentials here
  // }

  try {
    // Use dynamic import for node-fetch since it's CommonJS
    const fetch = (await import('node-fetch')).default
    
    // Create HTTPS agent that accepts self-signed certificates for local development
    // Only use this for HTTPS URLs
    const httpsAgent = baseUrl.startsWith('https://')
      ? new https.Agent({
          rejectUnauthorized: false, // Allow self-signed certificates for localhost
        })
      : undefined
    
    console.log('Sending request to orchestrator:', JSON.stringify(body, null, 2))
    
    const res = await fetch(`${baseUrl}/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
      agent: httpsAgent, // Use custom agent for HTTPS with self-signed certs
    })

    if (!res.ok) {
      const text = await res.text()
      const errorMessage = `HTTP ${res.status}: ${text}`
      console.error('Orchestrator error:', errorMessage)
      
      // Provide more helpful error messages
      if (res.status === 500 && text.includes('Controller')) {
        throw new Error(
          'Controller service error. The orchestrator is trying to connect to a VM controller.\n' +
          'Options:\n' +
          '1. Start your controller service on http://127.0.0.1:5000\n' +
          '2. Or configure the orchestrator to work without a controller\n' +
          `Details: ${text}`
        )
      }
      
      throw new Error(errorMessage)
    }

    const json = await res.json()
    return json // goes back to renderer as lastResult
  } catch (err: any) {
    console.error('run-task error:', err)
    throw new Error(err?.message || 'Failed to call orchestrator')
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
})
