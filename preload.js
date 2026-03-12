const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("flashcards", {
  loadDefaultDeck: () => ipcRenderer.invoke("deck:load-default"),
  loadDeckFromDialog: () => ipcRenderer.invoke("deck:load-from-dialog"),
});
