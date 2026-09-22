import { sys } from 'cc';

/** FNV-1a 32 位哈希，把字符串打散成无符号整数 */
function fnv1a(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** 把一个整数混入已有哈希 */
function fnv1aMix(h: number, v: number): number {
    return Math.imul(h ^ (v >>> 0), 16777619) >>> 0;
}

/**
 * 取一个密码学随机的 32 位无符号整数。
 * 部分原生环境没有 Web Crypto 时退回 Math.random。
 */
function getCryptoUint32(): number {
    try {
        const c = (globalThis as { crypto?: Crypto }).crypto;
        if (c?.getRandomValues) {
            const buf = new Uint32Array(1);
            c.getRandomValues(buf);
            return buf[0]!;
        }
    } catch {
        /* 部分原生环境无 Web Crypto */
    }
    return (Math.random() * 0xffffffff) >>> 0;
}

/** 高精度时间（有 performance.now 用它，否则 Date.now + random） */
function getHighResTime(): number {
    const perf = (globalThis as { performance?: Performance }).performance;
    if (perf?.now) {
        return perf.now();
    }
    return Date.now() + Math.random();
}

/** Mulberry32：可种子的伪随机数发生器 */
class Mulberry32 {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0 || 1;
    }

    /** 返回 [0, 1) 浮点随机数 */
    next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * 返回 [0, maxExclusive) 整数。
     * @param maxExclusive 上界（不含）
     */
    nextInt(maxExclusive: number): number {
        if (maxExclusive <= 1) {
            return 0;
        }
        return Math.floor(this.next() * maxExclusive);
    }
}

/**
 * 轻量 RNG：整数随机、Fisher-Yates 洗牌。
 * 实机 `shuffle` 会混入 crypto / 时间熵；蒙特卡洛模拟请用 `shuffleSim`。
 */
export class Rng {
    /** 本次进程会话种子 */
    private static sessionSeed = 0;
    /** 洗牌次数，用于每次生成不同种子 */
    private static shuffleCounter = 0;
    /** 是否已初始化会话 */
    private static initialized = false;

    /**
     * 把多段字符串和当前熵混成一个 32 位种子。
     * @param parts 参与混合的字符串
     * @returns 非 0 的无符号整数种子
     */
    static mixSeed(parts: string[]): number {
        let h = fnv1a(parts.join('\x1e'));
        h = fnv1aMix(h, getCryptoUint32());
        h = fnv1aMix(h, Math.floor(getHighResTime() * 1000));
        return h >>> 0 || 1;
    }

    /**
     * 确保本进程已建立会话种子（只做一次）。
     * 混入系统、平台、crypto 随机和高精度时钟。
     */
    static ensureSession(): void {
        if (Rng.initialized) {
            return;
        }
        Rng.initialized = true;
        Rng.sessionSeed = Rng.mixSeed([
            sys.os,
            sys.platform,
            String(getCryptoUint32()),
            String(getCryptoUint32()),
            String(getHighResTime()),
        ]);
    }

    /**
     * 每次洗牌前生成一个独立种子（会话种子 + 计数 + 当前熵）。
     * @returns 本次洗牌用的种子
     */
    static buildShuffleSeed(): number {
        Rng.ensureSession();
        Rng.shuffleCounter++;
        return Rng.mixSeed([
            String(Rng.sessionSeed),
            String(Rng.shuffleCounter),
            String(getCryptoUint32()),
            String(getHighResTime()),
        ]);
    }

    /**
     * 闭区间整数随机数，走 Math.random。
     * @param min 下限（含）
     * @param max 上限（含）
     * @param snapToMin `true` 时结果对齐为 min 的倍数（例如金额步进）
     * @returns [min, max] 内的整数
     */
    static getRandomInt(min: number, max: number, snapToMin: boolean = false): number {
        let randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
        if (snapToMin && min !== 0) {
            randomNum = Math.floor(randomNum / min) * min;
            if (randomNum < min) {
                randomNum = min;
            } else if (randomNum > max) {
                randomNum = Math.floor(max / min) * min;
            }
        }
        return randomNum;
    }

    /**
     * `[0, num)` 整数，等价于 `Math.floor(Math.random() * num)`。
     */
    static NumRandom(num: number): number {
        if (num <= 0) {
            return 0;
        }
        return Math.floor(Math.random() * num);
    }

    /**
     * `[0, maxExclusive)` 均匀整数（实机熵，每次换种子）。
     * @param maxExclusive 上界（不含）
     */
    static randomInt(maxExclusive: number): number {
        if (maxExclusive <= 1) {
            return 0;
        }
        const rng = new Mulberry32(Rng.buildShuffleSeed());
        return rng.nextInt(maxExclusive);
    }

    /**
     * Fisher-Yates 洗牌（实机）。不修改原数组，返回新数组。
     * @param array 原数组
     * @returns 打乱后的副本
     */
    static shuffle<T>(array: readonly T[]): T[] {
        const rng = new Mulberry32(Rng.buildShuffleSeed());
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = rng.nextInt(i + 1);
            const tmp = shuffled[i]!;
            shuffled[i] = shuffled[j]!;
            shuffled[j] = tmp;
        }
        return shuffled;
    }

    /**
     * 模拟 / 可复现统计用洗牌，走 Math.random，更快。
     * @param array 原数组
     * @returns 打乱后的副本
     */
    static shuffleSim<T>(array: readonly T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = shuffled[i]!;
            shuffled[i] = shuffled[j]!;
            shuffled[j] = tmp;
        }
        return shuffled;
    }

    /**
     * 原地 Fisher-Yates 洗牌（改原数组，少一次拷贝）。
     * @param array 要打乱的数组
     */
    static shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = array[i]!;
            array[i] = array[j]!;
            array[j] = tmp;
        }
        return array;
    }
}
