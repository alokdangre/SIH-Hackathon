const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying HedgeEscrow contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Set fee recipient (use deployer for now, should be platform wallet)
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  console.log("Fee recipient:", feeRecipient);

  // Deploy the contract
  const HedgeEscrow = await ethers.getContractFactory("HedgeEscrow");
  const escrow = await HedgeEscrow.deploy(feeRecipient);

  await escrow.deployed();

  console.log("HedgeEscrow deployed to:", escrow.address);
  console.log("Transaction hash:", escrow.deployTransaction.hash);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: escrow.address,
    deployerAddress: deployer.address,
    feeRecipient: feeRecipient,
    transactionHash: escrow.deployTransaction.hash,
    blockNumber: escrow.deployTransaction.blockNumber,
    deployedAt: new Date().toISOString(),
    abi: JSON.parse(escrow.interface.format('json'))
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentFile);

  // Save ABI for backend integration
  const abiFile = path.join(deploymentsDir, "HedgeEscrow.abi.json");
  fs.writeFileSync(abiFile, JSON.stringify(deploymentInfo.abi, null, 2));
  console.log("ABI saved to:", abiFile);

  // Verify contract on Etherscan (if API key provided)
  if (process.env.POLYGONSCAN_API_KEY && hre.network.name === "mumbai") {
    console.log("Waiting for block confirmations...");
    await escrow.deployTransaction.wait(6); // Wait for 6 confirmations

    try {
      await hre.run("verify:verify", {
        address: escrow.address,
        constructorArguments: [feeRecipient],
      });
      console.log("Contract verified on Polygonscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Display contract info
  console.log("\n=== Contract Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", escrow.address);
  console.log("Deployer:", deployer.address);
  console.log("Fee Recipient:", feeRecipient);
  console.log("Gas Used:", escrow.deployTransaction.gasLimit?.toString());
  
  if (hre.network.name === "mumbai") {
    console.log("Polygonscan URL:", `https://mumbai.polygonscan.com/address/${escrow.address}`);
  }

  console.log("\n=== Environment Variables for Backend ===");
  console.log(`ESCROW_CONTRACT_ADDRESS=${escrow.address}`);
  console.log(`ESCROW_ADMIN_ADDRESS=${deployer.address}`);
  console.log("Add these to your backend .env file");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
