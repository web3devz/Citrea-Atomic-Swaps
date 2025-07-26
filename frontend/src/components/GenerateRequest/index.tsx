/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Loader2, RefreshCw, Wallet, Lock, Bitcoin, Inbox } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useEffect, useState, useCallback } from "react";
// import { toast } from "../../hooks/use-toast";
import { ethers } from "ethers";
import { abi } from "../../abi/abi.json";
import { useAtom } from "jotai";
import { walletAddressAtom } from "../../atoms";

import { toast } from 'react-toastify';
import { formatDateTime } from "../../utils/time";
interface Request {
  requestor: string;
  amount: string;
  created: {
    full: string;
    relative: string;
  };
  status: string;
}

export const chain = {
  id: 5115,
  name: 'Citrea Testnet',
  network: 'citrea-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Citrea Bitcoin',
    symbol: 'cBTC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.citrea.xyz'] },
    public: { http: ['https://rpc.testnet.citrea.xyz'] },
  },
};


export const CONTRACT_ADDRESS = "0x29f5054129deefae63add822f325d78da70a2b6f";


const GenerateRequest = () => {
  const [amount, setAmount] = useState('');
  const [btcAddress, setBtcAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRequests, setIsFetchingRequests] = useState(false);
  const [transactionStep, setTransactionStep] = useState<'sending' | 'confirming' | 'updating' | null>(null);
  const [address, setWalletAddress] = useAtom(walletAddressAtom)
  const [, setWalletType] = useAtom(walletAddressAtom)
  const [requests, setRequests] = useState<Request[]>([]);


  const switchToChain = async () => {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask");
    }

    const chainIdHex = `0x${chain.id.toString(16)}`;

    try {

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {

      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls.public.http,
              },
            ],
          });
        } catch (addError) {
          throw new Error("Failed to add network");
        }
      } else {
        throw switchError;
      }
    }
  };




  const connectMetaMask = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setWalletType('metamask');
        setWalletAddress(accounts[0]);


      } else {
        alert('MetaMask is not installed!');
      }
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  };


  const handleGenerateRequest = async () => {
    if (!amount) {
      toast.error("Please enter amount");
      return;
    }

    if (!btcAddress) {
      toast.error("Please enter Bitcoin address");
      return;
    }

    setIsLoading(true);
    setTransactionStep('sending');
    
    try {
      if (!address) {
        await connectMetaMask();
      }
      await switchToChain();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contracts = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        signer
      );

      const parsedAmount = ethers.parseEther(amount);

      setTransactionStep('sending');
      const tx = await contracts[
        "generateRequest"
      ](parsedAmount,btcAddress, {
        value: parsedAmount,
      });

      console.log("Transaction sent:", tx.hash);
      toast.success(`Transaction sent! Hash: ${tx.hash.slice(0, 10)}...`);

      // Wait for transaction confirmation
      setTransactionStep('confirming');
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      toast.success("Swap request generated successfully!");

      // Now fetch updated requests after confirmation
      setTransactionStep('updating');
      console.log("Transaction confirmed, now fetching updated requests...");
      await getRequests();
      console.log("Requests updated successfully!");

      setBtcAddress("");
      setAmount("");

    } catch (error: any) {
      console.error("Transaction error:", error);
      if (error.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (error.code === -32603) {
        toast.error("Insufficient funds or network error");
      } else {
        toast.error("Transaction failed: " + (error.message || "Unknown error"));
      }
    } finally {
      setIsLoading(false);
      setTransactionStep(null);
    }
  };



  const getRequests = useCallback(async () => {
    if (!address) return;
    
    setIsFetchingRequests(true);
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrls.default.http[0]);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        provider
      );

      const allRequests: any = [];

      for (let i = 0; i < 100; i++) { // Increased from 10 to 100 to catch more requests
        try {
          const result = await contract.getRequest(i);

          console.log("result[0] === address", result[0]?.toLowerCase() == address?.toLowerCase(), result[0]?.toLowerCase(), address?.toLowerCase());

          if (result.amount.toString() !== "0" && address && result[0]?.toLowerCase() == address.toLowerCase()) {
            console.log("result", result);

            allRequests.push({
              requestor: result[0],
              btcAddr:  result[1],
              amount: ethers.formatEther(result[2]),
              created: formatDateTime(Number(result[3])),
              status: parseStatus(result[4])
            });
          }
        } catch (err) {
          console.log(`No more requests after ${i}`);
          break;
        }
      }

      console.log("All requests", allRequests);
      setRequests(allRequests.reverse());

    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests");
    } finally {
      setIsFetchingRequests(false);
    }
  }, [address]);


  const parseStatus = (statusCode: number): string => {


    switch (Number(statusCode)) {
      case 0:
        return 'fulfilled';
      case 1:
        return 'pending';
      case 2:
        return 'revoked';
      default:
        return 'unknown';
    }
  };

  useEffect(() => {
    if (address) {
      getRequests();
    }
  }, [address, getRequests]);
  // const getAndFilterRequestsForUser = async () => {
  //   const requests = await getRequests();
  //   // const userRequests = requests.filter((request) => request.btcAddress === btcAddress);
  //   // setRequests(userRequests);
  // }

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
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
            <Bitcoin className="h-5 w-5 text-blue-600" />
            <span className="text-blue-700 font-medium">Citrea Atomic Swaps</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
            Cross-Chain Bitcoin Swaps
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Seamlessly swap your cBTC across networks with secure atomic transactions
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Generate Swap Card */}
          <div className="group">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] relative">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative p-8 border-b border-gray-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-2xl shadow-lg">
                      <Lock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Generate Swap
                      </h2>
                      <p className="text-gray-600 text-sm">Lock your cBTC securely</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg">
                    <span className="text-white font-medium text-sm">
                      Step 1
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative p-8">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Amount (cBTC)
                    </label>
                    <div className="relative group">
                      <Input
                        type="number"
                        placeholder="0.00000000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isLoading}
                        step="0.00000001"
                        min="0"
                        className="pl-6 pr-16 py-4 text-lg border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 rounded-2xl transition-all duration-300 group-hover:border-blue-300 bg-gradient-to-r from-white to-gray-50"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                          <Bitcoin className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 font-medium text-sm">cBTC</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Bitcoin Address
                    </label>
                    <div className="relative group">
                      <Input
                        type="text"
                        placeholder="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
                        value={btcAddress}
                        onChange={(e) => setBtcAddress(e.target.value)}
                        disabled={isLoading}
                        className="pl-6 pr-4 py-4 text-lg border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 rounded-2xl transition-all duration-300 group-hover:border-purple-300 bg-gradient-to-r from-white to-gray-50"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    {!address ? (
                      <Button
                        className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 text-white rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group"
                        onClick={connectMetaMask}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-center gap-3">
                          <Wallet className="h-6 w-6" />
                          Connect MetaMask
                        </div>
                      </Button>
                    ) : (
                      <Button
                        className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 text-white rounded-2xl font-semibold shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group"
                        onClick={handleGenerateRequest}
                        disabled={isLoading || !btcAddress.trim() || !amount}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-center gap-3">
                          {isLoading ? (
                            <>
                              <Loader2 className="h-6 w-6 animate-spin" />
                              {transactionStep === 'sending' && 'Sending Transaction...'}
                              {transactionStep === 'confirming' && 'Confirming Transaction...'}
                              {transactionStep === 'updating' && 'Updating Swap List...'}
                              {!transactionStep && 'Processing...'}
                            </>
                          ) : (
                            <>
                              <Lock className="h-6 w-6" />
                              Lock cBTC & Generate Swap
                            </>
                          )}
                        </div>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Your Swaps Card */}
          <div className="group">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] relative">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative p-8 border-b border-gray-100/50 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg">
                      <Inbox className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Your Swaps
                      </h2>
                      <p className="text-gray-600 text-sm">Track your active transactions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-white font-medium text-sm">
                        {requests.length} Active
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={getRequests}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl p-3 transition-all duration-300"
                      disabled={isFetchingRequests}
                    >
                      {isFetchingRequests ? (
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

              <div className="relative p-8">
                <div className="space-y-6 max-h-[650px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
                  {!address ? (
                    <div className="text-center py-20">
                      <div className="relative mx-auto mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center shadow-lg">
                          <Wallet className="h-12 w-12 text-purple-500" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Wallet Not Connected</h3>
                      <p className="text-gray-500 mb-8 max-w-sm mx-auto">Connect your MetaMask wallet to view and manage your atomic swaps</p>
                      <Button
                        onClick={connectMetaMask}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                      >
                        <Wallet className="mr-2 h-5 w-5" />
                        Connect Wallet
                      </Button>
                    </div>
                  ) : isFetchingRequests ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="relative mb-8">
                        <div className="w-20 h-20 border-4 border-purple-100 rounded-full animate-spin border-t-purple-500 shadow-lg" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <Bitcoin className="h-8 w-8 text-purple-500 animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Loading Your Swaps</h3>
                        <p className="text-gray-500 animate-pulse">Fetching your transaction history...</p>
                      </div>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="relative mx-auto mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-lg">
                          <Inbox className="h-12 w-12 text-blue-500" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-yellow-800 text-xs">0</span>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">No Swaps Yet</h3>
                      <p className="text-gray-500 mb-8 max-w-sm mx-auto">Start your first atomic swap by generating a new swap request</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-blue-600 font-medium text-sm">Ready to swap</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {requests.map((request, index) => (
                        <div
                          key={index}
                          className="group relative bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-purple-300/50 transition-all duration-500 hover:shadow-xl p-6 transform hover:scale-[1.02]"
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

                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center shadow-lg">
                                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                              </div>
                              <div>
                                <p className="font-bold text-lg text-gray-900">
                                  {request.requestor.slice(0, 6)}...{request.requestor.slice(-4)}
                                </p>
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

                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-5 shadow-inner">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 font-medium">Amount</span>
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                                  <Bitcoin className="h-5 w-5 text-white" />
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    {request.amount}
                                  </span>
                                  <span className="ml-1 text-gray-600 font-medium">cBTC</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hover effect overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateRequest;