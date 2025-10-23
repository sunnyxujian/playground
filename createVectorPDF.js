const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

async function createPdf() {
  // 读取模板 PDF
  const existingPdfBytes = fs.readFileSync("template.pdf");

  // 加载 PDF
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // 注册 fontkit
  pdfDoc.registerFontkit(fontkit);

  // 嵌入字体
  const fontBytes = fs.readFileSync("SourceHanSansCN-Regular.ttf");
  const font = await pdfDoc.embedFont(fontBytes);

  // 获取第一页
  const page = pdfDoc.getPage(0);
  const { width, height } = page.getSize();

  // 绘制文字
  page.drawText("姓名：张三", {
    x: 100,
    y: height - 150,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText("编号：A2025-001", {
    x: 100,
    y: height - 180,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText("日期：2025年10月23日", {
    x: 100,
    y: height - 210,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });

  // ✅ 绘制矢量矩形
  const rectWidth = 200;
  const rectHeight = 100;
  const rectX = 100;
  const rectY = height - 100 - rectHeight; // 左上角100,100

  page.drawRectangle({
    x: rectX,
    y: rectY,
    width: rectWidth,
    height: rectHeight,
    color: rgb(0.9, 0.9, 0.9), // 填充色
    borderColor: rgb(0, 0, 0), // 边框颜色
    borderWidth: 2, // 边框宽度
  });

  // 保存 PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("filled.pdf", pdfBytes);
}

createPdf().catch((err) => console.log(err));
