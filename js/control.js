// 添加右下角控制点，独立控制宽高
fabric.Object.prototype.controls.br = new fabric.Control({
  x: 0.5,
  y: 0.5,
  cursor: "nwse-resize",
  actionName: "resize",

  mouseDownHandler: function (eventData, transform) {
    const target = transform.target;
    const canvas = target.canvas;
    const pointer = canvas.getPointer(eventData.e); // ← 这里取到正确坐标

    target._resizeStart = {
      width: target.width * target.scaleX,
      height: target.height * target.scaleY,
      pointer,
    };
    return true;
  },

  actionHandler: function (eventData, transform) {
    const target = transform.target;
    const canvas = target.canvas;
    const start = target._resizeStart;
    if (!start) return false;

    const pointer = canvas.getPointer(eventData.e);
    const deltaX = pointer.x - start.pointer.x;
    const deltaY = pointer.y - start.pointer.y;

    target.set({
      width: Math.max(1, start.width + deltaX),
      height: Math.max(1, start.height + deltaY),
      scaleX: 1,
      scaleY: 1,
    });
    target.setCoords();
    return true;
  },

  mouseUpHandler: function (eventData, transform) {
    const target = transform.target;
    delete target._resizeStart;
    return true;
  },

  render: fabric.controlsUtils.renderCircleControl,
});
