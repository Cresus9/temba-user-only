import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface TicketAvailabilityIndicatorProps {
  available: number;
  total: number;
  status?: string;
}

export default function TicketAvailabilityIndicator({
  available,
  total,
  status
}: TicketAvailabilityIndicatorProps) {
  const availabilityPercentage = Math.max(0, Math.min(100, ((total - available) / total) * 100));

  const getStatusInfo = () => {
    if (status === 'SOLD_OUT' || available <= 0) {
      return {
        text: 'Épuisé',
        icon: AlertCircle,
        color: 'text-[var(--error-600)]',
        bgColor: 'bg-red-100'
      };
    } else if (availabilityPercentage >= 80) {
      return {
        text: 'Presque Épuisé',
        icon: AlertCircle,
        color: 'text-[var(--error-600)]',
        bgColor: 'bg-red-100'
      };
    } else if (availabilityPercentage >= 50) {
      return {
        text: 'Vente Rapide',
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      };
    }
    return {
      text: 'Disponible',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
        <StatusIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{statusInfo.text}</span>
      </div>
      
      <div className="w-full">
        <div className="h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--primary-600)] transition-all duration-500 ease-out"
            style={{ width: `${availabilityPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-sm text-[var(--gray-600)]">{available} billets restants</span>
          <span className="text-sm text-[var(--gray-600)]">{total} total</span>
        </div>
      </div>

      {availabilityPercentage >= 80 && (
        <p className="text-sm text-[var(--error-600)]">
          Seulement {available} billets restants ! Réservez maintenant pour éviter toute déception.
        </p>
      )}
    </div>
  );
}
