import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { md5 } from "@/core/source/md5";

test("md5 matches node:crypto, including multi-block and UTF-8 input", () => {
  for (const text of ["", "abc", "mật khẩu 123", "x".repeat(55), "y".repeat(200)])
    expect(md5(text)).toBe(createHash("md5").update(text).digest("hex"));
});
