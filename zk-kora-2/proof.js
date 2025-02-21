const snarkjs = require('snarkjs');

async function generateProof(avgSpeed) {
    const input = {
        avgSpeed: avgSpeed * 100, // Scale by 100, e.g., 130.45 → 13045
        threshold: 120 * 100      // 120 → 12000
    };
    const { proof, publicSignals } = await snarkjs.plonk.fullProve(
        input,
        'circuit_js/circuit.wasm',
        'circuit_final.zkey'
    );
    console.log("Proof:", proof);
    console.log("Public Signals:", publicSignals); // [1] if avg <= 120, [0] otherwise
    return { proof, publicSignals };
}

module.exports = { generateProof };

generateProof(110.59); // Replace with your actual average