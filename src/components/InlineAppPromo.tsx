import React from 'react';
import { Smartphone, Download, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface InlineAppPromoProps {
  className?: string;
}

export default function InlineAppPromo({ className = "" }: InlineAppPromoProps) {
  const handleDownloadAndroid = () => {
    window.open('https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share', '_blank');
  };

  const handleDownloadiOS = () => {
    // Official Temba app on Apple App Store
    window.open('https://apps.apple.com/us/app/temba/id6748848506', '_blank');
  };

  return (
    <div className={`bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 ${className}`}>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Left side - Icon and text */}
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Smartphone className="h-8 w-8 text-indigo-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Téléchargez l'app Temba
            </h3>
            <p className="text-gray-600 text-sm">
              Accès hors ligne, notifications push et expérience optimisée
            </p>
            
            {/* Rating */}
            <div className="flex items-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-sm text-gray-500 ml-1">4.8 • Gratuit</span>
            </div>
          </div>
        </div>
        
        {/* Right side - Download buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadAndroid}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-sm"
          >
            <Download className="h-4 w-4" />
            Google Play
          </button>
          
          <button
            onClick={handleDownloadiOS}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm"
          >
            <Download className="h-4 w-4" />
            App Store
          </button>
        </div>
      </div>
    </div>
  );
}
