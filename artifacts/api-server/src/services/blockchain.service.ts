import { ethers } from "ethers";
import { logger } from "../lib/logger";
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// ─── ABI عقد DocumentRegistry (سلسلة الهاشات) ─────────────────────────────────
const CONTRACT_ABI = [
  // دوال الكتابة
  "function addDocumentHash(string documentHash, string previousHash) external returns (uint256)",
  
  // دوال القراءة
  "function getDocumentHash(uint256 docId) external view returns (string)",
  "function getPreviousHash(uint256 docId) external view returns (string)",
  "function getNextHash(string documentHash) external view returns (string)",
  "function verifyChain(uint256 startDocId) external view returns (bool isValid, uint256 chainLength, string[] hashes)",
  "function getAllHashes() external view returns (uint256[] ids, string[] hashes, string[] previousHashes, uint256[] timestamps)",
  "function documentCounter() external view returns (uint256)",
  "function hashExists(string documentHash) external view returns (bool)",
  
  // الأحداث
  "event DocumentAdded(uint256 indexed docId, string documentHash, string previousHash, uint256 timestamp, address creator)",
];
// ────────────────────────────────────────────────────────────────────────────

function getContractWriter(): { wallet: ethers.Wallet; contract: ethers.Contract } {
  console.log("🔍 === DEBUG Blockchain Service ===");
  console.log("🔍 ALCHEMY_RPC_URL:", process.env.ALCHEMY_RPC_URL ? "✅ موجود" : "❌ غير موجود");
  console.log("🔍 PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ موجود" : "❌ غير موجود");
  console.log("🔍 CONTRACT_ADDRESS:", process.env.CONTRACT_ADDRESS);
  console.log("🔍 ===============================");
  
  const rpcUrl          = process.env.ALCHEMY_RPC_URL;
  const privateKey      = process.env.PRIVATE_KEY;
  const contractAddress = "0xC69FB6b526886cd211cdb9617eFDe6d6d1c1d940";

  if (!rpcUrl)          throw new Error("ALCHEMY_RPC_URL غير معرّف في متغيرات البيئة");
  if (!privateKey)      throw new Error("PRIVATE_KEY غير معرّف في متغيرات البيئة");
  if (!contractAddress) throw new Error("CONTRACT_ADDRESS غير معرّف في متغيرات البيئة");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

  return { wallet, contract };
}
function getContractReader(): ethers.Contract {
  const rpcUrl          = process.env.ALCHEMY_RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl)          throw new Error("ALCHEMY_RPC_URL غير معرّف في متغيرات البيئة");
  if (!contractAddress) throw new Error("CONTRACT_ADDRESS غير معرّف في متغيرات البيئة");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
}

// ─── إضافة هاش وثيقة مرتبط بالهاش السابق ─────────────────────────────────────
export async function addDocumentHashToChain(
  documentHash: string,
  previousHash: string,
): Promise<{ docId: number; txUrl: string }> {
  try {
    const { contract } = getContractWriter();
    logger.info({ documentHash: documentHash.substring(0, 16) + "...", previousHash: previousHash ? previousHash.substring(0, 16) + "..." : "(أول وثيقة)" }, "إضافة هاش وثيقة إلى سلسلة Blockchain...");

    const tx = await contract.addDocumentHash(documentHash, previousHash);
    const receipt = await tx.wait(1);
    const txUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;

    let docId = 0;
    for (const log of receipt.logs) {
      try {
        const iface = new ethers.Interface(CONTRACT_ABI);
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "DocumentAdded") {
          docId = Number(parsed.args[0]);
          console.log("✅ Extracted docId from event:", docId);
          break;
        }
      } catch (_) {}
    }

    console.log("📝 Returning to caller:", { docId, txUrl });
    logger.info({ docId, txUrl }, "تم إضافة هاش الوثيقة إلى Blockchain بنجاح");
    return { docId, txUrl };
  } catch (err: any) {
    logger.error({ err: err.message, documentHash: documentHash.substring(0, 16) }, "فشل إضافة هاش الوثيقة إلى Blockchain");
    throw new Error(`فشل addDocumentHashToChain: ${err.message}`);
  }
}
// ─── استرجاع هاش وثيقة من Blockchain ─────────────────────────────────────────
export async function getDocumentHashFromChain(docId: number): Promise<string> {
  try {
    const contract = getContractReader();
    const hash = await contract.getDocumentHash(BigInt(docId));
    logger.info({ docId, hash: hash.substring(0, 16) + "..." }, "تم استرجاع هاش الوثيقة من Blockchain");
    return hash;
  } catch (err: any) {
    logger.error({ err: err.message, docId }, "فشل استرجاع هاش الوثيقة من Blockchain");
    throw new Error(`فشل getDocumentHashFromChain: ${err.message}`);
  }
}

