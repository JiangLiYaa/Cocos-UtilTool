# Cocos-UtilTool

Cocos Creator 3.x 通用工具脚本。clone / pull 之后把脚本放到项目的 `assets/script/` 下即可调用。

不绑具体玩法、不依赖 `GameConfig`。大厅跳转、牌局、关卡、广告、存档字段这类逻辑请留在各自项目里。

## 怎么用

1. 拉仓库：

```bash
git clone <本仓库地址> Cocos-UtilTool
```

2. 把本仓库的 `.ts` / `.js` 拷到游戏工程，例如 `assets/script/`（可再放进 `util/` 子目录，改 import 路径即可）：

```
YourGame/assets/script/
  AssetLoader.ts
  FormatUtil.ts
  AnimUtil.ts
  NodeUtil.ts
  Rng.ts
  TimeUtil.ts
  CryptoUtil.ts
  SceneUtil.ts
  ScratchUtil.ts
  PrintEffect.ts
  VScrollView.ts
  VScrollViewItem.ts
  UtilTool.ts
  encryptjs.js
  algo.js
```

Cocos 会自动生成 `.meta`，不要把项目里的 `.meta` 回写到本仓库。

3. 脚本里引用：

```ts
import { UtilTool } from './util/UtilTool';

await UtilTool.loadPrefab('prefab/Shop');
label.string = UtilTool.formatName(1234567); // 1,234,567
UtilTool.OpenGameUi(this.panel, this.mask, this.content);
```

只需要某一块时可以分开 import：

```ts
import { AssetLoader } from './util/AssetLoader';
import { FormatUtil } from './util/FormatUtil';
import { PrintEffect } from './util/PrintEffect';
```

`PrintEffect` 是组件：挂到节点上，再调 `typeOutText`。

## 目录

| 文件 | 作用 |
| --- | --- |
| `UtilTool.ts` | 聚合入口，静态方法都从这里转出去 |
| `AssetLoader.ts` | resources / Bundle 加载，带缓存和 `addRef` |
| `FormatUtil.ts` | 千分位、k/m 缩写、筹码拆分、签到奖励拆组 |
| `AnimUtil.ts` | 弹窗开关、金额滚动、回弹 / 淡入 / 上飘字 |
| `NodeUtil.ts` | 找节点、触摸、延时、定时器 |
| `Rng.ts` | 整数随机、Fisher-Yates 洗牌 |
| `TimeUtil.ts` | 签到倒计时、网络、原生震动 |
| `CryptoUtil.ts` | JSON + AES 加解密（encryptjs） |
| `SceneUtil.ts` | 切场景、预加载 |
| `ScratchUtil.ts` | 刮层 Graphics 盖章 / 检测格 / 自动刮路径 |
| `PrintEffect.ts` | 打字机效果（组件） |
| `VScrollView.ts` | 虚拟滚动列表（组件） |
| `VScrollViewItem.ts` | 列表子项点击 / Sorting2D 合批 |

按模块拆文件，方便改、也方便只拷自己要用的。新方法加在对应文件里，再在 `UtilTool.ts` 挂一层即可。

## 常用 API

### 资源 `AssetLoader` / `UtilTool`

```ts
await UtilTool.loadPrefab('prefab/Tips');
await UtilTool.loadResourcesSpriteFrame('icon/gold'); // 可省略 /spriteFrame
await UtilTool.preloadBundle('libs/music');
const clip = await UtilTool.assetManagerLoadAudioClip('libs/music', 'click');
const sf = await UtilTool.assetManagerLoadSpriteFrame('libs/ui', 'btn/ok');
await UtilTool.applySpriteFrame('libs/ui', this.iconNode, 'btn/ok'); // 加载并赋到 Sprite
await UtilTool.applyResourcesSpriteFrame(this.iconNode, 'icon/gold');
UtilTool.loadScene('host');
await UtilTool.preloadScene('game', false, (p) => console.log(p.completedCount, p.totalCount));
```

SpriteFrame 路径可以带或不带前导 `/`、带或不带 `/spriteFrame`。同一资源只会 load 一次，缓存失效（`isValid === false`）会自动重载。

### 节点与时间 `NodeUtil`

```ts
const btn = UtilTool.getnode(this.node, ['Panel', 'BtnOk']);
UtilTool.TouchEndClick(btn, true, this.onOk, this);   // 绑定
UtilTool.TouchEndClick(btn, false, this.onOk, this);  // 解绑
UtilTool.TouchCancelClick(btn, true, this.onCancel, this);
await UtilTool.delay(this, 0.3);
const timer = UtilTool.setTime(1, 4, 0, () => { /* 每秒一次，共 5 次 */ }, this);
timer.cancel();
```

`setTime` 的 `repeat` 与 `Component.schedule` 一致：额外重复次数，`0` 表示只跑 1 次。

### 随机 `Rng`

