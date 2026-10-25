import { describe, expect, it, vi } from "vitest";
import { analyticsEventsAccess } from "./access.js";

function args(user: { id: string } | null) {
  return { req: { user } } as Parameters<ReturnType<typeof analyticsEventsAccess>["read"]>[0];
}

describe("analyticsEventsAccess", () => {
  it("read is false without req.user and true with a user; create, update, and delete are false", async () => {
    const access = analyticsEventsAccess();

    expect(await access.read(args(null))).toBe(false);
    expect(await access.read(args({ id: "user-1" }))).toBe(true);
    expect(await access.create(args({ id: "user-1" }))).toBe(false);
    expect(await access.update(args({ id: "user-1" }))).toBe(false);
    expect(await access.delete(args({ id: "user-1" }))).toBe(false);
    expect(await access.create(args(null))).toBe(false);
  });

  it("calls a custom read function instead of the signed-in check", async () => {
    const read = vi.fn(() => false);
    const access = analyticsEventsAccess(read);

    expect(await access.read(args({ id: "user-1" }))).toBe(false);
    expect(read).toHaveBeenCalledOnce();
    expect(await access.create(args({ id: "user-1" }))).toBe(false);
  });
});
