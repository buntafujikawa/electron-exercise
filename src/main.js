const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");
const path = require("path");

let mainWindow;
let contentView;
let headerView;

// アカウント管理の状態
const accounts = new Map();
let currentAccount = null;

// アカウントの初期設定（開発用）
function initializeAccounts() {
  accounts.set("account1", {
    id: "account1",
    name: "メインアカウント",
    partition: "persist:twitter-main",
  });
  accounts.set("account2", {
    id: "account2",
    name: "サブアカウント",
    partition: "persist:twitter-sub",
  });
  currentAccount = accounts.get("account1");
}

function updateTabs() {
  const tabs = Array.from(accounts.values()).map((account) => ({
    id: account.id,
    name: account.name,
    active: currentAccount?.id === account.id,
    isLoggedIn: account.isLoggedIn,
  }));

  console.log("Sending tabs update:", tabs);
  headerView.webContents.send("update-tabs", tabs);
}

function createWindow() {
  // メインウィンドウの作成
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hiddenInset",
    icon: path.join(__dirname, "assets", "icon.png"),
  });

  // ヘッダー用のBrowserView
  headerView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // コンテンツ用のBrowserView
  contentView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: currentAccount?.partition || "persist:twitter-default",
    },
  });

  mainWindow.addBrowserView(headerView);
  mainWindow.addBrowserView(contentView);

  // ビューのサイズと位置を設定
  function updateViewBounds() {
    const bounds = mainWindow.getBounds();
    headerView.setBounds({ x: 0, y: 0, width: bounds.width, height: 40 });
    contentView.setBounds({
      x: 0,
      y: 40,
      width: bounds.width,
      height: bounds.height - 40,
    });
  }

  updateViewBounds();
  mainWindow.on("resize", updateViewBounds);

  // ヘッダーとコンテンツを読み込む
  headerView.webContents.loadFile(path.join(__dirname, "header.html"));
  headerView.webContents.openDevTools({ mode: "detach" });
  contentView.webContents.loadURL("https://twitter.com");

  // 初期タブ情報を送信
  headerView.webContents.on("did-finish-load", () => {
    updateTabs();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // devtoolsを開く
  // mainWindow.webContents.on('before-input-event', (event, input) => {
  //   if (input.key === 'F12' || (input.key === 'I' && input.meta && input.alt)) {
  //     mainWindow.webContents.openDevTools()
  //     event.preventDefault()
  //   }
  // })

  // // ヘッダー用のdevtoolsを開く
  // headerView.webContents.on('before-input-event', (event, input) => {
  //   if (input.key === 'F12' || (input.key === 'I' && input.meta && input.alt)) {
  //     headerView.webContents.openDevTools()
  //     event.preventDefault()
  //   }
  // })
}

// IPCハンドラー
ipcMain.on("switch-account", (_event, accountId) => {
  console.log("IPC: switch-account received", accountId);
  const account = accounts.get(accountId);
  if (account && account.id !== currentAccount?.id) {
    currentAccount = account;

    // 既存のcontentViewを削除
    if (contentView) {
      mainWindow.removeBrowserView(contentView);
    }

    // 新しいBrowserViewを作成
    contentView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: account.partition,
      },
    });

    mainWindow.addBrowserView(contentView);

    // ビューのサイズを設定
    const bounds = mainWindow.getBounds();
    contentView.setBounds({
      x: 0,
      y: 40,
      width: bounds.width,
      height: bounds.height - 40,
    });

    // URLを読み込む
    const url = account.isLoggedIn
      ? "https://twitter.com/home"
      : "https://twitter.com/login";
    contentView.webContents.loadURL(url);

    updateTabs();
  }
});

ipcMain.on("add-account", () => {
  console.log("Add account clicked");

  // まず新しいアカウントを追加
  const newAccountId = `account${accounts.size + 1}`;
  console.log("Creating new account with ID:", newAccountId);

  const newAccount = {
    id: newAccountId,
    name: `新規アカウント ${accounts.size + 1}`,
    partition: `persist:twitter-${newAccountId}`,
    isLoggedIn: false, // ログイン状態を管理
  };

  // 新アカウントを追加し、現在のアカウントとして設定
  accounts.set(newAccountId, newAccount);
  currentAccount = newAccount;

  console.log("New account created:", newAccount);
  console.log("Updating tabs...");

  // タブを更新
  updateTabs();

  // 既存のcontentViewを削除し、新しいものを作成
  if (contentView) {
    mainWindow.removeBrowserView(contentView);
  }

  // 新しいアカウント用のBrowserViewを作成
  contentView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: newAccount.partition,
    },
  });

  mainWindow.addBrowserView(contentView);

  // ビューのサイズと位置を設定
  const bounds = mainWindow.getBounds();
  contentView.setBounds({
    x: 0,
    y: 40,
    width: bounds.width,
    height: bounds.height - 40,
  });

  // ログインページを表示
  contentView.webContents.loadURL("https://twitter.com/login");

  // ログイン完了を検知する
  contentView.webContents.on("did-navigate", (event, url) => {
    if (url === "https://twitter.com/home") {
      console.log("Login successful!");
      newAccount.isLoggedIn = true;
      newAccount.name = `ログイン済み ${newAccount.id}`;
      updateTabs();
    }
  });
});

app.whenReady().then(() => {
  console.log("Application is ready");
  initializeAccounts();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
