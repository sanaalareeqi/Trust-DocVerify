/**
 * سكريبت تجميع ونشر عقد MultiSignatureRegistry على شبكة Sepolia
 *
 * الاستخدام: node scripts/deploy-with-compile.js
 *
 * يستخدم متغيرات البيئة:
 *   ALCHEMY_RPC_URL  - رابط RPC من Alchemy
 *   PRIVATE_KEY      - المفتاح الخاص للمحفظة
 *
 * بعد النجاح: حدّث CONTRACT_ADDRESS في Secrets
 */

import solc from "solc";
import { ethers } from "ethers";

// ─── كود العقد الذكي ────────────────────────────────────────────────────────
const SOLIDITY_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSignatureRegistry
 * @notice تخزين وثائق الجامعة مع توقيعات متعددة على Blockchain
 */
contract MultiSignatureRegistry {

    struct Signature {
        uint256 step;
        string  signerRole;
        string  signatureHash;
        uint256 timestamp;
        address signerAddress;
    }

    struct Document {
        string   documentHash;
        bool     isCompleted;
        uint256  createdAt;
        uint256  signaturesCount;
    }

    uint256 public documentCounter;

    mapping(uint256 => Document)    private documents;
    mapping(uint256 => Signature[]) private signatures;

    event DocumentCreated(uint256 indexed docId, string documentHash, uint256 timestamp);
    event SignatureAdded(uint256 indexed docId, uint256 step, string signerRole, address signerAddress, uint256 timestamp);
    event DocumentCompleted(uint256 indexed docId, uint256 signaturesCount, uint256 timestamp);

    function createDocument(string calldata documentHash) external returns (uint256) {
        documentCounter++;
        uint256 docId = documentCounter;
        documents[docId] = Document({
            documentHash:    documentHash,
            isCompleted:     false,
            createdAt:       block.timestamp,
            signaturesCount: 0
        });
        emit DocumentCreated(docId, documentHash, block.timestamp);
        return docId;
    }

    function addSignature(
        uint256 docId,
        string calldata signerRole,
        string calldata signatureHash
    ) external {
        require(docId > 0 && docId <= documentCounter, "Invalid document ID");
        require(!documents[docId].isCompleted, "Document already completed");
        documents[docId].signaturesCount++;
        uint256 step = documents[docId].signaturesCount;
        signatures[docId].push(Signature({
            step:          step,
            signerRole:    signerRole,
            signatureHash: signatureHash,
            timestamp:     block.timestamp,
            signerAddress: msg.sender
        }));
        emit SignatureAdded(docId, step, signerRole, msg.sender, block.timestamp);
    }

    function completeDocument(uint256 docId) external {
        require(docId > 0 && docId <= documentCounter, "Invalid document ID");
        require(!documents[docId].isCompleted, "Already completed");
        documents[docId].isCompleted = true;
        emit DocumentCompleted(docId, documents[docId].signaturesCount, block.timestamp);
    }

    function getDocumentHash(uint256 docId) external view returns (string memory) {
        return documents[docId].documentHash;
    }

    function getSignaturesCount(uint256 docId) external view returns (uint256) {
        return documents[docId].signaturesCount;
    }

    function isDocumentCompleted(uint256 docId) external view returns (bool) {
        return documents[docId].isCompleted;
    }

    function getSignature(uint256 docId, uint256 index)
        external view
        returns (uint256, string memory, string memory, uint256, address)
    {
        require(index < signatures[docId].length, "Index out of bounds");
        Signature storage s = signatures[docId][index];
        return (s.step, s.signerRole, s.signatureHash, s.timestamp, s.signerAddress);
    }

    function getAllSignatures(uint256 docId)
        external view
        returns (
            uint256[] memory steps,
            string[] memory roles,
            string[] memory hashes,
            uint256[] memory timestamps,
            address[] memory signers
        )
    {
        uint256 count = signatures[docId].length;
        steps      = new uint256[](count);
        roles      = new string[](count);
        hashes     = new string[](count);
        timestamps = new uint256[](count);
        signers    = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            Signature storage s = signatures[docId][i];
            steps[i]      = s.step;
            roles[i]      = s.signerRole;
            hashes[i]     = s.signatureHash;
            timestamps[i] = s.timestamp;
            signers[i]    = s.signerAddress;
        }
    }
}
`;
// ────────────────────────────────────────────────────────────────────────────

function compileContract(source) {
  const input = {
    language: "Solidity",
    sources: { "MultiSignatureRegistry.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      throw new Error("Compilation errors:\n" + errors.map((e) => e.formattedMessage).join("\n"));
    }
    output.errors.forEach((w) => console.warn("⚠️  Warning:", w.message));
  }

  const contract = output.contracts["MultiSignatureRegistry.sol"]["MultiSignatureRegistry"];
  return {
    abi:      contract.abi,
    bytecode: "0x" + contract.evm.bytecode.object,
  };
}

async function main() {
  const rpcUrl     = process.env.ALCHEMY_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error("❌ يجب تعيين ALCHEMY_RPC_URL و PRIVATE_KEY في Secrets");
    process.exit(1);
  }

  // التجميع
  console.log("⚙️  جاري تجميع عقد MultiSignatureRegistry...");
  const { abi, bytecode } = compileContract(SOLIDITY_SOURCE);
  const fnNames = abi.filter((x) => x.type === "function").map((x) => x.name).join(", ");
  console.log("✅ تجميع ناجح. الدوال:", fnNames);

  // الاتصال
  console.log("\n🔗 الاتصال بشبكة Sepolia...");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(privateKey, provider);
  const network  = await provider.getNetwork();
  const balance  = await provider.getBalance(wallet.address);

  console.log(`✅ الشبكة   : ${network.name} (chainId: ${network.chainId})`);
  console.log(`📬 المحفظة  : ${wallet.address}`);
  console.log(`💰 الرصيد   : ${ethers.formatEther(balance)} SepoliaETH`);

  if (balance < ethers.parseEther("0.005")) {
    console.error("❌ الرصيد غير كافٍ. احصل على SepoliaETH من: https://sepoliafaucet.com");
    process.exit(1);
  }

  // النشر
  console.log("\n🚀 جاري نشر العقد...");
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();

  console.log(`⏳ في انتظار التأكيد... TxHash: ${deployTx.hash}`);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ تم نشر العقد بنجاح!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📄 عنوان العقد   : ${contractAddress}`);
  console.log(`🔗 Etherscan     : https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log(`🔗 معاملة النشر  : https://sepolia.etherscan.io/tx/${deployTx.hash}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  حدّث CONTRACT_ADDRESS في Secrets بالقيمة أعلاه");

  // اختبار العقد
  console.log("\n🧪 اختبار الدوال...");
  try {
    const c = new ethers.Contract(contractAddress, abi, wallet);

    const tx1 = await c.createDocument("test-hash-0xABC");
    await tx1.wait(1);
    console.log("✅ createDocument   → نجحت");

    const tx2 = await c.addSignature(1n, "شؤون الخريجين", "sig-test-hash");
    await tx2.wait(1);
    console.log("✅ addSignature     → نجحت");

    const tx3 = await c.completeDocument(1n);
    await tx3.wait(1);
    console.log("✅ completeDocument → نجحت");

    const count = await c.getSignaturesCount(1n);
    const done  = await c.isDocumentCompleted(1n);
    console.log(`✅ getSignaturesCount  → ${count}`);
    console.log(`✅ isDocumentCompleted → ${done}`);
    console.log("\n🎉 جميع الدوال تعمل بشكل صحيح!");
  } catch (e) {
    console.warn("⚠️  فشل الاختبار (العقد منشور لكن الاختبار فشل):", e.message);
  }

  return contractAddress;
}

main().catch((err) => {
  console.error("❌ خطأ:", err.message);
  process.exit(1);
});
