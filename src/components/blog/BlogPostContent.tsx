import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface BlogPostContentProps {
  content: string;
}

export default function BlogPostContent({ content }: BlogPostContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Section headings (H2)
      const h2Headers = contentRef.current.querySelectorAll('h2');
      h2Headers.forEach((header) => {
        header.classList.add(
          'text-3xl', 'md:text-4xl', 'font-extrabold', 'text-gray-900',
          'mt-16', 'mb-8', 'relative', 'pb-4'
        );
        // Add decorative underline
        const underline = document.createElement('div');
        underline.className = 'absolute bottom-0 left-0 w-24 h-1 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full';
        header.appendChild(underline);
      });

      // Subsection headings (H3)
      const h3Headers = contentRef.current.querySelectorAll('h3');
      h3Headers.forEach((header) => {
        header.classList.add(
          'text-2xl', 'md:text-3xl', 'font-bold',
          'text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-[#6366F1]', 'to-[#8B5CF6]',
          'mt-12', 'mb-6', 'flex', 'items-center', 'gap-3'
        );
        // Add decorative icon
        const icon = document.createElement('span');
        icon.className = 'w-2 h-2 rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]';
        header.insertBefore(icon, header.firstChild);
      });

      // H4 headings
      const h4Headers = contentRef.current.querySelectorAll('h4');
      h4Headers.forEach((header) => {
        header.classList.add('text-xl', 'font-bold', 'text-gray-900', 'mt-8', 'mb-4');
      });

      // Paragraphs
      const paragraphs = contentRef.current.querySelectorAll('p');
      paragraphs.forEach((p, index) => {
        p.classList.add('text-gray-700', 'leading-relaxed', 'mb-6', 'text-lg');
        
        // Add drop cap to first paragraph
        if (index === 0 && p.textContent && p.textContent.trim().length > 0) {
          const text = p.innerHTML;
          const cleanText = text.replace(/^[*\s]+/, '');
          const firstLetter = cleanText.charAt(0);
          
          if (firstLetter && firstLetter.match(/[A-Za-zÀ-ÿ]/)) {
            p.innerHTML = `
              <span class="float-left text-8xl font-black leading-none mr-4 mt-1 mb-2 text-transparent bg-clip-text bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] select-none">
                ${firstLetter}
              </span>
              <span class="first-line:tracking-widest first-line:text-gray-900 first-line:font-semibold">
                ${cleanText.substring(1)}
              </span>
            `;
          }
        }
      });

      // Strong text (bold)
      const strong = contentRef.current.querySelectorAll('strong');
      strong.forEach((s) => {
        const text = s.textContent || '';
        
        // Only highlight significant statistics (numbers with 3+ digits or followed by specific words)
        const isSignificantStat = /\d{3,}/.test(text) || // 3+ digit numbers
                                 (/\d+/.test(text) && /(participants|personnes|jours|heures|ans|année)/i.test(text));
        
        if (isSignificantStat) {
          s.classList.add(
            'font-black', 'text-xl', 'px-2', 'py-0.5',
            'text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-[#6366F1]', 'to-[#8B5CF6]'
          );
        } else {
          // Regular bold text
          s.classList.add('font-bold', 'text-gray-900');
        }
      });

      // Links
      const links = contentRef.current.querySelectorAll('a');
      links.forEach((link) => {
        link.classList.add(
          'text-[#6366F1]', 'font-semibold', 'underline', 'decoration-2',
          'underline-offset-2', 'hover:text-[#8B5CF6]', 'transition-colors'
        );
      });

      // Blockquotes
      const blockquotes = contentRef.current.querySelectorAll('blockquote');
      blockquotes.forEach((bq) => {
        bq.classList.add(
          'my-12', 'pl-8', 'pr-6', 'py-6', 'relative',
          'bg-gradient-to-r', 'from-[#EEF2FF]', 'via-[#F5F3FF]', 'to-transparent',
          'border-l-4', 'border-[#6366F1]', 'rounded-r-2xl',
          'text-xl', 'italic', 'text-gray-700', 'leading-relaxed',
          'shadow-sm'
        );
      });

      // Lists
      const lists = contentRef.current.querySelectorAll('ul, ol');
      lists.forEach((list) => {
        list.classList.add('space-y-3', 'mb-8', 'text-gray-700', 'text-lg', 'leading-relaxed');
        if (list.tagName === 'UL') {
          list.classList.add('list-none', 'pl-0');
          const items = list.querySelectorAll('li');
          items.forEach((item) => {
            item.classList.add('pl-8', 'relative', 'before:content-[""]', 'before:absolute', 
              'before:left-0', 'before:top-[0.6em]', 'before:w-3', 'before:h-3', 
              'before:rounded-full', 'before:bg-gradient-to-br', 'before:from-[#6366F1]', 
              'before:to-[#8B5CF6]');
          });
        } else {
          list.classList.add('list-decimal', 'pl-8');
        }
      });

      // Images
      const images = contentRef.current.querySelectorAll('img');
      images.forEach((img) => {
        img.classList.add('my-12', 'w-full', 'h-auto', 'rounded-2xl', 'shadow-2xl');
      });

      // Code blocks
      const code = contentRef.current.querySelectorAll('code');
      code.forEach((c) => {
        if (!c.parentElement || c.parentElement.tagName !== 'PRE') {
          c.classList.add('bg-[#EEF2FF]', 'text-[#6366F1]', 'px-2', 'py-1', 'rounded', 'text-sm', 'font-mono', 'font-semibold');
        }
      });

      const pre = contentRef.current.querySelectorAll('pre');
      pre.forEach((p) => {
        p.classList.add('bg-gray-900', 'text-gray-100', 'p-6', 'overflow-x-auto', 'my-8', 
          'font-mono', 'text-sm', 'rounded-2xl', 'shadow-xl');
        const code = p.querySelector('code');
        if (code) {
          code.classList.remove('bg-[#EEF2FF]', 'text-[#6366F1]');
          code.classList.add('text-gray-100');
        }
      });
    }
  }, [content]);

  // Enhanced content processing
  const processContent = (rawContent: string): string => {
    let processed = rawContent;
    
    // Convert ### to h3, ## to h2
    processed = processed.replace(/###\s+([^\n]+)/g, '<h3>$1</h3>');
    processed = processed.replace(/##\s+([^\n]+)/g, '<h2>$1</h2>');
    
    // Convert **text** to <strong>text</strong>
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert single * to nothing (cleanup)
    processed = processed.replace(/(?<!\*)\*(?!\*)/g, '');
    
    // Split into paragraphs and clean up
    const paragraphs = processed.split(/\n\n+/);
    processed = paragraphs
      .filter(p => p.trim())
      .map(p => {
        const trimmed = p.trim();
        // Skip if already wrapped in HTML tags
        if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
          return trimmed;
        }
        // Wrap in paragraph
        return `<p>${trimmed}</p>`;
      })
      .join('\n\n');
    
    return processed;
  };

  const processedContent = processContent(content);

  const sanitizedContent = DOMPurify.sanitize(processedContent, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 's', 'strike',
      'a', 'img',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'title', 'width', 'height',
      'class', 'id', 'style'
    ]
  });

  return (
    <div className="relative">
      {/* Decorative gradient bar */}
      <div className="absolute -left-6 top-0 w-1 h-full bg-gradient-to-b from-[#6366F1] via-[#8B5CF6] to-transparent opacity-30 rounded-full"></div>
      
      {/* Content */}
      <div
        ref={contentRef}
        className="blog-content relative max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
      
      {/* Bottom decorative element */}
      <div className="mt-16 pt-8 border-t-2 border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#6366F1] to-transparent"></div>
          <div className="w-2 h-2 rounded-full bg-[#6366F1]"></div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent"></div>
        </div>
      </div>
    </div>
  );
}
