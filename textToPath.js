const fs = require("fs");
const { PDFDocument, rgb, PageSizes } = require("pdf-lib");
// 使用 @pdf-lib/fontkit 来直接创建字体对象
const fontkit = require("@pdf-lib/fontkit");

async function createPdf() {
  console.log("正在创建空白 PDF 文档..."); // 创建一个新的 A4 大小 PDF 文档

  const pdfDoc = await PDFDocument.create(); // 添加一个 A4 大小的空白页

  const page = pdfDoc.addPage(PageSizes.A4); // 加载中文字体
  console.log("正在加载中文字体...");
  const fontBytes = fs.readFileSync("SourceHanSansCN-Regular.ttf"); // ========================================================= // *** 核心：直接使用 fontkit.create 获取 fontObj *** // =========================================================

  const fontObj = fontkit.create(fontBytes); // 获取页面尺寸 (这里主要用于参考，但不是必须的)

  const text = "文字"; // 坐标和字号 // X坐标：从左侧边缘开始 50 单位

  let x = 150; // *** 修正点：Y坐标：从底部边缘向上 50 单位 ***
  const y = 150;
  const fontSize = 14;

  if (!fontObj) {
    throw new Error(
      "致命错误：无法通过 fontkit.create() 创建字体对象。请检查字体文件是否有效。"
    );
  }

  // *** 获取字体的度量信息（用于正确对齐） ***
  const ascender = fontObj.ascent;
  const unitsPerEm = fontObj.unitsPerEm;

  // 计算缩放比例和 Y 轴偏移量
  const scale = fontSize / unitsPerEm;
  // yOffset 是将字形基线（font Y=0）提升到我们设定的 y 坐标所需的偏移量
  const yOffset = ascender * scale;

  console.log(
    `正在将文字：“${text}” 转曲并绘制为矢量路径 (字号 ${fontSize})...`
  );
  let penX = x; // 遍历文本中的每个字符，将其绘制为 SVG 路径

  for (const char of text) {
    // 1. 获取字形
    const codePoint = char.codePointAt(0);
    const glyph = fontObj.glyphForCodePoint(codePoint);

    if (!glyph) {
      console.warn(`跳过无法获取字形的字符: ${char}`); // 遇到无法处理的字符时，根据字号推进笔刷位置
      penX += fontSize * 0.5;
      continue;
    } // 2. 获取 SVG 路径

    const path = glyph.path; // fontkit Path 对象 // 3. 绘制路径（即“转曲”文字）

    page.drawSvgPath(
      path.toSVG({
        x: penX,
        // 调整 Y 坐标：确保文字主体对齐到我们设定的 y 坐标
        // 因为 y 是接近底部的正值，减去 yOffset 会让路径整体下移
        // 注意：如果字体设计基线（Y=0）位于主体底部，可能需要加上 yOffset
        // 但对于大多数字体，减去 yOffset 是正确的，它将基线定位到 y 坐标
        y: y - yOffset,
        scaleX: scale,
        scaleY: scale,
      }),
      {
        color: rgb(0, 0, 0), // 填充颜色
        borderWidth: 0,
      }
    ); // 4. 根据字形宽度推进笔的位置

    penX += glyph.advanceWidth * scale;
  }
  console.log("文字转曲绘制完成。"); // 绘制一个矩形作为参考，位于文字下方

  page.drawRectangle({
    x: 50,
    y: 50 - 30, // 距离底部 20 单位
    width: 300,
    height: 2,
    color: rgb(0.8, 0.8, 0.8),
  }); // 保存 PDF

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("new_a4_vector_bottom_left.pdf", pdfBytes);
  console.log("PDF 已成功生成: new_a4_vector_bottom_left.pdf (空白 A4 文档)");
}

createPdf().catch((err) => {
  console.error("生成 PDF 过程中发生错误:");
  console.error(err);
});
