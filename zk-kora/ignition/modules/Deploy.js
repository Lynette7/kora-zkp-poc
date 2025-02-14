async function main() {
    // First, deploy the verifier
    const ZKVerifier = await ethers.getContractFactory("Verifier");
    const verifier = await ZKVerifier.deploy();
    await verifier.deployed();
    console.log("ZKVerifier deployed to:", verifier.address);
  
    // Then deploy the insurance oracle with the verifier address
    const InsuranceOracle = await ethers.getContractFactory("InsuranceOracle");
    const insuranceOracle = await InsuranceOracle.deploy(verifier.address);
    await insuranceOracle.deployed();
    console.log("InsuranceOracle deployed to:", insuranceOracle.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
