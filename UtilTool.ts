import { AudioClip, Component, Node, Prefab, SpriteFrame, Vec3 } from 'cc';
import type { AssetManager } from 'cc';
import { AnimUtil, type AnimControl, type LinearChangeParams, type SCurveParams, type TotalMoneyParams } from './AnimUtil';
import { AssetLoader } from './AssetLoader';
import { CryptoUtil } from './CryptoUtil';
import { FormatUtil, type ChipCountMap, type ChipPageResult, type FormatNameOptions, type RewardItem } from './FormatUtil';
import { NodeUtil } from './NodeUtil';
import { Rng } from './Rng';
import { SceneUtil, type ScenePreloadProgress } from './SceneUtil';
import { ScratchUtil, type ScratchHitBox, type ScratchStroke } from './ScratchUtil';
import { TimeUtil } from './TimeUtil';

export { AnimUtil, AssetLoader, CryptoUtil, FormatUtil, NodeUtil, Rng, SceneUtil, ScratchUtil, TimeUtil };
export type {
    AnimControl,
    ChipCountMap,
    ChipPageResult,
    FormatNameOptions,
    LinearChangeParams,
    RewardItem,
    ScenePreloadProgress,
    ScratchHitBox,
    ScratchStroke,
    SCurveParams,
    TotalMoneyParams,
};

/**
 * 聚合入口：静态方法都挂在 UtilTool 上，项目里只 import 这一个也能用。
 * 需要拆着用时直接 import { AssetLoader } / { FormatUtil } 等即可。
 */
export class UtilTool {
    // ---------- 资源 ----------

    /**
     * 从 resources 加载 SpriteFrame（缓存 + addRef）。
     * @param path 资源路径，可带或不带前导 `/`，可带或不带 `/spriteFrame`
     */
    static loadResourcesSpriteFrame(path: string): Promise<SpriteFrame> {
        return AssetLoader.loadResourcesSpriteFrame(path);
    }

    /**
     * 从 resources 加载预制体（缓存 + addRef）。
     * @param path 预制体路径，例如 `prefab/Tips`
     */
    static loadPrefab(path: string): Promise<Prefab> {
        return AssetLoader.loadPrefab(path);
    }

    /**
     * 加载并缓存 Asset Bundle。
     * @param packageUrl Bundle 名称或路径，例如 `libs/music`
     */
    static loadBundle(packageUrl: string): Promise<AssetManager.Bundle> {
        return AssetLoader.loadBundle(packageUrl);
    }

    /**
     * 启动时预加载 Bundle，减少首次播放 / 加载延迟。
     * @param packageUrl Bundle 名称或路径
     */
    static preloadBundle(packageUrl: string): Promise<void> {
        return AssetLoader.preloadBundle(packageUrl);
    }

    /**
     * 从指定 Bundle 加载 SpriteFrame。
     * @param packageUrl Bundle 路径或名称
     * @param name 贴图路径（可带或不带 `/spriteFrame`）
     */
    static assetManagerLoadSpriteFrame(packageUrl: string, name: string): Promise<SpriteFrame> {
        return AssetLoader.assetManagerLoadSpriteFrame(packageUrl, name);
    }

    /**
     * 从指定 Bundle 加载音频。
     * @param packageUrl Bundle 路径或名称
     * @param name 音频在 Bundle 内的路径
     */
    static assetManagerLoadAudioClip(packageUrl: string, name: string): Promise<AudioClip> {
        return AssetLoader.assetManagerLoadAudioClip(packageUrl, name);
    }

    /**
     * 从 Bundle 加载 SpriteFrame 并赋到节点 Sprite（带缓存）。
     * @param packageUrl Bundle 路径或名称
     * @param node 带 Sprite 的节点
     * @param name 贴图路径
     */
    static applySpriteFrame(packageUrl: string, node: Node, name: string): Promise<SpriteFrame | null> {
        return AssetLoader.applySpriteFrame(packageUrl, node, name);
    }

    /**
     * 从 resources 加载 SpriteFrame 并赋到节点 Sprite（带缓存）。
     */
    static applyResourcesSpriteFrame(node: Node, url: string): Promise<SpriteFrame | null> {
        return AssetLoader.applyResourcesSpriteFrame(node, url);
    }

