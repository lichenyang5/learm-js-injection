'use strict';
const assert = require('node:assert/strict');
const api = {
  platform: '教学平台',
  isApiAvailable(name, extra) {
    if (name === 'unknown') throw new Error('原函数不认识这个名字');
    return { platform: this.platform, name, extra };
  }
};
const original = api.isApiAvailable;
api.isApiAvailable = function (name) {
  if (name === 'createShortcutOnHomeScreen') return false;
  return original.apply(this, arguments);
};
console.log('加桌查询：', api.isApiAvailable('createShortcutOnHomeScreen'));
console.log('无关查询：', api.isApiAvailable('shareTargetPicker', '保留这个参数'));
assert.equal(api.isApiAvailable('createShortcutOnHomeScreen'), false);
assert.deepEqual(api.isApiAvailable('shareTargetPicker', 7), {
  platform: '教学平台', name: 'shareTargetPicker', extra: 7
});
assert.throws(() => api.isApiAvailable('unknown'), /原函数不认识/);
console.log('断言通过：this、额外参数、返回值与原异常语义得到保留。');
