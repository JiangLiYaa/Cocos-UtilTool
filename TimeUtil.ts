import { native, sys } from 'cc';
import { FormatUtil } from './FormatUtil';

/** 每日签到检查结果：倒计时字符串 / 可领 / 需重置 */
export type SignCheckResult = string;

/**
 * 签到倒计时、网络、原生震动。
 */
export class TimeUtil {
    /**
     * 距离明天 0 点的倒计时，`HH:MM:SS`。
     */
    static isSignedTime(): string {
        const today = new Date(new Date().toLocaleDateString());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();
        const timestamp = tomorrow.getTime() - now.getTime();
        const totalSeconds = Math.max(0, Math.floor(timestamp / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${FormatUtil.padZero(hours)}:${FormatUtil.padZero(minutes)}:${FormatUtil.padZero(seconds)}`;
    }

    /**
     * 按「上次签到日期」判断今天能不能签。
     * - 同一天：返回距明天的 `HH:MM:SS`
     * - 刚好差 1 天：返回 `Collect`
     * - 间隔更大：返回 `GameReset`（连续签到应清零）
     * @param lastSignTime 上次签到时间
     */
    static Checkqiandao(lastSignTime: Date): SignCheckResult {
        const time = new Date();
        const getDayTimestamp = (date: Date) => {
            const clone = new Date(date);
            clone.setHours(0, 0, 0, 0);
            return clone.getTime();
        };
        const dayDiff = Math.floor((getDayTimestamp(time) - getDayTimestamp(lastSignTime)) / 86400000);
        if (dayDiff === 0) {
            return TimeUtil.isSignedTime();
        }
        if (dayDiff === 1) {
            return 'Collect';
        }
        return 'GameReset';
    }

    /**
     * 浏览器用 navigator.onLine；原生默认视为在线。
     */
    static checkNetworkStatus(): boolean {
        if (sys.isBrowser) {
            return navigator.onLine;
        }
        return true;
    }

    /**
     * 原生震动（iOS / Android 通过 native.bridge 发 `zhengdong`）。
     * @param state false 时不发
     */
    static GameQIuZD(state: boolean): void {
        if (!state) {
            return;
        }
        if (sys.os === sys.OS.IOS || sys.os === sys.OS.ANDROID) {
            native.bridge?.sendToNative?.('zhengdong');
        }
    }
}
