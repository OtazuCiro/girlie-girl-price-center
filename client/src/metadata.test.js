import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const html = await readFile(resolve(process.cwd(), "index.html"), "utf8");

describe("sharing metadata", () => {
  it("contains the public title, description and Open Graph image", () => {
    expect(html).toContain("<title>Girlie Girl Price Central</title>");
    expect(html).toContain(
      'content="Que complementes tu preciosura con los mejores precios 💗"',
    );
    expect(html).toContain(
      '<meta property="og:title" content="Girlie Girl Price Central" />',
    );
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain(
      '<meta property="og:image" content="/social-preview.png" />',
    );
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image" />',
    );
  });
});
