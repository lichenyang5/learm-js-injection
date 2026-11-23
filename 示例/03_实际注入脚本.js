(function () {
  // 此配置仅挂在ぶるぶるどーぶつ；认证页、其他域名和 iframe 均不改。
  if (window.top !== window || location.origin !== 'https://miniapp.buruburu.app' ||
      (location.pathname !== '/' && location.pathname !== '/index.html') ||
      window.__atomicBuruShortcutHidden) return;
  window.__atomicBuruShortcutHidden = true;
  var wrappers = new WeakSet();
  function patch(liff) {
    if (!liff || typeof liff.isApiAvailable !== 'function' || wrappers.has(liff.isApiAvailable)) return liff;
    var original = liff.isApiAvailable;
    var wrapped = function (name) {
      // 游戏据此设置 canCreateShortcut，隐藏 Canvas 入口及首次加桌引导，不伪造创建成功。
      if (name === 'createShortcutOnHomeScreen') return false;
      return original.apply(this, arguments);
    };
    try {
      liff.isApiAvailable = wrapped;
      wrappers.add(wrapped);
    } catch (_) { /* 不覆盖只读能力接口，不影响游戏继续启动。 */ }
    return liff;
  }
  var descriptor = Object.getOwnPropertyDescriptor(window, 'liff');
  var current = window.liff;
  patch(current);
  // 保留 SDK 已安装的 LIFF getter/setter，兼容官方 SDK 迟到发布或重新赋值。
  if (descriptor && (!descriptor.configurable ||
      ('value' in descriptor ? !descriptor.writable : !descriptor.get || !descriptor.set))) return;
  try {
    Object.defineProperty(window, 'liff', {
      configurable: true,
      enumerable: descriptor ? descriptor.enumerable : true,
      get: function () {
        return patch(descriptor && descriptor.get ? descriptor.get.call(this) : current);
      },
      set: function (value) {
        if (descriptor && descriptor.set) descriptor.set.call(this, value);
        else current = value;
        patch(descriptor && descriptor.get ? descriptor.get.call(this) : current);
      }
    });
  } catch (_) { /* 全局属性不可改时，仅适配已存在的 LIFF 对象。 */ }
})();
