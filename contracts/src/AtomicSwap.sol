// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "bitcoin-spv/solidity/contracts/ValidateSPV.sol";
import "./interfaces/IBitcoinLightClient.sol";
import {IAtomicSwap, Request, Status} from "./interfaces/IAtomicSwap.sol";

contract AtomicSwap is IAtomicSwap {
    IBitcoinLightClient public bitcoinLightClient;

    mapping(uint256 => Request) public lockedFunds;
    // id => request
    mapping(uint256 => Request) public requests;

    uint256 public totalRequests;
    uint256 public totalVolume;
    uint256 public totalFulfilled;

    event GenerateRequest(uint256 indexed requestId, address indexed requestor, uint256 amount, string receiver, uint256 timestamp);
    event RequestFulfilled(uint256 indexed requestId, address indexed fulfiller, bool isIncluded, uint256 timestamp);
    event ReleaseFunds(uint256 indexed requestId, address indexed user, uint256 amount, uint256 timestamp);
    event RequestRevoked(uint256 indexed requestId, address indexed requestor, uint256 amount, uint256 timestamp);
    event SwapCompleted(uint256 indexed requestId, address indexed requestor, address indexed fulfiller, uint256 amount, uint256 timestamp);

    constructor(address _bitcoinLightClient) {
        bitcoinLightClient = IBitcoinLightClient(_bitcoinLightClient);
    }

    function generateRequest(
        uint256 amount,
        string memory reciever
    ) external payable {
        require(msg.value == amount, "Not enough funds sent");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(reciever).length > 0, "Receiver address cannot be empty");
        
        totalRequests++;
        totalVolume += amount;
        
        requests[totalRequests] = Request({
            requestor: msg.sender,
            reciever: reciever,
            amount: amount,
            generationTimestamp: block.timestamp,
            status: Status.Pending
        });
        
        emit GenerateRequest(totalRequests, msg.sender, amount, reciever, block.timestamp);
    }

    function getRequest(uint256 _id) public view returns (Request memory req_) {
        return requests[_id];
    }

    function getTotalRequests() public view returns (uint256) {
        return totalRequests;
    }

    function getTotalVolume() public view returns (uint256) {
        return totalVolume;
    }

    function getTotalFulfilled() public view returns (uint256) {
        return totalFulfilled;
    }

    function fullfill(
        uint256 _requestId,
        uint256 _blockNumber,
        bytes32 _wtxId,
        bytes calldata _proof,
        uint256 _index
    ) external {
        require(_requestId > 0 && _requestId <= totalRequests, "Invalid request ID");
        Request memory request = getRequest(_requestId);
        require(request.status == Status.Pending, "Request is not pending");
        
        bool is_included = bitcoinLightClient.verifyInclusion(
            _blockNumber,
            _wtxId,
            _proof,
            _index
        );

        require(is_included, "Transaction not included");
        
        emit RequestFulfilled(_requestId, msg.sender, is_included, block.timestamp);
        totalFulfilled++;
        
        releaseFundsTo(_requestId, msg.sender);
        
        emit SwapCompleted(_requestId, request.requestor, msg.sender, request.amount, block.timestamp);
    }

    function releaseFundsTo(uint256 _requestId, address user) private {
        Request memory request = getRequest(_requestId);

        // Update status of the request
        request.status = Status.Fulfilled;
        requests[_requestId] = request;

        uint256 amount = request.amount;
        (bool success, bytes memory _data) = user.call{value: amount}("");
        require(success, "Failed to send funds");
        
        emit ReleaseFunds(_requestId, user, amount, block.timestamp);
    }

    function revokeRequest(uint256 _requestId) external {
        require(_requestId > 0 && _requestId <= totalRequests, "Invalid request ID");
        Request memory request = getRequest(_requestId);
        require(request.requestor == msg.sender, "Unauthorized caller");
        require(request.status == Status.Pending, "Request is not pending");

        // Update status to Revoked
        request.status = Status.Revoked;
        requests[_requestId] = request;

        uint256 amount = request.amount;
        (bool success, bytes memory _data) = request.requestor.call{
            value: amount
        }("");
        require(success, "Failed to send funds");
        
        emit RequestRevoked(_requestId, request.requestor, amount, block.timestamp);
    }
}
