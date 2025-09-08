import React from 'react';
import { Apple, Play } from 'lucide-react';

export default function AppDownload() {
  const handleAppStoreDownload = () => {
    // TODO: Replace with actual App Store link
    window.open('https://apps.apple.com', '_blank');
  };

  const handleGooglePlayDownload = () => {
    // TODO: Replace with actual Google Play link
    window.open('https://play.google.com', '_blank');
  };

  return (
    <section className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-yellow-300 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-red-300 rounded-full blur-xl"></div>
      </div>

      <div className="grid grid-cols-2 items-center min-h-[280px] relative z-10">
        {/* Left Side - Content */}
        <div className="p-4 sm:p-6 lg:p-12 text-white flex items-center">
          <div className="w-full max-w-lg">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-3 sm:mb-4 lg:mb-6 leading-tight tracking-tight">
              Emportez Temba partout avec vous
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-orange-50 mb-4 sm:mb-6 lg:mb-8 leading-relaxed font-light">
              Téléchargez notre application mobile pour accéder à vos billets hors ligne et recevoir des notifications pour vos événements favoris.
            </p>
            
            {/* Download Buttons */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-4">
              <button
                onClick={handleAppStoreDownload}
                className="group flex items-center gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 bg-black/90 backdrop-blur-sm text-white rounded-lg sm:rounded-xl lg:rounded-2xl hover:bg-black hover:scale-105 transition-all duration-300 font-semibold shadow-xl border border-white/10"
              >
                <Apple className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform duration-300" />
                <div className="text-left">
                  <div className="text-xs lg:text-sm text-gray-300 font-normal">Télécharger sur l'</div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold">App Store</div>
                </div>
              </button>
              
              <button
                onClick={handleGooglePlayDownload}
                className="group flex items-center gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 bg-black/90 backdrop-blur-sm text-white rounded-lg sm:rounded-xl lg:rounded-2xl hover:bg-black hover:scale-105 transition-all duration-300 font-semibold shadow-xl border border-white/10"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform duration-300" />
                <div className="text-left">
                  <div className="text-xs lg:text-sm text-gray-300 font-normal">Disponible sur</div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold">Google Play</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Phone Mockup */}
        <div className="flex justify-center items-center p-4 sm:p-6 lg:p-12 relative">
          {/* Enhanced background glow */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-gradient-to-r from-white/20 to-yellow-300/20 rounded-full blur-xl sm:blur-2xl lg:blur-3xl"></div>
          </div>
          
          <div className="relative z-20">
            {/* Phone Container with premium styling */}
            <div className="bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl lg:rounded-3xl p-2 sm:p-3 lg:p-4 shadow-lg sm:shadow-xl lg:shadow-2xl border border-white/30">
              {/* Smartphone Frame */}
              <div className="relative w-32 sm:w-48 lg:w-56 h-56 sm:h-80 lg:h-96 bg-gradient-to-b from-gray-900 to-black rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg sm:shadow-xl lg:shadow-2xl">
                {/* Screen Bezel */}
                <div className="absolute inset-1 sm:inset-1.5 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg sm:rounded-xl">
                  {/* Dynamic Island */}
                  <div className="absolute top-0.5 sm:top-1 left-1/2 transform -translate-x-1/2 w-12 sm:w-20 h-2 sm:h-4 bg-black rounded-full shadow-inner"></div>
                  
                  {/* Screen Content */}
                  <div className="absolute inset-1 sm:inset-2 bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 rounded-md sm:rounded-lg overflow-hidden shadow-inner">
                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-2 sm:px-3 py-1 sm:py-2 text-white text-xs">
                      <span className="font-bold text-xs">9:41</span>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <div className="flex gap-0.5">
                          <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-white rounded-full"></div>
                          <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-white rounded-full"></div>
                          <div className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-white rounded-full"></div>
                        </div>
                        <div className="w-3 sm:w-5 h-2 sm:h-3 border border-white rounded-sm">
                          <div className="w-2 sm:w-3 h-1 sm:h-1.5 bg-white rounded-sm m-0.5"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* App Content */}
                    <div className="px-2 sm:px-4 py-2 sm:py-3">
                      {/* Temba Logo */}
                      <div className="text-center mb-2 sm:mb-4">
                        <div className="w-8 sm:w-12 h-8 sm:h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full mx-auto mb-1 sm:mb-2 flex items-center justify-center shadow-sm sm:shadow-lg border sm:border-2 border-white/20">
                          <span className="text-xs sm:text-base font-black text-black">T</span>
                        </div>
                        <h3 className="text-white text-xs sm:text-sm font-bold tracking-wide">Temba</h3>
                      </div>
                      
                      {/* Event Cards */}
                      <div className="space-y-1 sm:space-y-2">
                        <div className="bg-white/25 backdrop-blur-sm rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20 shadow-sm">
                          <div className="flex gap-1 sm:gap-2 items-center">
                            <div className="w-5 sm:w-8 h-5 sm:h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-sm sm:rounded-md shadow-sm flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="text-white font-semibold text-xs">Festival de Musique</div>
                              <div className="text-white/90 text-xs">15 Mars 2024</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white/25 backdrop-blur-sm rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20 shadow-sm">
                          <div className="flex gap-1 sm:gap-2 items-center">
                            <div className="w-5 sm:w-8 h-5 sm:h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-sm sm:rounded-md shadow-sm flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="text-white font-semibold text-xs">Concert Live</div>
                              <div className="text-white/90 text-xs">22 Mars 2024</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Home Indicator */}
                <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 w-8 sm:w-16 h-0.5 sm:h-1 bg-white/80 rounded-full"></div>
              </div>
            </div>
            
            {/* Premium Floating Elements */}
            <div className="absolute -top-1 sm:-top-2 -left-1 sm:-left-2 w-2 sm:w-4 h-2 sm:h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full animate-bounce opacity-90 shadow-sm sm:shadow-lg"></div>
            <div className="absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 w-1.5 sm:w-3 h-1.5 sm:h-3 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse opacity-90 shadow-sm sm:shadow-lg"></div>
            <div className="absolute top-1/4 -left-2 sm:-left-4 w-1 sm:w-2 h-1 sm:h-2 bg-gradient-to-r from-red-300 to-pink-300 rounded-full animate-ping opacity-80"></div>
          </div>
        </div>
      </div>
    </section>
  );
} 