import { BUYER_APP_SCHEME, ONELINK_BASE, WEB_ORIGIN, buildDeferredOneLink } from './appLinks';

export interface BuiltReferralShareLinks {
  oneLink: string;
  app: string;
  web: string;
}

/** Same OneLink base as the open-in-app handoff. */
export const REFERRAL_ONELINK_BASE = ONELINK_BASE;

export const REFERRAL_APP_SCHEME = BUYER_APP_SCHEME;

export const REFERRAL_WEB_ORIGIN = WEB_ORIGIN;

/**
 * Web share link is https://tembas.com/?r=CODE. /ref/CODE still captures the same code.
 * OneLink keeps deep_link_value=ref/CODE, and af_web_dp carries ?r= so a
 * store install that falls back to the site still attributes the order.
 */
export function buildReferralShareLinks(referralCode: string): BuiltReferralShareLinks {
  const trimmed = referralCode.trim();
  const web = `${REFERRAL_WEB_ORIGIN}/?r=${encodeURIComponent(trimmed)}`;
  return {
    oneLink: buildDeferredOneLink({
      path: `ref/${trimmed}`,
      code: trimmed,
      webUrl: web,
    }),
    app: `${REFERRAL_APP_SCHEME}://ref/${trimmed}`,
    web,
  };
}
