const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // アカウント切り替え
  switchAccount: (accountId) => {
    ipcRenderer.send('switch-account', accountId)
  },
  // 新規アカウント追加
  addAccount: () => {
    console.log('Add account button clicked');
    ipcRenderer.send('add-account')
  },
  // タブ情報更新のリスナー
  onUpdateTabs: (callback) => {
    console.log("Received tabs update in header:", tabs);
    ipcRenderer.on('update-tabs', (_event, tabs) => callback(tabs))
  }
})
