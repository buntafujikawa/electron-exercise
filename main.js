const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  // ウィンドウの作成
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,  // 最小ウィンドウサイズ
    minHeight: 600,
    title: 'Twitter Client', // ウィンドウのタイトル
    icon: path.join(__dirname, 'assets', 'icon.png'), // アプリアイコン
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:twitter'
    }
  })

  // カスタムメニューの作成
  const template = [
    {
      label: 'ファイル',
      submenu: [
        { role: 'quit', label: '終了' }
      ]
    },
    {
      label: 'ページ操作',
      submenu: [
        {
          label: 'リロード',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload()
          }
        },
        {
          label: 'ホームに戻る',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.loadURL('https://twitter.com/home')
          }
        }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'togglefullscreen', label: 'フルスクリーン' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { role: 'resetZoom', label: 'ズームリセット' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // ローディング画面を表示
  mainWindow.loadFile('loading.html')

  // ローディング完了後にTwitterを読み込む
  setTimeout(() => {
    mainWindow.loadURL('https://twitter.com')
  }, 1000)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
