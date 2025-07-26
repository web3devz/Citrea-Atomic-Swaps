import { useState } from "react";

declare global {
  interface Window {
    unisat?: any;
  }
}
import { Button } from "../ui/button";
import { Bitcoin, LogOut, Menu, X } from "lucide-react";
import { useAtom } from "jotai";
import { isWalletModalOpenAtom, walletAddressAtom, walletTypeAtom } from "../../atoms";
import WalletModal from "../walletmodal";
import WalletInfo from "../walletinfo";
import { useNavigate } from "react-router-dom";



const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [walletType, setWalletType] = useAtom(walletTypeAtom);
  const [walletAddress, setWalletAddress] = useAtom(walletAddressAtom);
  const [, setIsWalletModalOpen] = useAtom(isWalletModalOpenAtom);

  const navigate = useNavigate();


  const handleDisconnect = async () => {
    try {
      if (walletType === 'metamask') {

      } else if (walletType === 'unisat') {

        if (window.unisat && typeof window.unisat.disconnect === 'function') {
          await window.unisat.disconnect();
        }
      }

      setWalletType(null);
      setWalletAddress(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <>
      <nav className="border-b border-white/20 backdrop-blur-xl bg-white/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <Bitcoin className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Citrea Atomic Swaps
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Button 
              variant="ghost" 
              className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 font-medium"
              onClick={() => navigate('/')}
            >
              Home
            </Button>
            <Button 
              variant="ghost"
              className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 font-medium"
              onClick={() => navigate('/generate-requests')}
            >
              Generate Requests
            </Button>
            <Button 
              variant="ghost"
              className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 font-medium"
              onClick={() => navigate('/view-requests')}
            >
              View & Fulfill
            </Button>
            {walletAddress ? (
              <WalletInfo
                walletAddress={walletAddress}
                onDisconnect={handleDisconnect}
              />
            ) : (
              <Button 
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-medium"
              >
                Connect Wallet
              </Button>
            )}
          </div>

          <button 
            className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors duration-300" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-white/90 backdrop-blur-sm">
            <div className="p-4 space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                onClick={() => {
                  navigate('/');
                  setIsMenuOpen(false);
                }}
              >
                Home
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                onClick={() => {
                  navigate('/generate-requests');
                  setIsMenuOpen(false);
                }}
              >
                Generate Requests
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                onClick={() => {
                  navigate('/view-requests');
                  setIsMenuOpen(false);
                }}
              >
                View & Fulfill
              </Button>
              {walletAddress ? (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleDisconnect}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect Wallet
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg"
                  onClick={() => setIsWalletModalOpen(true)}
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>
      <WalletModal />
    </>
  );
};


export default Header;