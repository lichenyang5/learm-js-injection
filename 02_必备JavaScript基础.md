# 理解注入脚本所需的 JavaScript 基础

先不用掌握整门 JavaScript。读懂本次脚本需要了解对象、函数、闭包、调用对象和属性访问器。下面的片段可在你自己的空白测试页控制台中逐段运行，变量名按示例保持一致。

## 对象保存属性和方法

```javascript
var demoLiff = {
  name: '教学对象',
  isApiAvailable: function (name) {
    return name === 'shareTargetPicker';
  }
};
console.log(demoLiff.name); // 教学对象
console.log(demoLiff.isApiAvailable('shareTargetPicker')); // true
```

对象就像一个按名字取值的集合。`name` 保存字符串，`isApiAvailable` 保存函数。对象上保存的函数常称为方法。

当前脚本使用 `var`，你还会看到 `let` 和 `const`。`let` 与 `const` 使用块级作用域，`const` 禁止给变量重新赋另一个值，但不自动冻结对象内容。写新代码时可以按项目风格选择；不要仅为换声明方式重排已有兼容脚本。

## 函数也是一个值

```javascript
var original = demoLiff.isApiAvailable;
demoLiff.isApiAvailable = function (name) {
  if (name === 'createShortcutOnHomeScreen') return false;
  return original.apply(this, arguments);
};
```

第一行保存原函数的引用，之后给属性赋的是新函数。调用方仍然写同一个方法名，但实际先进入新函数。这就是函数包装。

修改前后的链路如下：

```text
调用方 → 原函数
调用方 → 包装函数 → 指定情况直接返回
                  → 其他情况调用原函数
```

这个教学例子的原函数对加桌本来就返回 false，所以它主要用于理解包装结构。离线实验室会用原先返回 true 的模拟对象展示按钮变化。

## this 表示这次调用的接收对象

```javascript
var receiverDemo = {
  prefix: '原对象',
  describe: function (name) { return this.prefix + ':' + name; }
};
console.log(receiverDemo.describe('分享')); // 原对象:分享
var saved = receiverDemo.describe;
console.log(saved.apply(receiverDemo, ['分享'])); // 原对象:分享
```

如果把函数单独取出来执行 `saved('分享')`，其 `this` 不再由 `receiverDemo.describe(...)` 这种调用形式提供；严格模式下通常是 `undefined`。不能假定结果与原方法调用一致。

`original.apply(this, arguments)` 把包装函数收到的调用对象和完整参数交回原函数，减少破坏其他调用的机会。`arguments` 是普通函数内的类数组参数对象；箭头函数没有自己的 `this` 和 `arguments`。这是此处使用普通函数的原因。[Function.apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) 定义了这些调用参数。

## 闭包让包装函数记住原函数

```javascript
function makeWrapper(original) {
  return function (name) {
    return original.apply(this, arguments);
  };
}
```

外层函数执行完后，返回的函数仍能引用当时的 `original`。这种函数与其外部变量之间的联系叫闭包。它保存的是变量绑定，不是自动复制整个对象。

因此包装里通常先保存原函数，再替换属性。若在包装函数内部直接再次调用 `demoLiff.isApiAvailable(name)`，取到的可能还是包装自身，造成递归。

## 立即执行函数把变量留在局部

```javascript
(function () {
  var localOnly = 1;
  console.log(localOnly);
})();
```

最后的 `()` 立即调用前面的函数。`localOnly` 不会因为这个声明直接变成 `window.localOnly`。本次完整脚本采用这种结构，避免把 `original`、`descriptor` 等常用名字散落到页面全局。

## getter 和 setter 拦在读取与赋值的位置

```javascript
var box = {};
var stored;
Object.defineProperty(box, 'value', {
  configurable: true,
  enumerable: true,
  get: function () {
    console.log('读取');
    return stored;
  },
  set: function (next) {
    console.log('赋值');
    stored = next;
  }
});
box.value = 3;            // 触发 setter
console.log(box.value);  // 触发 getter，再输出 3
```

getter 与 setter 是属性访问器，不是定时器。只有发生相应读取或赋值时才执行。本次脚本利用它们处理“注入时还没有 window.liff，官方 SDK 稍后才发布”的情况。

属性也可能是保存 `value` 的数据属性。数据属性和访问器属性使用不同的描述字段，不能把两套字段混在同一次定义里。`Object.getOwnPropertyDescriptor` 用来读取原描述，`Object.defineProperty` 用来定义；`configurable` 限制重新定义，数据属性的 `writable` 限制赋值，`enumerable` 控制枚举表现。[属性描述说明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) 是这部分的参考。

## WeakSet 记录哪些函数已经包装

```javascript
var seen = new WeakSet();
var fn = function () {};
seen.add(fn);
console.log(seen.has(fn)); // true
```

本次只向 WeakSet 放函数对象，用对象身份判断是否已经处理，避免一层又一层重复包装。WeakSet 不阻止仅由它引用的对象被回收，也不支持列举其中全部成员。[WeakSet 文档](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) 解释了这种弱引用集合。

## 返回值与异常也属于原行为

不相关调用应尽量原样返回原函数结果。原函数返回 Promise 时，直接 `return original.apply(...)` 会保留该返回对象；额外写成 `async function` 可能改变 Promise 身份。原函数抛异常时，随便 `catch` 后返回 false 也会改变调用契约。

本案例仅对指定名字同步返回 false，其他名字直接转交。安装脚本时遇到不可修改的属性会停止该处修改，不能把“安装未抛异常”当作“所有情况下必定成功隐藏”。

## 本篇练习

运行 [函数包装演示](示例/02_函数包装演示.cjs)。把转交原函数的 `original.apply(this, arguments)` 临时改成 `original(name)`，观察依赖 `this` 的方法为什么出错。修改学习副本即可，不要直接改生产配置。

下一篇：[注入时机与项目链路](03_注入时机与项目链路.md)。
