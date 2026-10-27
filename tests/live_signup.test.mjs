// Live sign-ups (founder 2026-10-15): the waitlist is over. Every CTA reads "text cued";
// the sign-up chat is unchanged; the success screen says what happens next based on
// the backend's `live` flag — their one iMessage tap brings the coach's first text
// (or "i don't have an iPhone" sends it by SMS now). An older backend (no `live`)
// still gets the waitlist copy, so the two deploys can land in either order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let lastDoc = null;
async function until(cond, { timeout = 4000, step = 10 } = {}) {
  const t0 = Date.now();
  for (;;) { const v = cond(); if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('timeout; inputArea=' + (lastDoc ? lastDoc.querySelector('#coInputArea')?.innerHTML.slice(0, 400) : '') + ' lastMsg=' + (lastDoc ? lastDoc.querySelector('#coMsgs')?.lastElementChild?.outerHTML.slice(0, 300) : ''));
    await new Promise(r => setTimeout(r, step)); }
}

function boot(posted, respond) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://cued.fit/',
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: /reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.SVGElement.prototype.getTotalLength = () => 100;
      w.HTMLElement.prototype.animate = () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null });
      w.fetch = async (url, opts) => {
        const body = JSON.parse(opts.body);
        posted.push({ url: String(url), body });
        return { ok: true, json: async () => respond(String(url), body) };
      };
    } });
  return dom.window;
}

async function chip(d, label, { send = false } = {}) {
  const b = await until(() => [...d.querySelectorAll('.co-opts:not(.done) .co-opt')].find(x => x.textContent.trim() === label));
  b.click();
  if (send) (await until(() => d.querySelector('#coInputArea .co-send, #coInputArea button[type=submit], #coInputArea button:not(.co-opt):not([disabled])'))).click();
}
async function type(d, value, { skip = false } = {}) {
  const inp = await until(() => d.querySelector('#coInputArea input.co-input:not([readonly])'));
  if (skip) { (await until(() => d.querySelector('#coInputArea .co-skip'))).click(); return; }
  inp.value = value; inp.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  // prefer the send arrow: an optional field's row has "skip" before it
  const btn = await until(() => d.querySelector('#coInputArea .co-send:not([disabled])')
                             || [...d.querySelectorAll('#coInputArea button')].find(b => !b.classList.contains('co-opt') && !b.disabled));
  btn.click();
}
const bubbles = (d) => [...d.querySelectorAll('#coMsgs .co-msg')].map(x => x.textContent);

async function walk(w, { referral = null } = {}) {
  const d = w.document; lastDoc = d;
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  await type(d, 'Edwin Ruiz');
  await type(d, '20');
  await chip(d, 'male');
  await chip(d, 'lose fat', { send: true });
  await chip(d, 'knowing what to do');
  await chip(d, '6 months – 2 years');
  await chip(d, 'full gym');
  await until(() => d.querySelector('#coInputArea .co-stats'));
  const nums = [...d.querySelectorAll('#coInputArea input[type=number], #coInputArea input[inputmode=numeric], #coInputArea input[inputmode=decimal]')];
  const vals = nums.length >= 3 ? ['5', '6', '139'] : ['168', '63'];
  nums.forEach((n, i) => { n.value = vals[i] || '1'; n.dispatchEvent(new w.Event('input', { bubbles: true })); });
  (await until(() => [...d.querySelectorAll('#coInputArea button')].find(b => !b.disabled && !b.classList.contains('co-opt') && !b.classList.contains('co-unit')))).click();
  await chip(d, '4');
  await chip(d, 'evenings', { send: true });
  await chip(d, 'no restrictions');
  await type(d, '', { skip: true });
  await chip(d, 'nothing yet', { send: true });
  // the phone ask no longer promises a text "when your spot opens"
  const phoneAsk = await until(() => bubbles(d).find(t => /your number\?/.test(t)));
  assert.doesNotMatch(phoneAsk, /spot/);
  await type(d, '5105550123');
  await type(d, '', { skip: true });                       // gmail
  const refAsk = await until(() => bubbles(d).find(t => /referral code/.test(t)));
  assert.match(refAsk, /skip if not/);
  if (referral) await type(d, referral); else await type(d, '', { skip: true });
  const consent = await until(() => bubbles(d).find(t => /recurring automated texts/.test(t)));
  assert.doesNotMatch(consent, /spot opens/);
  await chip(d, 'i agree');
  const success = await until(() => d.querySelector('#coMsgs .co-success'));
  return { d, success };
}

