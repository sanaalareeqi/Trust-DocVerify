import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// كود العقد الذكي
const contractSource = `
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

async function compileContract() {
  const input = {
    language: "Solidity",
    sources: {
      "DocumentRegistry.sol": {
        content: contractSource,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    output.errors.forEach((err) => {
      if (err.severity === "error") {
        console.error("Compilation error:", err.formattedMessage);
        throw new Error("Compilation failed");
      }
    });
  }

  const contract = output.contracts["DocumentRegistry.sol"]["DocumentRegistry"];
  return {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
  };
}

async function deploy() {
  try {
    const rpcUrl = process.env.ALCHEMY_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      console.error("❌ ALCHEMY_RPC_URL و PRIVATE_KEY مطلوبة في Secrets");
      process.exit(1);
    }

    console.log("📦 تجميع العقد الذكي...");
    const { abi, bytecode } = await compileContract();
    console.log("✅ تم التجميع بنجاح");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const network = await provider.getNetwork();
    console.log(`✅ متصل بشبكة: ${network.name} (chainId: ${network.chainId})`);
    console.log(`📬 عنوان المحفظة: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 الرصيد: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error("❌ الرصيد صفر. احصل على SepoliaETH من faucet أولاً");
      process.exit(1);
    }

    console.log("🚀 جاري نشر العقد...");
    const factory = new ethers.ContractFactory(abi, `0x${bytecode}`, wallet);
    const contract = await factory.deploy();

    console.log(
      `⏳ في انتظار التأكيد... (Transaction: ${contract.deploymentTransaction().hash})`,
    );
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log("\n✅ تم نشر العقد بنجاح!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📄 عنوان العقد: ${contractAddress}`);
    console.log(
      `🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`,
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️ أضف هذا المتغير إلى Secrets:");
    console.log(`CONTRACT_ADDRESS = ${contractAddress}`);
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.error("⚠️ رصيد غير كافٍ. احصل على SepoliaETH من faucet.");
    }
    process.exit(1);
  }
}

deploy();
