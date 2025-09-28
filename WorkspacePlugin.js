import { fabric } from "fabric";
import { throttle } from "lodash-es";
import Hammer from "hammerjs";

class WorkspacePlugin {
  constructor(canvas, editor) {
    this.canvas = canvas;
    this.editor = editor;
    this.workspace = null;
    this.init({
      width: 50,
      height: 20,
    });
    this.zoomRatio = 0.85;
    this.initialDistance = null;
    this.initialZoom = null;
  }

  static pluginName = "WorkspacePlugin";
  static events = [
    "sizeChange",
    "viewportChange",
    "viewportReset",
    "scaleChanged",
  ];
  static apis = [
    "big",
    "small",
    "auto",
    "one",
    "setSize",
    "getWorkspace",
    "setWorkspaseBg",
    "setCenterFromObject",
  ];

  workspaceEl;
  workspace;
  resizeObserver;
  option;
  zoomRatio;
  bizInfo;

  init(option) {
    const workspaceEl = document.querySelector("#workspace");
    if (!workspaceEl) {
      throw new Error("element #workspace is missing, plz check!");
    }
    this.workspaceEl = workspaceEl;
    this.workspace = null;
    this.option = option;
    this._initBackground();
    this._initWorkspace();
    this._initResizeObserve();
    this._initTouchEvents(); // 改成移动端手势事件
    this._bindWheel();
    // this._initRenderOverlay()
  }

  _initRenderOverlay() {
    // 当元素超出workspace元素时，在 upper-canvas 上绘制警告信息，
    // const that = this
    // this.canvas._renderOverlay = function (ctx) {
    //   // 设置绘制样式
    //   ctx.fillStyle = '#999999'
    //   ctx.font = '12px PingFang SC'
    //   ctx.textAlign = 'center'
    //   ctx.textBaseline = 'middle'
    //   const { perRollNum = 0, material = '', width = 0, height = 0 } = that.bizInfo
    //   const widthLabelX = (that.canvas.width || 0) / 2
    //   const widthString = `超出的部分不会被打印，请确保设计内容在 ${width}mm x ${height}mm 范围内，否则可能会出现打印错误`
    //   const widthLabelY = that.workspace.height * that.canvas.getZoom() + 20
    //   // 绘制文本
    //   ctx.fillText(widthString, widthLabelX, widthLabelY)
    // }
  }

  hookImportAfter() {
    return new Promise((resolve) => {
      const workspace = this.canvas
        .getObjects()
        .find((item) => item.id === "workspace");
      if (workspace) {
        workspace.set("selectable", false);
        workspace.set("hasControls", false);
        workspace.set("evented", false);
        if (workspace.width && workspace.height) {
          this.setSize(workspace.width, workspace.height);
          this.editor.emit("sizeChange", workspace.width, workspace.height);
        }
      }
      resolve("");
    });
  }

  hookSaveAfter() {
    return new Promise((resolve) => {
      this.auto();
      resolve(true);
    });
  }

  // 初始化背景
  _initBackground() {
    this.canvas.backgroundImage = "";
    this.canvas.setWidth(this.workspaceEl.offsetWidth);
    this.canvas.setHeight(this.workspaceEl.offsetHeight);
  }

  // 初始化画布
  _initWorkspace() {
    const { width, height } = this.option;
    const workspace = new fabric.Rect({
      fill: "rgba(255,255,255,1)",
      width,
      height,
      id: "workspace",
      strokeWidth: 0,
    });
    workspace.set("selectable", false);
    workspace.set("hasControls", false);
    workspace.hoverCursor = "default";
    this.canvas.add(workspace);
    this.canvas.renderAll();
    this.workspace = workspace;
    if (this.canvas.clearHistory) {
      this.canvas.clearHistory();
    }
    this.auto();
  }

  // 返回workspace对象
  getWorkspace() {
    return this.canvas.getObjects().find((item) => item.id === "workspace");
  }

