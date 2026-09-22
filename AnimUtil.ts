import { Animation, AnimationClip, Label, Node, tween, Tween, UIOpacity, UITransform, v3, Vec3, view, Widget } from 'cc';
import { FormatUtil } from './FormatUtil';

/** 动画控制句柄，调用 `cancel()` 可中途停止（不触发 onComplete） */
export interface AnimControl {
    /** 取消后续帧，已触发的 onUpdate 不会回滚 */
    cancel: () => void;
}

/** S 曲线数值动画参数 */
export interface SCurveParams {
    /** 起始值 */
    num: number;
    /** 目标值，默认 0 */
    target?: number;
    /** 持续时间（毫秒），默认 2000 */
    duration?: number;
    /** 是否取整显示，默认 false */
    Integer?: boolean;
    /** 回调节流帧率，默认 30 */
    fps?: number;
    /** 两次回调之间的最小变化量，默认 0 */
    minStep?: number;
    /** true 时不做自适应步长量化，平滑滚到目标 */
    noStep?: boolean;
    /** 计算步长时参考的数值；可传固定值或按当前值计算的函数 */
    stepReference?: number | ((currentValue: number) => number);
    /** 每帧（节流后）回调；第二个参数可 `control.cancel()` */
    onUpdate?: (currentValue: number, control: AnimControl) => void;
    /** 自然播完时回调；中途 cancel 不会触发 */
    onComplete?: (finalValue?: number) => void;
}

/** 总金额变化动画参数 */
export interface TotalMoneyParams {
    /** 变化前的总额 */
    start: number;
    /** 变化量（可负），默认 0 */
    delta?: number;
    /** 持续时间（毫秒），默认 2000 */
    duration?: number;
    /** 是否取整，默认 true */
    Integer?: boolean;
    /** 回调节流帧率，默认 60 */
    fps?: number;
    /** 最小步长，默认 0（仍会按金额量级自适应） */
    minStep?: number;
    /** true 时对总额直接平滑滚动，不做变化量映射 */
    smooth?: boolean;
    /** 每帧回调当前总额 */
    onUpdate?: (currentValue: number, control: AnimControl) => void;
    /** 播完回调，参数为最终总额 */
    onComplete?: (finalValue?: number) => void;
}

/** 匀速数值动画参数 */
export interface LinearChangeParams {
    /** 起始值 */
    num: number;
    /** 目标值，默认 0 */
    target?: number;
    /** 持续时间（毫秒），默认 2000 */
    duration?: number;
    /** 是否取整，默认 false */
    Integer?: boolean;
    /** 每帧回调；返回 `false` 会停掉后续帧（不触发 onComplete） */
    onUpdate?: (currentValue: number, control: AnimControl) => void | boolean;
    /** 自然播完回调 */
    onComplete?: (finalValue?: number) => void;
}

/**
 * 弹窗开关动画、金额 S 曲线滚动。
 */
export class AnimUtil {
    /**
     * 把弹窗遮罩拉满当前设计分辨率 / 父节点尺寸，避免宽屏两侧漏底。
     * 会同步设置 Widget 四边贴齐。
     * @param yy 遮罩节点
     * @param root 弹窗根节点（可选，有则一并改尺寸）
     */
    static fitPopupMask(yy: Node | null, root?: Node | null): void {
        if (!yy?.isValid) {
            return;
        }
        const design = view.getDesignResolutionSize();
        let w = design.width || 1920;
        let h = design.height || 1080;
        const parent = root?.parent ?? yy.parent;
        const parentUI = parent?.getComponent(UITransform);
        if (parentUI) {
            w = Math.max(w, parentUI.width);
            h = Math.max(h, parentUI.height);
        }
        const rootUI = root?.getComponent(UITransform);
        if (rootUI) {
            rootUI.setContentSize(w, h);
        }
        const yyUI = yy.getComponent(UITransform);
        if (yyUI) {
            yyUI.setContentSize(w, h);
        }
        yy.setPosition(0, 0, yy.position.z);
        const widget = yy.getComponent(Widget);
        if (widget) {
            widget.isAlignTop = true;
            widget.isAlignBottom = true;
            widget.isAlignLeft = true;
            widget.isAlignRight = true;
            widget.top = 0;
            widget.bottom = 0;
            widget.left = 0;
            widget.right = 0;
            widget.enabled = true;
            widget.updateAlignment();
        }
    }

