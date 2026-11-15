export const APP_STATE_CHANGED_EVENT = 'si-ujian-app-state-changed';

export function notifyAppStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(APP_STATE_CHANGED_EVENT));
  }
}