    /** 刮刮乐旧名 */
    static loadSpriteSpriteFrame(node: Node, url: string): Promise<SpriteFrame | null> {
        return AssetLoader.applyResourcesSpriteFrame(node, url);
    }

    /**
     * 切换场景。
     */
    static loadScene(name: string): boolean {
        return SceneUtil.loadScene(name);
    }

    /**
     * 预加载单个场景。loadWhenDone 为 true 时预完立刻切。
     */
    static preloadScene(
        name: string,
        loadWhenDone: boolean = false,
        progressCallback?: (info: ScenePreloadProgress) => void,
    ): Promise<void> {
        return SceneUtil.preloadScene(name, loadWhenDone, progressCallback);
    }

    /**
     * 并行预加载多个场景，进度 0~1。
     */
    static preloadScenesInParallel(sceneNames: string[], progressCallback?: (totalProgress: number) => void): Promise<void> {
        return SceneUtil.preloadScenesInParallel(sceneNames, progressCallback);
    }

    /**
     * 同 applySpriteFrame（Bingo 旧名）。
     */
    static assetManagerLoadSpriteFrameToNode(packageUrl: string, node: Node, name: string): Promise<SpriteFrame | null> {
        return AssetLoader.applySpriteFrame(packageUrl, node, name);
    }

    // ---------- 节点 / 时间 / 触摸 ----------

    /**
     * 按层级名称查找子节点。
     * 例：`getnode(root, ['Panel', 'BtnOk'])`
     * @param rootNode 起始节点
     * @param names 从近到远的子节点名称
     */
    static getnode(rootNode: Node, names: string[]): Node | null {
        return NodeUtil.getnode(rootNode, names);
    }

    /**
     * 等待指定秒数。组件销毁时自动清定时器。
     * @param target 用于 schedule 的组件（一般传 `this`）
     * @param seconds 等待秒数
     */
    static delay(target: Component, seconds: number): Promise<void> {
        return NodeUtil.delay(target, seconds);
    }

    /**
     * 定时器。`repeat` 为额外重复次数（0 表示只跑 1 次）。
     * @param interval 间隔秒数
     * @param repeat 额外重复次数
     * @param delay 首次触发前的延迟秒数
     * @param fun 回调
     * @param that 用于 schedule 的组件
     */
    static setTime(interval: number, repeat: number, delay: number, fun: () => void, that: Component): { cancel: () => void } {
        return NodeUtil.setTime(interval, repeat, delay, fun, that);
    }

    /** 刮刮乐旧名，同 setTime */
    static setTimeNew(interval: number, repeat: number, delay: number, fun: () => void, that: Component): { cancel: () => void } {
        return NodeUtil.setTime(interval, repeat, delay, fun, that);
    }

    /**
     * 绑定 / 解绑触摸按下。
     * @param node 目标节点
     * @param type `true` 绑定，`false` 解绑
     * @param fun 回调
     * @param that 回调 this
     */
    static TouchStartClick(node: Node, type: boolean, fun: Function, that: object): void {
        NodeUtil.TouchStartClick(node, type, fun, that);
    }

    /**
     * 绑定 / 解绑触摸抬起。
     * @param node 目标节点
     * @param type `true` 绑定，`false` 解绑
     * @param fun 回调
     * @param that 回调 this
     */
    static TouchEndClick(node: Node, type: boolean, fun: Function, that: object): void {
        NodeUtil.TouchEndClick(node, type, fun, that);
    }

    /**
     * 绑定 / 解绑触摸移动。
     * @param node 目标节点
     * @param type `true` 绑定，`false` 解绑
     * @param fun 回调
     * @param that 回调 this
     */
    static TouchMoveClick(node: Node, type: boolean, fun: Function, that: object): void {
        NodeUtil.TouchMoveClick(node, type, fun, that);
    }

    /**
     * 绑定 / 解绑触摸取消。
     */
    static TouchCancelClick(node: Node, type: boolean, fun: Function, that: object): void {
        NodeUtil.TouchCancelClick(node, type, fun, that);
    }

    /** 旧拼写兼容 */
    static TouchCancleClick(node: Node, type: boolean, fun: Function, that: object): void {
        NodeUtil.TouchCancelClick(node, type, fun, that);
    }