    /**
     * 打开弹窗：遮罩淡入 + 内容从 1.2 缩放到目标 scale。
     * @param node 弹窗根节点（会提到最上层并设为 active）
     * @param yy 遮罩节点
     * @param bg 内容节点
     * @param scale 结束缩放，默认 1；有自适应比值时可传入 designRealRatio
     */
    static OpenGameUi(node: Node, yy: Node, bg: Node, scale: number = 1): void {
        if (node?.parent?.isValid) {
            node.setSiblingIndex(node.parent.children.length - 1);
        }
        AnimUtil.fitPopupMask(yy, node);
        const yyOp = yy.getComponent(UIOpacity) ?? yy.addComponent(UIOpacity);
        const bgOp = bg.getComponent(UIOpacity) ?? bg.addComponent(UIOpacity);
        Tween.stopAllByTarget(yyOp);
        Tween.stopAllByTarget(bg);
        Tween.stopAllByTarget(bgOp);
        yyOp.opacity = 0;
        bg.setScale(1.2, 1.2);
        bgOp.opacity = 0;
        node.active = true;
        bg.active = true;
        yy.active = true;
        tween(yyOp)
            .to(0.2, { opacity: 166 })
            .call(() => {
                tween(bgOp).to(0.1, { opacity: 255 }).start();
                tween(bg).to(0.1, { scale: v3(scale, scale, 1) }).start();
            })
            .start();
    }

    /**
     * 关闭弹窗：内容缩小淡出 + 遮罩淡出，结束后把根节点 active=false。
     * @param node 弹窗根节点
     * @param yy 遮罩节点
     * @param bg 内容节点
     */
    static CloseGameUi(node: Node, yy: Node, bg: Node): void {
        const yyOp = yy.getComponent(UIOpacity);
        const bgOp = bg.getComponent(UIOpacity);
        if (yyOp) {
            Tween.stopAllByTarget(yyOp);
        }
        Tween.stopAllByTarget(bg);
        if (bgOp) {
            Tween.stopAllByTarget(bgOp);
            tween(bgOp).to(0.08, { opacity: 0 }).start();
        }
        tween(bg).to(0.08, { scale: v3(1.2, 1.2, 1.2) }).start();
        if (!yyOp) {
            node.active = false;
            return;
        }
        tween(yyOp)
            .to(0.12, { opacity: 0 })
            .call(() => {
                node.active = false;
            })
            .start();
    }

    /**
     * 按金额量级返回动画最小步长，避免大额逐 1 爬行。
     * 例如 10000 以上步长为 1000。
     * @param absValue 当前金额（会取绝对值）
     * @returns 建议步长
     */
    static getMoneyAnimStep(absValue: number): number {
        const v = Math.abs(absValue);
        if (v < 100) return 1;
        if (v < 1000) return 10;
        if (v < 10000) return 100;
        if (v < 100000) return 1000;
        if (v < 1000000) return 10000;
        return 10000;
    }

    /**
     * 结算滚动时长：赢额 ≥ 本金 10 倍时 3 秒，其余 1.5 秒。
     * @param benjin 本金 / 总下注
     * @param wins 赢额
     * @returns 毫秒
     */
    static getWagerWinAnimDuration(benjin: number, wins: number): number {
        if (wins >= benjin * 10) {
            return 3000;
        }
        return 1500;
    }

