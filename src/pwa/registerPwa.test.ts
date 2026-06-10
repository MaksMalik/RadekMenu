import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Mock virtual:pwa-register ---
let capturedOptions: { onNeedRefresh?: () => void } = {};
const mockUpdateSW = vi.fn<(reloadPage?: boolean) => Promise<void>>();

vi.mock('virtual:pwa-register', () => ({
  registerSW: (opts: { onNeedRefresh?: () => void }) => {
    capturedOptions = opts;
    return mockUpdateSW;
  },
}));

describe('PWA Update Manager (registerPwa)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedOptions = {};
    mockUpdateSW.mockReset();
    mockUpdateSW.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('auto-applies update when no pending edits (Req 2.2)', async () => {
    const { registerPwa } = await import('./registerPwa');

    registerPwa({ hasPendingEdits: () => false });

    // Trigger onNeedRefresh
    expect(capturedOptions.onNeedRefresh).toBeDefined();
    capturedOptions.onNeedRefresh!();

    // updateSW(true) should have been called immediately
    expect(mockUpdateSW).toHaveBeenCalledWith(true);
    expect(mockUpdateSW).toHaveBeenCalledTimes(1);
  });

  it('defers update when pending edits exist, then applies after edits clear (Req 2.3)', async () => {
    const { registerPwa } = await import('./registerPwa');

    let hasPending = true;
    registerPwa({ hasPendingEdits: () => hasPending });

    // Trigger onNeedRefresh while edits are pending
    capturedOptions.onNeedRefresh!();

    // updateSW should NOT have been called immediately
    expect(mockUpdateSW).not.toHaveBeenCalledWith(true);

    // Advance timers but edits still pending
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockUpdateSW).not.toHaveBeenCalledWith(true);

    // Now simulate edits clearing
    hasPending = false;
    await vi.advanceTimersByTimeAsync(2000);

    // updateSW(true) should now be called
    expect(mockUpdateSW).toHaveBeenCalledWith(true);
  });

  it('retains current version on activation failure and logs a warning (Req 2.4)', async () => {
    const { registerPwa } = await import('./registerPwa');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Make updateSW reject (activation failure)
    mockUpdateSW.mockRejectedValue(new Error('Activation failed'));

    registerPwa({ hasPendingEdits: () => false });

    capturedOptions.onNeedRefresh!();

    // Let the promise rejection settle
    await vi.advanceTimersByTimeAsync(0);
    // Flush microtasks
    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith('PWA update activation failed');
    warnSpy.mockRestore();
  });
});

describe('Workbox config snapshot (vite.config.ts)', () => {
  it('contains NetworkFirst navigation strategy with networkTimeoutSeconds: 3 (Req 1.3)', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');

    expect(configContent).toContain('networkTimeoutSeconds: 3');
    expect(configContent).toContain("navigateFallback: '/index.html'");
    expect(configContent).toContain("handler: 'NetworkFirst'");
    expect(configContent).toContain("registerType: 'prompt'");
  });
});
