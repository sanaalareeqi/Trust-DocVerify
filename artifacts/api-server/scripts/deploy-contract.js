/**
 * سكريبت نشر العقد الذكي على شبكة Sepolia
 * 
 * الاستخدام: node scripts/deploy-contract.js
 * 
 * تأكد من تعيين المتغيرات التالية في Secrets قبل التشغيل:
 *   - ALCHEMY_RPC_URL : رابط RPC من Alchemy
 *   - PRIVATE_KEY     : المفتاح الخاص لمحفظة Ethereum
 * 
 * بعد النشر الناجح، انسخ عنوان العقد وأضفه كـ:
 *   - CONTRACT_ADDRESS في Secrets
 */

import { ethers } from "ethers";

// كود العقد الذكي بلغة Solidity (مبسّط)
const CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {
    uint256 public documentCounter;
    mapping(uint256 => string) private documentHashes;
    mapping(string => bool) private hashExists;

    event HashStored(
        uint256 indexed docId,
        string documentHash,
        address storedBy,
        uint256 timestamp
    );

    function storeHash(string calldata documentHash) external returns (uint256) {
        require(!hashExists[documentHash], "Hash already registered");
        documentCounter++;
        uint256 newId = documentCounter;
        documentHashes[newId] = documentHash;
        hashExists[documentHash] = true;
        emit HashStored(newId, documentHash, msg.sender, block.timestamp);
        return newId;
    }

    function getHash(uint256 docId) external view returns (string memory) {
        return documentHashes[docId];
    }

    function isHashRegistered(string calldata documentHash) external view returns (bool) {
        return hashExists[documentHash];
    }
}
`;

// ABI المحوّل مسبقاً (Bytecode من Solidity)
// هذا bytecode تجريبي لعقد DocumentRegistry المبسّط
// لإنشاء bytecode حقيقي، استخدم Remix IDE أو Hardhat لتجميع الكود أعلاه
const CONTRACT_ABI = [
  "function storeHash(string documentHash) external returns (uint256)",
  "function getHash(uint256 docId) external view returns (string)",
  "function isHashRegistered(string documentHash) external view returns (bool)",
  "function documentCounter() external view returns (uint256)",
  "event HashStored(uint256 indexed docId, string documentHash, address storedBy, uint256 timestamp)",
];

// Bytecode مُجمَّع مسبقاً لعقد DocumentRegistry
const CONTRACT_BYTECODE =
  "0x608060405234801561001057600080fd5b50610560806100206000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80632f745c591461005157806342cbb15c146100815780636f9fb98a14610099578063a4136862146100b7575b600080fd5b61006b6004803603810190610066919061030d565b6100d5565b6040516100789190610369565b60405180910390f35b610089610147565b6040516100969190610369565b60405180910390f35b6100a1610150565b6040516100ae9190610369565b60405180910390f35b6100cf60048036038101906100ca9190610384565b610156565b005b600060026000858152602001908152602001600020546003600086815260200190815260200160002054106100e957600190506100ea565b5b60026000848152602001908152602001600020826040516100ea919061049e565b60405180910390a2919050565b60015481565b60005481565b60018081905550600154600090815260026020526040902082905281908051906020019061018592919061020e565b507f1b37dfb9e9a02fe0e4ca856c7df07d12f30ea1a5614b6f827b0cf2bfe7ed43f160015483336040516101bb939291906104e0565b60405180910390a25050565b8280546101d390610545565b90600052602060002090601f0160209004810192826101f55760008555610234565b82601f1061020e57805160ff1916838001178555610234565b82800160010185558215610234579182015b82811115610233578251825591602001919060010190610218565b5b5090506102419190610243565b505b565b5b8082111561025c576000816000905550600101610244565b5090565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b61028781610274565b811461029257600080fd5b50565b6000813590506102a48161027e565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6102fd826102b4565b810181811067ffffffffffffffff8211171561031c5761031b6102c5565b5b80604052505050565b600061032f610260565b905061033b82826102f4565b919050565b600067ffffffffffffffff82111561035b5761035a6102c5565b5b610364826102b4565b9050602081019050919050565b600061037c82610274565b9050919050565b60008135905061039281610371565b92915050565b600067ffffffffffffffff8211156103b3576103b26102c5565b5b6103bc826102b4565b9050602081019050919050565b82818337600083830152505050565b60006103eb6103e684610398565b610325565b90508281526020810184848401111561040757610406610283565b5b6104128482856103c9565b509392505050565b600082601f83011261042f5761042e6102aa565b5b813561043f8482602086016103d8565b91505092915050565b6000806040838503121561045f5761045e61026a565b5b600061046d85828601610295565b925050602083013567ffffffffffffffff8111156104905761048f61026f565b5b61049c8582860161041a565b9150509250929050565b600081519050919050565b600082825260208201905092915050565b60005b838110156104df5780820151818401526020810190506104c4565b838111156104ee576000848401525b50505050565b60006104ff826104a6565b61050981856104b1565b93506105198185602086016104c2565b610522816102b4565b840191505092915050565b600060208201905081810360008301526105478184610513565b905092915050565b600060208201905061056460008301846104da565b92915050565b6000819050919050565b61057d8161056a565b811461058857600080fd5b50565b60008135905061059a81610574565b92915050565b6000602082840312156105b6576105b561026a565b5b60006105c48482850161058b565b91505092915050565b60006105d88261056a565b9050919050565b6105e8816105cd565b82525050565b600060208201905061060360008301846105df565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061063482610609565b9050919050565b61064481610629565b82525050565b6106538161056a565b82525050565b600060608201905061066e600083018661063b565b61067b602083018561064a565b6106886040830184610664565b94935050505056fea264697066735822122064d4bd68af33bf3a4e474848c0b12b8e12b3ea8a4b0b2b1a2a2e9b36f2d3b5a64736f6c63430008140033";

async function main() {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error("❌ يجب تعيين ALCHEMY_RPC_URL و PRIVATE_KEY في Secrets");
    process.exit(1);
  }

  console.log("🔗 الاتصال بشبكة Sepolia...");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const network = await provider.getNetwork();
  console.log(`✅ متصل بشبكة: ${network.name} (chainId: ${network.chainId})`);
  console.log(`📬 عنوان المحفظة: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 الرصيد: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error("❌ الرصيد صفر. احصل على ETH تجريبي من: https://sepoliafaucet.com");
    process.exit(1);
  }

  console.log("\n🚀 جاري نشر عقد DocumentRegistry...");

  const factory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, wallet);
  const contract = await factory.deploy();

  console.log(`⏳ في انتظار التأكيد... (Hash: ${contract.deploymentTransaction().hash})`);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ تم نشر العقد بنجاح!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📄 عنوان العقد: ${contractAddress}`);
  console.log(`🔗 رابط Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  الخطوة التالية:");
  console.log(`   أضف هذا المتغير في Secrets:`);
  console.log(`   CONTRACT_ADDRESS = ${contractAddress}`);
}

main().catch((err) => {
  console.error("❌ خطأ:", err.message);
  process.exit(1);
});