    /**
     * S 形曲线变化到目标值（慢-快-慢）。
     * `onUpdate` 里可调用 `control.cancel()` 中途停止（不触发 onComplete）。
     * @param params 见 {@link SCurveParams}
     * @returns 控制对象 `{ cancel }`
     */
    static sCurveChangeToTarget({
        num,
        target = 0,
        duration = 2000,
        Integer = false,
        fps = 30,
        minStep = 0,
        noStep = false,
        stepReference,
        onUpdate,
        onComplete,
    }: SCurveParams): AnimControl {
        const startValue = num;
        let cancelled = false;
        const control: AnimControl = {
            cancel: () => {
                cancelled = true;
            },
        };

        if (typeof onUpdate === 'function') {
            try {
                onUpdate(startValue, control);
            } catch {
                /* ignore */
            }
        }

        if (startValue === target) {
            if (!cancelled && typeof onComplete === 'function') {
                onComplete(target);
            }
            return control;
        }

        const startTime = Date.now();
        const frameInterval = Math.max(1, Math.floor(1000 / Math.max(1, fps)));
        const minDelta = Math.max(0, Number(minStep) || 0);
        let lastFrameTime = 0;
        let lastReportedValue = startValue;
        const delta = target - startValue;

        /** 按当前数值量级给一个带随机抖动的步长 */
        function getAdaptiveStepByValue(v: number): number {
            const absV = Math.abs(v);
            if (absV <= 20) return 0;
            if (absV <= 100) return 1 + Math.random() * 3;
            if (absV < 1000) return 5 + Math.random() * 5;
            const baseStep = Math.pow(10, Math.max(0, Math.floor(Math.log10(absV)) - 2));
            return baseStep * (4 + Math.random() * 2);
        }

        /** 解析步长参考值：函数 / 固定值 / 当前值 */
        function resolveStepReference(currentValue: number): number {
            if (typeof stepReference === 'function') {
                return stepReference(currentValue);
            }
            if (stepReference != null) {
                return stepReference;
            }
            return currentValue;
        }

        /** S 形缓动：0→1 慢-快-慢 */
        function sEase(t: number): number {
            return 0.5 - Math.cos(t * Math.PI) / 2;
        }

        const animate = () => {
            if (cancelled) {
                return;
            }
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = sEase(progress);
            let dynamicStep = minDelta;

            let currentValue: number;
            if (Integer) {
                currentValue = Math.round(startValue + delta * easedProgress);
            } else {
                currentValue = parseFloat((startValue + delta * easedProgress).toFixed(2));
            }
            if (progress === 1) {
                currentValue = target;
            }

            if (Integer && progress < 1 && !noStep) {
                const refValue = resolveStepReference(currentValue);
                const adaptiveStep = Math.max(
                    getAdaptiveStepByValue(refValue),
                    AnimUtil.getMoneyAnimStep(refValue),
                    minDelta,
                );
                dynamicStep = Math.max(0, adaptiveStep);
                if (dynamicStep > 0) {
                    if (delta >= 0) {
                        currentValue = Math.floor(currentValue / dynamicStep) * dynamicStep;
                    } else {
                        currentValue = Math.ceil(currentValue / dynamicStep) * dynamicStep;
                    }
                }
                currentValue = Math.round(currentValue);
            }

            const isFirstUpdate = lastFrameTime === 0;
            const shouldThrottle = !isFirstUpdate && progress < 1 && (now - lastFrameTime) < frameInterval;
            const effectiveMinDelta = Integer ? Math.max(minDelta, dynamicStep > 0 ? dynamicStep * 1.2 : 0) : minDelta;
            const shouldSkipByStep = progress < 1 && effectiveMinDelta > 0 && Math.abs(currentValue - lastReportedValue) < effectiveMinDelta;

            if (!shouldThrottle && !shouldSkipByStep && typeof onUpdate === 'function') {
                try {
                    onUpdate(currentValue, control);
                } catch {
                    /* ignore */
                }
                lastFrameTime = now;
                lastReportedValue = currentValue;
            }

            if (cancelled) {
                return;
            }
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (typeof onComplete === 'function') {
                onComplete(target);
            }
        };
        animate();
        return control;
    }

    /**
     * 总货币变化动画。
     * 默认对「变化量」做动画再映射回总额，避免总额很大时步长过大看不到过程。
     * `smooth=true` 时直接从 start 滚到 start+delta。
     * @param params 见 {@link TotalMoneyParams}
     * @returns 控制对象 `{ cancel }`
     */
    static totalMoneyChangeToTarget({
        start,
        delta = 0,
        duration = 2000,
        Integer = true,
        fps = 60,
        minStep = 0,
        smooth = false,
        onUpdate,
        onComplete,
    }: TotalMoneyParams): AnimControl {
        const target = start + delta;
        if (smooth) {
            return AnimUtil.sCurveChangeToTarget({
                num: start,
                target,
                duration,
                Integer,
                fps,
                noStep: true,
                onUpdate,
                onComplete: () => {
                    if (typeof onComplete === 'function') {
                        onComplete(target);
                    }
                },
            });
        }
        const absDelta = Math.abs(delta);
        const direction = delta >= 0 ? 1 : -1;
        const stepRefBase = Math.max(Math.abs(start), Math.abs(target), absDelta);
        const animMinStep = Math.max(minStep, AnimUtil.getMoneyAnimStep(stepRefBase));
        return AnimUtil.sCurveChangeToTarget({
            num: 0,
            target: absDelta,
            duration,
            Integer,
            fps,
            minStep: animMinStep,
            stepReference: (innerValue: number) => Math.abs(start + innerValue * direction),
            onUpdate: (value, control) => {
                const currentTotal = start + value * direction;
                if (typeof onUpdate === 'function') {
                    onUpdate(currentTotal, control);
                }
            },
            onComplete: () => {
                if (typeof onComplete === 'function') {
                    onComplete(target);
                }
            },
        });
    }

