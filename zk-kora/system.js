require('dotenv').config();
const InsuranceOracleABI = require("./artifacts/contracts/Oracle.sol/InsuranceOracle.json").abi;

const fs = require('fs');
const csv = require('csv-parser');
const snarkjs = require('snarkjs');
const { ethers, JsonRpcProvider } = require('ethers');
const { buildPoseidon } = require('circomlibjs');
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

    validateAndConvertCoordinate(coord, name) {
        // Convert to fixed precision integer (6 decimal places)
        const converted = Math.floor(Math.abs(coord) * 1000000);
        if (converted > Number.MAX_SAFE_INTEGER) {
            throw new Error(`${name} value too large: ${coord}`);
        }
        return converted;
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
        try {
            // Convert and validate values
            const speedValue = BigInt(Math.floor(Math.abs(reading.speed * 100)));
            const latValue = BigInt(this.validateAndConvertCoordinate(reading.location[0], 'Latitude'));
            const lonValue = BigInt(this.validateAndConvertCoordinate(reading.location[1], 'Longitude'));
            const timestampValue = BigInt(reading.timestamp);
            const speedLimitValue = BigInt(12000);

            const input = {
                publicDataHash: '0', // This will be calculated by the circuit
                speed: speedValue.toString(),
                location: [
                    latValue.toString(),
                    lonValue.toString()
                ],
                timestamp: timestampValue.toString(),
                speedLimit: speedLimitValue.toString()
            };

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                "circuit_js/circuit.wasm",
                "circuit_final.zkey"
            );

            return {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
                c: [proof.pi_c[0], proof.pi_c[1]],
                input: publicSignals
            };
        } catch (error) {
            console.error('Error generating proof:', error);
            console.error('Input values:', {
                speed: reading.speed,
                location: reading.location,
                timestamp: reading.timestamp
            });
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
        
        return Math.max(0, Math.min(100, Math.floor(riskScore)));
    }

    async submitToBlockchain(reading, proof) {
        try {
            // Validate and convert speed
            const speedInt = Math.floor(Math.abs(reading.speed * 100));
            
            // Validate and convert coordinates
            const lat = this.validateAndConvertCoordinate(reading.location[0], 'Latitude');
            const lon = this.validateAndConvertCoordinate(reading.location[1], 'Longitude');
            
            // Convert to BigNumber with explicit base 10
            const latBig = ethers.BigNumber.from(lat.toString());
            const lonBig = ethers.BigNumber.from(lon.toString());
            const speedBig = ethers.BigNumber.from(speedInt.toString());
            const timestampBig = ethers.BigNumber.from(reading.timestamp.toString());

            // Debug log
            console.log('Converted values:', {
                speed: speedBig.toString(),
                lat: latBig.toString(),
                lon: lonBig.toString(),
                timestamp: timestampBig.toString()
            });

            const dataHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['uint256', 'uint256[2]', 'uint256'],
                    [
                        speedBig,
                        [latBig, lonBig],
                        timestampBig
                    ]
                )
            );

            // Submit data transaction
            const submitTx = await this.contract.submitData(dataHash);
            await submitTx.wait();
            console.log('Data submitted successfully with hash:', dataHash);

            // Calculate risk score
            const riskScore = this.calculateRiskScore(reading);
            const riskScoreBig = ethers.BigNumber.from(riskScore.toString());

            // Verify proof transaction
            const verifyTx = await this.contract.verifyDataProof(
                proof.a,
                proof.b,
                proof.c,
                proof.input.map(x => ethers.BigNumber.from(x)),
                riskScoreBig
            );
            await verifyTx.wait();
            console.log('Proof verified successfully with risk score:', riskScore);

            return true;
        } catch (error) {
            console.error('Error submitting to the blockchain:', error);
            console.error('Original reading:', reading);
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
        '0xec70a01f3D8623fd249FF181de3Eb5ec27fdEf20',
        'https://sepolia.infura.io/v3/${process.env.INFURA_KEY}'
    );

    await system.processBatch('./telematics.csv');
}

main().catch(console.error);