  /**
   * 设置画布中心到指定对象中心点上
   * @param {Object} obj 指定的对象
   */
  setCenterFromObject(obj, horizon = false) {
    const { canvas } = this;
    const objCenter = obj.getCenterPoint();
    const viewportTransform = canvas.viewportTransform;
    if (!canvas.width || !canvas.height || !viewportTransform) return;

    // 水平居中
    viewportTransform[4] =
      canvas.width / 2 - objCenter.x * viewportTransform[0];

    if (horizon) {
      // 垂直居中
      viewportTransform[5] =
        canvas.height / 2 - objCenter.y * viewportTransform[3];
    } else {
      // 垂直方向保持默认（不改 viewportTransform[5]）
      viewportTransform[5] = 5;
    }

    canvas.setViewportTransform(viewportTransform);
    canvas.renderAll();
  }

  // 初始化监听器
  _initResizeObserve() {
    const resizeObserver = new ResizeObserver(
      throttle(() => {
        this.auto();
      }, 50)
    );
    this.resizeObserver = resizeObserver;
    this.resizeObserver.observe(this.workspaceEl);
  }

  setSize(width, height) {
    this._initBackground();
    this.option.width = width;
    this.option.height = height;
    this.workspace = this.canvas
      .getObjects()
      .find((item) => item.id === "workspace");
    this.workspace.set("width", width);
    this.workspace.set("height", height);
    this.editor.emit("sizeChange", this.workspace.width, this.workspace.height);
    this.auto();
  }

  setZoomAuto(scale, cb) {
    const { workspaceEl } = this;
    const width = workspaceEl.offsetWidth;
    const height = workspaceEl.offsetHeight;
    this.canvas.setWidth(width);
    this.canvas.setHeight(height);
    const center = this.canvas.getCenter();
    this.canvas.setViewportTransform(fabric.iMatrix.concat());
    this.canvas.zoomToPoint(new fabric.Point(center.left, center.top), scale);
    if (!this.workspace) return;
    this.setCenterFromObject(this.workspace);
    if (cb) cb(this.workspace.left, this.workspace.top);
  }

  _getScale() {
    return fabric.util.findScaleToFit(this.getWorkspace(), {
      width: this.workspaceEl.offsetWidth,
      height: this.workspaceEl.offsetHeight,
    });
  }

  // 放大
  big() {
    let zoomRatio = this.canvas.getZoom();
    zoomRatio += 0.05;
    const center = this.canvas.getCenter();
    this.canvas.zoomToPoint(
      new fabric.Point(center.left, center.top),
      zoomRatio
    );
  }

  // 缩小
  small() {
    let zoomRatio = this.canvas.getZoom();
    zoomRatio -= 0.05;
    const center = this.canvas.getCenter();
    this.canvas.zoomToPoint(
      new fabric.Point(center.left, center.top),
      zoomRatio < 0 ? 0.01 : zoomRatio
    );
  }

  // 自动缩放
  auto() {
    const scale = this._getScale();
    this.setZoomAuto(scale * this.zoomRatio);
    this.editor.emit("viewportReset", null);
  }

  // 1:1 放大
  one() {
    this.setZoomAuto(1 * this.zoomRatio);
    this.canvas.requestRenderAll();
  }

  setWorkspaseBg(color) {
    const workspase = this.getWorkspace();
    workspase?.set("fill", color);
  }

  zoomTo(scale, horizon = false) {
    const { canvas, workspace } = this;
    if (!workspace) return;

    const viewportTransform = canvas.viewportTransform;

    // 重置缩放到指定倍数
    canvas.setZoom(scale);

    // 计算水平居中
    const objCenter = workspace.getCenterPoint();
    viewportTransform[4] =
      canvas.width / 2 - objCenter.x * viewportTransform[0];

    if (horizon) {
      // 计算垂直居中
      viewportTransform[5] =
        canvas.height / 2 - objCenter.y * viewportTransform[3];
    } else {
      // 顶部对齐（这里设置留白为 0，你可以改成想要的间距）
      viewportTransform[5] = 0;
    }

    canvas.setViewportTransform(viewportTransform);
    canvas.renderAll();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.canvas.off();
    console.log("pluginDestroy");
    if (this._hammer) {
      this._hammer.destroy();
    }
  }
}

export { WorkspacePlugin as default };
