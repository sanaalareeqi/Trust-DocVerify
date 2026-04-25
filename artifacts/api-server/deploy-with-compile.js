import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ العقد الذكي الجديد - يخزن سلسلة هاشات (كل هاش مرتبط بالسابق)
const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {
    struct Document {
        string documentHash;     // هاش الوثيقة الحالية
        string previousHash;     // هاش الوثيقة السابقة
        uint256 timestamp;
        address creator;
        bool isValid;
    }
    
    uint256 public documentCounter;
    mapping(uint256 => Document) public documents;
    mapping(string => bool) public hashExists;
    
    event DocumentAdded(
        uint256 indexed docId,
        string documentHash,
        string previousHash,
        uint256 timestamp,
        address creator
    );
    
    // ✅ إضافة هاش وثيقة مرتبط بالهاش السابق
    function addDocumentHash(
        string calldata documentHash,
        string calldata previousHash
    ) external returns (uint256) {
        require(!hashExists[documentHash], "Hash already exists");
        
        documentCounter++;
        uint256 newId = documentCounter;
        
        documents[newId] = Document({
            documentHash: documentHash,
            previousHash: previousHash,
            timestamp: block.timestamp,
            creator: msg.sender,
            isValid: true
        });
        
        hashExists[documentHash] = true;
        
        emit DocumentAdded(newId, documentHash, previousHash, block.timestamp, msg.sender);
        
        return newId;
    }
    
    // ✅ الحصول على هاش وثيقة
    function getDocumentHash(uint256 docId) external view returns (string memory) {
        require(docId > 0 && docId <= documentCounter, "Document not found");
        return documents[docId].documentHash;
    }
    
    // ✅ الحصول على الهاش السابق
    function getPreviousHash(uint256 docId) external view returns (string memory) {
        require(docId > 0 && docId <= documentCounter, "Document not found");
        return documents[docId].previousHash;
    }
    
    // ✅ الحصول على الهاش التالي (الذي يشير إلى هذا الهاش)
    function getNextHash(string calldata documentHash) external view returns (string memory) {
        for (uint256 i = 1; i <= documentCounter; i++) {
            if (keccak256(bytes(documents[i].previousHash)) == keccak256(bytes(documentHash))) {
                return documents[i].documentHash;
            }
        }
        return "";
    }
    
    // ✅ التحقق من صحة السلسلة (من هذه الوثيقة إلى بداية السلسلة)
    function verifyChain(uint256 startDocId) external view returns (
        bool isValid,
        uint256 chainLength,
        string[] memory hashes
    ) {
        require(startDocId > 0 && startDocId <= documentCounter, "Invalid start ID");
        
        uint256 count = 0;
        uint256 currentId = startDocId;
        string memory currentHash;
        string memory previousHash;
        
        // أولاً: حساب طول السلسلة
        while (currentId > 0) {
            count++;
            currentHash = documents[currentId].documentHash;
            previousHash = documents[currentId].previousHash;
            
            if (bytes(previousHash).length == 0) {
                break;
            }
            
            // البحث عن المعرف السابق
            uint256 prevId = 0;
            for (uint256 i = 1; i <= documentCounter; i++) {
                if (keccak256(bytes(documents[i].documentHash)) == keccak256(bytes(previousHash))) {
                    prevId = i;
                    break;
                }
            }
            currentId = prevId;
        }
        
        hashes = new string[](count);
        
        // ثانياً: جمع الهاشات
        currentId = startDocId;
        for (uint256 i = 0; i < count; i++) {
            hashes[i] = documents[currentId].documentHash;
            
            if (bytes(documents[currentId].previousHash).length > 0) {
                // البحث عن المعرف السابق
                for (uint256 j = 1; j <= documentCounter; j++) {
                    if (keccak256(bytes(documents[j].documentHash)) == keccak256(bytes(documents[currentId].previousHash))) {
                        currentId = j;
                        break;
                    }
                }
            } else {
                currentId = 0;
            }
        }
        
        return (true, count, hashes);
    }
    
    // ✅ الحصول على جميع الهاشات (من أول وثيقة إلى آخرها)
    function getAllHashes() external view returns (
        uint256[] memory ids,
        string[] memory hashes,
        string[] memory previousHashes,
        uint256[] memory timestamps
    ) {
        ids = new uint256[](documentCounter);
        hashes = new string[](documentCounter);
        previousHashes = new string[](documentCounter);
        timestamps = new uint256[](documentCounter);
        
        for (uint256 i = 1; i <= documentCounter; i++) {
            ids[i-1] = i;
            hashes[i-1] = documents[i].documentHash;
            previousHashes[i-1] = documents[i].previousHash;
            timestamps[i-1] = documents[i].timestamp;
        }
        
        return (ids, hashes, previousHashes, timestamps);
    }
}
`;

async function compileContract() {
  console.log("📦 تجميع العقد الذكي...");
  
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
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    output.errors.forEach((err) => {
      if (err.severity === "error") {
        console.error("❌ Compilation error:", err.formattedMessage);
        throw new Error("Compilation failed");
      } else if (err.severity === "warning") {
        console.warn("⚠️ Warning:", err.formattedMessage);
      }
    });
  }

  const contract = output.contracts["DocumentRegistry.sol"]["DocumentRegistry"];
  
  console.log("✅ تم التجميع بنجاح");
  
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

    console.log("🔗 الاتصال بشبكة Sepolia...");
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const network = await provider.getNetwork();
    console.log(`✅ متصل بشبكة: ${network.name} (chainId: ${network.chainId})`);
    console.log(`📬 عنوان المحفظة: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 الرصيد: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error("❌ الرصيد صفر. احصل على SepoliaETH من faucet أولاً");
      console.log("🔗 https://sepoliafaucet.com");
      process.exit(1);
    }

    const { abi, bytecode } = await compileContract();

    console.log("\n🚀 جاري نشر العقد الجديد (سلسلة الهاشات)...");
    const factory = new ethers.ContractFactory(abi, `0x${bytecode}`, wallet);
    const contract = await factory.deploy();

    console.log(`⏳ في انتظار التأكيد... (Transaction: ${contract.deploymentTransaction().hash})`);
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    // حفظ ABI
    const abiPath = path.join(__dirname, "contract_abi.json");
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    console.log(`📁 تم حفظ ABI في: ${abiPath}`);

    console.log("\n✅ تم نشر العقد بنجاح!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📄 عنوان العقد: ${contractAddress}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️ أضف هذا المتغير إلى ملف .env:");
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