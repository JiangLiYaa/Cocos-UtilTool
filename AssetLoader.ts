import { assetManager, AudioClip, Node, Prefab, resources, Sprite, SpriteFrame } from 'cc';
import type { AssetManager } from 'cc';

/**
 * 资源加载工具。
 * 从 `resources` 或远程 Bundle 加载预制体、贴图、音频，带内存缓存和 `addRef`，避免重复 IO。
 */
export class AssetLoader {
    /** 预制体缓存：路径 → Prefab */
    private static _prefabCache = new Map<string, Prefab>();
    /** Bundle 缓存：包名/路径 → Bundle */
    private static _bundleCache = new Map<string, AssetManager.Bundle>();
    /** 音频缓存：包名/路径 → AudioClip */
    private static _clipCache = new Map<string, AudioClip>();
    /** Bundle 内 SpriteFrame 缓存 */
    private static _spriteFrameCache = new Map<string, SpriteFrame>();
    /** resources 内 SpriteFrame 缓存 */
    private static _resourcesSfCache = new Map<string, SpriteFrame>();
    /** 正在加载中的 resources SpriteFrame，用于合并并发请求 */
    private static _resourcesSfInflight = new Map<string, Promise<SpriteFrame>>();

    /**
     * 把路径统一成 Cocos 3.x 的 SpriteFrame 资源键。
     * 去掉前导 `/`，若未以 `/spriteFrame` 结尾则自动补上。
     * @param path 原始路径，例如 `icon/gold` 或 `/icon/gold/spriteFrame`
     * @returns 规范化后的路径，例如 `icon/gold/spriteFrame`
     */
    static normalizeSpriteFramePath(path: string): string {
        let key = (path || '').replace(/^\/+/, '');
        if (!key.toLowerCase().endsWith('/spriteframe')) {
            key = key.replace(/\/+$/, '') + '/spriteFrame';
        }
        return key;
    }

    /**
     * 从 `resources` 加载 SpriteFrame（缓存 + addRef）。
     * 同一路径只会真正 load 一次；缓存失效（节点已销毁）会自动重载。
     * @param path 资源路径，可带或不带前导 `/`，可带或不带 `/spriteFrame`
     * @returns 加载完成的 SpriteFrame
     */
    static loadResourcesSpriteFrame(path: string): Promise<SpriteFrame> {
        const key = AssetLoader.normalizeSpriteFramePath(path);
        const cached = AssetLoader._resourcesSfCache.get(key);
        if (cached?.isValid) {
            return Promise.resolve(cached);
        }
        if (cached) {
            AssetLoader._resourcesSfCache.delete(key);
        }
        const inflight = AssetLoader._resourcesSfInflight.get(key);
        if (inflight) {
            return inflight;
        }
        const p = new Promise<SpriteFrame>((resolve, reject) => {
            resources.load(key, SpriteFrame, (err, sf) => {
                AssetLoader._resourcesSfInflight.delete(key);
                if (err || !sf?.isValid) {
                    reject(err ?? new Error(`load SpriteFrame failed: ${key}`));
                    return;
                }
                sf.addRef();
                AssetLoader._resourcesSfCache.set(key, sf);
                resolve(sf);
            });
        });
        AssetLoader._resourcesSfInflight.set(key, p);
        return p;
    }

    /**
     * 从 `resources` 加载预制体（缓存 + addRef）。
     * @param path 预制体路径，例如 `prefab/Tips`（可带前导 `/`）
     * @returns 加载完成的 Prefab
     */
    static loadPrefab(path: string): Promise<Prefab> {
        const key = path.startsWith('/') ? path.slice(1) : path;
        const cached = AssetLoader._prefabCache.get(key);
        if (cached?.isValid) {
            return Promise.resolve(cached);
        }
        if (cached) {
            AssetLoader._prefabCache.delete(key);
        }
        return new Promise((resolve, reject) => {
            resources.load(key, Prefab, (err, prefab) => {
                if (err || !prefab?.isValid) {
                    reject(err ?? new Error(`load prefab failed: ${key}`));
                    return;
                }
                prefab.addRef();
                AssetLoader._prefabCache.set(key, prefab);
                resolve(prefab);
            });
        });
    }

