import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
const installedAdb = join(sdk, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
const adb = existsSync(installedAdb) ? installedAdb : "adb";
const serial = process.argv[2];
if (serial && !/^[a-zA-Z0-9._:-]+$/.test(serial)) throw new Error("Invalid device serial");
const target = serial ? ["-s", serial] : ["-d"];
const run = (...args) => execFileSync(adb, [...target, ...args], { maxBuffer: 20 * 1024 * 1024, timeout: 30000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = join(root, "artifacts", "smoke");
mkdirSync(out, { recursive: true });
const decode = (s) => s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&#10;", "\n");
const nodesOf = (xml) => [...xml.matchAll(/<node\b[^>]+>/g)].map(([tag]) => Object.fromEntries(
  [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, decode(v)]),
));
let nodes = [];
async function capture(name) {
  const current = run("shell", "dumpsys", "activity", "activities").toString();
  if (!/(?:mResumedActivity|topResumedActivity|ResumedActivity)[^\n]*app\.capynime\.compose/.test(current)) throw new Error("App is not foreground; stop before touching another app");
  const remote = `/sdcard/capynime-native-${Date.now()}.xml`;
  run("shell", "uiautomator", "dump", remote);
  const xml = run("exec-out", "cat", remote).toString();
  run("shell", "rm", remote);
  if (!xml.includes('package="app.capynime.compose"')) throw new Error("Expected Capynime UI hierarchy");
  nodes = nodesOf(xml);
  const shot = run("exec-out", "screencap", "-p");
  if (!shot.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error("ADB returned an invalid PNG; use current Android SDK platform-tools");
  writeFileSync(join(out, name + ".xml"), xml);
  writeFileSync(join(out, name + ".png"), shot);
  const labels = nodes.flatMap((n) => [n.text, n["content-desc"]]).filter(Boolean);
  writeFileSync(join(out, name + ".json"), JSON.stringify(labels, null, 2));
  console.log(`${name}: ${labels.length} visible labels, screenshot saved`);
  return labels;
}
async function waitForContent(name, predicate) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const labels = await capture(name);
    if (predicate(labels)) return labels;
    await sleep(1200);
  }
  throw new Error(`Expected ${name} page content did not appear within the network loading window`);
}
function tapNode(predicate, last = false) {
  const matches = nodes.filter(predicate);
  const node = last ? matches.at(-1) : matches[0];
  if (!node) throw new Error("Expected UI control is missing");
  const b = [...node.bounds.matchAll(/\d+/g)].map((x) => +x[0]);
  run("shell", "input", "tap", String(Math.round((b[0] + b[2]) / 2)), String(Math.round((b[1] + b[3]) / 2)));
}
run("shell", "cmd", "statusbar", "collapse");
run("shell", "am", "start", "-W", "-n", "app.capynime.compose/.MainActivity");
await sleep(1000);
await capture("entry");
tapNode((n) => n["content-desc"] === "Trang chủ", true);
await sleep(500);
await waitForContent("home", (labels) => labels.includes("Thông tin chi tiết"));
const expected = {
  explore: (labels) => labels.includes("TV/Series"),
  schedule: (labels) => labels.some((s) => s.includes("giờ Việt Nam")),
  search: (labels) => labels.includes("TÌM KIẾM TRỰC TUYẾN"),
  favorites: (labels) => labels.includes("Danh sách của tôi"),
  history: (labels) => labels.some((s) => s === "Đang xem" || s.includes("Chưa có lịch sử")),
  "home-return": (labels) => labels.includes("Thông tin chi tiết"),
};
for (const [label, name] of [["Khám phá", "explore"], ["Lịch chiếu", "schedule"], ["Tìm kiếm", "search"], ["Danh sách", "favorites"], ["Lịch sử", "history"], ["Trang chủ", "home-return"]]) {
  tapNode((n) => n["content-desc"] === label, true);
  await sleep(1000);
  await waitForContent(name, expected[name]);
}
tapNode((n) => n["content-desc"] === "Thông tin chi tiết");
await sleep(1000);
await capture("title");
run("shell", "input", "keyevent", "4");
await sleep(300);
await capture("home-play");
tapNode((n) => n["content-desc"]?.startsWith("Xem "));
await sleep(7000);
const watch = await capture("watch");
if (!watch.some((s) => /Tập|Đang tải video|Xem phim|Xem tiếp|Chọn tập|Thử lại/i.test(s))) throw new Error("Watch screen did not appear");
console.log("Navigation/title/watch smoke completed. Inspect screenshots and live playback separately; no account writes performed.");
