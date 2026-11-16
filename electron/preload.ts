import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: (): Promise<{ status: 'checking' | 'available' | 'latest' | 'error'; version?: string }> =>
    ipcRenderer.invoke('check-for-updates'),
});
