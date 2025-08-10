/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

import { Button } from "../ui/button";
import RequestDialog from "./RequestModal";
import { ethers } from "ethers";
import { chain, CONTRACT_ADDRESS } from "../GenerateRequest";
import { abi } from '../../abi/abi.json'
import { getVerificationDetails } from "../../utils/verifications";
import { useAtom } from "jotai";
import { walletAddressAtom } from "../../atoms";
import { formatDateTime } from "../../utils/time";
import { parseStatus } from "../../utils/chain";
import { Bitcoin, Inbox, Loader2, RefreshCw, Users, Zap, Shield, ArrowRightLeft } from "lucide-react";


const FullFillRequests = () => {
  const [address, setWalletAddress] = useAtom(walletAddressAtom);
  const [, setWalletType] = useAtom(walletAddressAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [requests, setRequests] = useState<{
    request_id: number;
    btcAddr: string;
    requestor: string;
    amount: string;
    created: {
      full: string;
      relative: string;
    };
    status: string;
  }[]>([]);


  const getRequests = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      console.log('🔍 Fetching pending requests...');
      
      const provider = new ethers.JsonRpcProvider(chain.rpcUrls.default.http[0]);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        provider
      );

      // Try to get total requests first, with fallback
      let totalRequestsCount = 0;
      try {
        const totalFromContract = await contract.getTotalRequests();
        totalRequestsCount = Number(totalFromContract);
        console.log(`✅ Total requests: ${totalRequestsCount}`);
      } catch (error) {
        console.warn('⚠️ getTotalRequests failed, using fallback:', error);
        // Fallback: search manually
        for (let i = 1; i <= 100; i++) {
          try {
            const testResult = await contract.getRequest(i);
            if (testResult.amount.toString() !== "0") {
              totalRequestsCount = i;
            }
          } catch {
            break;
          }
        }
        console.log(`📍 Found ${totalRequestsCount} requests via fallback`);
      }

      if (totalRequestsCount === 0) {
        console.log('ℹ️ No requests found');
        setRequests([]);
        if (!isRefreshing) {
          toast.info("No swap requests found at the moment");
        }
        return;
      }

      const allRequests: any = [];
      let totalRequestsFound = 0;
      const batchSize = 5; // Smaller batch size for reliability
      const maxToFetch = Math.min(50, totalRequestsCount);
      const startIndex = Math.max(1, totalRequestsCount - maxToFetch + 1);
      const endIndex = totalRequestsCount;

      console.log(`📥 Checking requests ${startIndex}-${endIndex} for pending status`);

      // Process requests in batches for better performance
      for (let batch = startIndex; batch <= endIndex; batch += batchSize) {
        const batchEnd = Math.min(batch + batchSize - 1, endIndex);
        const batchPromises = [];
        
        for (let i = batch; i <= batchEnd; i++) {
          batchPromises.push(
            contract.getRequest(i)
              .then((result: any) => ({ id: i, result, success: true }))
              .catch((error: any) => {
                console.warn(`❌ Failed to fetch request ${i}:`, error.message || error);
                return { id: i, result: null, success: false };
              })
          );
        }

        try {
          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(({ id, result, success }) => {
            if (success && result && result.amount.toString() !== "0") {
              totalRequestsFound++;
              const status = parseStatus(result[4]);
              console.log(`📋 Request ${id}: Status = ${status}`);
              
              // Only add pending requests (available to fulfill)
              if (status === 'pending') {
                allRequests.push({
                  request_id: id,
                  requestor: result[0],
                  btcAddr: result[1],
                  amount: ethers.formatEther(result[2]),
                  created: formatDateTime(Number(result[3])),
                  status: status
                });
              }
            }
          });
        } catch (batchError) {
          console.error(`❌ Batch ${batch}-${batchEnd} failed:`, batchError);
        }

        // Small delay between batches
        if (batch + batchSize <= endIndex) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`✅ Found ${totalRequestsFound} total requests, ${allRequests.length} pending`);
      setRequests(allRequests.reverse()); // Show newest first
      
      if (!isRefreshing) {
        if (allRequests.length > 0) {
          toast.success(`✅ Found ${allRequests.length} pending requests out of ${totalRequestsFound} total`);
        } else if (totalRequestsFound > 0) {
          toast.info(`ℹ️ Found ${totalRequestsFound} total requests, but none are pending`);
        } else {
          toast.info("ℹ️ No swap requests found at the moment");
        }
      }
      
    } catch (error: any) {
      console.error("❌ Error fetching pending requests:", error);
      
      // More specific error messages
      if (error.code === 'NETWORK_ERROR') {
        toast.error("🌐 Network error - please check your connection");
      } else if (error.code === 'CALL_EXCEPTION') {
        toast.error("📞 Contract call failed - contract may not be deployed");
      } else if (error.message?.includes('timeout')) {
        toast.error("⏰ Request timeout - please try again");
      } else {
        toast.error(`❌ Failed to fetch requests: ${error.message || 'Unknown error'}`);
      }
      
      setRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    getRequests();
  }, []);

  const handleRefresh = () => {
    getRequests(true);
  };


  const connectUniSat = async () => {
    try {
        if (typeof window.unisat !== 'undefined') {
            await window.unisat.switchChain('BITCOIN_TESTNET4');

            const accounts = await window.unisat.requestAccounts();
            setWalletAddress(accounts[0]);
            setWalletType('unisat');
            // setIsOpen(false);
        } else {
            alert('UniSat Wallet is not installed!');
        }
    } catch (error) {
        console.error('Error connecting to UniSat:', error);
    }
};

  const handleSendBitcoin = async (request: {
    request_id: number;
    btcAddr: string;
    requestor: string;
    amount: string;
    created: {
      full: string;
      relative: string;
    };
    status: string;
  }) => {
    try {

      console.log("req", request);

      if (typeof window.unisat === 'undefined') {
        throw new Error('UniSat wallet is not installed!');
      }

      await connectUniSat();
      const accounts = await window.unisat.requestAccounts();
      if (!accounts.length) {
        throw new Error('Please connect your UniSat wallet first');
      }

      console.log("accounts", accounts);

      
        let txid = await window.unisat.sendBitcoin(request.btcAddr,
          1000
        );

        toast.info("Transaction Started. Please confirm the transaction in your wallet");
        return txid;




      // toast({
      //   title: "Transaction Started",
      //   description: "Please confirm the transaction in your wallet",
      // });
      

    } catch (error: any) {
      // toast({
      //   title: "Transaction Failed",
      //   description: error.message || "Failed to send Bitcoin",
      //   variant: "destructive",
      // });
      toast.error(error.message || "Failed to send Bitcoin");
    }
  };


  const connectMetaMask = async () => {
    try {
        if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            setWalletAddress(accounts[0]);
            setWalletType('metamask');
            
        } else {
            alert('MetaMask is not installed!');
        }
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
    }
};

  const handleClaimCBTC = async (txHash: string, id: number) => {
    try {
      const response = await axios.get(
        `https://mempool.space/testnet4/api/tx/${txHash}`
      );

      const blockhash = response.data.status.confirmed
        ? response.data.status.block_hash
        : null;


      const blockHeight = response.data.status.block_height

      if (!blockhash) {
        throw new Error("Transaction not confirmed yet");
      }


      console.log("processing blockhash", response.data);

      const {
        blockHash,
        wtxid,
        proof,
        index
      } = await getVerificationDetails(blockhash, txHash);

      console.log("blockHash", blockHash);
      // console.log("wtxid", wtxid);
      // console.log("proof", proof);
      // console.log("index", index);

      if (!address) {
        await connectMetaMask();
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();


      const contracts = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        signer
      );



      console.log(
        "id",
        id,
        "blockHeight",
        blockHeight,
        "wtxid",
        wtxid,
        "proof",
        proof,
        "index",
        index
      );

      // Convert wtxid to bytes32
      const wtxidBytes32 = `0x${wtxid}`;

      // Convert proof to bytes
      const proofBytes = `0x${proof}`;



      const tx = await contracts.fullfill(
        id,                 // _requestId: uint256
        blockHeight,        // _blockNumber: uint256
        wtxidBytes32,       // _wtxId: bytes32
        proofBytes,         // _proof: bytes
        index              // _index: uint256
      );

      // toast({
      //   title: "CBTC Claimed",
      //   description: "Transaction submitted successfully. Waiting for confirmation...",
      // });

      toast.info("Transaction submitted successfully. Waiting for confirmation...");

      console.log("tx", tx);


      await tx.wait(1)





      // const transactions = await getWtxids(blockhash);

      // Add your CBTC claiming logic here
      // toast({
      //   title: "CBTC Claimed",
      //   description: "Successfully claimed CBTC tokens",
      // });

      toast.success("Successfully claimed CBTC tokens");

    } catch (error: any) {
      // toast({
      //   title: "Claim Failed",
      //   description: error.message || "Failed to claim CBTC",
      //   variant: "destructive",
      // });

      toast.error(error.message || "Failed to claim CBTC");
    }
  };




  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
            <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            <span className="text-purple-700 font-medium">Fulfill Requests</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent mb-4">
            Active Swap Requests
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Discover and fulfill atomic swap requests from other users
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
            <Users className="h-4 w-4 text-green-600" />
            <span className="text-green-700 font-medium text-sm">Showing all public requests</span>
          </div>
        </div>

        {/* Main Card with enhanced glass effect */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 hover:shadow-3xl transition-all duration-500">
          {/* Header Section */}
          <div className="p-8 border-b border-gray-100/50 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Pending Swaps
                  </h2>
                  <p className="text-gray-600 text-sm">Available pending requests to fulfill</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-white font-medium text-sm">
                    {requests?.length || 0} Available
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl p-3 transition-all duration-300"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-purple-100 rounded-full animate-spin border-t-purple-500 shadow-lg" />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Bitcoin className="h-8 w-8 text-purple-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Loading Swap Requests</h3>
                  <p className="text-gray-500 animate-pulse">Fetching available opportunities...</p>
                </div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-20">
                <div className="relative mx-auto mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center shadow-lg">
                    <Inbox className="h-12 w-12 text-purple-500" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-yellow-800 text-xs">0</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Pending Swaps</h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                  There are no pending swap requests available to fulfill at the moment. Check back later for new opportunities.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="border-purple-200 hover:bg-purple-50 text-purple-600 rounded-xl px-6 py-3 font-medium"
                  disabled={isRefreshing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check for New Requests
                </Button>
              </div>
            ) : (
              <div className="relative">
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-500" />
                      <span className="text-purple-600 font-medium">Refreshing...</span>
                    </div>
                  </div>
                )}
                <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-2">
                  {requests.map((request) => (
                    <div
                      key={request.request_id}
                      className="group relative bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-purple-300/50 transition-all duration-500 hover:shadow-xl overflow-hidden transform hover:scale-[1.02]"
                    >
                      {/* Status indicator */}
                      <div className="absolute -top-2 -right-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                          request.status === 'pending'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}>
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>

                      {/* Card Header */}
                      <div className="p-6 border-b border-gray-100/50">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center shadow-lg">
                              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                {request.requestor.slice(0, 6)}...{request.requestor.slice(-4)}
                              </h3>
                              <div className="text-sm text-gray-500 space-y-1">
                                <p className="font-medium">{request.created.relative}</p>
                                <p className="text-xs opacity-75">{request.created.full}</p>
                              </div>
                            </div>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                            request.status === 'pending'
                              ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200'
                              : 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 space-y-6">
                        <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl p-5 shadow-inner">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-purple-600" />
                              <span className="text-gray-700 font-medium">Swap Amount</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-lg">
                                <Bitcoin className="h-5 w-5 text-white" />
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                  {request.amount}
                                </span>
                                <span className="ml-1 text-gray-600 font-medium">cBTC</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {request.status === 'pending' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Zap className="h-4 w-4 text-amber-500" />
                              <span>Ready to fulfill this swap request</span>
                            </div>
                            <RequestDialog
                              request={request}
                              onSendBitcoin={handleSendBitcoin}
                              onClaimCBTC={handleClaimCBTC}
                            />
                          </div>
                        )}
                      </div>

                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



export default FullFillRequests;