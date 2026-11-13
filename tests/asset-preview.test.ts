import { describe, expect, it } from "vitest";
import { editorAssetPreviewUrl, isPdfAssetUrl } from "@/lib/asset-preview";

describe("editorAssetPreviewUrl", () => {
  it("routes uploaded assets through the local editor preview API", () => {
    expect(editorAssetPreviewUrl("/assets/uploads/certificate.png")).toBe("/api/admin/upload/certificate.png");
    expect(editorAssetPreviewUrl("https://dfbro.my.id/RevisionedPortfolio/assets/uploads/certificate%20one.png")).toBe("/api/admin/upload/certificate%20one.png");
  });

  it("routes root-relative public files through the public preview API", () => {
    expect(editorAssetPreviewUrl("/profile.jpg")).toBe("/api/admin/public-preview?path=%2Fprofile.jpg");
  });

  it("leaves external and embedded media untouched", () => {
    expect(editorAssetPreviewUrl("https://images.example/avatar.png")).toBe("https://images.example/avatar.png");
    expect(editorAssetPreviewUrl("//cdn.example/avatar.png")).toBe("//cdn.example/avatar.png");
    expect(editorAssetPreviewUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });
});

describe("isPdfAssetUrl", () => {
  it("recognizes PDF sources but not generated image previews", () => {
    expect(isPdfAssetUrl("/assets/uploads/source.pdf")).toBe(true);
    expect(isPdfAssetUrl("https://dfbro.my.id/assets/uploads/source.PDF?download=1")).toBe(true);
    expect(isPdfAssetUrl("/assets/uploads/preview.png")).toBe(false);
    expect(isPdfAssetUrl(null)).toBe(false);
  });
});
