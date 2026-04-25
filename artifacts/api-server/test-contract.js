import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  console.log("📞 Testing connection to contract:", contractAddress);
  
  const abi = ["function documentCounter() view returns (uint256)"];
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  try {
    const counter = await contract.documentCounter();
    console.log("✅ Contract is alive! documentCounter:", counter.toString());
  } catch (error) {
    console.error("❌ Cannot connect to contract:", error.message);
  }
}

test();