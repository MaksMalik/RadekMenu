/// <reference types="vite-plugin-pwa/vanillajs" />
import { registerSW } from 'virtual:pwa-register';

export interface RegisterPwaOptions {
  hasPendingEdits: () => boolean;
}

const RECHECK_INTERVAL_MS = 2000;

export function registerPwa(opts: RegisterPwaOptions): void {
  let recheckTimer: ReturnType<typeof setInterval> | null = null;

  const applyUpdate = (updateFn: (reloadPage?: boolean) => Promise<void>): void => {
    updateFn(true).catch(() => {
      console.warn('PWA update activation failed');
    });
  };

  const startRecheckInterval = (updateFn: (reloadPage?: boolean) => Promise<void>): void => {
    if (recheckTimer !== null) return;
    recheckTimer = setInterval(() => {
      if (!opts.hasPendingEdits()) {
        if (recheckTimer !== null) {
          clearInterval(recheckTimer);
          recheckTimer = null;
        }
        applyUpdate(updateFn);
      }
    }, RECHECK_INTERVAL_MS);
  };

  const updateSW = registerSW({
    onNeedRefresh() {
      if (!opts.hasPendingEdits()) {
        applyUpdate(updateSW);
      } else {
        startRecheckInterval(updateSW);
      }
    },
  });
}
