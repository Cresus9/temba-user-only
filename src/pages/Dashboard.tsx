import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ticket, 
  Calendar,
  CreditCard,
  ChevronRight,
  Loader,
  TrendingUp,
  Clock,
  MapPin,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import type { DashboardStats } from '../services/userService';

export default function Dashboard() {
  const { profile } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await userService.getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error('Erreur lors du chargement des données du tableau de bord:', error);
        toast.error('Échec du chargement des données du tableau de bord');
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-[var(--primary-600)]" />
          <p className="text-[var(--gray-600)]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">
            Échec du chargement du tableau de bord
          </h2>
          <p className="text-[var(--gray-600)] mb-4">
            Nous n'avons pas pu charger vos données
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
       <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 md:p-10">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Bienvenue, {profile?.name || 'Invité'} ! 👋
              </h1>
              <p className="text-indigo-100 text-sm sm:text-base">
                Suivez vos événements, billets et réservations en un seul endroit
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/events"
                className="flex items-center justify-center sm:justify-start gap-2 px-6 py-3 bg-white text-[var(--primary-600)] rounded-xl hover:bg-[var(--primary-50)] transition-colors text-sm sm:text-base font-medium"
              >
                Parcourir les événements
                <ChevronRight className="h-5 w-5" />
              </Link>
              <Link
                to="/support"
                className="flex items-center justify-center sm:justify-start gap-2 px-6 py-3 bg-[var(--primary-500)] text-white rounded-xl hover:bg-[var(--primary-400)] transition-colors text-sm sm:text-base font-medium"
              >
                <MessageSquare className="h-5 w-5" />
                Obtenir de l'aide
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Calendar className="h-6 w-6 text-[var(--primary-600)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--gray-600)]">
                Événements à venir
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[var(--gray-900)]">
                  {dashboardData.stats.upcomingEvents}
                </p>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Ticket className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--gray-600)]">
                Total des billets
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[var(--gray-900)]">
                  {dashboardData.stats.totalTickets}
                </p>
                <span className="text-sm text-green-600">
                  Actifs
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--gray-600)]">
                Total dépensé
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[var(--gray-900)]">
                  {formatCurrency(dashboardData.stats.totalSpent, 'XOF')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--gray-900)]">
              Commandes récentes
            </h2>
            <Link 
              to="/profile/bookings"
              className="text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium"
            >
              Voir tout
            </Link>
          </div>
          
          {dashboardData.recentOrders.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentOrders.map((order) => (
                <div 
                  key={order.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-[var(--gray-200)] transition-colors"
                >
                  <div className="mb-4 md:mb-0">
                    <h3 className="font-medium text-[var(--gray-900)]">{order.eventName}</h3>
                    <div className="flex items-center gap-4 text-sm text-[var(--gray-600)] mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(order.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {order.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-[var(--gray-900)]">
                        {formatCurrency(order.total, order.currency)}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'COMPLETED' ? 'Terminée' : 
                         order.status === 'PENDING' ? 'En attente' : 'Annulée'}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--gray-400)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">
                Pas encore de commandes
              </h3>
              <p className="text-[var(--gray-600)] mb-4">
                Commencez à explorer les événements et faites votre première réservation
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
              >
                Parcourir les événements
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