test('every CTA reads "text cued"', () => {
  const w = boot([], () => ({}));
  const d = w.document;
  for (const id of ['floatCta', 'heroCta', 'heroCtaTop', 'closeCta']) {
    assert.equal(d.getElementById(id).textContent.trim(), 'text cued', id);
  }
  assert.doesNotMatch(d.body.innerHTML, /Join the waitlist/);
});

test('live + link: "you\'re in", the iMessage tap, and no-iPhone sends the first text by SMS now', async () => {
  const posted = [];
  const w = boot(posted, (url) => url.endsWith('/signup/channel')
    ? { status: 'ok', channel: 'sms', hook_sent: true, waitlist: false }
    : { status: 'ok', live: true, hook_deferred: true, imessage_link: 'https://photon.test/users/ph-1/redirect' });
  const { d, success } = await walk(w);
  assert.equal(posted[0].url, 'https://web-production-90171c.up.railway.app/waitlist');
  assert.equal(posted[0].body.sms_consent, true);
  assert.equal(success.querySelector('h3').textContent, "you're in, Edwin.");
  const body = success.querySelector('p').textContent;
  assert.match(body, /text me once/); assert.doesNotMatch(body, /spot|list/);
  const a = success.querySelector('a.co-imsg');
  assert.equal(a.getAttribute('href'), 'https://photon.test/users/ph-1/redirect');
  assert.equal(a.textContent, 'text me on iMessage');
  success.querySelector('button.co-alt').click();
  const note = await until(() => success.querySelector('.co-imsg-note'));
  assert.match(note.textContent, /just texted you by SMS/);
  assert.equal(posted[1].url, 'https://web-production-90171c.up.railway.app/signup/channel');
  assert.equal(posted[1].body.channel, 'sms');
  assert.equal(posted[1].body.phone.replace(/\D/g, ''), '5105550123');
});

test('live, no link: the first text is already on its way', async () => {
  const w = boot([], () => ({ status: 'ok', live: true, hook_deferred: false, imessage_link: null }));
  const { success } = await walk(w);
  assert.equal(success.querySelector('h3').textContent, "you're in, Edwin.");
  assert.match(success.querySelector('p').textContent, /just texted you/);
  assert.equal(success.querySelector('a.co-imsg'), null);
});

test('live, already signed up: no re-pitch, just "text me whenever"', async () => {
  const w = boot([], () => ({ status: 'exists', live: true, message: 'This number is already signed up.',
                              imessage_link: 'https://photon.test/users/ph-2/redirect' }));
  const { success } = await walk(w);
  assert.equal(success.querySelector('h3').textContent, "you're already signed up.");
  assert.match(success.querySelector('p').textContent, /text me whenever/);
  assert.ok(success.querySelector('a.co-imsg'));
});

test('older backend (no `live`): the waitlist copy still reads right', async () => {
  const w = boot([], () => ({ status: 'ok', imessage_link: null }));
  const { success } = await walk(w);
  assert.equal(success.querySelector('h3').textContent, "you're on the list, Edwin.");
  assert.match(success.querySelector('p').textContent, /spot opens/);
});

// The referral code (founder 2026-10-27): the last optional ask, after gmail. Typed → posted
// upper-cased as `referral_code` and the success copy names who got the credit; skipped →
// null, nothing said; an unknown code → a soft line, still in.
test('referral code: typed → posted + credited line; skipped → null; unknown → soft line', async () => {
  let posted = [];
  let w = boot(posted, () => ({ status: 'ok', live: true, hook_deferred: false, imessage_link: null,
                                referral: { credited: true, referrer: 'Jayden' } }));
  let { success } = await walk(w, { referral: 'jayden42' });
  assert.equal(posted[0].body.referral_code, 'JAYDEN42');
  assert.match(success.querySelector('p').textContent, /jayden gets the referral credit/);

  posted = [];
  w = boot(posted, () => ({ status: 'ok', live: true, hook_deferred: false, imessage_link: null, referral: null }));
  ({ success } = await walk(w));
  assert.equal(posted[0].body.referral_code, null);
  assert.doesNotMatch(success.querySelector('p').textContent, /referral/);

  posted = [];
  w = boot(posted, () => ({ status: 'ok', live: true, hook_deferred: false, imessage_link: null,
                            referral: { credited: false, referrer: null } }));
  ({ success } = await walk(w, { referral: 'zzz99' }));
  assert.equal(posted[0].body.referral_code, 'ZZZ99');
  assert.match(success.querySelector('p').textContent, /didn't match anyone, but you're in/);
});
