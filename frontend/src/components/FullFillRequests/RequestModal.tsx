import { useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Loader2, Copy, Bitcoin, Wallet, Send, CheckCircle } from "lucide-react";
import { Separator } from "../ui/separator";
import { useAtom } from "jotai";
import { walletAddressAtom, walletTypeAtom } from "../../atoms";

interface RequestDialogProps {
  request: {
    request_id: number;
    btcAddr: string;
    requestor: string;
    amount: string;
    created: {
      full: string;
      relative: string;
    };
    status: string;
  };
  onSendBitcoin: (request: {
    request_id: number;
    btcAddr: string;
    requestor: string;
    amount: string;
    created: {
      full: string;
      relative: string;
    };
    status: string;
  }) => Promise<string | void>;
  onClaimCBTC: (txHash: string, id: number) => Promise<void>;
}

const RequestDialog = ({ request, onSendBitcoin, onClaimCBTC }: RequestDialogProps) => {
  const [txHash, setTxHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUnisatConnecting, setIsUnisatConnecting] = useState(false);
  const [isMetamaskConnecting, setIsMetamaskConnecting] = useState(false);
  const [unisatConnected, setUnisatConnected] = useState(false);
  const [metamaskConnected, setMetamaskConnected] = useState(false);
  const [sentTxId, setSentTxId] = useState('');
  const [, setWalletType] = useAtom(walletTypeAtom);
  const [, setWalletAddress] = useAtom(walletAddressAtom);

  const connectUniSat = async () => {
    setIsUnisatConnecting(true);
    try {
      if (typeof window.unisat === 'undefined') {
        toast.error('UniSat wallet is not installed!');
        return;
      }
      await window.unisat.switchChain('BITCOIN_TESTNET4');
      const accounts = await window.unisat.requestAccounts();
      setUnisatConnected(true);
      setWalletType('unisat');
      setWalletAddress(accounts[0]);
    } catch (error) {
      console.error('Error connecting to UniSat:', error);
      toast.error('Failed to connect to UniSat wallet');
    } finally {
      setIsUnisatConnecting(false);
    }
  };

  const connectMetaMask = async () => {
    setIsMetamaskConnecting(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        toast.error('MetaMask is not installed!');
        return;
      }
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setMetamaskConnected(true);
      setWalletType('metamask');
      setWalletAddress(accounts[0]);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      toast.error('Failed to connect to MetaMask');
    } finally {
      setIsMetamaskConnecting(false);
    }
  };

  const handleSendBitcoin = async () => {
    if (!unisatConnected) {
      await connectUniSat();
      return;
    }
    setIsSending(true);
    try {
      const result = await onSendBitcoin(request);
      if (result) {
        setSentTxId(result);
        setTxHash(result);
      }
    } catch (error) {
      console.error('Error sending Bitcoin:', error);
      toast.error('Failed to send Bitcoin');
    } finally {
      setIsSending(false);
    }
  };

  const handleClaimSubmit = async () => {
    if (!metamaskConnected) {
      await connectMetaMask();
      return;
    }

    if (!txHash) {
      toast.error("Please enter transaction hash");
      return;
    }
    setIsLoading(true);
    try {
      await onClaimCBTC(txHash, request.request_id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTxId = () => {
    navigator.clipboard.writeText(sentTxId);
    toast.success('Transaction ID copied to clipboard!');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-none rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-medium"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Fulfill Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
        <DialogHeader className="text-center pb-6 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Complete Atomic Swap
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base mt-2">
            Follow these steps to fulfill the swap request securely
          </DialogDescription>
        </DialogHeader>
        
        {/* Request Details Card */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border border-purple-100 shadow-inner">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-purple-600" />
            Request Details
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-600">Amount</Label>
              <p className="font-bold text-lg text-purple-600">{request.amount} cBTC</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-600">Status</Label>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                {request.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-600">Requestor</Label>
              <p className="font-mono text-sm bg-white/80 p-2 rounded-lg border break-all">{request.requestor}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Bitcoin Address</Label>
              <p className="font-mono text-sm bg-white/80 p-2 rounded-lg border break-all">{request.btcAddr}</p>
            </div>
          </div>
        </div>

        {/* Step 1: Send Bitcoin */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <h4 className="text-lg font-bold text-gray-900">Send Bitcoin</h4>
            {unisatConnected && !sentTxId && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Wallet Connected</span>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleSendBitcoin} 
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-medium py-6"
            disabled={isSending || isUnisatConnecting}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending Bitcoin...
              </>
            ) : isUnisatConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting to UniSat...
              </>
            ) : !unisatConnected ? (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                Connect UniSat Wallet
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Send {request.amount} BTC
              </>
            )}
          </Button>

          {sentTxId && (
            <div className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Label className="text-sm font-bold text-green-800">Bitcoin Sent Successfully!</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCopyTxId}
                  className="ml-auto h-8 px-3 text-green-600 hover:bg-green-100"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm font-mono bg-white p-2 rounded-lg border break-all">{sentTxId}</p>
              <p className="text-xs text-green-600 mt-2 font-medium">
                ✓ Transaction ID auto-filled below for claiming
              </p>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Step 2: Claim cBTC */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <h4 className="text-lg font-bold text-gray-900">Claim cBTC</h4>
            {metamaskConnected && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">MetaMask Connected</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="txHash" className="text-sm font-medium text-gray-700">Bitcoin Transaction Hash</Label>
              <Input
                id="txHash"
                placeholder="Enter your Bitcoin transaction hash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                disabled={isLoading || isMetamaskConnecting}
                className="mt-2 border-2 border-gray-200 focus:border-purple-400 rounded-xl"
              />
            </div>
            
            <Button 
              onClick={handleClaimSubmit} 
              disabled={isLoading || isMetamaskConnecting || !txHash} 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-medium py-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Claiming cBTC...
                </>
              ) : isMetamaskConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting to MetaMask...
                </>
              ) : !metamaskConnected ? (
                <>
                  <Wallet className="mr-2 h-5 w-5" />
                  Connect MetaMask
                </>
              ) : (
                <>
                  <Bitcoin className="mr-2 h-5 w-5" />
                  Claim {request.amount} cBTC
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDialog;