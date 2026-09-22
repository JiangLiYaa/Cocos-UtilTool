import { director } from 'cc';

/** 单场景预载进度 */
export interface ScenePreloadProgress {
    completedCount: number;
    totalCount: number;
    item: unknown;
}

/**
 * 场景加载 / 预加载。
 */
export class SceneUtil {
    /**
     * 切换场景。
     * @param name 场景名
     * @returns 引擎是否接受本次切场景
     */
    static loadScene(name: string): boolean {
        return director.loadScene(name);
    }

    /**
     * 预加载单个场景。
     * @param name 场景名
     * @param loadWhenDone `true` 时预载完成后立刻切过去
     * @param progressCallback 进度回调（completedCount / totalCount）
     */
    static preloadScene(
        name: string,
        loadWhenDone: boolean = false,
        progressCallback?: (info: ScenePreloadProgress) => void,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            director.preloadScene(
                name,
                (completedCount, totalCount, item) => {
                    progressCallback?.({ completedCount, totalCount, item });
                },
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (loadWhenDone) {
                        director.loadScene(name);
                    }
                    resolve();
                },
            );
        });
    }

    /**
     * 并行预加载多个场景，进度为 0~1 的平均值。
     * @param sceneNames 场景名列表
     * @param progressCallback 总进度 0~1
     */
    static async preloadScenesInParallel(
        sceneNames: string[],
        progressCallback?: (totalProgress: number) => void,
    ): Promise<void> {
        if (!sceneNames.length) {
            progressCallback?.(1);
            return;
        }
        const sceneProgress = new Array(sceneNames.length).fill(0);
        const preloadPromises = sceneNames.map((sceneName, index) => {
            return new Promise<void>((resolve, reject) => {
                director.preloadScene(
                    sceneName,
                    (completedCount, totalCount) => {
                        sceneProgress[index] = totalCount > 0 ? completedCount / totalCount : 1;
                        const currentLoaded = sceneProgress.reduce((sum, p) => sum + p, 0);
                        progressCallback?.(currentLoaded / sceneNames.length);
                    },
                    (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            sceneProgress[index] = 1;
                            resolve();
                        }
                    },
                );
            });
        });
        await Promise.all(preloadPromises);
        progressCallback?.(1);
    }
}
