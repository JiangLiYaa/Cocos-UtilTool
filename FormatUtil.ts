import { Label, Node } from 'cc';

/** 筹码名称 → 张数，例如 `{ '1k': 2, '500': 1 }` */
export type ChipCountMap = Record<string, number>;

/** `formatName` 千分位格式化选项 */
export interface FormatNameOptions {
    /** 地区，默认 `en-US`（逗号分组、点小数）；其它值用点分组、逗号小数 */
    locale?: string;
    /** 最少小数位数，不足补 0 */
    minimumFractionDigits?: number;
    /** 最多保留的小数位数 */
    maximumFractionDigits?: number;
    /** 是否加千分位分隔符，默认 true */
    useGrouping?: boolean;
}

/** `breakChips` 按页拆分的结果 */
export interface ChipPageResult {
    /** 页码，从 1 开始 */
    page: number;
    /** 本页面值 → 张数 */
    content: Record<number, number>;
}

/** 奖励项（签到 / 宝箱拆组用） */
export interface RewardItem {
    name: string;
    count: number;
    type?: string;
}

/** 默认筹码名称表（从 1 到 20M） */
const DEFAULT_CHIP_NAMES = [
    '1', '5', '10', '50', '100',
    '200', '500', '1k', '5k', '10k',
    '20k', '50k', '100k', '200k', '500k',
    '1M', '2M', '5M', '10M', '20M',
];

/** 默认筹码面值表（从大到小，给选筹码面板分页用） */
const DEFAULT_CHIP_VALUES = [
    20000000, 10000000, 5000000, 2000000, 1000000,
    500000, 200000, 100000, 50000, 20000,
    10000, 5000, 1000, 500, 200,
    100, 50, 10, 5, 1,
];

/**
 * 金额展示、筹码拆分、k/m 单位换算。
 * 原生环境 `toLocaleString` 经常无效，统一走 `formatName`。
 */
export class FormatUtil {
    /**
     * 千分位格式化金额。
     * 默认 en-US：`1234567` → `1,234,567`。
     * @param number 要格式化的数字或数字字符串
     * @param options 小数位、分组、地区等选项
     * @returns 格式化后的字符串；非法输入原样转成字符串返回
     */
    static formatName(number: number | string, options: FormatNameOptions = {}): string {
        const defaults: Required<FormatNameOptions> = {
            locale: 'en-US',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            useGrouping: true,
        };
        const opts = { ...defaults, ...options };
        if (typeof number === 'number' ? isNaN(number) : isNaN(Number(number))) {
            return String(number);
        }
        const num = Number(number);
        let [integerPart, decimalPart = ''] = num.toString().split('.');
        if (opts.useGrouping) {
            const separator = opts.locale === 'en-US' ? ',' : '.';
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
        }
        if (opts.minimumFractionDigits > 0 || opts.maximumFractionDigits > 0) {
            decimalPart = decimalPart.slice(0, opts.maximumFractionDigits);
            while (decimalPart.length < opts.minimumFractionDigits) {
                decimalPart += '0';
            }
            if (decimalPart.length > 0) {
                const decimalSeparator = opts.locale === 'en-US' ? '.' : ',';
                return integerPart + decimalSeparator + decimalPart;
            }
        }
        return integerPart;
    }

    /**
     * 把金额写到节点上的 Label。
     * @param node 带 Label 的节点
     * @param moneys 金额数值
     * @param Digit `true` 只返回字符串；字符串则当前缀（如 `$`）；默认 `false` 直接写 Label
     * @returns `Digit=true` 时返回格式化字符串，否则无返回值
     */
    static serachMoney(node: Node, moneys: number, Digit: boolean | string = false): string | void {
        const da = FormatUtil.formatName(moneys);
        const text = da.split('.')[0];
        if (Digit === true) {
            return text;
        }
        const prefix = typeof Digit === 'string' ? Digit : '';
        const label = node.getComponent(Label);
        if (label) {
            label.string = `${prefix}${text}`;
        }
    }

