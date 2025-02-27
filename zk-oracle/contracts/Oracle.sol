// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IZKVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[1] memory input
    ) external view returns (bool);
}

contract InsuranceOracle is Ownable(msg.sender), ReentrancyGuard {
    IZKVerifier public verifier;

    struct DriverData {
        bytes32 dataHash;
        uint256 timestamp;
        bool isVerified;
        uint256 riskScore;
    }

    mapping(address => DriverData[]) public driverHistory;

    event DataSubmitted(address indexed driver, bytes32 dataHash, uint256 timestamp);
    event ProofVerified(address indexed driver, uint256 riskScore);

    constructor(address _verifierAddress) {
        verifier = IZKVerifier(_verifierAddress);
    }

    function submitData(bytes32 _dataHash) external nonReentrant {
        DriverData memory newData = DriverData({
            dataHash: _dataHash,
            timestamp: block.timestamp,
            isVerified: false,
            riskScore: 0
        });

        driverHistory[msg.sender].push(newData);
        emit DataSubmitted(msg.sender, _dataHash, block.timestamp);
    }

    function verifyDataProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[1] memory input,
        uint256 riskScore
    ) external nonReentrant {
        require(driverHistory[msg.sender].length > 0, "no data submitted");

        require(verifier.verifyProof(a, b, c, input), "Invalid Proof");

        uint256 lastIndex = driverHistory[msg.sender].length - 1;
        driverHistory[msg.sender][lastIndex].isVerified = true;
        driverHistory[msg.sender][lastIndex].riskScore = riskScore;

        emit ProofVerified(msg.sender, riskScore);
    }

    function getLatestRiskScore(address driver) external view returns (uint256) {
        require(driverHistory[driver].length > 0, "No data available");
        return driverHistory[driver][driverHistory[driver].length - 1].riskScore;
    }
}
