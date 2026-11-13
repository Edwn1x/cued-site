// Umami funnel events (2026-11-12). The sign-up card fires signup-open / -step /
// -submit / -imessage / -sms through a guarded track() helper. This stubs
// window.umami, walks the chat, and pins the exact sequence — so a refactor can't
// silently drop the funnel — and checks no typed answer ever rides in an event.
// Without the stub (every other test) the helper is a no-op; that path is covered there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

async function until(cond, { timeout = 4000, step = 10 } = {}) {
  const t0 = Date.now();
  for (;;) { const v = cond(); if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('timeout');
    await new Promise(r => setTimeout(r, step)); }
}

function boot(respond, { tracker = true } = {}) {
  const events = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://cued.fit/',
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: /reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.SVGElement.prototype.getTotalLength = () => 100;
      w.HTMLElement.prototype.animate = () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null });
      // clone out of the jsdom realm so deepEqual compares plain Node objects
      if (tracker) w.umami = { track: (name, data) => events.push(JSON.parse(JSON.stringify({ name, data }))) };
      w.fetch = async (url, opts) => {
        const body = JSON.parse(opts.body);
        const r = respond(String(url), body);
        if (r instanceof Error) throw r;
        return { ok: r.ok !== false, json: async () => r };
      };
    } });
  return { w: dom.window, events };
}

async function chip(d, label, { send = false } = {}) {
  const b = await until(() => [...d.querySelectorAll('.co-opts:not(.done) .co-opt')].find(x => x.textContent.trim() === label));
  b.click();
  if (send) (await until(() => d.querySelector('#coInputArea .co-send:not([disabled])'))).click();
}
async function type(d, value, { skip = false } = {}) {
  const inp = await until(() => d.querySelector('#coInputArea input.co-input:not([readonly])'));
  if (skip) { (await until(() => d.querySelector('#coInputArea .co-skip'))).click(); return; }
  inp.value = value; inp.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  (await until(() => d.querySelector('#coInputArea .co-send:not([disabled])')
                || [...d.querySelectorAll('#coInputArea button')].find(b => !b.classList.contains('co-opt') && !b.disabled))).click();
}

const NAME = 'Edwin Ruiz', PHONE = '5105550123';
async function walk(w, source = 'close') {
  const d = w.document;
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist(source);
  await type(d, NAME);
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
  await type(d, PHONE);
  await type(d, '', { skip: true });   // gmail
  await type(d, '', { skip: true });   // referral code
  await chip(d, 'i agree');
  return d;
}

const STEP_NAMES = ['name', 'age', 'gender', 'goals', 'obstacle', 'experience', 'equipment', 'stats', 'days', 'time', 'diet', 'restrictions', 'apps', 'phone', 'consent'];

test('full live sign-up: open → 15 steps → submit live → iMessage tap and SMS tap, all tagged with the CTA source', async () => {
  const { w, events } = boot((url) => url.endsWith('/signup/channel')
    ? { status: 'ok', channel: 'sms', hook_sent: true }
    : { status: 'ok', live: true, hook_deferred: true, imessage_link: 'https://photon.test/users/ph-1/redirect' });
  const d = await walk(w, 'close');
  const success = await until(() => d.querySelector('#coMsgs .co-success'));

  assert.deepEqual(events[0], { name: 'signup-open', data: { source: 'close' } });
  const steps = events.filter(e => e.name === 'signup-step');
  assert.deepEqual(steps.map(e => e.data.step), STEP_NAMES.map((_, i) => i + 1), 'one step event per tick, in order, none repeated');
  assert.deepEqual(steps.map(e => e.data.name), STEP_NAMES);
  assert.ok(steps.every(e => e.data.source === 'close'));
  const submit = events.filter(e => e.name === 'signup-submit');
  assert.deepEqual(submit, [{ name: 'signup-submit', data: { result: 'live', source: 'close' } }]);
  assert.equal(events.length, 1 + 15 + 1, 'nothing else fired before the success taps');

  success.querySelector('a.co-imsg').addEventListener('click', e => e.preventDefault());
  success.querySelector('a.co-imsg').click();
  success.querySelector('button.co-alt').click();
  await until(() => success.querySelector('.co-imsg-note'));
  assert.deepEqual(events.slice(-2), [
    { name: 'signup-imessage', data: { source: 'close' } },
    { name: 'signup-sms', data: { source: 'close' } },
  ]);

  // Nothing personal ever rides in an event.
  const blob = JSON.stringify(events);
  for (const pii of ['Edwin', 'Ruiz', PHONE, '510']) assert.doesNotMatch(blob, new RegExp(pii), pii);
});

test('submit outcomes: already signed up → live-exists; old backend → waitlist; rejected and network error are named', async () => {
  for (const [respond, result] of [
    [() => ({ status: 'exists', live: true }), 'live-exists'],
    [() => ({ status: 'ok' }), 'waitlist'],
    [() => ({ status: 'exists', message: "you're already on the list." }), 'waitlist-exists'],
    [() => ({ ok: false, status: 'error', message: 'nope' }), 'rejected'],
    [() => new Error('offline'), 'error'],
  ]) {
    const { w, events } = boot(respond);
    await walk(w, 'hero');
    const submit = await until(() => events.find(e => e.name === 'signup-submit'));
    assert.deepEqual(submit.data, { result, source: 'hero' });
  }
});

test('re-opening the card resumes the chat without a second signup-open', async () => {
  const { w, events } = boot(() => ({ status: 'ok', live: true }));
  const d = w.document;
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  await type(d, NAME);
  await until(() => events.some(e => e.name === 'signup-step'));
  d.getElementById('waitlistClose').click();
  w.openWaitlist('floating');
  assert.deepEqual(events.filter(e => e.name === 'signup-open'), [{ name: 'signup-open', data: { source: 'hero' } }]);
});

test('without the tracker the chat runs to the success screen untouched', async () => {
  const { w, events } = boot(() => ({ status: 'ok', live: true }), { tracker: false });
  const d = await walk(w, 'nav');
  await until(() => d.querySelector('#coMsgs .co-success'));
  assert.equal(events.length, 0);
});