    /**
     * 加载并缓存 Asset Bundle。已加载过则直接返回。
     * @param packageUrl Bundle 名称或路径，例如 `libs/music`
     * @returns 对应的 Bundle 实例
     */
    static loadBundle(packageUrl: string): Promise<AssetManager.Bundle> {
        const existed = assetManager.getBundle(packageUrl) ?? AssetLoader._bundleCache.get(packageUrl);
        if (existed) {
            AssetLoader._bundleCache.set(packageUrl, existed);
            return Promise.resolve(existed);
        }
        return new Promise((resolve, reject) => {
            assetManager.loadBundle(packageUrl, (err, bundle) => {
                if (err || !bundle) {
                    reject(err ?? new Error(`load bundle failed: ${packageUrl}`));
                    return;
                }
                AssetLoader._bundleCache.set(packageUrl, bundle);
                resolve(bundle);
            });
        });
    }

    /**
     * 从指定 Bundle 加载 SpriteFrame（缓存 + addRef）。
     * @param packageUrl Bundle 路径或名称
     * @param name 贴图在 Bundle 内的路径（可带或不带 `/spriteFrame`）
     * @returns 加载完成的 SpriteFrame
     */
    static async assetManagerLoadSpriteFrame(packageUrl: string, name: string): Promise<SpriteFrame> {
        const key = `${packageUrl}/${name}`;
        const cached = AssetLoader._spriteFrameCache.get(key);
        if (cached?.isValid) {
            return cached;
        }
        if (cached) {
            AssetLoader._spriteFrameCache.delete(key);
        }
        const assetPath = AssetLoader.normalizeSpriteFramePath(name);
        const bundle = await AssetLoader.loadBundle(packageUrl);
        return new Promise((resolve, reject) => {
            bundle.load(assetPath, SpriteFrame, (err, sf) => {
                if (err || !sf?.isValid) {
                    reject(err ?? new Error(`load SpriteFrame failed: ${name}`));
                    return;
                }
                sf.addRef();
                AssetLoader._spriteFrameCache.set(key, sf);
                resolve(sf);
            });
        });
    }

    /**
     * 从指定 Bundle 加载音频（缓存）。
     * @param packageUrl Bundle 路径或名称
     * @param name 音频在 Bundle 内的路径，例如 `click`
     * @returns 加载完成的 AudioClip
     */
    static async assetManagerLoadAudioClip(packageUrl: string, name: string): Promise<AudioClip> {
        const clipKey = `${packageUrl}/${name}`;
        const cached = AssetLoader._clipCache.get(clipKey);
        if (cached?.isValid) {
            return cached;
        }
        if (cached) {
            AssetLoader._clipCache.delete(clipKey);
        }
        const bundle = await AssetLoader.loadBundle(packageUrl);
        return new Promise((resolve, reject) => {
            bundle.load(name, AudioClip, (err, clip) => {
                if (err || !clip?.isValid) {
                    reject(err ?? new Error(`load AudioClip failed: ${name}`));
                    return;
                }
                AssetLoader._clipCache.set(clipKey, clip);
                resolve(clip);
            });
        });
    }

    /**
     * 启动时预加载 Bundle，减少首次播放 / 加载延迟。
     * @param packageUrl Bundle 路径或名称
     */
    static async preloadBundle(packageUrl: string): Promise<void> {
        await AssetLoader.loadBundle(packageUrl);
    }

    /**
     * 从 Bundle 加载 SpriteFrame 并赋到节点的 Sprite 上（带缓存）。
     * 比每次 loadBundle 再赋图更省 IO。
     * @param packageUrl Bundle 路径或名称
     * @param node 带 Sprite 的节点
     * @param name 贴图路径（可带或不带 `/spriteFrame`）
     */
    static async applySpriteFrame(packageUrl: string, node: Node, name: string): Promise<SpriteFrame | null> {
        if (!node?.isValid) {
            return null;
        }
        const sf = await AssetLoader.assetManagerLoadSpriteFrame(packageUrl, name);
        const sprite = node.getComponent(Sprite);
        if (!sprite || !sf?.isValid) {
            return sf ?? null;
        }
        sprite.spriteFrame = sf;
        sprite.enabled = true;
        return sf;
    }

    /**
     * 从 resources 加载 SpriteFrame 并赋到节点 Sprite（带缓存）。
     * @param node 带 Sprite 的节点
     * @param url resources 路径，可省略 `/spriteFrame`
     */
    static async applyResourcesSpriteFrame(node: Node, url: string): Promise<SpriteFrame | null> {
        if (!node?.isValid) {
            return null;
        }
        const sf = await AssetLoader.loadResourcesSpriteFrame(url);
        const sprite = node.getComponent(Sprite);
        if (!sprite || !sf?.isValid) {
            return sf ?? null;
        }
        sprite.spriteFrame = sf;
        sprite.enabled = true;
        return sf;
    }
}
