// Stub for virtual:pwa-register — overridden by vi.mock in tests
export function registerSW(_opts?: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}
