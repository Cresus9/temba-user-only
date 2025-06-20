import React from 'react';
import { Ticket, Shield, CreditCard, Users } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Ticket,
      title: "Réservation Facile",
      description: "Réservez vos billets en quelques clics, sans tracas"
    },
    {
      icon: Shield,
      title: "Sécurité Garantie",
      description: "Transactions sécurisées et protection des données personnelles"
    },
    {
      icon: CreditCard,
      title: "Paiement Instantané",
      description: "Options de paiement multiples, y compris Mobile Money"
    },
    {
      icon: Users,
      title: "Support Client",
      description: "Notre équipe est disponible pour vous aider à tout moment"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Pourquoi Choisir Temba
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-200 transition-colors">
                <feature.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}