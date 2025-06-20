import React from 'react';
import { Building, Users, Target } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-24 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">À Propos de Temba</h2>
          <p className="mt-4 text-lg text-gray-500">
            Votre plateforme de confiance pour découvrir et réserver les meilleurs événements en Afrique.
          </p>
        </div>
        <div className="mt-12 lg:mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                <Building />
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-medium text-gray-900">Notre Entreprise</h3>
                <p className="mt-2 text-base text-gray-500">
                  Temba a été fondée avec la vision de simplifier l'accès à la culture et au divertissement en Afrique, en offrant une plateforme de billetterie sécurisée et facile à utiliser.
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                <Target />
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-medium text-gray-900">Notre Mission</h3>
                <p className="mt-2 text-base text-gray-500">
                  Notre mission est de connecter les gens avec des expériences inoubliables, de soutenir les organisateurs d'événements locaux et de promouvoir la richesse culturelle du continent.
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                <Users />
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-medium text-gray-900">Notre Équipe</h3>
                <p className="mt-2 text-base text-gray-500">
                  Nous sommes une équipe passionnée de développeurs, de designers et de spécialistes de l'événementiel, tous unis par l'amour de la culture africaine et de la technologie.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 