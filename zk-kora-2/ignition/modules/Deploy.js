const hre = require("hardhat");

async function main() {
    const Verifier = await hre.ethers.getContractFactory("PlonkVerifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("Verifier deployed to:", verifierAddress);

    const Insurance = await hre.ethers.getContractFactory("InsuranceUnderwriting");
    const insurance = await Insurance.deploy(verifier.getAddress());
    await insurance.waitForDeployment();
    const insuranceAddress = await insurance.getAddress();
    console.log("Insurance deployed to:", insuranceAddress);
}

main();