```ts
UtilTool.getRandomInt(1, 10);          // [min, max]
UtilTool.getRandomInt(100, 9900, true); // 对齐为 100 的倍数
UtilTool.NumRandom(10);                // [0, 10)
const deck = UtilTool.shuffle(cards);  // 实机：混入 crypto / 时间熵
UtilTool.shuffleSim(cards);            // 模拟统计：Math.random，更快、更好复现
```

### 金额与筹码 `FormatUtil`

```ts
UtilTool.formatName(1234567);           // 1,234,567
UtilTool.DisplayMoneyFont(1050);        // 1.05k
UtilTool.DisplayBetFont(1050);          // 两位小数规则（WagerWin）
UtilTool.formatChipStackAmount(1500);   // 2k  堆顶取整
UtilTool.replaceNum('1.5k');            // 1500
UtilTool.distributeChips(2750);         // { '2k': 1, '500': 1, '200': 1, '50': 1 }
UtilTool.breakChips(2750);              // 按页（每页 5 个面值）拆
UtilTool.serachMoney(this.goldLabel.node, 12345);
UtilTool.serachMoney(this.goldLabel.node, 12345, '$'); // 前缀
```

筹码面额表可自行传入；不传则用默认 `1 … 20M`。

### 动画 `AnimUtil`

```ts
UtilTool.OpenGameUi(this.root, this.mask, this.panel);       // scale 默认 1
UtilTool.OpenGameUi(this.root, this.mask, this.panel, ratio); // 有自适应比值时传入
UtilTool.CloseGameUi(this.root, this.mask, this.panel);

const ctrl = UtilTool.totalMoneyChangeToTarget({
    start: 1000,
    delta: 250,
    duration: 1500,
    onUpdate: (v) => { this.gold.string = UtilTool.formatName(v); },
    onComplete: () => { /* 播完 */ },
});
ctrl.cancel(); // 中途停，不走 onComplete

UtilTool.linearChangeToTarget({
    num: 0, target: 100, duration: 800, Integer: true,
    onUpdate: (v) => { this.label.string = `${v}`; },
});
UtilTool.updateAnmState(this.node, 'idle', 1, -1);

await UtilTool.TapBall(this.btn.node);
UtilTool.playTabnum(this.goldNode, 100, 2);
UtilTool.dagou(this.checkIcon, v3(0, 0, 0));
UtilTool.fadeIn(this.hint);
await UtilTool.bianFont_Anm(this.bar, '+20', 'bian');
```

`sCurveChangeToTarget` 是底层：从 `num` 滚到 `target`。`totalMoneyChangeToTarget` 对「变化量」做动画，再映射回总额，大数字不会因为步长太大看不到过程。

### 打字机 `PrintEffect`

挂到任意节点：

```ts
const pe = this.getComponent(PrintEffect);
pe.typeOutText('Hello', this.label, () => {
    // 打完
}, 2, 48, 48);
pe.cancelTyping();
```

### 签到 / 加密 `TimeUtil` `CryptoUtil`

```ts
UtilTool.Checkqiandao(lastDate); // 'Collect' | 'GameReset' | '02:15:09'
UtilTool.isSignedTime();         // 距明天 0 点
UtilTool.encryptData(obj, 'your-key');
UtilTool.decryptData(cipher, 'your-key');
```

### 虚拟列表 `VScrollView`

挂到带 Mask 的视窗节点上，绑定 content，设 itemPrefab。数据刷新：

```ts
import { VirtualScrollView } from './VScrollView';

this.list.renderItemFn = (node, index) => { /* 填这一项 */ };
this.list.setTotalCount(data.length);
```

子项点击走 `onItemClickFn`，不要把关卡 / 商城逻辑写进 `VScrollViewItem`。

### 刮层 `ScratchUtil`

```ts
UtilTool.clears(mask, 40, cur, last);          // 手指刮
const boxes = UtilTool.initCheckBox(this.grid); // 检测格
const path = UtilTool.jslj(w, h, center, 40);   // 自动刮折线
```

## 和业务代码怎么分

本仓库只放「多项目都能抄」的方法。下面这类请写在游戏自己的 `script` 里，不要塞进工具包：

- 进大厅、切场景、评分弹窗
- 牌型、发牌、赔率、自动上注配置
- Bingo 关卡球、卡牌、道具龙骨、IAP 商品表
- 刮刮乐各关赔率表、中奖金额拆分到格子
- 存档字段名、广告、Fire 机型特判
- 依赖某个 Bundle 名、某套图集路径的预热逻辑

项目里可以再包一层，例如 `game/util/GameUtil.ts` 调 `UtilTool`，再写玩法相关方法。

## 自己加方法

1. 通用能力：加到对应模块（加载 → `AssetLoader`，格式化 → `FormatUtil`，……）。
2. 在 `UtilTool.ts` 加一个静态转发，保持 `UtilTool.xxx()` 能调到。
3. 在本 README 的「常用 API」补一行示例。

方法保持 `static`，不要在工具类里存玩法状态。需要挂到节点上的（如打字机）再写成 `@ccclass` 组件。

## 环境

- Cocos Creator 3.x（`from 'cc'`）
- TypeScript
- 目标：拷进 `assets/script/` 就能编过，无 npm 依赖
