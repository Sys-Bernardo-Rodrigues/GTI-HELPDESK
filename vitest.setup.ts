import { beforeAll, vi } from "vitest";

beforeAll(() => {
  // Mock fetch to avoid real network calls in HomePage
  // Resolves with ok: false by default
  if (!globalThis.fetch) {
    globalThis.fetch = vi.fn(async () => ({ ok: false })) as any;
  } else {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as any);
  }

  // Mock window.location.assign to prevent navigation during tests
  // Not required for current tests (we don't trigger Confirmar)
});
import "@testing-library/jest-dom";