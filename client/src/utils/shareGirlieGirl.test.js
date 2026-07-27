import { describe, expect, it, vi } from "vitest";

import {
  SHARE_TEXT,
  SHARE_TITLE,
  shareGirlieGirl,
} from "./shareGirlieGirl.js";

const locationImpl = { origin: "https://girlie.example" };

describe("shareGirlieGirl", () => {
  it("uses the Web Share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const clipboard = { writeText: vi.fn() };

    await expect(
      shareGirlieGirl({
        navigatorImpl: { share, clipboard },
        locationImpl,
      }),
    ).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: SHARE_TITLE,
      text: SHARE_TEXT,
      url: locationImpl.origin,
    });
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copies the current origin when Web Share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(
      shareGirlieGirl({
        navigatorImpl: { clipboard: { writeText } },
        locationImpl,
      }),
    ).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(locationImpl.origin);
  });

  it("falls back safely when sharing fails", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(
      shareGirlieGirl({
        navigatorImpl: {
          share: vi.fn().mockRejectedValue(new Error("share failed")),
          clipboard: { writeText },
        },
        locationImpl,
      }),
    ).resolves.toBe("copied");
  });

  it("does not turn a cancelled native share into an error", async () => {
    const error = new DOMException("Cancelled", "AbortError");

    await expect(
      shareGirlieGirl({
        navigatorImpl: { share: vi.fn().mockRejectedValue(error) },
        locationImpl,
      }),
    ).resolves.toBe("cancelled");
  });

  it("returns unavailable instead of throwing when every method fails", async () => {
    await expect(
      shareGirlieGirl({
        navigatorImpl: {
          clipboard: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) },
        },
        locationImpl,
      }),
    ).resolves.toBe("unavailable");
  });
});
