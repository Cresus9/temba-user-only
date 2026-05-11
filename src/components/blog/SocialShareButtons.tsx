import React, { useState } from 'react';
import {
  Facebook,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Check,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  /**
   * `inline` = horizontal row (default, used inside the article)
   * `rail`   = vertical sticky rail (used in the desktop left gutter)
   */
  variant?: 'inline' | 'rail';
}

const monoFamily =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export default function SocialShareButtons({
  url,
  title,
  variant = 'inline',
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Lien copié !');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url: fullUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      copyToClipboard();
    }
  };

  const buttons = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: shareLinks.twitter,
      label: 'Partager sur Twitter',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: shareLinks.facebook,
      label: 'Partager sur Facebook',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: shareLinks.linkedin,
      label: 'Partager sur LinkedIn',
    },
  ];

  /* ── Vertical sticky rail ── */
  if (variant === 'rail') {
    return (
      <div className="flex flex-col items-center gap-2">
        <span
          className="hidden lg:block writing-mode-vertical text-[10px] font-bold uppercase tracking-[0.22em] text-ink-mute mb-1"
          style={{
            fontFamily: monoFamily,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          Partager
        </span>
        <button
          type="button"
          onClick={nativeShare}
          aria-label="Partager"
          className="w-10 h-10 grid place-items-center rounded-full bg-paper border border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50 transition-colors shadow-card"
          title="Partager"
        >
          <Share2 className="w-4 h-4" strokeWidth={2.2} />
        </button>
        {buttons.map(({ name, icon: Icon, url: u, label }) => (
          <a
            key={name}
            href={u}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="w-10 h-10 grid place-items-center rounded-full bg-paper border border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50 transition-colors"
            title={label}
          >
            <Icon className="w-4 h-4" strokeWidth={2.2} />
          </a>
        ))}
        <button
          type="button"
          onClick={copyToClipboard}
          aria-label="Copier le lien"
          className={`w-10 h-10 grid place-items-center rounded-full border transition-colors ${
            copied
              ? 'bg-brand text-paper border-brand'
              : 'bg-paper border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50'
          }`}
          title="Copier le lien"
        >
          {copied ? (
            <Check className="w-4 h-4" strokeWidth={2.5} />
          ) : (
            <LinkIcon className="w-4 h-4" strokeWidth={2.2} />
          )}
        </button>
      </div>
    );
  }

  /* ── Inline horizontal ── */
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-mute mr-1"
        style={{ fontFamily: monoFamily }}
      >
        Partager ·
      </span>
      {buttons.map(({ name, icon: Icon, url: u, label }) => (
        <a
          key={name}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="w-9 h-9 grid place-items-center rounded-full bg-paper border border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50 transition-colors"
        >
          <Icon className="w-4 h-4" strokeWidth={2.2} />
        </a>
      ))}
      <button
        type="button"
        onClick={copyToClipboard}
        aria-label="Copier le lien"
        title="Copier le lien"
        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[12px] font-semibold transition-colors ${
          copied
            ? 'bg-brand text-paper border-brand'
            : 'bg-paper border-line text-ink hover:border-brand hover:text-brand hover:bg-brand-50'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            Copié
          </>
        ) : (
          <>
            <LinkIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
            Copier le lien
          </>
        )}
      </button>
    </div>
  );
}
