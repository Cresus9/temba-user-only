import React from 'react';
import { Search, CreditCard, Ticket, Smartphone } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      icon: Search,
      title: 'Découvrez',
      description: "Explorez concerts, festivals et spectacles en Afrique de l'Ouest.",
    },
    {
      id: 2,
      icon: CreditCard,
      title: 'Réservez',
      description: 'Payez en FCFA via Mobile Money ou carte, en toute sécurité.',
    },
    {
      id: 3,
      icon: Ticket,
      title: 'Recevez',
      description: 'Vos e-billets QR code arrivent instantanément dans votre boîte.',
    },
    {
      id: 4,
      icon: Smartphone,
      title: 'Profitez',
      description: "Présentez votre billet à l'entrée et vivez l'expérience.",
    },
  ];

  return (
    <section className="section-normal surface-cream">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="max-w-2xl mb-8">
          <p className="eyebrow mb-2">En 4 étapes</p>
          <h2 className="text-ink mb-2">Réserver, c'est facile</h2>
          <p className="text-[14px] text-ink-mute">
            De la découverte à l'entrée, votre billet en quelques minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="relative bg-paper border border-line rounded-xl2 p-5 hover:border-brand/40 hover:shadow-card transition-all duration-300"
              >
                {/* Step number — outline numeral, top-right */}
                <span
                  aria-hidden
                  className="absolute top-4 right-5 text-[40px] font-bold text-line leading-none select-none"
                  style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
                >
                  0{step.id}
                </span>

                {/* Icon tile */}
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 text-brand mb-5">
                  <Icon className="h-5 w-5" />
                </div>

                <h3
                  className="text-[16px] font-bold text-ink mb-1.5 tracking-tight"
                  style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
                >
                  {step.title}
                </h3>
                <p className="text-[13px] text-ink-mute leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
