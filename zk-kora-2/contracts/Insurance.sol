// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Verifier.sol";

contract InsuranceUnderwriting is Ownable {
    PlonkVerifier public verifier;
    mapping(address => bool) public insuredDrivers;
    uint256 public premiumBaseRate = 1000;

    event DriverInsured(address indexed driver, uint256 premium);

    constructor(address _verifier) Ownable(msg.sender) {
        verifier = PlonkVerifier(_verifier);
    }

    function submitProof(
        uint256[24] calldata proof,
        uint256[1] calldata publicSignals
    ) external {
        bool isValid = verifier.verifyProof(proof, publicSignals);
        require(isValid, "Invalid proof");

        uint256 isBelowThreshold = publicSignals[0];
        if (isBelowThreshold == 1) {
            insuredDrivers[msg.sender] = true;
            uint256 premium = premiumBaseRate;
            emit DriverInsured(msg.sender, premium);
        } else {
            revert("Driver exceeds speed threshold");
        }
    }

    function checkInsurance(address driver) external view returns (bool) {
        return insuredDrivers[driver];
    }
}