import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { DeviceMobile, X } from "@phosphor-icons/react";
import {
  appHandoffUrl,
  codeFromLocation,
  detectMobilePlatform,
  type MobilePlatform,
  WEB_ORIGIN,
} from "../../config/appLinks";
import { getPendingReferralCode } from "../../utils/referralStorage";

const DISMISS_KEY = "temba-open-app-dismissed";

interface OpenInAppBannerProps {
  hint?: string;
}

/**
 * Small mobile-only handoff. Desktop renders nothing, so a desktop visit
 * stays on the website. The link keeps ?r= and falls back to OneLink.
 */
export default function OpenInAppBanner({
  hint = "Retrouvez cet événement dans l'application.",
}: OpenInAppBannerProps) {
  const { pathname, search } = useLocation();
  const [platform, setPlatform] = useState<MobilePlatform | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPlatform(detectMobilePlatform(navigator.userAgent, navigator.maxTouchPoints));
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const href = useMemo(() => {
    if (platform !== "ios" && platform !== "android") return null;
    const code = codeFromLocation(pathname, search) ?? getPendingReferralCode();
    const webUrl = `${WEB_ORIGIN}${pathname}${search}`;
    return appHandoffUrl(platform, {
      path: pathname,
      webUrl,
      code,
    });
  }, [pathname, platform, search]);

  if (!href || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="border-b border-line bg-cream px-4 py-2.5">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <DeviceMobile size={18} />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
          <span className="font-semibold text-ink">L'application Temba</span>
          <span className="mt-0.5 block text-[12.5px] text-ink-3">{hint}</span>
        </p>
        <a
          href={href}
          className="inline-flex h-9 shrink-0 items-center rounded-lg bg-brand px-3 text-[13px] font-semibold text-white"
        >
          Ouvrir dans l'app
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-white hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