    /**
     * 判断数组是否包含某值。
     * @param arr 数组
     * @param value 要查找的值
     */
    static arrayContains<T>(arr: T[], value: T): boolean {
        return NodeUtil.arrayContains(arr, value);
    }

    /**
     * 兼容 Array.includes，支持 fromIndex。
     */
    static arrayIncludes<T>(array: T[], searchElement: T, fromIndex?: number): boolean {
        return NodeUtil.arrayIncludes(array, searchElement, fromIndex);
    }

    /**
     * 兼容性 Object.values。
     * @param obj 普通对象
     */
    static objectValues<T extends Record<string, unknown>>(obj: T): Array<T[keyof T]> {
        return NodeUtil.objectValues(obj);
    }

    /**
     * 兼容性 Object.entries。
     * @param obj 普通对象
     */
    static objectEntries<T extends Record<string, unknown>>(obj: T): Array<[string, T[keyof T]]> {
        return NodeUtil.objectEntries(obj);
    }

    // ---------- 随机 ----------

    /**
     * 闭区间整数随机数 `[min, max]`。
     * @param min 下限（含）
     * @param max 上限（含）
     */
    static getRandomInt(min: number, max: number, snapToMin: boolean = false): number {
        return Rng.getRandomInt(min, max, snapToMin);
    }

    /**
     * `[0, num)` 整数随机。
     */
    static NumRandom(num: number): number {
        return Rng.NumRandom(num);
    }

    /**
     * Fisher-Yates 洗牌（实机熵）。不修改原数组。
     * @param array 原数组
     */
    static shuffle<T>(array: readonly T[]): T[] {
        return Rng.shuffle(array);
    }

    /**
     * 模拟 / 统计用洗牌，走 Math.random。
     * @param array 原数组
     */
    static shuffleSim<T>(array: readonly T[]): T[] {
        return Rng.shuffleSim(array);
    }

    /**
     * 原地洗牌（改原数组）。
     */
    static shuffleArray<T>(array: T[]): T[] {
        return Rng.shuffleArray(array);
    }

    // ---------- 金额 / 筹码 ----------

    /**
     * 千分位格式化。默认 `1234567` → `1,234,567`。
     * @param number 金额
     * @param options 小数位、分组等
     */
    static formatName(number: number | string, options?: FormatNameOptions): string {
        return FormatUtil.formatName(number, options);
    }

    /**
     * 把金额写到节点 Label。`Digit=true` 时只返回字符串。
     * @param node 带 Label 的节点
     * @param moneys 金额
     * @param Digit 是否只返回字符串
     */
    static serachMoney(node: Node, moneys: number, Digit: boolean | string = false): string | void {
        return FormatUtil.serachMoney(node, moneys, Digit);
    }

    /**
     * `$1.5k` / `20M` 这类字符串转数字。
     * @param my 金额字符串
     */
    static replaceNum(my: string): number {
        return FormatUtil.replaceNum(my);
    }

    /**
     * 金额缩写：`1050` → `1.05k`。传 `WagerWin` 保留两位小数。
     * @param sum 金额
     * @param name 展示规则名
     */
    static DisplayMoneyFont(sum: number, name?: string): string {
        return FormatUtil.DisplayMoneyFont(sum, name);
    }

    /**
     * 下注区域金额展示（WagerWin 两位小数规则）。
     * @param sum 金额
     */
    static DisplayBetFont(sum: number): string {
        return FormatUtil.DisplayBetFont(sum);
    }

    /**
     * 筹码堆顶合计：只显示整数 k/m。`1500` → `2k`。
     * @param sum 金额
     */
    static formatChipStackAmount(sum: number): string {
        return FormatUtil.formatChipStackAmount(sum);
    }

    /**
     * formatChipStackAmount 的别名。
     * @param num 金额
     */
    static formatNumber(num: number): string {
        return FormatUtil.formatNumber(num);
    }

    /**
     * 截断到指定小数位（不四舍五入）。
     * @param num 原数值
     * @param decimalPlaces 小数位数
     */
    static truncateToDecimalPlaces(num: number, decimalPlaces: number): number {
        return FormatUtil.truncateToDecimalPlaces(num, decimalPlaces);
    }

