import {
    _decorator,
    Component,
    EventTouch,
    Label,
    Node,
    settings,
    Sorting2D,
    Vec2,
} from 'cc';
const { ccclass } = _decorator;

/**
 * 给 UI 节点设置 Sorting2D 层级，避免 Label 交错打断合批。
 * @param sortingNode 目标节点
 * @param sortingLayer 项目设置里的 layer value
 * @param sortingOrder 同层内顺序（可选）
 */
export function changeUISortingLayer(
    sortingNode: Node,
    sortingLayer: number,
    sortingOrder?: number,
): void {
    if (!sortingNode || !Sorting2D) {
        return;
    }
    let sortingLayers = settings.querySettings('engine', 'sortingLayers') as any[];
    if (!sortingLayers || sortingLayers.length === 0) {
        sortingLayers = [{ id: 0, value: 0, name: 'default' }];
    }
    const result = sortingLayers.find((layer) => layer.value === sortingLayer);
    if (!result) {
        console.warn(`未找到 sortingLayer:${sortingLayer}，改用默认层`);
        sortingLayer = sortingLayers[0].value;
    }
    const sort2d = sortingNode.getComponent(Sorting2D) || sortingNode.addComponent(Sorting2D);
    if (sort2d) {
        sort2d.sortingLayer = sortingLayer;
        if (sortingOrder !== undefined) {
            sort2d.sortingOrder = sortingOrder;
        }
    }
}

/**
 * 虚拟列表子项：点击判定（滑动超过阈值不算点）+ 可选按压缩放。
 * 挂到 item 预制体根节点。玩法数据刷新请用 VirtualScrollView.renderItemFn。
 */
@ccclass('VScrollViewItem')
export class VScrollViewItem extends Component {
    /** 当前 item 对应的数据下标 */
    public dataIndex: number = -1;
    /** 按下时是否缩放到 0.95 */
    public useItemClickEffect: boolean = true;
    /** 点击回调（由 VirtualScrollView 注入） */
    public onClickCallback: ((index: number) => void) | null = null;

    private _touchStartNode: Node | null = null;
    private _isCanceled: boolean = false;
    private _startPos: Vec2 = new Vec2();
    private _moveThreshold: number = 40;
    private _clickThreshold: number = 10;

    onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
    }

    onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
    }

    /**
     * 给所有子 Label 单独排 Sorting2D order，减少合批打断。
     */
    public onSortLayer(): void {
        let orderNumber = 1;
        const labels = this.node.getComponentsInChildren(Label);
        for (let i = 0; i < labels.length; i++) {
            changeUISortingLayer(labels[i].node, 0, orderNumber);
            orderNumber++;
        }
    }

    /** 关闭渲染分层（order 归 0） */
    public offSortLayer(): void {
        const labels = this.node.getComponentsInChildren(Label);
        for (let i = 0; i < labels.length; i++) {
            changeUISortingLayer(labels[i].node, 0, 0);
        }
    }

    /**
     * 更新数据下标。列表内容请在 renderItemFn 里画，这里只记 index。
     */
    public setDataIndex(index: number): void {
        this.dataIndex = index;
    }

    private _onTouchStart(e: EventTouch): void {
        this._touchStartNode = this.node;
        this._isCanceled = false;
        e.getLocation(this._startPos);
        if (this.useItemClickEffect) {
            this.node.setScale(0.95, 0.95);
        }
    }

    private _onTouchMove(e: EventTouch): void {
        if (this._isCanceled) {
            return;
        }
        const movePos = e.getLocation();
        const dx = movePos.x - this._startPos.x;
        const dy = movePos.y - this._startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this._moveThreshold) {
            this._isCanceled = true;
            this._restoreScale();
            this._touchStartNode = null;
        }
    }

    private _onTouchEnd(e: EventTouch): void {
        if (this._isCanceled) {
            this._reset();
            return;
        }
        this._restoreScale();
        const endPos = e.getLocation();
        const dx = endPos.x - this._startPos.x;
        const dy = endPos.y - this._startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this._clickThreshold && this._touchStartNode === this.node && this.onClickCallback) {
            this.onClickCallback(this.dataIndex);
        }
        this._reset();
    }

    private _onTouchCancel(): void {
        this._restoreScale();
        this._reset();
    }

    private _restoreScale(): void {
        if (this.useItemClickEffect) {
            this.node.setScale(1, 1);
        }
    }

    private _reset(): void {
        this._touchStartNode = null;
        this._isCanceled = false;
    }
}
