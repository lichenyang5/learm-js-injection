'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// 执行旁边保存的真实脚本副本，而非在测试里复制实现。
const script = fs.readFileSync(path.join(__dirname, '03_实际注入脚本.js'), 'utf8');
function page(url = 'https://miniapp.buruburu.app/index.html', frame = false) {
  const location = new URL(url), window = { location };
  window.top = frame ? {} : window;
  const context = vm.createContext({ window, location });
  return { window, install: () => vm.runInContext(script, context) };
}
test('只改变加桌，保留其他查询的 this 参数 返回值与异常', () => {
  const f = page(); const marker = {}, error = Error('原异常');
  f.window.liff = { marker, isApiAvailable(name, extra) {
    if (name === 'unknown') throw error;
    assert.equal(this.marker, marker); return extra;
  } };
  f.install(); f.install();
  assert.equal(f.window.liff.isApiAvailable('createShortcutOnHomeScreen'), false);
  assert.equal(f.window.liff.isApiAvailable('shareTargetPicker', marker), marker);
  assert.throws(() => f.window.liff.isApiAvailable('unknown'), e => e === error);
});
test('不处理其他来源 路径或 iframe', () => {
  for (const url of ['https://access.line.me/login', 'https://miniapp.buruburu.app.evil/index.html',
    'http://miniapp.buruburu.app/index.html', 'https://miniapp.buruburu.app/other']) {
    const f = page(url), original = () => true; f.window.liff = { isApiAvailable: original };
    f.install(); assert.equal(f.window.liff.isApiAvailable, original);
  }
  const f = page(undefined, true); f.install(); assert.equal(f.window.__atomicBuruShortcutHidden, undefined);
});
test('保留原 setter 并处理迟到发布及方法替换', () => {
  const f = page(); let current, assignments = 0;
  Object.defineProperty(f.window, 'liff', { configurable: true,
    get() { return current; }, set(value) { assignments++; current = value; } });
  f.install(); f.window.liff = { isApiAvailable: () => true };
  assert.equal(assignments, 1);
  assert.equal(f.window.liff.isApiAvailable('createShortcutOnHomeScreen'), false);
  f.window.liff.isApiAvailable = () => '新实现';
  assert.equal(f.window.liff.isApiAvailable('createShortcutOnHomeScreen'), false);
  assert.equal(f.window.liff.isApiAvailable('shareTargetPicker'), '新实现');
});
test('晚注入不会自动修改游戏已经缓存的值', () => {
  const f = page(); f.window.liff = { isApiAvailable: () => true };
  const gameCached = f.window.liff.isApiAvailable('createShortcutOnHomeScreen');
  f.install();
  assert.equal(f.window.liff.isApiAvailable('createShortcutOnHomeScreen'), false);
  assert.equal(gameCached, true);
});