// ─── استرجاع الهاش السابق من Blockchain ──────────────────────────────────────
export async function getPreviousHashFromChain(docId: number): Promise<string> {
  try {
    const contract = getContractReader();
    const previousHash = await contract.getPreviousHash(BigInt(docId));
    logger.info({ docId, previousHash: previousHash ? previousHash.substring(0, 16) + "..." : "(أول وثيقة)" }, "تم استرجاع الهاش السابق من Blockchain");
    return previousHash;
  } catch (err: any) {
    logger.error({ err: err.message, docId }, "فشل استرجاع الهاش السابق من Blockchain");
    throw new Error(`فشل getPreviousHashFromChain: ${err.message}`);
  }
}

// ─── استرجاع الهاش التالي (الذي يشير إلى هذا الهاش) ─────────────────────────
export async function getNextHashFromChain(documentHash: string): Promise<string> {
  try {
    const contract = getContractReader();
    const nextHash = await contract.getNextHash(documentHash);
    logger.info({ 
      documentHash: documentHash.substring(0, 16) + "...",
      nextHash: nextHash ? nextHash.substring(0, 16) + "..." : "(لا يوجد هاش تالي)"
    }, "تم استرجاع الهاش التالي من Blockchain");
    return nextHash;
  } catch (err: any) {
    logger.error({ err: err.message }, "فشل استرجاع الهاش التالي من Blockchain");
    throw new Error(`فشل getNextHashFromChain: ${err.message}`);
  }
}

// ─── التحقق من صحة السلسلة (من وثيقة معينة إلى بداية السلسلة) ────────────────
export async function verifyChainFromBlockchain(startDocId: number): Promise<{
  isValid: boolean;
  chainLength: number;
  hashes: string[];
}> {
  try {
    const contract = getContractReader();
    const [isValid, chainLength, hashes] = await contract.verifyChain(BigInt(startDocId));
    logger.info({ startDocId, isValid, chainLength }, "تم التحقق من سلسلة الوثائق");
    return { isValid, chainLength, hashes };
  } catch (err: any) {
    logger.error({ err: err.message, startDocId }, "فشل التحقق من سلسلة الوثائق");
    throw new Error(`فشل verifyChainFromBlockchain: ${err.message}`);
  }
}

// ─── استرجاع جميع الهاشات من Blockchain ──────────────────────────────────────
export async function getAllHashesFromBlockchain(): Promise<{
  ids: number[];
  hashes: string[];
  previousHashes: string[];
  timestamps: number[];
}> {
  try {
    const contract = getContractReader();
    const [ids, hashes, previousHashes, timestamps] = await contract.getAllHashes();
    
    const result = {
      ids: ids.map((id: any) => Number(id)),
      hashes: hashes,
      previousHashes: previousHashes,
      timestamps: timestamps.map((ts: any) => Number(ts)),
    };
    
    logger.info({ count: result.ids.length }, "تم استرجاع جميع الهاشات من Blockchain");
    return result;
  } catch (err: any) {
    logger.error({ err: err.message }, "فشل استرجاع جميع الهاشات من Blockchain");
    throw new Error(`فشل getAllHashesFromBlockchain: ${err.message}`);
  }
}

// ─── التحقق من وجود هاش في Blockchain ────────────────────────────────────────
export async function isHashRegisteredOnChain(documentHash: string): Promise<boolean> {
  try {
    const contract = getContractReader();
    const exists = await contract.hashExists(documentHash);
    logger.info({ documentHash: documentHash.substring(0, 16) + "...", exists }, "تم التحقق من وجود الهاش");
    return exists;
  } catch (err: any) {
    logger.error({ err: err.message }, "فشل التحقق من وجود الهاش");
    throw new Error(`فشل isHashRegisteredOnChain: ${err.message}`);
  }
}

// ─── الحصول على عدد الوثائق في Blockchain ────────────────────────────────────
export async function getDocumentCountFromChain(): Promise<number> {
  try {
    const contract = getContractReader();
    const count = await contract.documentCounter();
    logger.info({ count: Number(count) }, "تم استرجاع عدد الوثائق من Blockchain");
    return Number(count);
  } catch (err: any) {
    logger.error({ err: err.message }, "فشل استرجاع عدد الوثائق من Blockchain");
    throw new Error(`فشل getDocumentCountFromChain: ${err.message}`);
  }
}