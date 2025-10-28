import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  MessageSquare,
  Gift,
  User,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { transferredTicketsService, type TransferredTicket } from '../services/transferredTicketsService';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import type { DashboardStats } from '../services/userService';
import EnhancedFestivalTicket from '../components/tickets/EnhancedFestivalTicket';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [transferredTickets, setTransferredTickets] = useState<TransferredTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TransferredTicket | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [data, transferredTicketsData] = await Promise.all([
          userService.getDashboardData(),
          transferredTicketsService.getTransferredTickets()
        ]);
        console.log('Dashboard data loaded:', { data, transferredTicketsData });
        setDashboardData(data);
        setTransferredTickets(transferredTicketsData);
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
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Échec du chargement du tableau de bord
          </h2>
          <p className="text-gray-600 mb-4">
            Nous n'avons pas pu charger vos données
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
                className="flex items-center justify-center sm:justify-start gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors text-sm sm:text-base font-medium"
              >
                Parcourir les événements
                <ChevronRight className="h-5 w-5" />
              </Link>
              <Link
                to="/support"
                className="flex items-center justify-center sm:justify-start gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-colors text-sm sm:text-base font-medium"
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
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Événements à venir
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
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
              <p className="text-sm text-gray-600">
                Total des billets
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
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
              <p className="text-sm text-gray-600">
                Total dépensé
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
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
            <h2 className="text-xl font-bold text-gray-900">
              Commandes récentes
            </h2>
            <Link 
              to="/profile/bookings"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Voir tout
            </Link>
          </div>
          
          {dashboardData.recentOrders.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentOrders.map((order) => (
                <div 
                  key={order.id}
                  onClick={() => navigate(`/profile/bookings`)}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-200 cursor-pointer group"
                >
                  <div className="mb-4 md:mb-0">
                    <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{order.eventName}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
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
                      <p className="font-medium text-gray-900">
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
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Pas encore de commandes
              </h3>
              <p className="text-gray-600 mb-4">
                Commencez à explorer les événements et faites votre première réservation
              </p>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Parcourir les événements
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Transferred Tickets Section */}
      {transferredTickets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Gift className="h-6 w-6 text-purple-600" />
                Billets reçus
              </h2>
              <span className="text-sm text-gray-500">
                {transferredTickets.length} billet{transferredTickets.length > 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-4">
              {transferredTickets.map((transfer) => (
                <div 
                  key={transfer.id}
                  onClick={() => setSelectedTicket(transfer)}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all duration-200 cursor-pointer group"
                >
                  <div className="mb-4 md:mb-0">
                    <h3 className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                      {transfer.ticket.event.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(transfer.ticket.event.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {transfer.ticket.event.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {transfer.sender ? `Transféré par ${transfer.sender.name}` : 'Billet transféré'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {transfer.ticket.ticket_type.name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transfer.status === 'USED' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {transfer.status === 'USED' ? 'Utilisé' : 'Reçu'}
                          </span>
                        </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Gift className="h-6 w-6 text-purple-600" />
                Billet reçu
              </h3>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Transfer Information Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Gift className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900">Billet transféré</h4>
                  <div className="text-sm text-purple-700">
                    {selectedTicket.sender && (
                      <span>Transféré par <strong>{selectedTicket.sender.name}</strong> le {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                    )}
                    {selectedTicket.message && (
                      <div className="mt-2 p-2 bg-white rounded border border-purple-200">
                        <span className="text-purple-600 font-medium">Message: </span>
                        <span className="text-purple-800">{selectedTicket.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Display */}
            <div className="relative">
                  <EnhancedFestivalTicket
                    ticketHolder={profile?.name || 'Utilisateur'}
                    ticketType={selectedTicket.ticket.ticket_type.name}
                    ticketId={selectedTicket.ticket.id}
                    eventTitle={selectedTicket.ticket.event.title}
                    eventDate={selectedTicket.ticket.event.date}
                    eventTime={selectedTicket.ticket.event.time}
                    eventLocation={selectedTicket.ticket.event.location}
                    qrCode={selectedTicket.ticket.qr_code}
                    eventImage={selectedTicket.ticket.event.image_url}
                    price={selectedTicket.ticket.ticket_type.price}
                    currency="XOF"
                    orderNumber={selectedTicket.id}
                    purchaseDate={selectedTicket.created_at}
                    eventCategory="Concert"
                    specialInstructions="Arrivez 30 minutes avant le début. Présentez ce billet à l'entrée."
                    ticketStatus={selectedTicket.ticket.status} // NEW: Pass ticket status
                    scannedAt={selectedTicket.ticket.scanned_at} // NEW: Pass scan timestamp
                    scannedBy={selectedTicket.ticket.scanned_by_name} // NEW: Pass scanner name
                    scanLocation={selectedTicket.ticket.scan_location} // NEW: Pass scan location
                    onTransferComplete={() => {
                      setSelectedTicket(null);
                      // Refresh the transferred tickets list
                      const refreshData = async () => {
                        try {
                          const [data, transferredTicketsData] = await Promise.all([
                            userService.getDashboardData(),
                            transferredTicketsService.getTransferredTickets()
                          ]);
                          setDashboardData(data);
                          setTransferredTickets(transferredTicketsData);
                        } catch (error) {
                          console.error('Error refreshing data:', error);
                        }
                      };
                      refreshData();
                    }}
                  />
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  navigate('/profile/bookings');
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium"
              >
                <Eye className="h-4 w-4" />
                Voir tous les billets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}