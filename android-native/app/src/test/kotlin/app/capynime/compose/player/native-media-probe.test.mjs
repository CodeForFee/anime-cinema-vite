import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const sourcePath = new URL('../../../../../../main/kotlin/app/capynime/compose/player/NativeMediaProbe.kt', import.meta.url);
const source = readFileSync(fileURLToPath(sourcePath), 'utf8');
const script = source.match(/val script = """\r?\n([\s\S]*?)\r?\n\s*"""\.trimIndent\(\)/)?.[1];
assert.ok(script, 'Kotlin document-start probe must be present');

function page(item, { top = false, available = true } = {}) {
  const messages = [], intervals = [], cleared = [];
  const window = {
    parent: { postMessage: value => messages.push(value) },
    jwplayer: available ? () => ({ getPlaylistItem: () => item }) : undefined,
    addEventListener() {},
  };
  window.top = top ? window : {};
  vm.runInNewContext(script, {
    window, URL,
    location: { href: 'https://player.example/embed/42#animevsub-vsub_extra', hash: '#animevsub-vsub_extra' },
    setInterval: fn => { intervals.push(fn); return intervals.length; },
    clearInterval: id => cleared.push(id),
  });
  return { messages, intervals, cleared };
}

test('offers an opaque HTTPS endpoint only when the public player declares HLS', () => {
  const p = page({ sources: [{ file: 'https://media.example/playlist?token=example', type: 'hls' }] });
  assert.equal(p.messages.length, 1);
  assert.equal(p.messages[0].type, 'native-media');
  assert.equal(p.messages[0].mediaType, 'hls');
  assert.equal(p.messages[0].frameUrl, 'https://player.example/embed/42#animevsub-vsub_extra');
  p.intervals[0]();
  assert.equal(p.messages.length, 1);
});

test('unknown opaque files and browser blob URLs stay with the source player', () => {
  assert.equal(page({ file: 'https://media.example/opaque' }).messages.length, 0);
  assert.equal(page({ file: 'blob:https://player.example/video', type: 'hls' }).messages.length, 0);
});

test('rejects DRM metadata on playlist and individual source', () => {
  assert.equal(page({ file: 'https://media.example/a.m3u8', drm: { widevine: {} } }).messages.length, 0);
  assert.equal(page({ sources: [{ file: 'https://media.example/a.m3u8', drm: { widevine: {} } }] }).messages.length, 0);
});

test('resolves normal relative manifest URLs against the actual frame', () => {
  const p = page({ sources: [{ file: '/media/master.m3u8' }] });
  assert.equal(p.messages.length, 1);
  assert.equal(p.messages[0].url, 'https://player.example/media/master.m3u8');
});

test('public MP4 sources use the progressive media path', () => {
  assert.equal(page({ file: 'https://media.example/video', type: 'video/mp4' }).messages[0].mediaType, 'mp4');
});

test('never probes the top document and stops bounded polling when unavailable', () => {
  assert.equal(page({ file: 'https://media.example/a.m3u8' }, { top: true }).intervals.length, 0);
  const p = page({}, { available: false });
  for (let i = 0; i < 121; i++) p.intervals[0]();
  assert.equal(p.messages.length, 0);
  assert.ok(p.cleared.length > 0);
});

test('unsafe schemes and embedded credentials are never offered', () => {
  assert.equal(page({ file: 'javascript:alert(1)', type: 'hls' }).messages.length, 0);
  assert.equal(page({ file: 'https://user:secret@media.example/video.m3u8' }).messages.length, 0);
});
