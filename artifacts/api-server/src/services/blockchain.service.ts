import { ethers } from "ethers";
import { logger } from "../lib/logger";

// ─── ABI عقد MultiSignatureRegistry ─────────────────────────────────────────
const MULTI_SIG_ABI = [
  "function createDocument(string documentHash) external returns (uint256)",
  "function addSignature(uint256 docId, string signerRole, string signatureHash) external",
  "function completeDocument(uint256 docId) external",
  "function getDocumentHash(uint256 docId) external view returns (string)",
  "function getSignaturesCount(uint256 docId) external view returns (uint256)",
  "function isDocumentCompleted(uint256 docId) external view returns (bool)",
  "function getSignature(uint256 docId, uint256 index) external view returns (uint256, string, string, uint256, address)",
  "function getAllSignatures(uint256 docId) external view returns (uint256[] steps, string[] roles, string[] hashes, uint256[] timestamps, address[] signers)",
  "function documentCounter() external view returns (uint256)",
  "event DocumentCreated(uint256 indexed docId, string documentHash, uint256 timestamp)",
  "event SignatureAdded(uint256 indexed docId, uint256 step, string signerRole, address signerAddress, uint256 timestamp)",
  "event DocumentCompleted(uint256 indexed docId, uint256 signaturesCount, uint256 timestamp)",
];
// ────────────────────────────────────────────────────────────────────────────

function getContractWriter(): { wallet: ethers.Wallet; contract: ethers.Contract } {
  const rpcUrl          = process.env.ALCHEMY_RPC_URL;
  const privateKey      = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl)          throw new Error("ALCHEMY_RPC_URL غير معرّف في متغيرات البيئة");
  if (!privateKey)      throw new Error("PRIVATE_KEY غير معرّف في متغيرات البيئة");
  if (!contractAddress) throw new Error("CONTRACT_ADDRESS غير معرّف في متغيرات البيئة");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, MULTI_SIG_ABI, wallet);

  return { wallet, contract };
}

function getContractReader(): ethers.Contract {
  const rpcUrl          = process.env.ALCHEMY_RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl)          throw new Error("ALCHEMY_RPC_URL غير معرّف في متغيرات البيئة");
  if (!contractAddress) throw new Error("CONTRACT_ADDRESS غير معرّف في متغيرات البيئة");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(contractAddress, MULTI_SIG_ABI, provider);
}

// ─── إنشاء وثيقة على Blockchain ─────────────────────────────────────────────
export async function createDocumentOnChain(
  documentHash: string,
): Promise<{ docId: number; txUrl: string }> {
  try {
    const { contract } = getContractWriter();
    logger.info({ documentHash: documentHash.substring(0, 16) + "..." }, "إنشاء وثيقة على Blockchain...");

    const tx     = await contract.createDocument(documentHash);
    const receipt = await tx.wait(1);

    const txUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;

    // استخراج docId من الحدث
    let docId = 0;
    for (const log of receipt.logs) {
      try {
        const iface  = new ethers.Interface(MULTI_SIG_ABI);
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "DocumentCreated") {
          docId = Number(parsed.args[0]);
          break;
        }
      } catch (_) {}
    }

    logger.info({ docId, txUrl }, "تم إنشاء الوثيقة على Blockchain بنجاح");
    return { docId, txUrl };
  } catch (err: any) {
    logger.error({ err: err.message }, "فشل إنشاء الوثيقة على Blockchain");
    throw new Error(`فشل createDocumentOnChain: ${err.message}`);
  }
}

// ─── إضافة توقيع إلى الوثيقة على Blockchain ────────────────────────────────
export async function addSignatureToChain(
  docId: number,
  signerRole: string,
  signatureHash: string,
): Promise<string> {
  try {
    const { contract } = getContractWriter();
    logger.info({ docId, signerRole }, "إضافة توقيع على Blockchain...");

    const tx = await contract.addSignature(BigInt(docId), signerRole, signatureHash);
    await tx.wait(1);

    const txUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    logger.info({ docId, signerRole, txUrl }, "تم إضافة التوقيع على Blockchain");
    return txUrl;
  } catch (err: any) {
    logger.error({ err: err.message, docId }, "فشل إضافة التوقيع على Blockchain");
    throw new Error(`فشل addSignatureToChain: ${err.message}`);
  }
}

// ─── إكمال الوثيقة على Blockchain ───────────────────────────────────────────
export async function completeDocumentOnChain(docId: number): Promise<string> {
  try {
    const { contract } = getContractWriter();
    logger.info({ docId }, "إكمال الوثيقة على Blockchain...");

    const tx = await contract.completeDocument(BigInt(docId));
    await tx.wait(1);

    const txUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    logger.info({ docId, txUrl }, "تم إكمال الوثيقة على Blockchain");
    return txUrl;
  } catch (err: any) {
    logger.error({ err: err.message, docId }, "فشل إكمال الوثيقة على Blockchain");
    throw new Error(`فشل completeDocumentOnChain: ${err.message}`);
  }
}

// ─── استرجاع جميع التوقيعات من Blockchain ───────────────────────────────────
export async function getAllSignaturesFromChain(docId: number): Promise<
  Array<{
    step: number;
    signerRole: string;
    signatureHash: string;
    timestamp: number;
    signerAddress: string;
  }>
> {
  try {
    const contract = getContractReader();
    const [steps, roles, hashes, timestamps, signers] =
      await contract.getAllSignatures(BigInt(docId));

    return steps.map((_: any, i: number) => ({
      step:          Number(steps[i]),
      signerRole:    roles[i],
      signatureHash: hashes[i],
      timestamp:     Number(timestamps[i]),
      signerAddress: signers[i],
    }));
  } catch (err: any) {
    logger.error({ err: err.message, docId }, "فشل استرجاع التوقيعات من Blockchain");
    throw new Error(`فشل getAllSignaturesFromChain: ${err.message}`);
  }
}
