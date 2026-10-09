// Walks the sign-up chat in jsdom with the backend stubbed: the training-time step is
// multi-select, the payload carries the first pick in workout_time and the whole list
// in workout_times (founder 2026-10-09; backend onboarding restructure PR 4).
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

function boot(posted) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://cued.fit/',
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: /reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.SVGElement.prototype.getTotalLength = () => 100;
      w.HTMLElement.prototype.animate = () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null });
      w.fetch = async (url, opts) => {
        posted.push({ url, body: JSON.parse(opts.body) });
        return { ok: true, json: async () => ({ status: 'ok', imessage_link: null }) };
      };
    } });
  return dom.window;
}

async function chip(d, label, { multi = false, send = false } = {}) {
  const b = await until(() => [...d.querySelectorAll('.co-opts:not(.done) .co-opt')].find(x => x.textContent.trim() === label));
  b.click();
  if (send) (await until(() => d.querySelector('#coInputArea .co-send, #coInputArea button[type=submit], #coInputArea button:not(.co-opt):not([disabled])'))).click();
}
async function type(d, value, { skip = false } = {}) {
  const inp = await until(() => d.querySelector('#coInputArea input.co-input:not([readonly])'));
  if (skip) { (await until(() => d.querySelector('#coInputArea .co-skip'))).click(); return; }
  inp.value = value; inp.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
  const btn = await until(() => [...d.querySelectorAll('#coInputArea button')].find(b => !b.classList.contains('co-opt') && !b.disabled));
  btn.click();
}

test('training time is multi-select and posts first pick + list', async () => {
  const posted = [];
  const w = boot(posted); const d = w.document; lastDoc = d;
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  await type(d, 'Edwin Ruiz');
  await type(d, '20');
  await chip(d, 'male');
  await chip(d, 'lose fat'); await chip(d, 'build muscle', { send: true });
  await chip(d, 'knowing what to do');
  await chip(d, '6 months – 2 years');
  await chip(d, 'full gym');
  // stats composer: fill every number box, then send
  await until(() => d.querySelector('#coInputArea .co-stats'));
  const nums = [...d.querySelectorAll('#coInputArea input[type=number], #coInputArea input[inputmode=numeric], #coInputArea input[inputmode=decimal]')];
  const vals = nums.length >= 3 ? ['5', '6', '139'] : ['168', '63'];
  nums.forEach((n, i) => { n.value = vals[i] || '1'; n.dispatchEvent(new w.Event('input', { bubbles: true })); });
  (await until(() => [...d.querySelectorAll('#coInputArea button')].find(b => !b.disabled && !b.classList.contains('co-opt') && !b.classList.contains('co-unit')))).click();
  await chip(d, '4');
  // the step under test
  const prompt = await until(() => [...d.querySelectorAll('#coMsgs .msg, #coMsgs div')].map(x => x.textContent).find(t => /when do you usually get to it/.test(t)));
  assert.match(prompt, /pick all that apply/);
  await chip(d, 'mornings'); await chip(d, 'evenings', { send: true });
  await chip(d, 'no restrictions');
  await type(d, '', { skip: true });
  await chip(d, 'nothing yet', { send: true });
  await type(d, '5105550123');
  await type(d, '', { skip: true });
  await chip(d, 'i agree');
  const p = (await until(() => posted[0])).body;
  assert.equal(p.workout_time, 'morning');
  assert.deepEqual(p.workout_times, ['morning', 'evening']);
  assert.equal(p.workout_days, '4');
});

test('a single pick posts no workout_times', async () => {
  const posted = [];
  const w = boot(posted); const d = w.document; lastDoc = d;
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  await type(d, 'Pat Lee'); await type(d, '22'); await chip(d, 'female');
  await chip(d, 'build muscle', { send: true }); await chip(d, 'consistency'); await chip(d, 'just starting'); await chip(d, 'full gym');
  await until(() => d.querySelector('#coInputArea .co-stats'));
  const nums = [...d.querySelectorAll('#coInputArea input[type=number], #coInputArea input[inputmode=numeric], #coInputArea input[inputmode=decimal]')];
  const vals = nums.length >= 3 ? ['5', '6', '139'] : ['168', '63'];
  nums.forEach((n, i) => { n.value = vals[i] || '1'; n.dispatchEvent(new w.Event('input', { bubbles: true })); });
  (await until(() => [...d.querySelectorAll('#coInputArea button')].find(b => !b.disabled && !b.classList.contains('co-opt') && !b.classList.contains('co-unit')))).click();
  await chip(d, '3');
  await chip(d, 'evenings', { send: true });
  await chip(d, 'vegan'); await type(d, '', { skip: true }); await chip(d, 'strava', { send: true });
  await type(d, '5105550124'); await type(d, '', { skip: true }); await chip(d, 'i agree');
  const p = (await until(() => posted[0])).body;
  assert.equal(p.workout_time, 'evening');
  assert.equal(p.workout_times, null);
});
