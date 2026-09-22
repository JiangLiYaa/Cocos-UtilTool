import { _decorator, Component, Label } from 'cc';
const { ccclass } = _decorator;

/**
 * 打字机效果组件：把完整文案一个字一个字写到 Label 上。
 * 挂到任意节点后调用 `typeOutText`。
 */
@ccclass('PrintEffect')
export class PrintEffect extends Component {
    /** setInterval 句柄，null 表示当前没有在打字 */
    private intervalId: number | null = null;
    /** 每次 typeOutText / cancel 递增，用于丢弃过期回调 */
    private _session = 0;

    /**
     * 一个字一个字展示文本。再次调用会打断上一次。
     * @param msg 完整文案
     * @param label 目标 Label
     * @param callBack 打完后的回调，默认 null
     * @param time 打完整段需要的秒数，默认 3
     * @param fontSize 字号，默认 60
     * @param lineHeight 行高，默认 60
     */
    typeOutText(
        msg: string,
        label: Label,
        callBack: (() => void) | null = null,
        time: number = 3,
        fontSize: number = 60,
        lineHeight: number = 60,
    ): void {
        this.cancelTyping();
        if (!msg || !label?.isValid) {
            callBack && callBack();
            return;
        }
        const session = ++this._session;
        label.fontSize = fontSize;
        label.lineHeight = lineHeight;
        label.enableWrapText = true;
        label.overflow = Label.Overflow.RESIZE_HEIGHT;
        label.string = '';
        const content = msg;
        let index = 0;
        const safeTime = Math.max(time, 0.1);
        const typingSpeed = Math.max(1, Math.floor(content.length / safeTime));
        this.intervalId = setInterval(() => {
            if (session !== this._session) {
                this.clearTimer();
                return;
            }
            if (!label?.isValid) {
                this.clearTimer();
                return;
            }
            if (index >= content.length) {
                this.clearTimer();
                if (session === this._session) {
                    callBack && callBack();
                }
                return;
            }
            label.string += content[index];
            index++;
        }, 1000 / typingSpeed) as unknown as number;
    }

    /**
     * 打断当前打字，不触发完成回调。
     * 需要收尾（例如停打字音效）由调用方自己做。
     */
    cancelTyping(): void {
        this._session++;
        this.clearTimer();
    }

    /** 清掉内部定时器 */
    private clearTimer(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /** 节点销毁时停掉打字，避免野定时器 */
    onDestroy(): void {
        this.cancelTyping();
    }
}
