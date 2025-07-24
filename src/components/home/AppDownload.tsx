import React from 'react';
import { Smartphone, Download, Apple, Play } from 'lucide-react';

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
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex flex-col lg:flex-row items-center">
              {/* Left Side - Content */}
              <div className="flex-1 p-8 lg:p-12 text-white">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                  Téléchargez Notre Application Mobile
                </h2>
                <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
                  Obtenez la meilleure expérience avec notre application mobile. Réservez des billets, recevez des notifications et accédez à vos e-billets hors ligne.
                </p>
                
                {/* Download Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleAppStoreDownload}
                    className="flex items-center justify-center gap-3 px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold shadow-lg"
                  >
                    <Apple className="h-6 w-6" />
                    <span>App Store</span>
                  </button>
                  
                  <button
                    onClick={handleGooglePlayDownload}
                    className="flex items-center justify-center gap-3 px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold shadow-lg"
                  >
                    <Play className="h-6 w-6" />
                    <span>Google Play</span>
                  </button>
                </div>
              </div>

              {/* Right Side - Smartphone Graphic */}
              <div className="flex-1 flex justify-center lg:justify-end p-8 lg:p-12">
                <div className="relative">
                  {/* Smartphone Frame */}
                  <div className="relative w-64 h-96 bg-gray-300 rounded-3xl border-4 border-white shadow-2xl">
                    {/* Screen */}
                    <div className="absolute inset-2 bg-gray-200 rounded-2xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                          <Smartphone className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-gray-600 font-semibold">TEMBA</div>
                        <div className="text-gray-500 text-sm">Application Mobile</div>
                      </div>
                    </div>
                    
                    {/* Home Button */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-400 rounded-full"></div>
                  </div>
                  
                  {/* Floating Elements */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-purple-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 