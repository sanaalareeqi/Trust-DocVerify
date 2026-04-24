// crypto.service.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';

// @ts-ignore
import { secp256k1 } from '@noble/curves/secp256k1.js';

// ✅ استخدام مجلد keys
const KEYS_DIR = path.join(process.cwd(), 'keys');

// التأكد من وجود المجلد
async function ensureKeysDir() {
  try {
    await fs.access(KEYS_DIR);
  } catch {
    await fs.mkdir(KEYS_DIR, { recursive: true });
    console.log(`📁 Created keys directory at: ${KEYS_DIR}`);
  }
}

/**
 * توليد زوج مفاتيح ECC جديد (مفتاح عام ومفتاح خاص)
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  // إنشاء مفتاح خاص عشوائي 32-بايت
  const privateKeyBytes = randomBytes(32);
  const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');
  
  // اشتقاق المفتاح العام من المفتاح الخاص (بتنسيق مضغوط 33-بايت)
  const publicKeyBytes = (secp256k1 as any).getPublicKey(privateKeyBytes);
  const publicKeyHex = Buffer.from(publicKeyBytes).toString('hex');

  return { publicKey: publicKeyHex, privateKey: privateKeyHex };
}

/**
 * حفظ المفتاح الخاص في ملف على الخادم
 */
export async function savePrivateKeyForUser(userId: number, privateKey: string): Promise<void> {
  await ensureKeysDir();
  const filePath = path.join(KEYS_DIR, `user_${userId}.key`);
  await fs.writeFile(filePath, privateKey, 'utf8');
  console.log(`✅ Private key saved for user ${userId} at: ${filePath}`);
}

/**
 * استرجاع المفتاح الخاص للمستخدم من ملفه
 */
export async function getPrivateKeyForUser(userId: number): Promise<string | null> {
  try {
    const filePath = path.join(KEYS_DIR, `user_${userId}.key`);
    const privateKey = await fs.readFile(filePath, 'utf8');
    console.log(`✅ Private key found for user ${userId}`);
    return privateKey;
  } catch (error) {
    console.error(`❌ Error reading private key for user ${userId}:`, error);
    return null;
  }
}

/**
 * توقيع هاش باستخدام المفتاح الخاص
 */
/**
 * توقيع هاش باستخدام المفتاح الخاص
 */
export async function signHash(hash: string, privateKeyHex: string): Promise<string> {
  try {
    console.log(`🔐 Signing hash, private key length: ${privateKeyHex?.length}`);
    
    // تحويل الهاش من string hex إلى Uint8Array
    const hashBytes = new Uint8Array(Buffer.from(hash, 'hex'));
    console.log(`📦 Hash bytes length: ${hashBytes.length}`);
    
    // تحويل المفتاح الخاص من string hex إلى Uint8Array
    const privateKeyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
    console.log(`🔑 Private key bytes length: ${privateKeyBytes.length}`);
    
    // توقيع الهاش
    const signature = (secp256k1 as any).sign(hashBytes, privateKeyBytes);
    console.log(`✅ Signature created, type: ${typeof signature}`);
    
    // ✅ التحقق من نوع التوقيع وتحويله بشكل صحيح
    let signatureBytes: Uint8Array;
    
    if (typeof signature === 'object' && signature !== null) {
      // إذا كان التوقيع كائناً به r و s
      if (signature.r !== undefined && signature.s !== undefined) {
        // تحويل r و s إلى DER format
        const rBytes = signature.r instanceof Uint8Array ? signature.r : new Uint8Array(Buffer.from(signature.r.toString(16), 'hex'));
        const sBytes = signature.s instanceof Uint8Array ? signature.s : new Uint8Array(Buffer.from(signature.s.toString(16), 'hex'));
        
        // بناء توقيع DER بسيط
        const derLength = rBytes.length + sBytes.length + 4;
        const der = new Uint8Array(derLength + 2);
        der[0] = 0x30;
        der[1] = derLength;
        der[2] = 0x02;
        der[3] = rBytes.length;
        der.set(rBytes, 4);
        der[4 + rBytes.length] = 0x02;
        der[5 + rBytes.length] = sBytes.length;
        der.set(sBytes, 6 + rBytes.length);
        
        signatureBytes = der;
      } else if (typeof signature.toDERRawBytes === 'function') {
        signatureBytes = signature.toDERRawBytes();
      } else if (signature instanceof Uint8Array) {
        signatureBytes = signature;
      } else {
        throw new Error('Unsupported signature format');
      }
    } else {
      throw new Error('Invalid signature object');
    }
    
    // إرجاع التوقيع بصيغة Base64
    const result = Buffer.from(signatureBytes).toString('base64');
    console.log(`✅ Signature converted to Base64, length: ${result.length}`);
    return result;
  } catch (error) {
    console.error('❌ Sign error:', error);
    throw new Error('فشل في توقيع المستند: ' + (error as Error).message);
  }
}

/**
 * التحقق من صحة توقيع باستخدام المفتاح العام
 */
export async function verifySignature(hash: string, signatureBase64: string, publicKeyHex: string): Promise<boolean> {
  try {
    // تحويل البيانات من النصوص إلى Uint8Array
    const hashBytes = new Uint8Array(Buffer.from(hash, 'hex'));
    const signatureBytes = new Uint8Array(Buffer.from(signatureBase64, 'base64'));
    const publicKeyBytes = new Uint8Array(Buffer.from(publicKeyHex, 'hex'));

    // التحقق من التوقيع
    const isValid = (secp256k1 as any).verify(signatureBytes, hashBytes, publicKeyBytes);
    console.log(`🔍 Signature verification result: ${isValid}`);
    return isValid;
  } catch (error) {
    console.error("❌ Signature verification failed:", error);
    return false;
  }
}