import { ethers } from "ethers";
import { logger } from "../lib/logger";

const DOCUMENT_REGISTRY_ABI = [
  "function storeHash(string documentHash) external returns (uint256)",
  "event HashStored(uint256 indexed docId, string documentHash, address storedBy, uint256 timestamp)",
];

export async function storeDocumentHashOnChain(documentHash: string): Promise<string> {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl) {
    throw new Error("ALCHEMY_RPC_URL غير معرّف في متغيرات البيئة");
  }
  if (!privateKey) {
    throw new Error("PRIVATE_KEY غير معرّف في متغيرات البيئة");
  }
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS غير معرّف في متغيرات البيئة");
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, DOCUMENT_REGISTRY_ABI, wallet);

    logger.info({ documentHash: documentHash.substring(0, 16) + "..." }, "إرسال هاش الوثيقة إلى Blockchain...");

    const tx = await contract.storeHash(documentHash);
    logger.info({ txHash: tx.hash }, "تم إرسال المعاملة، في انتظار التأكيد...");

    await tx.wait(1);

    const txUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    logger.info({ txUrl }, "تم تخزين الهاش على Blockchain بنجاح");

    return txUrl;
  } catch (err: any) {
    logger.error({ err: err.message }, "فشل تخزين الهاش على Blockchain");
    throw new Error(`فشل الاتصال بـ Blockchain: ${err.message}`);
  }
}