    /**
     * 根据字符长度给筹码数字选字号。
     * @param num 已格式化的数字字符串
     */
    static fontSizeReplace(num: string): number {
        return FormatUtil.fontSizeReplace(num);
    }

    /**
     * 贪心拆筹码。`2750` → `{ '2k': 1, '500': 1, ... }`。
     * @param num 金额
     * @param chips 筹码名称表，不传用默认
     */
    static distributeChips(num: number, chips?: string[]): ChipCountMap {
        return FormatUtil.distributeChips(num, chips);
    }

    /**
     * 按页（每页 5 面值）拆筹码，给选筹码面板用。
     * @param num 金额
     * @param allChips 面值表，不传用默认
     */
    static breakChips(num: number, allChips?: number[]): ChipPageResult[] {
        return FormatUtil.breakChips(num, allChips);
    }

    /**
     * 自动上注数组求和。`[{ name: '1k', count: 2 }]` → `2000`。
     * @param arr 名称 + 张数
     */
    static sumAutoValue(arr: Array<{ name: string; count: number }>): number {
        return FormatUtil.sumAutoValue(arr);
    }

    /**
     * 英文单词首字母大写。
     */
    static capitalizeFirstLetter(name: string): string {
        return FormatUtil.capitalizeFirstLetter(name);
    }

    /**
     * 数字补成两位：`5` → `05`。
     */
    static padZero(num: number): string {
        return FormatUtil.padZero(num);
    }

    /**
     * 奖励随机拆成两组，保证都不为空。
     */
    static assignRewardsToTwoGroups<T extends RewardItem>(originalRewards: T[]): { group1: T[]; group2: T[] } {
        return FormatUtil.assignRewardsToTwoGroups(originalRewards);
    }

    // ---------- 动画 ----------

    /**
     * 弹窗遮罩拉满当前设计 / 父节点尺寸，避免宽屏漏底。
     * @param yy 遮罩节点
     * @param root 弹窗根节点（可选）
     */
    static fitPopupMask(yy: Node | null, root?: Node | null): void {
        AnimUtil.fitPopupMask(yy, root);
    }

    /**
     * 打开弹窗：遮罩淡入 + 内容从 1.2 缩到 scale。
     * @param node 弹窗根节点
     * @param yy 遮罩
     * @param bg 内容
     * @param scale 结束缩放，默认 1
     */
    static OpenGameUi(node: Node, yy: Node, bg: Node, scale: number = 1): void {
        AnimUtil.OpenGameUi(node, yy, bg, scale);
    }

    /**
     * 关闭弹窗：内容缩小淡出 + 遮罩淡出。
     * @param node 弹窗根节点
     * @param yy 遮罩
     * @param bg 内容
     */
    static CloseGameUi(node: Node, yy: Node, bg: Node): void {
        AnimUtil.CloseGameUi(node, yy, bg);
    }

    /**
     * CloseGameUi 旧名兼容（历史拼写 Colse）。
     * @param node 弹窗根节点
     * @param yy 遮罩
     * @param bg 内容
     */
    static ColseGameUi(node: Node, yy: Node, bg: Node): void {
        AnimUtil.CloseGameUi(node, yy, bg);
    }

    /**
     * 按金额量级返回滚动动画最小步长。
     * @param absValue 当前金额
     */
    static getMoneyAnimStep(absValue: number): number {
        return AnimUtil.getMoneyAnimStep(absValue);
    }

    /**
     * 结算滚动时长：大赢 3 秒，其余 1.5 秒。
     * @param benjin 本金
     * @param wins 赢额
     */
    static getWagerWinAnimDuration(benjin: number, wins: number): number {
        return AnimUtil.getWagerWinAnimDuration(benjin, wins);
    }

    /**
     * S 形曲线从 num 滚到 target。可在 onUpdate 里 cancel。
     * @param params 动画参数
     */
    static sCurveChangeToTarget(params: SCurveParams): AnimControl {
        return AnimUtil.sCurveChangeToTarget(params);
    }

    /**
     * 匀速滚数字。onUpdate 返回 false 可停。
     */
    static linearChangeToTarget(params: LinearChangeParams): AnimControl {
        return AnimUtil.linearChangeToTarget(params);
    }

