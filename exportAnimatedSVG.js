(function () {
  function esc(val) {
    return String(val ?? "").replace(/"/g, "&quot;");
  }

  function toAttrStr(attrs) {
    return Object.entries(attrs)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}="${esc(v)}"`)
      .join(" ");
  }

  function buildTransform(obj) {
    const transforms = [];
    // translate
    transforms.push(`translate(${obj.left || 0} ${obj.top || 0})`);
    // rotate
    if (obj.angle) {
      const ox =
        obj.originX === "center"
          ? ((obj.width || 0) * (obj.scaleX || 1)) / 2
          : 0;
      const oy =
        obj.originY === "center"
          ? ((obj.height || 0) * (obj.scaleY || 1)) / 2
          : 0;
      transforms.push(`rotate(${obj.angle} ${ox} ${oy})`);
    }
    // scale
    if (obj.scaleX !== 1 || obj.scaleY !== 1) {
      transforms.push(`scale(${obj.scaleX || 1} ${obj.scaleY || 1})`);
    }
    return transforms.length ? transforms.join(" ") : undefined;
  }

  function serializeObject(obj) {
    // 你也可以根据 obj.get('type') 做更细的区分
    switch (obj.type) {
      case "rect":
        return serializeRect(obj);
      case "circle":
        return serializeCircle(obj);
      case "line":
        return serializeLine(obj);
      case "path":
        return serializePath(obj);
      case "textbox":
      case "text":
        return serializeText(obj);
      default:
        return null;
    }
  }

  function serializeRect(obj) {
    const w = obj.width || 0;
    const h = obj.height || 0;
    const attrs = {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: obj.rx || 0,
      ry: obj.ry || 0,
      fill: obj.fill || "none",
      stroke: obj.stroke || "none",
      "stroke-width": obj.strokeWidth || 0,
      transform: buildTransform(obj),
    };
    const anim = buildAnimateTags(obj, "rect");
    return `<rect ${toAttrStr(attrs)}>${anim}</rect>`;
  }

  function serializeCircle(obj) {
    const r = obj.radius || 0;
    const attrs = {
      cx: r,
      cy: r,
      r,
      fill: obj.fill || "none",
      stroke: obj.stroke || "none",
      "stroke-width": obj.strokeWidth || 0,
      transform: buildTransform(obj),
    };
    const anim = buildAnimateTags(obj, "circle");
    return `<circle ${toAttrStr(attrs)}>${anim}</circle>`;
  }

  function serializeLine(obj) {
    const x1 = obj.x1 || 0;
    const y1 = obj.y1 || 0;
    const x2 = obj.x2 || 0;
    const y2 = obj.y2 || 0;
    const attrs = {
      x1,
      y1,
      x2,
      y2,
      stroke: obj.stroke || "none",
      "stroke-width": obj.strokeWidth || 1,
      transform: buildTransform(obj),
    };
    const anim = buildAnimateTags(obj, "line");
    return `<line ${toAttrStr(attrs)}>${anim}</line>`;
  }

  function serializePath(obj) {
    const d = obj.path
      ? fabric.util.joinPath(obj.path)
      : obj.pathOffset
      ? obj.pathOffset
      : obj.path;
    const attrs = {
      d: obj.path ? fabric.util.joinPath(obj.path) : obj.d || "", // 如果 fabric 版本没有 joinPath，可以用 obj.getSvgPath() / obj.toSVG() 自己拆
      fill: obj.fill || "none",
      stroke: obj.stroke || "none",
      "stroke-width": obj.strokeWidth || 1,
      transform: buildTransform(obj),
    };
    const anim = buildAnimateTags(obj, "path");
    return `<path ${toAttrStr(attrs)}>${anim}</path>`;
  }

  function serializeText(obj) {
    const attrs = {
      x: 0,
      y: 0,
      fill: obj.fill || "#000",
      "font-size": obj.fontSize || 16,
      "font-family": obj.fontFamily || "sans-serif",
      "font-weight": obj.fontWeight || "normal",
      "text-anchor":
        obj.textAlign === "center"
          ? "middle"
          : obj.textAlign === "right"
          ? "end"
          : "start",
      transform: buildTransform(obj),
      "dominant-baseline": "hanging",
    };
    const anim = buildAnimateTags(obj, "text");
    const textContent = esc(obj.text || "");
    return `<text ${toAttrStr(attrs)}>${textContent}${anim}</text>`;
  }

  function arrayToStr(arr) {
    return Array.isArray(arr) ? arr.join(";") : arr;
  }

  function buildAnimateTags(obj, tagType) {
    const list = obj.exportAnim;
    if (!Array.isArray(list) || !list.length) return "";
    return (
      "\n" +
      list
        .map((a) => {
          if (a.type === "transform" || a.tag === "animateTransform") {
            const attrs = {
              attributeName: "transform",
              attributeType: "XML",
              type: a.transformType || "translate",
              values: arrayToStr(a.values),
              from: a.from,
              to: a.to,
              dur: typeof a.dur === "number" ? `${a.dur}s` : a.dur,
              repeatCount: a.repeatCount || "indefinite",
              keyTimes: Array.isArray(a.keyTimes)
                ? a.keyTimes.join(";")
                : a.keyTimes,
              calcMode: a.calcMode,
              keySplines: Array.isArray(a.keySplines)
                ? a.keySplines.join(";")
                : a.keySplines,
              begin: a.begin,
              additive: a.additive,
              accumulate: a.accumulate,
              fill: a.fill,
            };
            return `  <animateTransform ${toAttrStr(attrs)} />`;
          } else {
            const attrs = {
              attributeName: a.attributeName,
              from: a.from,
              to: a.to,
              values: arrayToStr(a.values),
              dur: typeof a.dur === "number" ? `${a.dur}s` : a.dur,
              repeatCount: a.repeatCount || "indefinite",
              keyTimes: Array.isArray(a.keyTimes)
                ? a.keyTimes.join(";")
                : a.keyTimes,
              calcMode: a.calcMode,
              keySplines: Array.isArray(a.keySplines)
                ? a.keySplines.join(";")
                : a.keySplines,
              begin: a.begin,
              additive: a.additive,
              accumulate: a.accumulate,
              fill: a.fill,
            };
            return `  <animate ${toAttrStr(attrs)} />`;
          }
        })
        .join("\n") +
      "\n"
    );
  }

  fabric.Canvas.prototype.exportAnimatedSVG = function (opts = {}) {
    const {
      fileName = "canvas-animated.svg",
      download = true,
      background = this.backgroundColor || "white",
      viewBoxPadding = 0,
    } = opts;

    const w = this.getWidth();
    const h = this.getHeight();

    // 生成每个对象的 SVG 片段
    const pieces = this.getObjects()
      .map((o) => serializeObject(o))
      .filter(Boolean)
      .join("\n");

    const svg =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${-viewBoxPadding} ${-viewBoxPadding} ${
        w + viewBoxPadding * 2
      } ${h + viewBoxPadding * 2}">\n` +
      (background
        ? `  <rect width="100%" height="100%" fill="${background}"/>\n`
        : "") +
      pieces +
      `\n</svg>`;

    if (download) {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    return svg;
  };
})();
