import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalEventTarget } from '../utils/eventPath';
import { buildReferralShareLinks } from './referralShare';
import {
  APP_STORE_URL,
  BUYER_ANDROID_PACKAGE,
  BUYER_APPLE_TEAM_ID,
  BUYER_IOS_APP_STORE_ID,
  PLAY_STORE_URL,
  appHandoffUrl,
  buildDeferredOneLink,
  codeFromLocation,
  detectMobilePlatform,
} from './appLinks';

const FINGERPRINT = '3D:87:B3:A6:75:4E:C7:ED:CD:F1:33:E3:B6:06:FF:E1:23:27:C1:F0:49:59:D9:EC:B9:45:AC:38:F6:6E:57:5B';

describe('association files', () => {
  it('keeps the buyer app id and adds /e/* next to /event/* and /ref/*', () => {
    const aasa = JSON.parse(readFileSync('public/.well-known/apple-app-site-association', 'utf8'));
    const detail = aasa.applinks.details[0];
    const paths = detail.components.filter((row: { exclude?: boolean }) => !row.exclude).map((row: { '/': string }) => row['/']);
    expect(detail.appIDs).toEqual([`${BUYER_APPLE_TEAM_ID}.app.rork.temba`]);
    expect(aasa.webcredentials.apps).toEqual([`${BUYER_APPLE_TEAM_ID}.app.rork.temba`]);
    expect(paths).toEqual(expect.arrayContaining(['/e/*', '/event/*', '/ref/*']));
  });

  it('keeps the published Android fingerprint and does not add another app', () => {
    const links = JSON.parse(readFileSync('public/.well-known/assetlinks.json', 'utf8'));
    expect(links).toHaveLength(1);
    expect(links[0].target.package_name).toBe(BUYER_ANDROID_PACKAGE);
    expect(links[0].target.sha256_cert_fingerprints).toEqual([FINGERPRINT]);
  });
});

describe('store links', () => {
  it('points the download buttons at the buyer app', () => {
    expect(PLAY_STORE_URL).toBe('https://play.google.com/store/apps/details?id=app.rork.temba');
    expect(APP_STORE_URL).toBe('https://apps.apple.com/app/temba/id6748848506');
    expect(APP_STORE_URL).toContain(BUYER_IOS_APP_STORE_ID);
    expect(PLAY_STORE_URL).not.toContain('scanner');
    expect(APP_STORE_URL).not.toContain('0000000000');
  });
});

describe('handoff', () => {
  it('treats a desktop browser as the website', () => {
    expect(detectMobilePlatform('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0')).toBe('desktop');
    expect(appHandoffUrl('desktop', { path: '/e/soiree', webUrl: 'https://tembas.com/e/soiree?r=SIGUI1', code: 'SIGUI1' })).toBeNull();
  });

  it('builds an Android intent that keeps ?r= and falls back to OneLink', () => {
    const href = appHandoffUrl('android', {
      path: '/e/soiree',
      webUrl: 'https://tembas.com/e/soiree',
      code: 'SIGUI1',
    });
    expect(href).toContain('intent://tembas.com/e/soiree?r=SIGUI1#Intent;scheme=https;package=app.rork.temba;');
    const fallback = decodeURIComponent(href!.split('S.browser_fallback_url=')[1].replace(/;end$/, ''));
    const params = new URL(fallback).searchParams;
    expect(params.get('deep_link_value')).toBe('e/soiree');
    expect(params.get('deep_link_sub1')).toBe('SIGUI1');
    expect(params.get('af_web_dp')).toBe('https://tembas.com/e/soiree?r=SIGUI1');
  });

  it('sends a phone on /ref/CODE?r=CODE to the buyer OneLink with the code', () => {
    expect(codeFromLocation('/ref/SIGUI1', '?r=SIGUI1')).toBe('SIGUI1');
    const link = buildDeferredOneLink({
      path: '/ref/SIGUI1',
      webUrl: 'https://tembas.com/ref/SIGUI1?r=SIGUI1',
      code: 'SIGUI1',
    });
    const params = new URL(link).searchParams;
    expect(params.get('deep_link_value')).toBe('ref/SIGUI1');
    expect(params.get('deep_link_sub1')).toBe('SIGUI1');
    expect(params.get('af_web_dp')).toBe('https://tembas.com/ref/SIGUI1?r=SIGUI1');
    expect(appHandoffUrl('ios', {
      path: '/ref/SIGUI1',
      webUrl: 'https://tembas.com/ref/SIGUI1?r=SIGUI1',
      code: 'SIGUI1',
    })).toBe(link);
  });

  it('keeps ?r= when an old event URL is canonicalised', () => {
    expect(canonicalEventTarget('/event/soiree', '?r=SIGUI1', '', '/e/soiree')).toEqual({
      pathname: '/e/soiree',
      search: '?r=SIGUI1',
      hash: '',
    });
    expect(canonicalEventTarget('/e/soiree', '?r=SIGUI1', '', '/e/soiree')).toBeNull();
  });
});

describe('referral share', () => {
  it('puts ?r= on the web fallback of the OneLink', () => {
    const links = buildReferralShareLinks('TEMBA8YEF');
    expect(links.web).toBe('https://tembas.com/?r=TEMBA8YEF');
    const params = new URL(links.oneLink).searchParams;
    expect(params.get('deep_link_value')).toBe('ref/TEMBA8YEF');
    expect(params.get('deep_link_sub1')).toBe('TEMBA8YEF');
    expect(params.get('af_web_dp')).toBe('https://tembas.com/?r=TEMBA8YEF');
  });
});
