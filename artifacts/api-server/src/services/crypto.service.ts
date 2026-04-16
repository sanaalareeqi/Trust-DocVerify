import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// حساب Hash الوثيقة (SHA-256)
export const hashDocument = async (buffer: Buffer): Promise<string> => {
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
};

// حساب Hash للنص العادي
export const hashMessage = async (message: string): Promise<string> => {
  const hash = crypto.createHash("sha256");
  hash.update(message);
  return hash.digest("hex");
};

// إنشاء زوج مفاتيح RSA
export const generateKeyPair = (): { publicKey: string; privateKey: string } => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
};

// توقيع الهاش بالمفتاح الخاص
export const signHash = (hash: string, privateKeyPem: string): string => {
  const sign = crypto.createSign("SHA256");
  sign.update(hash);
  sign.end();
  return sign.sign(privateKeyPem, "base64");
};

// التحقق من التوقيع بالمفتاح العام
export const verifySignature = (
  hash: string,
  signature: string,
  publicKeyPem: string
): boolean => {
  const verify = crypto.createVerify("SHA256");
  verify.update(hash);
  verify.end();
  return verify.verify(publicKeyPem, signature, "base64");
};

// الحصول على المفتاح الخاص للمستخدم (من ملف آمن)
export const getPrivateKeyForUser = async (userId: number): Promise<string | null> => {
  const keysDir = path.join(__dirname, "../../keys");
  const keyPath = path.join(keysDir, `user_${userId}_private.pem`);
  
  try {
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, "utf-8");
    }
    return null;
  } catch (error) {
    console.error(`Error reading private key for user ${userId}:`, error);
    return null;
  }
};

// تخزين المفتاح الخاص للمستخدم
export const savePrivateKeyForUser = async (
  userId: number,
  privateKey: string
): Promise<void> => {
  const keysDir = path.join(__dirname, "../../keys");
  
  // تأكد من وجود مجلد المفاتيح
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }
  
  const keyPath = path.join(keysDir, `user_${userId}_private.pem`);
  fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });
};

// حذف المفتاح الخاص للمستخدم (عند إبطاله)
export const deletePrivateKeyForUser = async (userId: number): Promise<void> => {
  const keysDir = path.join(__dirname, "../../keys");
  const keyPath = path.join(keysDir, `user_${userId}_private.pem`);
  
  try {
    if (fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
    }
  } catch (error) {
    console.error(`Error deleting private key for user ${userId}:`, error);
  }
};