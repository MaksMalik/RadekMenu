import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..');
const indexCss = fs.readFileSync(path.join(projectRoot, 'src', 'index.css'), 'utf-8');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

describe('Global mobile CSS baseline', () => {
  it('contains transparent tap-highlight-color (11.1)', () => {
    expect(indexCss).toContain('-webkit-tap-highlight-color: transparent');
  });

  it('contains overscroll-behavior: none (11.3)', () => {
    expect(indexCss).toContain('overscroll-behavior: none');
  });

  it('contains env(safe-area-inset-*) utilities (11.5)', () => {
    expect(indexCss).toContain('env(safe-area-inset-');
  });
});

describe('Viewport meta tag', () => {
  it('includes viewport-fit=cover (12.1)', () => {
    expect(indexHtml).toContain('viewport-fit=cover');
  });
});
