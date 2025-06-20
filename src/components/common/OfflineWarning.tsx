import React from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

export default function OfflineWarning() {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const { t } = useTranslation();

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <WifiOff className="h-5 w-5" />
      <span>{t('error.offline', { default: "You're offline" })}</span>
    </div>
  );
}