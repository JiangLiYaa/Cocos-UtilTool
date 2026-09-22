import { Graphics, Node, UITransform, Vec3 } from 'cc';

/** 刮层检测格子：子节点包围盒 + 是否已刮开 */
export interface ScratchHitBox {
    name: Node;
    left: number;
    right: number;
    top: number;
    bottom: number;
    state: boolean;
}

/** 自动刮路径的一段：起点 qs、终点 zd、长度 jl */
export interface ScratchStroke {
    qs: Vec3;
    zd: Vec3;
    jl: number;
}

/**
 * 刮刮乐 Graphics 擦除：盖章、检测格、自动刮折线。
 */
export class ScratchUtil {
    /**
     * 在 Graphics 上盖一笔（圆 + 可选线段），用来刮开涂层。
     * @param tar 带 Graphics 的遮罩节点
     * @param fanwei 笔刷半径
     * @param wz 当前点
     * @param wz2 上一点；有则连线，避免刮得断断续续
     */
    static clears(tar: Node, fanwei: number, wz: Vec3, wz2: Vec3 | null = null): void {
        const g = tar?.getComponent(Graphics);
        if (!g) {
            return;
        }
        g.circle(wz.x, wz.y, fanwei);
        g.fill();
        if (wz2) {
            g.lineWidth = fanwei * 2;
            g.moveTo(wz.x, wz.y);
            g.lineTo(wz2.x, wz2.y);
            g.stroke();
            g.fill();
        }
    }

    /**
     * 把检测层每个子节点做成包围盒，供「刮到格子」判定。
     * @param ck 检测格父节点
     */
    static initCheckBox(ck: Node): ScratchHitBox[] {
        const box: ScratchHitBox[] = [];
        if (!ck) {
            return box;
        }
        for (let i = 0; i < ck.children.length; i++) {
            const child = ck.children[i];
            const size = child.getComponent(UITransform);
            if (!size) {
                continue;
            }
            const pos = child.position;
            box.push({
                name: child,
                left: pos.x - size.width / 2,
                right: pos.x + size.width / 2,
                top: pos.y + size.height / 2,
                bottom: pos.y - size.height / 2,
                state: false,
            });
        }
        return box;
    }

    /**
     * 生成自动刮的折线路径（之字形铺满矩形）。
     * @param width 区域宽
     * @param height 区域高
     * @param pos 区域中心
     * @param fanwei 笔刷直径（步长）
     */
    static jslj(width: number, height: number, pos: Vec3, fanwei: number): ScratchStroke[] {
        if (fanwei <= 0) {
            return [];
        }
        const zsj = new Vec3(pos.x - width / 2, pos.y + height / 2);
        const zzd = new Vec3(pos.x + width / 2, pos.y - height / 2);
        const bjz = width / fanwei;
        const hbjz = height / bjz;
        const ljsz: ScratchStroke[] = [];
        for (let i = 0; i < bjz * 2; i++) {
            if (i < bjz) {
                const x = new Vec3(zsj.x + i * fanwei, zsj.y);
                const y = new Vec3(zsj.x, zsj.y - i * hbjz);
                if (i % 2 === 0) {
                    ljsz.push({ qs: y, zd: x, jl: Vec3.distance(x, y) });
                } else {
                    ljsz.push({ qs: x, zd: y, jl: Vec3.distance(x, y) });
                }
            } else {
                const x = new Vec3(zzd.x - (bjz - (i - bjz)) * fanwei, zzd.y);
                const y = new Vec3(zzd.x, zzd.y + (bjz - (i - bjz)) * hbjz);
                if (i % 2 === 0) {
                    ljsz.push({ qs: x, zd: y, jl: Vec3.distance(x, y) });
                } else {
                    ljsz.push({ qs: y, zd: x, jl: Vec3.distance(x, y) });
                }
            }
        }
        return ljsz;
    }
}