    /**
     * 匀速滚到目标值。`onUpdate` 返回 `false` 可中途停（切场景时常用）。
     * 也可用返回的 `control.cancel()`。
     * @param params 见 {@link LinearChangeParams}
     */
    static linearChangeToTarget({
        num,
        target = 0,
        duration = 2000,
        Integer = false,
        onUpdate,
        onComplete,
    }: LinearChangeParams): AnimControl {
        const startValue = num;
        let cancelled = false;
        const control: AnimControl = {
            cancel: () => {
                cancelled = true;
            },
        };
        if (startValue === target) {
            if (typeof onUpdate === 'function') {
                try {
                    onUpdate(target, control);
                } catch {
                    /* ignore */
                }
            }
            if (!cancelled && typeof onComplete === 'function') {
                onComplete(target);
            }
            return control;
        }
        const startTime = Date.now();
        const delta = target - startValue;
        const animate = () => {
            if (cancelled) {
                return;
            }
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            let currentValue: number;
            if (Integer) {
                currentValue = Math.round(startValue + delta * progress);
            } else {
                currentValue = parseFloat((startValue + delta * progress).toFixed(2));
            }
            if (progress === 1) {
                currentValue = target;
            }
            let shouldContinue = true;
            if (typeof onUpdate === 'function') {
                try {
                    shouldContinue = onUpdate(currentValue, control) !== false;
                } catch {
                    /* ignore */
                }
            }
            if (cancelled || !shouldContinue) {
                return;
            }
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (typeof onComplete === 'function') {
                onComplete(target);
            }
        };
        animate();
        return control;
    }

    /**
     * 改 Animation 状态并播放。
     * @param Anmnode 带 Animation 的节点
     * @param AnmName 剪辑名
     * @param wrapMode 0 播完停 / 1 循环 / 2 来回 / 3 倒放停 / 4 倒放循环 / 5 倒放来回
     * @param repeatCount 次数；`-1` 无限
     * @param speed 速度，默认 1
     */
    static updateAnmState(
        Anmnode: Node,
        AnmName: string,
        wrapMode: number,
        repeatCount?: number,
        speed?: number,
    ): void {
        const anm = Anmnode?.getComponent(Animation);
        if (!anm) {
            return;
        }
        const type = anm.getState(AnmName);
        if (!type) {
            return;
        }
        const modes = [
            AnimationClip.WrapMode.Normal,
            AnimationClip.WrapMode.Loop,
            AnimationClip.WrapMode.PingPong,
            AnimationClip.WrapMode.Reverse,
            AnimationClip.WrapMode.LoopReverse,
            AnimationClip.WrapMode.PingPongReverse,
        ];
        type.wrapMode = modes[wrapMode] ?? AnimationClip.WrapMode.Normal;
        type.speed = speed !== undefined ? speed : 1;
        if (repeatCount !== undefined) {
            type.repeatCount = repeatCount === -1 ? Infinity : repeatCount;
        }
        anm.play(AnmName);
    }

    /**
     * 从 0 缩放打开弹窗（商店加球这类小窗）。
     * @param nd 弹窗根节点，需有子节点 `yy`（遮罩）和 `background`（内容）
     */
    static OpenGameUiFromZero(nd: Node): void {
        const yy = nd.getChildByName('yy');
        const bg = nd.getChildByName('background');
        if (!yy || !bg) {
            nd.active = true;
            return;
        }
        const yyOp = yy.getComponent(UIOpacity) ?? yy.addComponent(UIOpacity);
        Tween.stopAllByTarget(yyOp);
        Tween.stopAllByTarget(bg);
        yyOp.opacity = 0;
        bg.setScale(0, 0, 0);
        nd.active = true;
        tween(yyOp)
            .to(0.1, { opacity: 166 })
            .call(() => {
                tween(bg).to(0.15, { scale: v3(1, 1, 1) }).start();
            })
            .start();
    }

