import React from 'react';
import { Ticket, Shield, CreditCard, Headphones, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { SlideIn, Stagger, StaggerItem } from '../common/Motion';

const display = '"Plus Jakarta Sans", Inter, sans-serif';

export default function Features() {
  const features = [
    {
      icon: Ticket,
      title: 'Réservation en 30 secondes',
      description:
        "Pas de file d'attente, pas de paperasse. Choisissez vos places et payez — votre billet arrive instantanément.",
    },
    {
      icon: CreditCard,
      title: 'Paiement local en FCFA',
      description:
        'Mobile Money, Orange Money, carte bancaire. Achetez dans votre devise, sans frais cachés.',
    },
    {
      icon: Shield,
      title: 'Billets sécurisés',
      description:
        "QR code unique vérifié à l'entrée. Transferts traçables, anti-fraude, garantie événement.",
    },
    {
      icon: Headphones,
      title: 'Support en français',
      description:
        "Notre équipe à Ouagadougou répond 7j/7 par WhatsApp ou téléphone. Pas de robot.",
    },
  ];

  return (
    <section className="section-normal bg-paper">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left — animated from the left */}
          <SlideIn from="left" className="lg:col-span-4">
            <p className="eyebrow mb-2">Pourquoi Temba</p>
            <h2 className="text-ink mb-3">
              Conçu pour l'
              <span className="relative inline-block">
                <span className="relative z-10">Afrique de l'Ouest</span>
                <span aria-hidden className="absolute left-0 right-0 bottom-0.5 h-2 bg-accent/40 rounded-sm -z-0" />
              </span>
            </h2>
            <p className="text-[14px] text-ink-mute leading-relaxed mb-6">
              Notre billetterie est pensée pour les organisateurs locaux et leur public.
              Paiements en devise locale, support de proximité, événements près de chez vous.
            </p>
            <motion.a
              href="https://admin.tembas.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand transition-colors"
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Devenir organisateur
              <ArrowUpRight className="h-4 w-4" />
            </motion.a>
          </SlideIn>

          {/* Right — stagger cards */}
          <Stagger staggerDelay={0.08} className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <StaggerItem key={idx} distance={20}>
                  <motion.div
                    className="group flex gap-4 p-5 bg-paper border border-line rounded-xl2 hover:border-brand/40 transition-colors duration-300 h-full"
                    whileHover={{ y: -4, boxShadow: '0 12px 32px -6px rgba(20,23,42,0.12)' }}
                    transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                  >
                    <motion.div
                      className="grid place-items-center w-10 h-10 rounded-xl bg-ink text-paper flex-shrink-0"
                      whileHover={{ scale: 1.15, backgroundColor: '#3D3FE2' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    <div className="min-w-0">
                      <h3
                        className="text-[15px] font-bold text-ink mb-1 tracking-tight"
                        style={{ fontFamily: display }}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-[13px] text-ink-mute leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
