pragma circom 2.0.0;

template SpeedCheck() {
    signal input avgSpeed;
    signal input threshold;
    signal output isBelowThreshold;

    signal diff;
    diff <== threshold - avgSpeed;

    signal diffShifted;
    diffShifted <== diff + 100000;

    isBelowThreshold <-- diff >= 0 ? 1 : 0;

    isBelowThreshold * (isBelowThreshold - 1) === 0;

    signal diffPositivePart;
    diffPositivePart <== diffShifted * isBelowThreshold;
    diffPositivePart - (100000 * isBelowThreshold) === diff * isBelowThreshold;
}

component main = SpeedCheck();
