import { describe, expect, it } from "vitest";
import { requireAdminApi } from "@/lib/admin/guard";

describe("local editor API origin guard", () => {
  it("allows same-origin HTTP requests on the loopback editor host", () => {
    const request = new Request("http://127.0.0.1:4317/api/admin/upload", {
      method: "POST",
      headers: { host: "127.0.0.1:4317", origin: "http://127.0.0.1:4317" },
    });

    expect(requireAdminApi(request)).toBeNull();
  });

  it("rejects a mutation without an Origin header", () => {
    const request = new Request("http://127.0.0.1:4317/api/admin/upload", { method: "POST" });
    expect(requireAdminApi(request)?.status).toBe(403);
  });

  it("rejects a cross-origin request even when the Host is local", () => {
    const request = new Request("http://127.0.0.1:4317/api/admin/upload", {
      method: "POST",
      headers: { host: "127.0.0.1:4317", origin: "https://attacker.example" },
    });

    expect(requireAdminApi(request)?.status).toBe(403);
  });

  it("rejects non-loopback hosts", () => {
    const request = new Request("http://192.168.1.10:4317/api/admin/upload", {
      method: "POST",
      headers: { host: "192.168.1.10:4317", origin: "http://192.168.1.10:4317" },
    });

    expect(requireAdminApi(request)?.status).toBe(403);
  });
});
