export {};

declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: () => Promise<{
        status: 'checking' | 'available' | 'latest' | 'error';
        version?: string;
      }>;
    };
  }
}
