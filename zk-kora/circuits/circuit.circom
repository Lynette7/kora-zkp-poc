pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

template DrivingDataVerifier() {
    signal input publicDataHash;

    signal input speed;
    signal input location[2]; // [latitude, longitude]
    signal input timestamp;

    signal input speedLimit;
    component isSpeedValid = LessThan(32);
    isSpeedValid.in[0] <== speed;
    isSpeedValid.in[1] <== speedLimit;
    signal speedIsValid <== isSpeedValid.out;

    component hasher = Poseidon(4);
    hasher.inputs[0] <== speed;
    hasher.inputs[1] <== location[0];
    hasher.inputs[2] <== location[1];
    hasher.inputs[3] <== timestamp;

    publicDataHash === hasher.out;
}

component main {public [publicDataHash]} = DrivingDataVerifier();
