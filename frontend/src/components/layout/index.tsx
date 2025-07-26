import { Outlet } from "react-router-dom";
import Header from "../header";

const Layout = () => {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced background decorative elements */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] -z-10"></div>

      <div className="relative flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8">
          <Outlet />
        </main>

        <footer className="mt-auto border-t border-white/20 backdrop-blur-xl bg-white/80">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Citrea Atomic Swaps
                </div>
                <div className="text-sm text-gray-600">
                  © {new Date().getFullYear()} Powered by Citrea Network
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <a 
                  href="https://docs.citrea.xyz" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium"
                >
                  Documentation
                </a>
                <a 
                  href="https://twitter.com/citreabtc" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium"
                >
                  Twitter
                </a>
                <a 
                  href="https://github.com/citrea" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
