export interface BuiltReferralShareLinks {
  oneLink: string;
  app: string;
  web: string;
}

/**
 * AppsFlyer OneLink base (same contract as mobile). Override via Vite env in production if the template id changes.
 */
export const REFERRAL_ONELINK_BASE =
  (import.meta.env.VITE_REFERRAL_ONELINK_BASE as string | undefined)?.replace(/\/$/, '') ??
  'https://temba.onelink.me/Xbe8';

export const REFERRAL_APP_SCHEME =
  (import.meta.env.VITE_REFERRAL_APP_SCHEME as string | undefined) ?? 'temba';

export const REFERRAL_WEB_ORIGIN =
  (import.meta.env.VITE_REFERRAL_WEB_ORIGIN as string | undefined)?.replace(/\/$/, '') ??
  'https://tembas.com';

/**
 * Builds share URLs aligned with mobile: deep_link_value = ref/{CODE}
 */
export function buildReferralShareLinks(referralCode: string): BuiltReferralShareLinks {
  const trimmed = referralCode.trim();
  const deepValue = `ref/${trimmed}`;
  const q = new URLSearchParams({ deep_link_value: deepValue }).toString();
  return {
    oneLink: `${REFERRAL_ONELINK_BASE}?${q}`,
    app: `${REFERRAL_APP_SCHEME}://ref/${trimmed}`,
    web: `${REFERRAL_WEB_ORIGIN}/ref/${encodeURIComponent(trimmed)}`,
  };
}