    /**
     * 改 Animation 循环方式并播放。
     * wrapMode：0 停 / 1 循环 / 2 来回 / 3 倒放停 / 4 倒放循环 / 5 倒放来回
     */
    static updateAnmState(Anmnode: Node, AnmName: string, wrapMode: number, repeatCount?: number, speed?: number): void {
        AnimUtil.updateAnmState(Anmnode, AnmName, wrapMode, repeatCount, speed);
    }

    /**
     * 总货币变化动画：对变化量做动画再映射回总额。
     * @param params 动画参数
     */
    static totalMoneyChangeToTarget(params: TotalMoneyParams): AnimControl {
        return AnimUtil.totalMoneyChangeToTarget(params);
    }

    /**
     * 从 0 缩放打开弹窗（根节点需有 yy / background 子节点）。
     */
    static OpenGameUiFromZero(nd: Node): void {
        AnimUtil.OpenGameUiFromZero(nd);
    }

    /** Bingo 旧名 */
    static shopBallAddOpenUi(nd: Node): void {
        AnimUtil.OpenGameUiFromZero(nd);
    }

    /**
     * 点击回弹（压扁再拉高）。
     */
    static TapBall(target: Node): Promise<void> {
        return AnimUtil.TapBall(target);
    }

    /**
     * 数字放大一拍后写成 num * bl。
     */
    static playTabnum(node: Node, num: number, bl: number): void {
        AnimUtil.playTabnum(node, num, bl);
    }

    /**
     * 打勾 / 图标弹出到指定坐标。
     */
    static dagou(gou: Node, pos: Vec3): void {
        AnimUtil.dagou(gou, pos);
    }

    /**
     * 节点淡入（已显示则忽略）。
     */
    static fadeIn(node: Node, time: number = 0.2): void {
        AnimUtil.fadeIn(node, time);
    }

    /** Bingo 旧名 */
    static FuangKuaiGren(node: Node): void {
        AnimUtil.fadeIn(node);
    }

    /**
     * 透明度淡入再淡出。
     */
    static fadeInOut(node: Node, time: number = 0.5): void {
        AnimUtil.fadeInOut(node, time);
    }

    /**
     * 子节点文字上飘淡出。
     */
    static bianFont_Anm(pt: Node, val: string, name: string): Promise<void> {
        return AnimUtil.bianFont_Anm(pt, val, name);
    }

    // ---------- 时间 / 签到 / 原生 ----------

    /**
     * 距离明天 0 点的 `HH:MM:SS`。
     */
    static isSignedTime(): string {
        return TimeUtil.isSignedTime();
    }

    /**
     * 每日签到：`HH:MM:SS` / `Collect` / `GameReset`。
     */
    static Checkqiandao(lastSignTime: Date): string {
        return TimeUtil.Checkqiandao(lastSignTime);
    }

    /**
     * 浏览器在线检测；原生默认 true。
     */
    static checkNetworkStatus(): boolean {
        return TimeUtil.checkNetworkStatus();
    }

    /**
     * 原生震动（发 zhengdong）。
     */
    static GameQIuZD(state: boolean): void {
        TimeUtil.GameQIuZD(state);
    }

    // ---------- 加解密 ----------

    /**
     * JSON 序列化后 AES 加密。
     */
    static encryptData(data: unknown, key: string, nBits?: 128 | 192 | 256): string {
        return CryptoUtil.encryptData(data, key, nBits);
    }

    /**
     * AES 解密并 JSON.parse。
     */
    static decryptData(cipherText: string, key: string, nBits?: 128 | 192 | 256): unknown {
        return CryptoUtil.decryptData(cipherText, key, nBits);
    }

    // ---------- 刮层 Graphics ----------

    /**
     * Graphics 盖章刮开（圆 + 可选连线）。
     */
    static clears(tar: Node, fanwei: number, wz: Vec3, wz2: Vec3 | null = null): void {
        ScratchUtil.clears(tar, fanwei, wz, wz2);
    }

    /**
     * 检测格子包围盒，给「刮到没有」用。
     */
    static initCheckBox(ck: Node): ScratchHitBox[] {
        return ScratchUtil.initCheckBox(ck);
    }

    /**
     * 自动刮折线路径。
     */
    static jslj(width: number, height: number, pos: Vec3, fanwei: number): ScratchStroke[] {
        return ScratchUtil.jslj(width, height, pos, fanwei);
    }
}
