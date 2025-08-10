// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

enum Status {
    Fulfilled,
    Pending,
    Revoked
}

struct Request {
    address requestor;
    string reciever;
    uint256 amount;
    uint256 generationTimestamp;
    Status status;
}

interface IAtomicSwap {
    function generateRequest(
        uint256 amount,
        string memory reciever
    ) external payable;

    function getRequest(
        uint256 _id
    ) external view returns (Request memory req_);

    function getTotalRequests() external view returns (uint256);

    function getTotalVolume() external view returns (uint256);

    function getTotalFulfilled() external view returns (uint256);

    function fullfill(
        uint256 _requestId,
        uint256 _blockNumber,
        bytes32 _wtxId,
        bytes calldata _proof,
        uint256 _index
    ) external;

    function revokeRequest(uint256 _requestId) external;
}
