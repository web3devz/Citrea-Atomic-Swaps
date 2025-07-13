# 📘 SwapRoot – Trustless Atomic Swaps Between Bitcoin and Citrea

SwapRoot is a decentralized protocol enabling **trustless atomic swaps** between native Bitcoin and assets on the **Citrea zkEVM rollup**. The protocol allows two users—one on Citrea and one on Bitcoin—to exchange assets securely, without intermediaries, using **hash time-locked contracts (HTLCs)** and **Bitcoin Light Clients**.

> ⚡ SwapRoot bridges Bitcoin's security with Ethereum-style programmability via Citrea, unlocking frictionless cross-chain value movement.

## 🔍 Motivation

Cross-chain swaps are plagued by:

* **Custodial risks** from centralized bridges
* **Long withdrawal times** via Layer 1 settlement
* **Fragmented liquidity**

Citrea brings zkEVM rollups to Bitcoin. SwapRoot builds on this to provide:

* **Instant finality** and **smart contract support**
* **Trustless, censorship-resistant swap flows**
* A foundation for future **DeFi-on-Bitcoin** primitives


## 🔁 Swap Workflow Overview

SwapRoot implements a **request-fulfillment model**:

### 1. **Swap Request (Citrea Side)**

User A (on Citrea) initiates a swap by locking tokens into a smart contract with:

* Amount offered on Citrea
* Desired BTC amount
* Swap hashlock (H = SHA256(secret))
* Timeout (T1)

### 2. **Fulfillment (Bitcoin Side)**

User B (on Bitcoin) sees the request and agrees to fulfill it. They:

* Lock BTC in a Bitcoin HTLC using the same hash H and timeout T2 < T1

### 3. **Redemption (Citrea Side)**

User A detects the BTC lock and uses the secret `s` to claim BTC from Bitcoin.

Once `s` is revealed on Bitcoin, User B can use `s` to claim User A’s funds from Citrea.

### Flow 
Say, user A on Citrea wants to get BTC on bitcoin.
- User A will generate a Request on Citrea quoting the amount he desires and locking the funds.
- User B who has funds on Bitcoin and has an opposite intent as User A can fulfill the request.
	- Post the above txn User B can claim the funds from the locking contract trustlessly.
	- The contract here will verify using LightClient and release the funds to user

### Flow chart
![image](https://github.com/user-attachments/assets/7496dbd1-bfe8-461f-9dcd-f077d4cf1694)

## ⚙️ Core Components

### 🔐 Smart Contract (Citrea)

Written in Solidity and deployed on Citrea zkEVM:

* Handles **swap creation, cancellation, and redemption**
* Verifies fulfillment proofs from the Bitcoin chain via a **Bitcoin Light Client**
* Includes hashlock + timelock logic for atomicity
* Emits events for fulfillment watchers

### 🧠 Bitcoin Light Client Integration

SwapRoot uses **zk-proven Bitcoin headers** verified on Citrea:

* Validates Bitcoin HTLC scripts, tx inclusion, and spending
* Ensures that funds were locked/redeemed on Bitcoin using correct hash
* Avoids need for off-chain oracles or trust assumptions

### 🔎 Off-Chain Watcher (Optional)

Though not strictly required, an off-chain watcher service:

* Monitors Bitcoin for relevant HTLC txns
* Relays fulfillment proofs to Citrea
* Can be run by User A, User B, or a neutral third party

---

## ⛓️ Atomicity & Security Model

### ✅ Trustless Guarantees

* Neither user can cheat if the other follows protocol
* If BTC is not locked, User A reclaims Citrea funds after T1
* If BTC is locked but User A doesn’t redeem, User B reclaims BTC after T2

### 🔒 Light Client Security

* Based on Citrea's zk-powered Bitcoin Light Client
* Assumes correctness of zkSNARK-based header chain
* Prevents false claims about Bitcoin txs

### 📉 Fallbacks

* If Bitcoin transaction is never confirmed, no risk to Citrea user
* If secret is leaked off-chain, attacker must still race timeouts


## 📦 Features

* 🪙 **Supports arbitrary ERC20 tokens on Citrea**
* ⏱️ **Configurable timeouts** for swap lifecycle control
* 🔍 **Transparent event logs** for trustless auditing
* 🔗 **Modular architecture** for future expansion (e.g., LN support)


## 🧪 Use Cases

* **Peer-to-peer BTC <> ERC20 swaps**
* **Non-custodial on/off ramps**
* **Cross-chain arbitrage**
* **Foundational bridge layer for DeFi-on-Bitcoin protocols**


## 📚 Technical Details

### Smart Contract Methods (Simplified)

```solidity
function createSwap(bytes32 hashlock, address token, uint256 amount, uint256 expiry) external;
function cancelSwap(bytes32 swapId) external;
function fulfillSwap(bytes32 swapId, bytes calldata btcProof, bytes calldata btcTx) external;
```

### Bitcoin HTLC Template (P2WSH)

```asm
OP_IF
  <PubKey B> OP_CHECKSIG
OP_ELSE
  <TimeLock> OP_CHECKLOCKTIMEVERIFY OP_DROP
  <PubKey A> OP_CHECKSIG
OP_ENDIF
```

* BTC funds can be claimed by B with secret `s` or refunded after `T2`

## 🧱 Future Enhancements

* 🔐 **ZK privacy layer** to hide participants or amounts
* 🌉 **Lightning Network support** for fast BTC fulfillment
* 📈 **Orderbook + routing** for swap matching and batching
* 🎮 **Gamified liquidity incentives** via on-chain reputation or LP rewards

## 🙌 Credits

* Built on [Citrea zkEVM](https://citrea.xyz)
* Powered by Bitcoin Light Client proof system
* Inspired by classic HTLC atomic swap research
