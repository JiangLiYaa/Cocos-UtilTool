import { Component, Input, Node } from 'cc';

/**
 * 节点查找、触摸绑定、延时器、对象兼容方法。
 */
export class NodeUtil {
    /**
     * 按层级名称查找子节点。
     * 例：`getnode(root, ['Panel', 'BtnOk'])` 等价于 `root.Panel.BtnOk`。
     * @param rootNode 起始节点
     * @param names 从近到远的子节点名称；空数组时返回 rootNode 本身
     * @returns 找到的节点；中途缺失则返回 null
     */
    static getnode(rootNode: Node, names: string[]): Node | null {
        if (!rootNode || names.length === 0) {
            return rootNode ?? null;
        }
        const namesCopy = [...names];
        const currentName = namesCopy.shift()!;
        const currentNode = rootNode.getChildByName(currentName);
        return currentNode ? NodeUtil.getnode(currentNode, namesCopy) : null;
    }

    /**
     * 等待指定秒数（走 Component.scheduleOnce，跟 Cocos 生命周期一致）。
     * 组件或节点销毁时会自动清定时器并结束 Promise。
     * @param target 用于 schedule 的组件（一般传 `this`）
     * @param seconds 等待秒数
     */
    static delay(target: Component, seconds: number): Promise<void> {
        return new Promise((resolve) => {
            if (!target?.isValid) {
                resolve();
                return;
            }
            const cb = () => resolve();
            target.scheduleOnce(cb, seconds);
            if (target.node?.isValid) {
                target.node.once(Node.EventType.NODE_DESTROYED, () => {
                    if (target.isValid) {
                        target.unschedule(cb);
                    }
                    resolve();
                });
            }
        });
    }

    /**
     * 定时器封装，返回 `cancel` 可提前停。
     * `repeat` 与 `Component.schedule` 一致：额外重复次数，`0` 表示只跑 1 次。
     * @param interval 间隔秒数
     * @param repeat 额外重复次数
     * @param delay 首次触发前的延迟秒数
     * @param fun 回调
     * @param that 用于 schedule 的组件（一般传 `this`）
     */
    static setTime(interval: number, repeat: number, delay: number, fun: () => void, that: Component): { cancel: () => void } {
        if (!that?.isValid) {
            return { cancel: () => { /* 组件已失效 */ } };
        }
        const cb = () => {
            fun();
        };
        that.schedule(cb, interval, repeat, delay);
        return {
            cancel: () => {
                if (that.isValid) {
                    that.unschedule(cb);
                }
            },
        };
    }

    /**
     * 绑定 / 解绑触摸按下（TOUCH_START）。
     * @param node 目标节点
     * @param type `true` 绑定，`false` 解绑
     * @param fun 回调
     * @param that 回调里的 this 指向
     */
    static TouchStartClick(node: Node, type: boolean, fun: Function, that: object): void {
        if (!node?.isValid) {
            return;
        }
        if (type) {
            node.on(Input.EventType.TOUCH_START, fun, that);
        } else {
            node.off(Input.EventType.TOUCH_START, fun, that);
        }
    }

    /**
     * 绑定 / 解绑触摸抬起（TOUCH_END）。
     * @param node 目标节点
     * @param type `true` 绑定，`false` 解绑
     * @param fun 回调
     * @param that 回调里的 this 指向
     */
    static TouchEndClick(node: Node, type: boolean, fun: Function, that: object): void {
        if (!node?.isValid) {
            return;
        }
        if (type) {
            node.on(Input.EventType.TOUCH_END, fun, that);
        } else {
            node.off(Input.EventType.TOUCH_END, fun, that);
        }
    }

    /**
     * 绑定 / 解绑触摸移动（TOUCH_MOVE）。
     * @param node 目标节点
     * @param type `true` 绑定，`false` 解绑
     * @param fun 回调
     * @param that 回调里的 this 指向
     */
    static TouchMoveClick(node: Node, type: boolean, fun: Function, that: object): void {
        if (!node?.isValid) {
            return;
        }
        if (type) {
            node.on(Input.EventType.TOUCH_MOVE, fun, that);
        } else {
            node.off(Input.EventType.TOUCH_MOVE, fun, that);
        }
    }

    /**
     * 绑定 / 解绑触摸取消（TOUCH_CANCEL，手指滑出节点时）。
     * @param node 目标节点
     * @param type `true` 绑定，`false` 解绑
     * @param fun 回调
     * @param that 回调里的 this 指向
     */
    static TouchCancelClick(node: Node, type: boolean, fun: Function, that: object): void {
        if (!node?.isValid) {
            return;
        }
        if (type) {
            node.on(Input.EventType.TOUCH_CANCEL, fun, that);
        } else {
            node.off(Input.EventType.TOUCH_CANCEL, fun, that);
        }
    }

    /** 旧拼写兼容 */
    static TouchCancleClick(node: Node, type: boolean, fun: Function, that: object): void {
        NodeUtil.TouchCancelClick(node, type, fun, that);
    }

    /**
     * 判断数组是否包含某值（兼容旧环境，不用 includes）。
     * @param arr 数组
     * @param value 要查找的值（严格相等）
     */
    static arrayContains<T>(arr: T[], value: T): boolean {
        return NodeUtil.arrayIncludes(arr, value);
    }

    /**
     * 兼容 `Array.includes`，支持 fromIndex（可为负）。
     * @param array 数组
     * @param searchElement 要查找的值（严格相等）
     * @param fromIndex 起始下标，负数从末尾倒数
     */
    static arrayIncludes<T>(array: T[], searchElement: T, fromIndex?: number): boolean {
        const startIndex = fromIndex
            ? (fromIndex < 0 ? Math.max(0, array.length + fromIndex) : fromIndex)
            : 0;
        for (let i = startIndex; i < array.length; i++) {
            if (array[i] === searchElement) {
                return true;
            }
        }
        return false;
    }

    /**
     * 兼容性 `Object.values`：取出对象所有自身可枚举属性的值。
     * @param obj 普通对象
     */
    static objectValues<T extends Record<string, unknown>>(obj: T): Array<T[keyof T]> {
        return Object.keys(obj).map((key) => obj[key] as T[keyof T]);
    }

    /**
     * 兼容性 `Object.entries`：取出 `[key, value]` 数组。
     * @param obj 普通对象
     */
    static objectEntries<T extends Record<string, unknown>>(obj: T): Array<[string, T[keyof T]]> {
        return Object.keys(obj).map((key) => [key, obj[key] as T[keyof T]]);
    }
}
