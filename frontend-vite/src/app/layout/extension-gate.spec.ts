import { isOutdated } from "@/app/layout/ExtensionGate";

describe("extension version gate", () => {
  test("older versions are outdated, equal or newer are not", () => {
    expect(isOutdated("1.0.46", "1.0.47")).toBe(true);
    expect(isOutdated("0.9.99", "1.0.47")).toBe(true);
    expect(isOutdated("1.0.47", "1.0.47")).toBe(false);
    expect(isOutdated("1.0.100", "1.0.47")).toBe(false);
    expect(isOutdated("1.1", "1.0.47")).toBe(false);
    expect(isOutdated("2.0.0", "1.0.47")).toBe(false);
  });
  test("anything unparsable counts as current", () => {
    expect(isOutdated("dev", "1.0.47")).toBe(false);
  });
});
