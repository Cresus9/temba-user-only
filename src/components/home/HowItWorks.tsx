import React from 'react';
import { Search, CreditCard, Ticket, Smartphone } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      icon: Search,
      title: "Découvrez des événements",
      description: "Explorez notre large sélection d'événements culturels, concerts, festivals et spectacles au Burkina Faso."
    },
    {
      id: 2,
      icon: CreditCard,
      title: "Réservez en ligne",
      description: "Choisissez vos places et payez en toute sécurité avec Mobile Money ou carte bancaire."
    },
    {
      id: 3,
      icon: Ticket,
      title: "Recevez vos billets",
      description: "Obtenez instantanément vos e-billets avec QR code unique pour un accès rapide."
    },
    {
      id: 4,
      icon: Smartphone,
      title: "Profitez de l'événement",
      description: "Présentez simplement votre billet numérique à l'entrée et profitez de votre expérience."
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Comment ça marche ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={step.id} className="text-center group">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-200 transition-colors relative">
                  <IconComponent className="h-6 w-6 text-indigo-600" />
                  {/* Step Number Badge */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {step.id}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
