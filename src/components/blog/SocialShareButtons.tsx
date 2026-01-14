import React from 'react';
import { Facebook, Twitter, Linkedin, Link as LinkIcon, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface SocialShareButtonsProps {
  url: string;
  title: string;
}

export default function SocialShareButtons({ url, title }: SocialShareButtonsProps) {
  const [copied, setCopied] = React.useState(false);

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
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareButtons = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: shareLinks.facebook,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      url: shareLinks.twitter,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: shareLinks.linkedin,
    },
  ];

  return (
    <div className="flex items-center gap-3 pb-8 mb-8 border-b border-gray-200">
      <span className="text-sm font-semibold text-gray-900">Share:</span>
      
      {shareButtons.map((button) => (
        <a
          key={button.name}
          href={button.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 border-2 border-gray-200 rounded-lg hover:border-[#6366F1] hover:bg-[#6366F1] hover:text-white transition-all"
          title={`Share on ${button.name}`}
        >
          <button.icon className="w-5 h-5" />
        </a>
      ))}

      <button
        onClick={copyToClipboard}
        className={`p-2 rounded-lg transition-all ${
          copied
            ? 'border-2 border-[#10B981] bg-[#10B981] text-white'
            : 'border-2 border-gray-200 hover:border-[#6366F1] hover:bg-[#6366F1] hover:text-white'
        }`}
        title="Copy link"
      >
        {copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}
