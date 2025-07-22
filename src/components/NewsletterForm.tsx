import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { newsletterService } from '../services/newsletterService';
import toast from 'react-hot-toast';
import { Input, Button } from './ui';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Veuillez entrer votre adresse e-mail');
      return;
    }

    setIsSubmitting(true);
    try {
      await newsletterService.subscribe(email);
      toast.success('Merci pour votre inscription !');
      setEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Échec de l\'abonnement. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Entrez votre email"
        leftIcon={<Mail className="h-5 w-5" />}
        disabled={isSubmitting}
      />
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        loading={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Abonnement..." : "S'abonner"}
      </Button>
    </form>
  );
}
