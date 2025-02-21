const snarkjs = require('snarkjs');

async function generateProof(avgSpeed) {
    const input = {
        avgSpeed: avgSpeed * 100,
        threshold: 120 * 100
    };
    const { proof, publicSignals } = await snarkjs.plonk.fullProve(
        input,
        'circuit_js/circuit.wasm',
        'circuit_final.zkey'
    );
    console.log("Proof:", proof);
    console.log("Public Signals:", publicSignals);
    return { proof, publicSignals };
}

module.exports = { generateProof };

generateProof(110.59);