import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the real tokens out of globals.css, so changing a color there re-runs these checks.
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Token --${name} not found in globals.css`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// [text token, background token, ratio claimed in brand.md, minimum we accept]
// Text pairs must reach 4.5 (WCAG AA). The decorative dye-line is checked separately below.
const pairs: [string, string, number, number][] = [
  ["ink", "ground", 14.4, 4.5],
  ["ink", "surface", 16.5, 4.5],
  ["ink-soft", "ground", 6.6, 4.5],
  ["ink-soft", "surface", 7.6, 4.5],
  ["surface", "indigo", 9.6, 4.5],
  ["ink", "tape", 11.6, 4.5],
  ["ink", "tape-tint", 14.3, 4.5],
  ["paid", "surface", 6.5, 4.5],
  ["paid", "paid-tint", 5.4, 4.5],
  ["error", "surface", 6.0, 4.5],
  ["error", "error-tint", 4.7, 4.5],
];

describe("brand.md contrast pairs", () => {
  it.each(pairs)("%s on %s is at least %d:1 as documented", (fg, bg, claimed, minimum) => {
    const ratio = contrast(token(fg), token(bg));
    expect(ratio).toBeGreaterThanOrEqual(minimum);
    // brand.md rounds to one decimal; allow a small gap so a rounding choice is not a failure.
    expect(Math.abs(ratio - claimed)).toBeLessThan(0.6);
  });

  it("keeps the dye-line decorative (too faint to be the only edge of an input)", () => {
    expect(contrast(token("dye-line"), token("ground"))).toBeLessThan(3);
    // Input borders use ink-soft instead, which does clear the 3:1 needed for UI edges.
    expect(contrast(token("ink-soft"), token("surface"))).toBeGreaterThanOrEqual(3);
  });
});