    /**
     * 点击回弹：压扁再拉高再回 1（按钮 / 球反馈）。
     * @param target 目标节点
     */
    static TapBall(target: Node): Promise<void> {
        return new Promise((resolve) => {
            if (!target?.isValid) {
                resolve();
                return;
            }
            Tween.stopAllByTarget(target);
            tween(target)
                .to(0.1, { scale: v3(1.2, 0.8, 1) })
                .to(0.1, { scale: v3(0.8, 1.2, 1) })
                .to(0.1, { scale: v3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }

    /**
     * 数字节点放大一拍，再写成 `num * bl` 的金额，再缩回。
     * @param node 带 Label 的节点
     * @param num 基础数值
     * @param bl 倍率
     */
    static playTabnum(node: Node, num: number, bl: number): void {
        Tween.stopAllByTarget(node);
        tween(node)
            .to(0.2, { scale: v3(1.3, 1.3, 1.3) })
            .call(() => {
                FormatUtil.serachMoney(node, num * bl);
            })
            .to(0.2, { scale: v3(1, 1, 1) })
            .start();
    }

    /**
     * 打勾 / 图标弹出：移到 pos，从 1.5 缩到 1 并淡入。
     * @param gou 图标节点（需有 UIOpacity）
     * @param pos 目标本地坐标
     */
    static dagou(gou: Node, pos: Vec3): void {
        if (!gou?.isValid) {
            return;
        }
        const op = gou.getComponent(UIOpacity) ?? gou.addComponent(UIOpacity);
        Tween.stopAllByTarget(gou);
        Tween.stopAllByTarget(op);
        gou.setPosition(pos);
        op.opacity = 55;
        gou.active = true;
        gou.setScale(v3(1.5, 1.5, 1.5));
        tween(gou).to(0.3, { scale: v3(1, 1, 1) }).start();
        tween(op).to(0.3, { opacity: 255 }).start();
    }

    /**
     * 节点淡入（已显示则忽略）。
     * @param node 目标节点
     * @param time 时长秒，默认 0.2
     */
    static fadeIn(node: Node, time: number = 0.2): void {
        if (!node?.isValid || node.active) {
            return;
        }
        const op = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        Tween.stopAllByTarget(op);
        op.opacity = 0;
        node.active = true;
        tween(op).to(time, { opacity: 255 }).start();
    }

    /**
     * 透明度淡入再淡出（提示条）。
     * @param node 目标节点
     * @param time 单程秒数，默认 0.5
     */
    static fadeInOut(node: Node, time: number = 0.5): void {
        if (!node?.isValid) {
            return;
        }
        const op = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        Tween.stopAllByTarget(op);
        node.active = true;
        op.opacity = 0;
        tween(op)
            .to(time, { opacity: 255 })
            .to(time, { opacity: 0 })
            .start();
    }

    /**
     * 子节点文字上飘并淡出（到账 +N 一类）。
     * @param pt 父节点
     * @param val 要写的文案
     * @param name 子节点名（需有 Label + UIOpacity）
     */
    static bianFont_Anm(pt: Node, val: string, name: string): Promise<void> {
        return new Promise((resolve) => {
            const bian = pt?.getChildByName(name);
            if (!bian?.isValid) {
                resolve();
                return;
            }
            const label = bian.getComponent(Label);
            const op = bian.getComponent(UIOpacity) ?? bian.addComponent(UIOpacity);
            if (label) {
                label.string = val;
            }
            Tween.stopAllByTarget(bian);
            Tween.stopAllByTarget(op);
            op.opacity = 255;
            bian.setPosition(0, -50, 0);
            bian.active = true;
            tween(bian)
                .to(0.3, { position: v3(bian.position.x, bian.position.y + 60, bian.position.z) })
                .start();
            tween(op)
                .to(0.3, { opacity: 0 })
                .call(() => {
                    bian.active = false;
                    resolve();
                })
                .start();
        });
    }
}
