/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { abi } from '../../abi/abi.json';
import { chain, CONTRACT_ADDRESS } from "../GenerateRequest";
import { useAtom } from "jotai";
import { walletAddressAtom } from "../../atoms";
import { formatDateTime } from "../../utils/time";
import { parseStatus } from "../../utils/chain";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  TrendingUp, 
  Bitcoin, 
  Filter,
  Calendar,
  Activity,
  BarChart3,
  Loader2,
  User,
  Globe,
  Users
} from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface SwapRequest {
  id: number;
  requestor: string;
  receiver: string;
  amount: string;
  status: string;
  created: {
    full: string;
    relative: string;
  };
  lastUpdated?: string;
}

interface SwapStats {
  total: number;
  pending: number;
  fulfilled: number;
  revoked: number;
  totalVolume: string;
}

const SwapDashboard = () => {
  const [address] = useAtom(walletAddressAtom);
  const [userRequests, setUserRequests] = useState<SwapRequest[]>([]);
  const [allRequests, setAllRequests] = useState<SwapRequest[]>([]);
  const [stats, setStats] = useState<SwapStats>({
    total: 0,
    pending: 0,
    fulfilled: 0,
    revoked: 0,
    totalVolume: "0"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'fulfilled' | 'revoked'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'platform'>('personal');
  const [platformStats, setPlatformStats] = useState<SwapStats>({
    total: 0,
    pending: 0,
    fulfilled: 0,
    revoked: 0,
    totalVolume: "0"
  });

  const fetchSwapData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrls.default.http[0]);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

      console.log('🔍 Fetching swap data...');
      console.log('Contract address:', CONTRACT_ADDRESS);
      console.log('Provider:', chain.rpcUrls.default.http[0]);

      // First, try to get the total number of requests
      let totalRequestsCount = 0;
      try {
        const totalFromContract = await contract.reqCount();
        totalRequestsCount = Number(totalFromContract);
        console.log(`✅ Total requests from contract: ${totalRequestsCount}`);
      } catch (error) {
        console.warn('⚠️ reqCount failed, falling back to manual discovery:', error);
        // Fallback: try to find the last valid request
        for (let i = 1; i <= 50; i++) {
          try {
            const testResult = await contract.getRequest(i);
            if (testResult.amount.toString() !== "0") {
              totalRequestsCount = i;
            }
          } catch {
            break;
          }
        }
        console.log(`📍 Discovered ${totalRequestsCount} requests through manual search`);
      }
      
      if (totalRequestsCount === 0) {
        console.log('ℹ️ No requests found');
        setUserRequests([]);
        setAllRequests([]);
        setStats({
          total: 0,
          pending: 0,
          fulfilled: 0,
          revoked: 0,
          totalVolume: "0"
        });
        
        if (!isRefreshing) {
          toast.info("No swap requests found yet");
        }
        return;
      }

      const userReqs: SwapRequest[] = [];
      const allReqs: SwapRequest[] = [];
      let totalVolume = ethers.parseEther("0");

      // Determine the range to fetch (last 50 requests for performance)
      const maxToFetch = Math.min(50, totalRequestsCount);
      const startIndex = Math.max(1, totalRequestsCount - maxToFetch + 1);
      const endIndex = totalRequestsCount;

      console.log(`📥 Fetching requests ${startIndex} to ${endIndex} (${maxToFetch} total)`);

      // Create batch requests for better performance
      const batchSize = 5; // Reduced batch size for better reliability
      let successfulRequests = 0;

      for (let batch = startIndex; batch <= endIndex; batch += batchSize) {
        const batchEnd = Math.min(batch + batchSize - 1, endIndex);
        const batchPromises = [];
        
        console.log(`🔄 Processing batch ${batch}-${batchEnd}`);
        
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
              successfulRequests++;
              const status = parseStatus(result[4]);
              const timestamp = Number(result[3]); // generationTimestamp
              const createdTime = formatDateTime(timestamp);
              const swapData: SwapRequest = {
                id: id,
                requestor: result[0],
                receiver: result[1], // This is the BTC address (reciever in contract)
                amount: ethers.formatEther(result[2]),
                status: status,
                created: createdTime,
                lastUpdated: new Date().toISOString()
              };

              allReqs.push(swapData);
              totalVolume = totalVolume + result[2];

              // Filter user's requests
              if (address && result[0]?.toLowerCase() === address.toLowerCase()) {
                userReqs.push(swapData);
              }
            }
          });
        } catch (batchError) {
          console.error(`❌ Batch ${batch}-${batchEnd} failed:`, batchError);
        }

        // Add a small delay between batches to avoid overwhelming the RPC
        if (batch + batchSize <= endIndex) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Successfully fetched ${successfulRequests} requests`);
      console.log(`👤 Found ${userReqs.length} user requests`);

      // Calculate platform-wide statistics (all requests)
      const platformPending = allReqs.filter(req => req.status === 'pending').length;
      const platformFulfilled = allReqs.filter(req => req.status === 'fulfilled').length;
      const platformRevoked = allReqs.filter(req => req.status === 'revoked').length;

      // Calculate user-specific statistics
      const userPending = userReqs.filter(req => req.status === 'pending').length;
      const userFulfilled = userReqs.filter(req => req.status === 'fulfilled').length;
      const userRevoked = userReqs.filter(req => req.status === 'revoked').length;
      const userVolume = userReqs.reduce((sum, req) => sum + ethers.parseEther(req.amount), ethers.parseEther("0"));

      setUserRequests(userReqs.reverse());
      setAllRequests(allReqs.reverse());
      
      // Set user statistics (for personal tab)
      setStats({
        total: userReqs.length,
        pending: userPending,
        fulfilled: userFulfilled,
        revoked: userRevoked,
        totalVolume: ethers.formatEther(userVolume)
      });

      // Set platform statistics (for platform tab)
      setPlatformStats({
        total: totalRequestsCount,
        pending: platformPending,
        fulfilled: platformFulfilled,
        revoked: platformRevoked,
        totalVolume: ethers.formatEther(totalVolume)
      });

      if (!isRefreshing) {
        if (successfulRequests > 0) {
          toast.success(`✅ Dashboard loaded! Found ${userReqs.length} of your swaps (${successfulRequests} total requests)`);
        } else {
          toast.info("ℹ️ Dashboard loaded but no valid requests found");
        }
      }

    } catch (error: any) {
      console.error("❌ Critical error fetching swap data:", error);
      
      // More specific error messages
      if (error.code === 'NETWORK_ERROR') {
        toast.error("🌐 Network error - please check your connection");
      } else if (error.code === 'CALL_EXCEPTION') {
        toast.error("📞 Contract call failed - please check the contract address");
      } else if (error.message?.includes('timeout')) {
        toast.error("⏰ Request timeout - please try again");
      } else {
        toast.error(`❌ Failed to load dashboard: ${error.message || 'Unknown error'}`);
      }
      
      // Set empty state on error
      setUserRequests([]);
      setAllRequests([]);
      setStats({
        total: 0,
        pending: 0,
        fulfilled: 0,
        revoked: 0,
        totalVolume: "0"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [address]);

  // Auto-refresh functionality
  useEffect(() => {
    if (address) {
      fetchSwapData();
    }
  }, [address, fetchSwapData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && address) {
      interval = setInterval(() => {
        fetchSwapData(true);
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, address, fetchSwapData]);

  const handleRefresh = () => {
    fetchSwapData(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'fulfilled':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'revoked':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fulfilled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Current data based on active tab
  const currentRequests = activeTab === 'personal' ? userRequests : allRequests;
  
  const filteredRequests = currentRequests.filter(req => 
    filter === 'all' || req.status === filter
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h3>
          <p className="text-gray-500">Fetching your swap data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-blue-700 font-medium">Swap Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-4">
            {activeTab === 'personal' ? 'Your Swap Activity' : 'Platform Swap Activity'}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            {activeTab === 'personal' 
              ? 'Track all your atomic swaps, monitor progress, and view detailed statistics'
              : 'Monitor platform-wide swap activities, ecosystem stats, and market insights'
            }
          </p>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-xl p-1 border border-gray-200/50">
              <div className="flex gap-1">
                <Button
                  onClick={() => setActiveTab('personal')}
                  variant={activeTab === 'personal' ? 'default' : 'ghost'}
                  className={`flex items-center gap-2 px-6 py-3 ${
                    activeTab === 'personal'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <User className="h-4 w-4" />
                  Your Activity
                  <span className="ml-1 px-2 py-0.5 text-xs bg-black/10 rounded-full">
                    {stats.total}
                  </span>
                </Button>
                <Button
                  onClick={() => setActiveTab('platform')}
                  variant={activeTab === 'platform' ? 'default' : 'ghost'}
                  className={`flex items-center gap-2 px-6 py-3 ${
                    activeTab === 'platform'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  Platform Activity
                  <span className="ml-1 px-2 py-0.5 text-xs bg-black/10 rounded-full">
                    {platformStats.total}
                  </span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === 'personal' ? 'Your Total Swaps' : 'Platform Total Swaps'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeTab === 'personal' ? stats.total : platformStats.total}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {activeTab === 'personal' ? stats.pending : platformStats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeTab === 'personal' ? stats.fulfilled : platformStats.fulfilled}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-purple-600">
                  {parseFloat(activeTab === 'personal' ? stats.totalVolume : platformStats.totalVolume).toFixed(4)} cBTC
                </p>
              </div>
              <Bitcoin className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {(['all', 'pending', 'fulfilled', 'revoked'] as const).map((status) => (
            <Button
              key={status}
              onClick={() => setFilter(status)}
              variant={filter === status ? "default" : "outline"}
              className="capitalize"
            >
              <Filter className="h-4 w-4 mr-2" />
              {status} ({status === 'all' ? currentRequests.length : currentRequests.filter(r => r.status === status).length})
            </Button>
          ))}
        </div>

        {/* Swaps Section */}
        <Card className="bg-white/80 backdrop-blur-xl border-white/20 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  {activeTab === 'personal' ? <User className="h-5 w-5 text-white" /> : <Users className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {activeTab === 'personal' ? 'Your Swap History' : 'Platform Swap Activity'}
                  </h2>
                  <p className="text-gray-600">
                    Showing {filteredRequests.length} of {currentRequests.length} {activeTab === 'personal' ? 'swaps' : 'total swaps'}
                  </p>
                </div>
              </div>
              {autoRefresh && (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {filter === 'all' 
                    ? (activeTab === 'personal' ? 'No Swaps Yet' : 'No Platform Activity Yet') 
                    : `No ${filter} swaps`
                  }
                </h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'all' 
                    ? (activeTab === 'personal' 
                        ? 'Start your first atomic swap to see it here!' 
                        : 'No swap activity on the platform yet. Be the first to create a swap!'
                      ) 
                    : (activeTab === 'personal'
                        ? `You don't have any ${filter} swaps at the moment.`
                        : `No ${filter} swaps on the platform at the moment.`
                      )
                  }
                </p>
                {filter !== 'all' && (
                  <Button onClick={() => setFilter('all')} variant="outline">
                    View All Swaps
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="group relative bg-gradient-to-r from-white/50 to-white/30 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:border-blue-300/50 transition-all duration-300 p-6 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(request.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">Swap #{request.id}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(request.status)}`}>
                              {request.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium">Amount:</span> {parseFloat(request.amount).toFixed(6)} cBTC</p>
                            <p><span className="font-medium">BTC Address:</span> {request.receiver}</p>
                            {activeTab === 'platform' && (
                              <p><span className="font-medium">Requestor:</span> {request.requestor.slice(0, 8)}...{request.requestor.slice(-6)}</p>
                            )}
                            <p><span className="font-medium">Created:</span> {request.created.full}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {parseFloat(request.amount).toFixed(4)} cBTC
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.created.relative}
                        </div>
                      </div>
                    </div>

                    {/* Progress indicator for pending swaps */}
                    {request.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-gray-200/50">
                        <div className="flex items-center gap-2 text-sm text-yellow-600">
                          <Clock className="h-4 w-4 animate-pulse" />
                          <span>Waiting for fulfillment...</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full animate-pulse" style={{width: '33%'}}></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SwapDashboard;