    /**
     * 把带单位的金额字符串转成数字。
     * 支持可选前缀 `$`，后缀 `k/K`（千）、`m/M`（百万）。
     * 例：`$1.5k` → `1500`，`20M` → `20000000`。
     * @param my 金额字符串
     * @returns 数值；解析失败返回 0
     */
    static replaceNum(my: string): number {
        if (!my) {
            return 0;
        }
        let startIdx = 0;
        if (my[0] === '$') {
            startIdx = 1;
        }
        const lastChar = my[my.length - 1];
        let num = 0;
        switch (lastChar) {
            case 'k':
            case 'K':
                num = Number(my.substring(startIdx, my.length - 1)) * 1000;
                break;
            case 'm':
            case 'M':
                num = Number(my.substring(startIdx, my.length - 1)) * 1000000;
                break;
            default:
                num = Number(my.substring(startIdx));
        }
        return isNaN(num) ? 0 : num;
    }

    /**
     * 截断到指定小数位（不四舍五入）。
     * @param num 原数值
     * @param decimalPlaces 保留的小数位数
     * @returns 截断后的数值
     */
    static truncateToDecimalPlaces(num: number, decimalPlaces: number): number {
        const multiplier = Math.pow(10, decimalPlaces);
        const adjustedNum = Number((num * multiplier).toFixed(10));
        return Math.trunc(adjustedNum) / multiplier;
    }

    /**
     * 金额缩写展示。
     * `999` → `999`，`1050` → `1.05k`，`1500000` → `1.5m`。
     * @param sum 金额
     * @param name 传 `WagerWin` 时保留 2 位小数，否则 1 位
     * @returns 带 k/m 的展示字符串
     */
    static DisplayMoneyFont(sum: number, name?: string): string {
        const td = name === 'WagerWin' ? 2 : 1;
        if (sum < 1000) {
            return `${sum}`;
        }
        if (sum < 1000000) {
            const k = sum / 1000;
            if (k - Math.floor(k) > 0) {
                return `${FormatUtil.truncateToDecimalPlaces(k, td)}k`;
            }
            return `${k}k`;
        }
        const m = sum / 1000000;
        if (m - Math.floor(m) > 0) {
            return `${FormatUtil.truncateToDecimalPlaces(m, td)}m`;
        }
        return `${m}m`;
    }

    /**
     * 下注区域金额展示（与 WagerWin 规则一致：两位小数）。
     * `1050` → `1.05k`，`1500` → `1.5k`。
     * @param sum 金额
     * @returns 展示字符串
     */
    static DisplayBetFont(sum: number): string {
        return FormatUtil.DisplayMoneyFont(sum, 'WagerWin');
    }

    /**
     * 筹码堆顶合计：只显示整数 k/m（会四舍五入）。
     * `1500` → `2k`，`1050` → `1k`。
     * @param sum 金额
     * @returns 展示字符串；非法或 ≤0 时返回 `0`
     */
    static formatChipStackAmount(sum: number): string {
        const rounded = Math.round(Number(sum));
        if (isNaN(rounded) || !isFinite(rounded) || rounded <= 0) {
            return '0';
        }
        if (rounded < 1000) {
            return `${rounded}`;
        }
        if (rounded < 1000000) {
            return `${Math.round(rounded / 1000)}k`;
        }
        return `${Math.round(rounded / 1000000)}m`;
    }

    /**
     * `formatChipStackAmount` 的别名，按堆顶规则把数字转成 k/m 字符串。
     * @param num 金额
     * @returns 展示字符串
     */
    static formatNumber(num: number): string {
        return FormatUtil.formatChipStackAmount(num);
    }

    /**
     * 根据字符长度给筹码数字选字号。
     * 1 位 50、2 位 40、3～5 位 36，更长 28。
     * @param num 已经格式化好的数字字符串
     * @returns 建议字号
     */
    static fontSizeReplace(num: string): number {
        if (num.length <= 1) {
            return 50;
        }
        if (num.length <= 2) {
            return 40;
        }
        if (num.length <= 5) {
            return 36;
        }
        return 28;
    }

    /**
     * 贪心拆筹码：用尽量少的大面额凑出金额。
     * 例：`2750` → `{ '2k': 1, '500': 1, '200': 1, '50': 1 }`。
     * @param num 要拆的金额
     * @param chips 筹码名称表，不传则用默认 `1 … 20M`
     * @returns 名称 → 张数；无效输入返回空对象
     */
    static distributeChips(num: number, chips: string[] = DEFAULT_CHIP_NAMES): ChipCountMap {
        if (typeof num !== 'number' || !Array.isArray(chips)) {
            return {};
        }
        const chipValues = chips.map((chip) => {
            if (chip.indexOf('k') > -1 || chip.indexOf('K') > -1) {
                return parseFloat(chip) * 1000;
            }
            if (chip.indexOf('M') > -1 || chip.indexOf('m') > -1) {
                return parseFloat(chip) * 1000000;
            }
            return parseFloat(chip);
        });
        const sortedChips = chips
            .map((chip, index) => ({ name: chip, value: chipValues[index] }))
            .sort((a, b) => b.value - a.value);
        let remaining = num;
        const result: ChipCountMap = {};
        for (let i = 0; i < sortedChips.length; i++) {
            const chip = sortedChips[i];
            if (remaining >= chip.value) {
                const count = Math.floor(remaining / chip.value);
                result[chip.name] = count;
                remaining -= count * chip.value;
            }
            if (remaining === 0) {
                break;
            }
        }
        if (remaining > 0) {
            const smallestChip = sortedChips[sortedChips.length - 1].name;
            result[smallestChip] = (result[smallestChip] || 0) + 1;
        }
        const finalResult: ChipCountMap = {};
        Object.keys(result).forEach((chip) => {
            if (result[chip] > 0) {
                finalResult[chip] = result[chip];
            }
        });
        return finalResult;
    }

    /**
     * 按页拆筹码（每页 5 个面值），给选筹码面板用。
     * @param num 要拆的金额
     * @param allChips 面值表（从大到小），不传则用默认表
     * @returns 分页结果；拆不出时退回第 1 页面值 1
     */
    static breakChips(num: number, allChips: number[] = DEFAULT_CHIP_VALUES): ChipPageResult[] {
        const pages: number[][] = [];
        for (let i = 0; i < allChips.length; i += 5) {
            pages.push(allChips.slice(i, i + 5));
        }
        const result: ChipPageResult[] = [];
        let remaining = num;
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const pageChips = pages[pageIndex];
            const pageContent: Record<number, number> = {};
            let pageUsed = false;
            for (const chip of pageChips) {
                if (remaining >= chip) {
                    const count = Math.floor(remaining / chip);
                    pageContent[chip] = count;
                    remaining -= chip * count;
                    pageUsed = true;
                    if (remaining === 0) {
                        break;
                    }
                }
            }
            if (pageUsed) {
                result.push({ page: pageIndex + 1, content: pageContent });
            }
            if (remaining === 0) {
                break;
            }
        }
        return result.length > 0 ? result : [{ page: 1, content: { 1: num } }];
    }

    /**
     * 自动上注数组求和。
     * 例：`[{ name: '1k', count: 2 }]` → `2000`。
     * @param arr 名称 + 张数
     * @returns 总金额
     */
    static sumAutoValue(arr: Array<{ name: string; count: number }>): number {
        let num = 0;
        for (let i = 0; i < arr.length; i++) {
            num += FormatUtil.replaceNum(arr[i].name) * arr[i].count;
        }
        return num;
    }

    /**
     * 英文单词首字母大写，其余转小写。
     * `GOLD` → `Gold`
     * @param name 原字符串
     */
    static capitalizeFirstLetter(name: string): string {
        if (!name) {
            return '';
        }
        const word = name.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    /**
     * 数字补成两位：`5` → `05`，`12` → `12`。
     * @param num 非负整数
     */
    static padZero(num: number): string {
        return num < 10 ? `0${num}` : `${num}`;
    }

    /**
     * 把奖励随机拆成两组，保证两组都不为空。
     * @param originalRewards 原始奖励列表（不修改入参）
     * @returns `{ group1, group2 }`
     */
    static assignRewardsToTwoGroups<T extends RewardItem>(originalRewards: T[]): { group1: T[]; group2: T[] } {
        const rewards = [...originalRewards];
        const group1: T[] = [];
        const group2: T[] = [];
        rewards.forEach((reward) => {
            (Math.random() > 0.5 ? group1 : group2).push(reward);
        });
        if (group1.length === 0 && group2.length > 0) {
            const moveItem = group2.shift();
            if (moveItem) {
                group1.push(moveItem);
            }
        } else if (group2.length === 0 && group1.length > 0) {
            const moveItem = group1.shift();
            if (moveItem) {
                group2.push(moveItem);
            }
        }
        return { group1, group2 };
    }
}
