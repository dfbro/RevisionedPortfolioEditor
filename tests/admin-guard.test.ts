import { describe, expect, it } from "vitest";
import { requireAdminApi, requireAdminReadApi } from "@/lib/admin/guard";

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

  it("allows local browser preview requests without an Origin header", () => {
    const request = new Request("http://127.0.0.1:4317/api/admin/upload/example.png", {
      headers: { host: "127.0.0.1:4317", "sec-fetch-site": "same-origin" },
    });
    expect(requireAdminReadApi(request)).toBeNull();
  });

  it("rejects cross-site asset preview requests", () => {
    const request = new Request("http://127.0.0.1:4317/api/admin/upload/example.png", {
      headers: { host: "127.0.0.1:4317", "sec-fetch-site": "cross-site" },
    });
    expect(requireAdminReadApi(request)?.status).toBe(403);
  });

  it("rejects preview requests without same-origin browser metadata", () => {
    const request = new Request("http://127.0.0.1:4317/api/admin/upload/example.png", {
      headers: { host: "127.0.0.1:4317" },
    });
    expect(requireAdminReadApi(request)?.status).toBe(403);
  });
});
