import { describe, expect, it } from 'vitest';
import { WEB_BUILD_BASE, WEB_DEV_SERVER_PORT } from './config/WebBuildConfig';

describe('web build config', () => {
  it('uses a relative base for desktop file loading', () => {
    expect(WEB_BUILD_BASE).toBe('./');
  });

  it('uses the documented desktop dev-server port', () => {
    expect(WEB_DEV_SERVER_PORT).toBe(5173);
  });
});