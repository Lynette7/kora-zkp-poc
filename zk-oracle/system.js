const fs = require('fs');
const csv = require('csv-parser');
const snarkjs = require('snarkjs');
const { ethers } = require('ethers');
const { timeStamp } = require('console');

class TelematicsProofSystem {
    constructor(contractAddress, providerUrl) {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.contract = new ethers.Contract(
            contractAddress,
            InsuranceOracleABI,
            this.provider
        );
    }

    async processTelematics(csvFilePath) {
        const readings = [];
        return new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    readings.push({
                        timestamp: parseInt(row.timestamp),
                        location: [
                            parseFloat(row.latitude),
                            parseFloat(row.longitude)
                        ],
                        speed: parseFloat(row.speed_kmh)
                    });
                })
                .on('end', () => {
                    resolve(readings);
                })
                .on('error', reject);
        });
    }

    async generateProof(reading) {
        const input = {
            speed: Math.floor(reading.speed * 100),
            location: reading.location.map(coord => Math.floor(coord * 1000000)),
            timestamp: reading.timestamp,
            speedLimit: 12000
        };

        try {
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                "circuit_js/circuit.wasm",
                "circuit_final.zkey"
            );

            const proofForContract = {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
                c: [proof.pi_c[0], proof.pi_c[1]],
                input: publicSignals
            };

            return proofForContract;
        } catch (error) {
            console.error('Error generating proof:', error);
            throw error;
        }
    }

    calculateRiskScore(reading) {
        let riskScore = 100;

        if (reading.speed > 120) {
            riskScore -= 20;
        } else if (reading.speed > 100) {
            riskScore -= 10;
        }

        return Math.max(0, Math.min(100, riskScore));
    }

    async submitToBlockchain(reading, proof) {
        try {
            const dataHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['uint256', 'uint256[2]', 'uint256'],
                    [reading.speed, reading.location, reading.timestamp]
                )
            );

            await this.contract.submitData(dataHash);

            const riskScore = this.calculateRiskScore(reading);

            await this.contract.verifyDataProof(
                proof.a,
                proof.b,
                proof.c,
                proof.input,
                riskScore
            );

            return true;
        } catch (error) {
            console.error('Error submitting to the blockchain:', error);
            throw error;
        }
    }

    async processBatch(csvFilePath) {
        try {
            const readings = await this.processTelematics(csvFilePath);
            console.log(`Processing ${readings.length} readings...`);

            for (const reading of readings) {
                const proof = await this.generateProof(reading);
                console.log('Proof generated for reading at timestamp:', reading.timestamp);

                await this.submitToBlockchain(reading, proof);
                console.log('Data and proof submitted to blockchain');
            }

            return true;
        } catch (error) {
            console.error('Error in batch processing:', error);
            throw error;
        }
    }
}

async function main() {
    const system = new TelematicsProofSystem(
        'CONTRACT_ADDRESS',
        'PROVIDER_URL'
    );

    await system.processBatch('./telematics.csv');
}

main().catch(console.error);
