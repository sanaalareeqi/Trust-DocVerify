import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * generates a QR code as a Buffer
 */
export const generateQRCodeBuffer = async (docId: number): Promise<Buffer> => {
  const verifyUrl = ` https://vjmau-134-35-63-250.run.pinggy-free.link/verify/${docId}`;
  console.log(`📱 Generating QR code for URL: ${verifyUrl}`);
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 300, // زيادة الحجم قليلاً لضمان الجودة
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H'
  });
  console.log(`✅ QR code generated, size: ${qrBuffer.length} bytes`);
  return qrBuffer;
};

/**
 * Adds a QR code and metadata to a PDF document
 */
export const addQRCodeToPDF = async (pdfBuffer: Buffer, docId: number): Promise<Buffer> => {
  console.log(`\n--- 📄 [PDF DIAGNOSTICS START] ---`);
  console.log(`📄 Document ID: ${docId}`);
  console.log(`📄 Input PDF size: ${pdfBuffer.length} bytes`);
  
  try {
    // 1. Generate QR Code
    const qrBuffer = await generateQRCodeBuffer(docId);
    console.log(`📄 QR Buffer size: ${qrBuffer.length} bytes`);
    
    // 2. Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    if (pages.length === 0) {
      console.warn('⚠️ PDF has no pages, returning original buffer');
      return pdfBuffer;
    }
    
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    console.log(`📄 Page Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)}`);
    
    // 3. Embed QR Code Image
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const qrSize = 100; // حجم ثابت للـ QR
    const margin = 25;
    
    // Position: Bottom Right
    const qrX = width - qrSize - margin;
    const qrY = margin;
    
    console.log(`📄 Drawing QR at: x=${qrX.toFixed(2)}, y=${qrY.toFixed(2)}, size=${qrSize}`);
    
    // 4. Draw QR Code - Ensure it's on top
    firstPage.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
      opacity: 1,
    });
    
    // 5. Add Texts
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Arabic text workaround for pdf-lib (drawing characters individually or using a font that supports it)
    // Note: StandardFonts.Helvetica doesn't support Arabic glyphs. 
    // We'll use English as a fallback if Arabic fails, or try to draw it.
    // For now, let's use the provided text and ensure positioning is correct.
    
    const titleText = 'SCAN TO VERIFY'; // 'مسح للتحقق'
    const titleSize = 10;
    const titleWidth = font.widthOfTextAtSize(titleText, titleSize);
    
    firstPage.drawText(titleText, {
      x: qrX + (qrSize - titleWidth) / 2,
      y: qrY + qrSize + 5,
      size: titleSize,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    const docIdText = `Doc ID: ${docId}`; // `رقم الوثيقة: ${docId}`
    const docIdSize = 8;
    const docIdWidth = font.widthOfTextAtSize(docIdText, docIdSize);
    
    firstPage.drawText(docIdText, {
      x: qrX + (qrSize - docIdWidth) / 2,
      y: qrY - 12,
      size: docIdSize,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    // 6. Save and Return
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false }); // Disable object streams for better compatibility
    console.log(`📄 Output PDF size: ${pdfBytes.length} bytes`);
    console.log(`📄 Size Change: ${pdfBytes.length - pdfBuffer.length} bytes`);
    console.log(`--- 📄 [PDF DIAGNOSTICS END] ---\n`);
    
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error("❌ CRITICAL ERROR in addQRCodeToPDF:", error);
    return pdfBuffer;
  }
};

/**
 * Adds a QR code to an image
 */
export const addQRCodeToImage = async (imageBuffer: Buffer, docId: number): Promise<Buffer> => {
  console.log(`🖼️ [IMAGE] Starting addQRCodeToImage for doc ${docId}`);
  try {
    const sharp = require('sharp');
    const qrBuffer = await generateQRCodeBuffer(docId);
    
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 800;
    const originalHeight = metadata.height || 600;
    
    const qrSize = Math.floor(originalWidth * 0.15); // 15% of width
    const padding = 20;
    
    const qrImage = await sharp(qrBuffer).resize(qrSize, qrSize).toBuffer();
    
    // Add QR to the bottom right with a white background patch
    const result = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${qrSize + 20}" height="${qrSize + 40}">
              <rect x="0" y="0" width="${qrSize + 20}" height="${qrSize + 40}" fill="white" />
              <text x="50%" y="15" font-family="Arial" font-size="12" text-anchor="middle">VERIFY</text>
            </svg>`
          ),
          gravity: 'southeast'
        },
        {
          input: qrImage,
          gravity: 'southeast',
          top: originalHeight - qrSize - 10,
          left: originalWidth - qrSize - 10
        }
      ])
      .toBuffer();
      
    return result;
  } catch (error) {
    console.error("❌ Error adding QR to image:", error);
    return imageBuffer;
  }
};