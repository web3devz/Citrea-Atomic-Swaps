import { ArrowRightLeft, Bitcoin, Shield, Zap, Users, ChevronRight, Sparkles, BarChart3 } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Enhanced background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

      <div className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-6xl mx-auto">
          {/* Floating badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-xl rounded-full border border-white/20 shadow-xl mb-8 group hover:scale-105 transition-all duration-300">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 font-semibold text-sm">Powered by Citrea Network</span>
            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
          </div>

          {/* Main heading with enhanced styling */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Atomic Swaps
            </span>
            <br />
            <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>

          {/* Enhanced subtitle */}
          <p className="text-gray-600 text-xl md:text-2xl mb-16 max-w-3xl mx-auto leading-relaxed font-medium">
            Experience the future of <span className="text-blue-600 font-semibold">trustless cross-chain trading</span> with 
            our revolutionary atomic swap protocol. Secure, fast, and completely decentralized.
          </p>

          {/* Enhanced CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-20">
            <Button 
              size="lg" 
              className="group relative px-10 py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 text-white rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border border-blue-500/20"
              onClick={() => navigate("/generate-requests")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              <span className="relative flex items-center">
                <Bitcoin className="mr-3 h-6 w-6" />
                Start Swapping Now
                <ChevronRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="group relative px-10 py-6 text-lg font-semibold border-2 border-purple-400 text-purple-700 hover:bg-purple-50 hover:border-purple-500 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              onClick={() => navigate("/view-requests")}
            >
              <span className="relative flex items-center">
                <Users className="mr-3 h-6 w-6" />
                Explore Requests
                <ArrowRightLeft className="ml-2 h-5 w-5 transform group-hover:rotate-180 transition-transform duration-500" />
              </span>
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="group relative px-10 py-6 text-lg font-semibold border-2 border-green-400 text-green-700 hover:bg-green-50 hover:border-green-500 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              onClick={() => navigate("/dashboard")}
            >
              <span className="relative flex items-center">
                <BarChart3 className="mr-3 h-6 w-6" />
                View Dashboard
                <ChevronRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Button>
          </div>

          {/* Enhanced features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mb-20">
            {[
              {
                title: "Trustless",
                description: "Zero intermediaries or centralized parties. Pure peer-to-peer atomic swaps with cryptographic guarantees.",
                icon: Shield,
                color: "from-blue-500 to-cyan-500",
                bgColor: "from-blue-50 to-cyan-50"
              },
              {
                title: "Lightning Fast",
                description: "Ultra-fast execution with optimized smart contracts and minimal confirmation times.",
                icon: Zap,
                color: "from-purple-500 to-pink-500",
                bgColor: "from-purple-50 to-pink-50"
              },
              {
                title: "Community Driven",
                description: "Built by the community, for the community. Open-source protocol with transparent governance.",
                icon: Users,
                color: "from-green-500 to-emerald-500",
                bgColor: "from-green-50 to-emerald-50"
              }
            ].map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={index}
                  className="group relative p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden"
                >
                  {/* Gradient background overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  {/* Icon with gradient background */}
                  <div className="relative mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} p-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-full h-full text-white" />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-white/10 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                </div>
              );
            })}
          </div>

          {/* Stats section */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10,000+", label: "Swaps Completed" },
              { value: "₿2,450", label: "Volume Traded" },
              { value: "99.9%", label: "Success Rate" },
              { value: "24/7", label: "Uptime" }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium text-sm uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;