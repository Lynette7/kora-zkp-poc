async function main() {
    // First, deploy the verifier
    const ZKVerifier = await ethers.getContractFactory("Groth16Verifier");
    const verifier = await ZKVerifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("ZKVerifier deployed to:", verifierAddress);
  
    // Then deploy the insurance oracle with the verifier address
    const InsuranceOracle = await ethers.getContractFactory("InsuranceOracle");
    const insuranceOracle = await InsuranceOracle.deploy(verifier.getAddress());
    await insuranceOracle.waitForDeployment();
    const oracleAddress = await insuranceOracle.getAddress();
    console.log("InsuranceOracle deployed to:", oracleAddress);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
