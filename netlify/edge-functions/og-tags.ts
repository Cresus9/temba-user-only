import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = "https://uwmlagvsivxqocklxbbo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzMwMjYsImV4cCI6MjA1MTg0OTAyNn0.ylTM28oYPVjotPmEn9TSZGPy4EQW2pbWgNLRqWYduLc";

const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'Pinterest',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
];

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS.some(crawler => 
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
}

async function fetchEvent(eventId: string) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/events?id=eq.${eventId}&select=id,title,description,image_url,date,time,location`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!response.ok) return null;
    
    const events = await response.json();
    return events[0] || null;
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

function generateEventHtml(event: any, eventId: string): string {
  const title = event?.title || 'Événement sur TEMBA';
  const description = event?.description?.substring(0, 200) || 'Découvrez cet événement sur TEMBA - La plateforme de billetterie en Afrique de l\'Ouest';
  const imageUrl = event?.image_url || 'https://tembas.com/temba-app.png';
  const eventUrl = `https://tembas.com/event/${eventId}`;
  const location = event?.location || '';
  const eventDate = event?.date ? new Date(event.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';
  const eventTime = event?.time || '';

  const fullDescription = location && eventDate 
    ? `${description} | 📅 ${eventDate}${eventTime ? ' à ' + eventTime : ''} | 📍 ${location}`
    : description;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | TEMBA</title>
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TEMBA" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${fullDescription}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:alt" content="${title}" />
  <meta property="og:url" content="${eventUrl}" />
  <meta property="og:locale" content="fr_BF" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${fullDescription}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Standard Meta -->
  <meta name="description" content="${fullDescription}" />
  <link rel="canonical" href="${eventUrl}" />
  
  <!-- Redirect to app for non-crawlers -->
  <meta http-equiv="refresh" content="0;url=${eventUrl}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${fullDescription}</p>
  <img src="${imageUrl}" alt="${title}" />
  <a href="${eventUrl}">Voir l'événement sur TEMBA</a>
</body>
</html>`;
}

function generateReferralHtml(referralCode: string): string {
  const title = "Rejoignez TEMBA et gagnez des récompenses!";
  const description = "Utilisez ce code de parrainage pour recevoir des crédits gratuits sur vos premiers achats de billets.";
  const imageUrl = "https://tembas.com/temba-app.png";
  const referralUrl = `https://tembas.com/ref/${referralCode}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | TEMBA</title>
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TEMBA" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${referralUrl}" />
  <meta property="og:locale" content="fr_BF" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Standard Meta -->
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${referralUrl}" />
  
  <!-- Redirect for non-crawlers -->
  <meta http-equiv="refresh" content="0;url=${referralUrl}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <a href="${referralUrl}">Rejoindre TEMBA</a>
</body>
</html>`;
}

export default async function handler(request: Request, context: Context) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent');
  
  // Only intercept for crawlers
  if (!isCrawler(userAgent)) {
    return context.next();
  }

  // Handle event pages: /event/:id
  const eventMatch = url.pathname.match(/^\/event\/([^\/]+)$/);
  if (eventMatch) {
    const eventId = eventMatch[1];
    const event = await fetchEvent(eventId);
    
    return new Response(generateEventHtml(event, eventId), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Handle referral pages: /ref/:code
  const refMatch = url.pathname.match(/^\/ref\/([^\/]+)$/);
  if (refMatch) {
    const referralCode = refMatch[1];
    
    return new Response(generateReferralHtml(referralCode), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // For other pages, pass through
  return context.next();
}

export const config = {
  path: ["/event/*", "/ref/*"],
};
