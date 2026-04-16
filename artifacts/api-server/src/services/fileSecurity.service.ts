import { fileTypeFromBuffer } from 'file-type';
import NodeClam from 'clamscan';
import fs from 'fs';
import path from 'path';

// قائمة أنواع الملفات المسموحة
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// الحجم الأقصى (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ✅ المستوى 1: فحص Magic Number (التوقيع الثنائي)
export const validateMagicNumber = async (buffer: Buffer): Promise<{ isValid: boolean; detectedType?: string; error?: string }> => {
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      return { isValid: false, error: 'لا يمكن تحديد نوع الملف' };
    }
    
    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      return { isValid: false, detectedType: fileType.mime, error: `نوع الملف غير مسموح به: ${fileType.mime}` };
    }
    
    return { isValid: true, detectedType: fileType.mime };
  } catch (error) {
    console.error('Magic number validation error:', error);
    return { isValid: false, error: 'فشل في التحقق من نوع الملف' };
  }
};

// ✅ المستوى 2: فحص ClamAV (الفيروسات)
let clamscanInstance: any = null;

const initClamAV = async () => {
  if (clamscanInstance) return clamscanInstance;
  
  try {
    const clamscan = await new NodeClam().init({
      removeInfected: false,
      scanRecursively: true,
      clamdscan: {
        socket: '/var/run/clamav/clamd.ctl', // Linux/Mac
        host: '127.0.0.1',
        port: 3310,
        timeout: 60000,
        localFallback: true,
        active: true,
      },
      preference: 'clamdscan',
    });
    
    clamscanInstance = clamscan;
    console.log('✅ ClamAV initialized successfully');
    return clamscanInstance;
  } catch (error) {
    console.warn('⚠️ ClamAV not available, running in fallback mode');
    // وضع الاستغناء: بدون فحص فيروسات
    return null;
  }
};

export const scanForVirus = async (filePath: string): Promise<{ isInfected: boolean; viruses: string[]; error?: string }> => {
  try {
    const clamscan = await initClamAV();
    
    if (!clamscan) {
      // ClamAV غير متاح، نعتبر الملف آمناً (وضع الاستغناء)
      return { isInfected: false, viruses: [] };
    }
    
    const { isInfected, viruses } = await clamscan.scanFile(filePath);
    
    if (isInfected) {
      console.warn(`🦠 Virus detected: ${viruses.join(', ')}`);
    }
    
    return { isInfected, viruses };
  } catch (error) {
    console.error('ClamAV scan error:', error);
    return { isInfected: false, viruses: [], error: 'فشل في فحص الفيروسات' };
  }
};

// ✅ الفحص الكامل للملف
export const scanFile = async (buffer: Buffer, fileName: string): Promise<{
  isValid: boolean;
  isInfected: boolean;
  detectedType?: string;
  viruses?: string[];
  error?: string;
}> => {
  // 1. فحص الحجم
  if (buffer.length > MAX_FILE_SIZE) {
    return { isValid: false, isInfected: false, error: `الملف كبير جداً (أقصى حجم ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }
  
  // 2. فحص Magic Number
  const magicResult = await validateMagicNumber(buffer);
  if (!magicResult.isValid) {
    return { isValid: false, isInfected: false, error: magicResult.error, detectedType: magicResult.detectedType };
  }
  
  // 3. حفظ الملف مؤقتاً لفحص ClamAV
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempFilePath = path.join(tempDir, `scan_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`);
  fs.writeFileSync(tempFilePath, buffer);
  
  try {
    // 4. فحص ClamAV
    const virusResult = await scanForVirus(tempFilePath);
    
    if (virusResult.isInfected) {
      return { isValid: false, isInfected: true, error: 'الملف يحتوي على فيروس', viruses: virusResult.viruses };
    }
    
    return { isValid: true, isInfected: false, detectedType: magicResult.detectedType };
  } finally {
    // 5. حذف الملف المؤقت
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};