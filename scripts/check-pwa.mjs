/** Opens a published URL in Chrome and reports manifest / installability facts. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/check-pwa.mjs <url>');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
  headless: true,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

// Seed a small state so the tab bar (and the badge offset) is on screen.
await page.evaluate(() => {
  const now = new Date().toISOString();
  localStorage.setItem(
    'hisaabkitaab.v1',
    JSON.stringify({
      version: 1,
      profile: { name: 'Yashasva Moond', createdAt: now },
      settings: { onboarded: true, sound: true },
      persons: [{ id: 'p1', name: 'Rahul Sharma', color: 'clay', createdAt: now }],
      txns: [
        { id: 't1', personId: 'p1', direction: 'out', amount: 250, note: 'Chai and samosa', category: 'food', date: now, source: 'manual', createdAt: now },
      ],
    }),
  );
});
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((resolve) => setTimeout(resolve, 1500));

const cdp = await page.createCDPSession();
const manifest = await cdp.send('Page.getAppManifest');
const installability = await cdp.send('Page.getInstallabilityErrors').catch((error) => ({ error: error.message }));

const info = await page.evaluate(() => {
  const badge = [...document.querySelectorAll('a')].find((a) => /deed\.page/.test(a.href));
  const rect = badge?.getBoundingClientRect();
  const tabbar = document.querySelector('.tabbar')?.getBoundingClientRect();
  const overlapsTabbar = !!(
    rect &&
    tabbar &&
    rect.left < tabbar.right &&
    rect.right > tabbar.left &&
    rect.top < tabbar.bottom &&
    rect.bottom > tabbar.top
  );
  const badgeOverlapsContent = (() => {
    if (!rect) return false;
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return !!target && !badge.contains(target);
  })();
  return {
    host: document.documentElement.dataset.host || '',
    overlapsTabbar,
    badgeOverlapsContent,
    title: document.title,
    hasServiceWorker: 'serviceWorker' in navigator,
    controlled: !!navigator.serviceWorker?.controller,
    manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
    styled: !!getComputedStyle(document.documentElement).getPropertyValue('--font').trim(),
    badge: badge
      ? {
          text: badge.textContent?.trim(),
          position: getComputedStyle(badge).position,
          rect: rect ? { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
        }
      : null,
    heading: document.querySelector('.balance-title, .onboarding-hero h1')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) || null,
    tabbar: !!tabbar,
  };
});

await page.screenshot({ path: '/tmp/pwa-check.png' });
console.log(JSON.stringify({ url, manifestUrl: manifest.url, manifestErrors: manifest.errors, installability, info, errors }, null, 2));
await browser.close();
