require('dotenv').config();
const ethers = require('ethers');
const { generateProof } = require('./proof');

const provider = new ethers.providers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const abi = require("./artifacts/contracts/Insurance.sol/InsuranceUnderwriting.json").abi;

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function submitProof(proof, publicSignals) {
    console.log("Proof Object:", proof);
    console.log("Public Signals:", publicSignals);

    const proofArray = [
        proof.A[0], proof.A[1],
        proof.B[0], proof.B[1],
        proof.B[0], proof.B[1],
        proof.C[0], proof.C[1],
        proof.Z[0], proof.Z[1],
        proof.T1[0], proof.T1[1],
        proof.T2[0], proof.T2[1],
        proof.T3[0], proof.T3[1],
        proof.Wxi[0], proof.Wxi[1],
        proof.Wxiw[0], proof.Wxiw[1],
        0, 0, 0, 0
    ];

    console.log("Proof Array:", proofArray);

    const tx = await contract.submitProof(
        proofArray,
        publicSignals,
        { gasLimit: 500000 }
    );
    await tx.wait();
    console.log("Proof submitted:", tx.hash);
}

generateProof(110.29).then(({ proof, publicSignals }) => submitProof(proof, publicSignals)).catch(error => console.error("Error:", error));
