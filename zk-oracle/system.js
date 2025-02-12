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
                        speed: parseFloat(row.speed),
                        location: [
                            parseFloat(row.latitude),
                            parseFloat(row.longitude)
                        ]
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
}
