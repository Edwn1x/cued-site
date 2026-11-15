// The demo-site sign-up FORM (2026-11-14): the conversational chat the root page runs
// was too slow for readers who just want to fill in the boxes — demo-site/index.html
// opens the same frosted card with a plain form instead. Same questions, same
// /waitlist payload, same success states (live + link → iMessage tap / SMS fallback;
// no link → "just texted you"; exists; an older backend's waitlist copy), same Umami
// funnel (signup-open / -step / -submit / -imessage / -sms, ?src → qr-scan + ref).
// Walked in jsdom with fetch stubbed — never against the real backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAGE = 'demo-site/index.html';
const CTA_IDS = ['floatCta', 'heroCta', 'heroCtaTop', 'closeCta'];
const html = readFileSync(new URL('../' + PAGE, import.meta.url), 'utf8');

async function until(cond, { timeout = 4000, step = 10 } = {}) {
  const t0 = Date.now();
  for (;;) { const v = cond(); if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('timeout');
    await new Promise(r => setTimeout(r, step)); }
}

function boot(respond, { tracker = false, url = 'https://cued.fit/demo-site/', lateTracker = 0, language = 'en-US' } = {}) {
  const posted = [], events = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: /reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.SVGElement.prototype.getTotalLength = () => 100;
      w.HTMLElement.prototype.animate = () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null });
      Object.defineProperty(w.navigator, 'language', { value: language, configurable: true });
      const stub = { track: (name, data) => events.push(JSON.parse(JSON.stringify({ name, data }))) };
      if (tracker && !lateTracker) w.umami = stub;
      if (lateTracker) setTimeout(() => { w.umami = stub; }, lateTracker);
      w.fetch = async (url, opts) => {
        const body = JSON.parse(opts.body);
        posted.push({ url: String(url), body });
        const r = respond(String(url), body);
        if (r instanceof Error) throw r;
        return { ok: r.ok !== false, json: async () => r };
      };
    } });
  return { w: dom.window, d: dom.window.document, posted, events };
}

const field = (d, name) => d.querySelector(`#waitlistOverlay [data-f="${name}"]`);   // rows in the form; consent in the footer
function type(d, name, value, inputSel = '.fo-in') {
  const inp = field(d, name).querySelector(inputSel);
  inp.value = value; inp.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }));
}
function pick(d, name, ...labels) {
  for (const label of labels) {
    const chip = [...field(d, name).querySelectorAll('.fo-chip')].find(c => c.textContent.trim() === label);
    assert.ok(chip, `${name}: no chip "${label}"`); chip.click();
  }
}
function stats(d, { metric = false } = {}) {
  const f = field(d, 'stats');
  if (metric) { f.querySelector('.co-unit[data-metric="1"]').click(); type(d, 'stats', '168', '.fo-in[data-k=cm]'); type(d, 'stats', '63', '.fo-in[data-k=kg]'); }
  else { type(d, 'stats', '5', '.fo-in[data-k=ft]'); type(d, 'stats', '6', '.fo-in[data-k=in]'); type(d, 'stats', '139', '.fo-in[data-k=lbs]'); }
}
const consent = d => field(d, 'consent').querySelector('.fo-consent').click();
const submit = d => d.getElementById('coSubmit').click();
const success = d => until(() => d.querySelector('#coMsgs .co-success'));

// Fills top to bottom the way a reader would, then submits.
async function walk(w, d, { source = 'hero', referral = '', email = '', times = ['evenings'], goals = ['lose fat'], apps = ['nothing yet'] } = {}) {
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist(source);
  type(d, 'name', 'Edwin Ruiz');
  type(d, 'phone', '5105550123');
  pick(d, 'occupation', 'student'); type(d, 'occupation', 'uc berkeley', '#foSchool');
  type(d, 'age', '20');
  pick(d, 'gender', 'male');
  stats(d);
  pick(d, 'goals', ...goals);
  pick(d, 'obstacle', 'knowing what to do');
  pick(d, 'experience', '6 months – 2 years');
  pick(d, 'equipment', 'full gym');
  pick(d, 'days', '4');
  pick(d, 'time', ...times);
  pick(d, 'diet', 'no restrictions');
  pick(d, 'apps', ...apps);
  if (email) type(d, 'email', email);
  if (referral) type(d, 'referral', referral);
  consent(d);
  submit(d);
}

test('every CTA reads "text cued"; the card is a form, not a chat; name and phone lead', () => {
  const { d } = boot(() => ({}));
  assert.deepEqual([...d.querySelectorAll('#coForm .fo-field')].slice(0, 3).map(f => f.dataset.f), ['name', 'phone', 'occupation']);
  assert.match(d.querySelector('#hero h1').textContent, /the fitness coach that/);
  for (const id of CTA_IDS) assert.equal(d.getElementById(id).textContent.trim(), 'text cued', id);
  assert.doesNotMatch(d.body.innerHTML, /Join the waitlist/);
  assert.ok(d.querySelector('#waitlistOverlay form#coForm'));
  assert.equal(d.querySelector('#coMsgs .co-msg'), null, 'no bubbles');
  assert.equal(d.querySelector('#coSubmit').textContent.trim(), 'sign up');
  // consent sits in the footer beside the button, not in the rows; its fine print carries the terms + privacy links, root-absolute
  const fine = d.querySelector('#coInputArea .fo-consent');
  assert.ok(fine);
  assert.deepEqual([...d.querySelectorAll('#coForm .fo-sec-h')].map(h => h.firstChild.textContent.trim()), ['about you', 'a bit about you', 'your training', 'last things']);
  assert.deepEqual([...d.querySelectorAll('#coForm .fo-sec.opt .fo-sec-h small')].map(x => x.textContent), ['optional', 'optional', 'optional']);
  assert.match(fine.textContent, /recurring automated texts/);
  assert.deepEqual([...fine.querySelectorAll('a')].map(a => a.getAttribute('href')), ['/terms.html', '/privacy.html']);
});

test('live + link: the payload, "you\'re in", the iMessage tap, and no-iPhone sends the first text by SMS now', async () => {
  const { w, d, posted } = boot((url) => url.endsWith('/signup/channel')
    ? { status: 'ok', channel: 'sms', hook_sent: true, waitlist: false }
    : { status: 'ok', live: true, hook_deferred: true, imessage_link: 'https://photon.test/users/ph-1/redirect' });
  await walk(w, d, { source: 'close', email: 'Edwin@Gmail.com' });
  const s = await success(d);
  assert.equal(posted[0].url, 'https://web-production-90171c.up.railway.app/waitlist');
  const p = posted[0].body;
  assert.equal(p.name, 'Edwin'); assert.equal(p.full_name, 'Edwin Ruiz');
  assert.equal(p.phone, '(510) 555-0123'); assert.equal(p.email, 'edwin@gmail.com');
  assert.equal(p.source, 'close'); assert.equal(p.status, 'waitlist'); assert.equal(p.active, false);
  assert.equal(p.age, 20); assert.equal(p.gender, 'male'); assert.deepEqual(p.goal, ['fat_loss']);
  assert.equal(p.biggest_obstacle, 'knowledge'); assert.equal(p.experience, 'intermediate'); assert.equal(p.equipment, 'full_gym');
  assert.equal(p.height_ft, 5); assert.equal(p.height_in, 6); assert.equal(p.weight_lbs, 139);
  assert.equal(p.workout_days, '4'); assert.equal(p.workout_time, 'evening'); assert.equal(p.workout_times, null);
  assert.equal(p.diet, 'omnivore'); assert.equal(p.restrictions, null); assert.deepEqual(p.existing_tools, ['none']);
  assert.equal(p.referral_code, null); assert.equal(p.sms_consent, true);
  assert.equal(p.occupation, 'student at uc berkeley'); assert.equal(p.occupation_kind, 'student'); assert.equal(p.school, 'uc berkeley'); assert.equal(p.job, null);
  assert.ok(typeof p.ts === 'string' && typeof p.timezone === 'string');
  assert.equal(s.querySelector('h3').textContent, "you're in, Edwin.");
  const body = s.querySelector('p').textContent;
  assert.match(body, /text me once/); assert.doesNotMatch(body, /spot|list/);
  const a = s.querySelector('a.co-imsg');
  assert.equal(a.getAttribute('href'), 'https://photon.test/users/ph-1/redirect');
  assert.equal(a.textContent, 'text me on iMessage');
  assert.equal(d.getElementById('coInputArea').style.display, 'none', 'the submit row is gone');
  s.querySelector('button.co-alt').click();
  const note = await until(() => s.querySelector('.co-imsg-note'));
  assert.match(note.textContent, /just texted you by SMS/);
  assert.equal(posted[1].url, 'https://web-production-90171c.up.railway.app/signup/channel');
  assert.equal(posted[1].body.channel, 'sms');
  assert.equal(posted[1].body.phone.replace(/\D/g, ''), '5105550123');
});

test('live, no link: the first text is already on its way', async () => {
  const { w, d } = boot(() => ({ status: 'ok', live: true, hook_deferred: false, imessage_link: null }));
  await walk(w, d);
  const s = await success(d);
  assert.equal(s.querySelector('h3').textContent, "you're in, Edwin.");
  assert.match(s.querySelector('p').textContent, /just texted you/);
  assert.equal(s.querySelector('a.co-imsg'), null);
});

test('live, already signed up: no re-pitch, just "text me whenever"', async () => {
  const { w, d } = boot(() => ({ status: 'exists', live: true, message: 'This number is already signed up.', imessage_link: 'https://photon.test/users/ph-2/redirect' }));
  await walk(w, d);
  const s = await success(d);
  assert.equal(s.querySelector('h3').textContent, "you're already signed up.");
  assert.match(s.querySelector('p').textContent, /text me whenever/);
  assert.ok(s.querySelector('a.co-imsg'));
});

test('older backend (no `live`): the waitlist copy still reads right', async () => {
  const { w, d } = boot(() => ({ status: 'ok', imessage_link: null }));
  await walk(w, d);
  const s = await success(d);
  assert.equal(s.querySelector('h3').textContent, "you're on the list, Edwin.");
  assert.match(s.querySelector('p').textContent, /spot opens/);
});

test('referral code: typed → posted upper-cased + credited line; unknown → soft line', async () => {
  let r = boot(() => ({ status: 'ok', live: true, hook_deferred: false, imessage_link: null, referral: { credited: true, referrer: 'Jayden' } }));
  await walk(r.w, r.d, { referral: 'jayden4821' });
  let s = await success(r.d);
  assert.equal(r.posted[0].body.referral_code, 'JAYDEN4821');
  assert.match(s.querySelector('p').textContent, /jayden gets the referral credit/);

  r = boot(() => ({ status: 'ok', live: true, hook_deferred: false, imessage_link: null, referral: { credited: false, referrer: null } }));
  await walk(r.w, r.d, { referral: 'zzz9999' });
  s = await success(r.d);
  assert.equal(r.posted[0].body.referral_code, 'ZZZ9999');
  assert.match(s.querySelector('p').textContent, /didn't match anyone, but you're in/);
});

test('training time is multi-select: first pick in workout_time, the list in workout_times; goals and tools post as lists', async () => {
  const { w, d, posted } = boot(() => ({ status: 'ok', imessage_link: null }));
  await walk(w, d, { times: ['mornings', 'evenings'], goals: ['lose fat', 'build muscle'], apps: ['apple watch', 'strava'] });
  await success(d);
  const p = posted[0].body;
  assert.equal(p.workout_time, 'morning'); assert.deepEqual(p.workout_times, ['morning', 'evening']);
  assert.deepEqual(p.goal, ['fat_loss', 'muscle_building']);
  assert.deepEqual(p.existing_tools, ['apple_watch', 'strava']);
});

test('"nothing yet" is exclusive among the tools', () => {
  const { d } = boot(() => ({}));
  pick(d, 'apps', 'apple watch', 'strava', 'nothing yet');
  assert.deepEqual([...field(d, 'apps').querySelectorAll('.fo-chip.sel')].map(c => c.textContent), ['nothing yet']);
  pick(d, 'apps', 'garmin');
  assert.deepEqual([...field(d, 'apps').querySelectorAll('.fo-chip.sel')].map(c => c.textContent), ['garmin']);
});

test('metric units post height_cm / weight_kg; the toggle defaults from the locale', async () => {
  const { w, d, posted } = boot(() => ({ status: 'ok', imessage_link: null }), { language: 'en-GB' });
  await until(() => typeof w.openWaitlist === 'function');
  assert.ok(field(d, 'stats').classList.contains('metric'), 'en-GB → cm/kg');
  w.openWaitlist('hero');
  type(d, 'name', 'Pat Lee'); type(d, 'phone', '5105550124'); pick(d, 'occupation', 'i work'); type(d, 'age', '22'); pick(d, 'gender', 'female');
  type(d, 'stats', '168', '.fo-in[data-k=cm]'); type(d, 'stats', '63.5', '.fo-in[data-k=kg]');
  pick(d, 'goals', 'build muscle'); pick(d, 'obstacle', 'consistency'); pick(d, 'experience', 'just starting'); pick(d, 'equipment', 'home gym');
  pick(d, 'days', '3'); pick(d, 'time', 'evenings'); pick(d, 'diet', 'vegan'); pick(d, 'apps', 'nothing yet');
  consent(d); submit(d);
  await success(d);
  const p = posted[0].body;
  assert.equal(p.height_cm, 168); assert.equal(p.weight_kg, 63.5);
  assert.equal(p.height_ft, undefined); assert.equal(p.weight_lbs, undefined);
});

test('nothing posts until name, number and consent are in: the first gap is flagged, fixed, and the next one takes its turn; a half-typed row blocks too', async () => {
  const { w, d, posted } = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  submit(d);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(posted.length, 0);
  assert.ok(field(d, 'name').classList.contains('bad'), 'the first empty field is flagged');
  type(d, 'name', 'Edwin Ruiz');
  assert.ok(!field(d, 'name').classList.contains('bad'), 'typing clears the flag');
  // phone: a 9-digit number is refused, email: a bad address is refused, consent: required
  type(d, 'phone', '510555012'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'phone').classList.contains('bad'), 'a 9-digit number is refused, and phone is the second row'); assert.equal(posted.length, 0);
  type(d, 'phone', '5105550123');
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'occupation').classList.contains('bad') && isOpen(d, 'occupation'), 'occupation is required, the third row'); assert.equal(posted.length, 0);
  pick(d, 'occupation', 'something else');
  // a half-typed height & weight is refused (never a wrong fact), an empty one is fine
  type(d, 'stats', '5', '.fo-in[data-k=ft]'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'stats').classList.contains('bad') && isOpen(d, 'stats')); assert.equal(posted.length, 0);
  type(d, 'stats', '', '.fo-in[data-k=ft]');
  type(d, 'age', '2'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(!field(d, 'age').classList.contains('bad'), 'a 1-digit age is a valid age'); 
  type(d, 'age', '20'); pick(d, 'gender', 'male'); stats(d); pick(d, 'goals', 'endurance'); pick(d, 'obstacle', 'time');
  pick(d, 'experience', '2+ years'); pick(d, 'equipment', 'bodyweight only'); pick(d, 'days', '2'); pick(d, 'time', 'mornings');
  pick(d, 'diet', 'halal'); pick(d, 'apps', 'whoop');
  type(d, 'email', 'not-an-email'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'email').classList.contains('bad')); assert.equal(posted.length, 0);
  type(d, 'email', ''); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'consent').classList.contains('bad'), 'consent is required'); assert.equal(posted.length, 0);
  consent(d); submit(d);
  await success(d);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].body.email, null);
});

test('rejected and offline: the server\'s word shows above the button, the form stays, a retry posts again', async () => {
  let n = 0;
  const { w, d, posted } = boot(() => (n++ === 0 ? { ok: false, status: 'error', message: 'nope, not that number' } : { status: 'ok', live: true }));
  await walk(w, d);
  const err = await until(() => d.querySelector('#coErr.show'));
  assert.equal(err.textContent, 'nope, not that number');
  assert.ok(d.querySelector('#coForm'), 'the form is still there');
  assert.equal(d.getElementById('coSubmit').disabled, false);
  submit(d);
  await success(d);
  assert.equal(posted.length, 2);

  const off = boot(() => new Error('offline'));
  await walk(off.w, off.d);
  const e2 = await until(() => off.d.querySelector('#coErr.show'));
  assert.match(e2.textContent, /connection error/);
});

// The accordion (founder 2026-11-14): one row per question; answering folds the row to a
// one-line summary and opens the next unanswered one; typed / multi-pick rows wait for Enter
// or "next" ("skip" on an empty optional); any row opens on a tap; a flagged row opens.
const isOpen = (d, name) => field(d, name).classList.contains('open');
const summary = (d, name) => field(d, name).querySelector('.fo-qv').textContent;
test('accordion: the first row opens; a single pick folds it and opens the next; typed and multi rows advance on Enter / next', async () => {
  const { w, d } = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  assert.ok(isOpen(d, 'name')); assert.ok(!isOpen(d, 'age'));
  assert.equal(field(d, 'name').querySelector('.fo-q').getAttribute('aria-expanded'), 'true');
  type(d, 'name', 'Edwin Ruiz');
  assert.ok(isOpen(d, 'name'), 'typing alone does not advance');
  d.getElementById('foName').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.ok(!isOpen(d, 'name') && isOpen(d, 'phone'), 'Enter folds name and opens phone — name and number are the first two rows');
  assert.equal(summary(d, 'name'), 'Edwin Ruiz');
  assert.ok(field(d, 'name').classList.contains('done'));
  type(d, 'phone', '5105550123'); field(d, 'phone').querySelector('.fo-next').click();
  assert.ok(isOpen(d, 'occupation') && !isOpen(d, 'phone')); assert.equal(summary(d, 'phone'), '(510) 555-0123');
  // occupation: the pick stays open for its detail box instead of folding
  pick(d, 'occupation', 'student');
  await new Promise(r => setTimeout(r, 30));
  assert.ok(isOpen(d, 'occupation') && field(d, 'occupation').classList.contains('student'));
  type(d, 'occupation', 'uc berkeley', '#foSchool');
  d.getElementById('foSchool').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.ok(isOpen(d, 'age') && !isOpen(d, 'occupation')); assert.equal(summary(d, 'occupation'), 'student · uc berkeley');
  type(d, 'age', '20'); field(d, 'age').querySelector('.fo-next').click();
  assert.ok(isOpen(d, 'gender') && !isOpen(d, 'age'));
  pick(d, 'gender', 'male');
  await until(() => isOpen(d, 'stats'));
  assert.ok(!isOpen(d, 'gender')); assert.equal(summary(d, 'gender'), 'male');
  stats(d);
  // Enter in height & weight walks the empty boxes first, then advances
  const kg = field(d, 'stats').querySelector('.fo-in[data-k=lbs]');
  kg.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.ok(isOpen(d, 'goals') && !isOpen(d, 'stats'));
  assert.equal(summary(d, 'stats'), "5'6, 139 lbs");
  pick(d, 'goals', 'lose fat', 'build muscle');
  assert.ok(isOpen(d, 'goals'), 'multi-pick waits for next');
  field(d, 'goals').querySelector('.fo-next').click();
  assert.ok(isOpen(d, 'obstacle')); assert.equal(summary(d, 'goals'), 'lose fat, build muscle');
  // an optional row left blank skips on next; a MUST row left blank is flagged instead of moving on
  field(d, 'goals').querySelector('.fo-q').click(); assert.ok(isOpen(d, 'goals'), 'any row re-opens on a tap');
  pick(d, 'goals', 'lose fat', 'build muscle');   // un-pick both
  assert.equal(field(d, 'goals').querySelector('.fo-next').textContent, 'skip');
  field(d, 'goals').querySelector('.fo-next').click();
  assert.ok(!isOpen(d, 'goals') && !field(d, 'goals').classList.contains('bad'), 'blank optional row skips');
  field(d, 'phone').querySelector('.fo-q').click(); type(d, 'phone', '');
  field(d, 'phone').querySelector('.fo-next').click();
  assert.ok(field(d, 'phone').classList.contains('bad') && isOpen(d, 'phone'), 'a blank number cannot be skipped');
});

test('accordion: optional rows skip on next, their button reads "skip" until typed; consent folds to "agreed"; a flagged row opens', async () => {
  const { w, d } = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  assert.equal(field(d, 'restrictions').querySelector('.fo-next').textContent, 'skip');
  field(d, 'restrictions').querySelector('.fo-q').click();
  field(d, 'restrictions').querySelector('.fo-next').click();
  assert.ok(!isOpen(d, 'restrictions') && isOpen(d, 'apps'), 'skipped, next opens');
  type(d, 'email', 'edwin@gmail.com');
  assert.equal(field(d, 'email').querySelector('.fo-next').textContent, 'next');
  type(d, 'email', 'nope'); field(d, 'email').querySelector('.fo-q').click();
  field(d, 'email').querySelector('.fo-next').click();
  assert.ok(field(d, 'email').classList.contains('bad') && isOpen(d, 'email'), 'a bad email cannot be skipped past');
  // submit with gaps: the first gap (name) opens and is flagged
  field(d, 'name').querySelector('.fo-q').click(); assert.ok(!isOpen(d, 'name'));
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(isOpen(d, 'name') && field(d, 'name').classList.contains('bad'));
});

test('copy: "estimate is fine", never "ballpark"', () => {
  const { d } = boot(() => ({}));
  assert.doesNotMatch(d.body.innerHTML, /ballpark/);
  assert.match(field(d, 'stats').textContent, /estimate is fine/);
});

// The middle ground (founder 2026-11-14): name, number and consent are all the backend needs
// (app.py /waitlist); every other row is optional and the coach asks over text for what's null.
test('minimal sign-up: name + number + consent posts with the rest null; the button says so; "skip" on every optional row', async () => {
  const { w, d, posted } = boot(() => ({ status: 'ok', live: true, imessage_link: null }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  assert.equal(d.getElementById('coSubmit').textContent, 'sign up');
  type(d, 'name', 'Edwin Ruiz'); type(d, 'phone', '5105550123');
  consent(d);
  assert.equal(d.getElementById('coSubmit').textContent, 'sign up', 'not until occupation');
  pick(d, 'occupation', 'i work');
  assert.equal(d.getElementById('coSubmit').textContent, "sign up now, i'll ask the rest over text");
  for (const n of ['age', 'stats', 'goals', 'time', 'restrictions', 'apps', 'email', 'referral']) assert.equal(field(d, n).querySelector('.fo-next').textContent, 'skip', n);
  assert.equal(field(d, 'name').querySelector('.fo-next').textContent, 'next');
  submit(d);
  const s = await success(d);
  assert.equal(s.querySelector('h3').textContent, "you're in, Edwin.");
  const p = posted[0].body;
  assert.equal(p.name, 'Edwin'); assert.equal(p.phone, '(510) 555-0123'); assert.equal(p.sms_consent, true);
  assert.equal(p.occupation, 'working'); assert.equal(p.occupation_kind, 'working'); assert.equal(p.school, null); assert.equal(p.job, null);
  for (const k of ['age', 'gender', 'goal', 'biggest_obstacle', 'experience', 'equipment', 'workout_days', 'workout_time', 'workout_times', 'diet', 'restrictions', 'existing_tools', 'email', 'referral_code']) assert.equal(p[k], null, k);
  for (const k of ['height_ft', 'height_in', 'weight_lbs', 'height_cm', 'weight_kg']) assert.ok(!(k in p), k);
});

test('the button goes back to "sign up" once every question is answered', async () => {
  const { w, d } = boot(() => ({ status: 'ok', live: true }));
  await walk(w, d);   // walk answers everything and submits
  // re-check the label just before the post: boot a fresh one and stop short of submit
  const r = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof r.w.openWaitlist === 'function');
  r.w.openWaitlist('hero');
  type(r.d, 'name', 'Edwin Ruiz'); type(r.d, 'phone', '5105550123'); pick(r.d, 'occupation', 'student'); consent(r.d);
  assert.match(r.d.getElementById('coSubmit').textContent, /ask the rest/);
  type(r.d, 'age', '20'); pick(r.d, 'gender', 'male'); stats(r.d); pick(r.d, 'goals', 'lose fat'); pick(r.d, 'obstacle', 'time');
  pick(r.d, 'experience', '2+ years'); pick(r.d, 'equipment', 'full gym'); pick(r.d, 'days', '3'); pick(r.d, 'time', 'evenings'); pick(r.d, 'diet', 'vegan');
  assert.match(r.d.getElementById('coSubmit').textContent, /ask the rest/, 'apps still blank');
  pick(r.d, 'apps', 'nothing yet');
  assert.equal(r.d.getElementById('coSubmit').textContent, 'sign up', 'gmail / referral / allergies do not count');
});

test('occupation: what goes up for each kind — the free text starts with "student" when they study, school and job ride on their own keys', async () => {
  const cases = [
    [['student'], 'uc berkeley', '', { occupation: 'student at uc berkeley', occupation_kind: 'student', school: 'uc berkeley', job: null }],
    [['student'], '', '', { occupation: 'student', occupation_kind: 'student', school: null, job: null }],
    [['i work'], '', 'nurse', { occupation: 'nurse', occupation_kind: 'working', school: null, job: 'nurse' }],
    [['both'], 'sjsu', 'barista', { occupation: 'student at sjsu, works as barista', occupation_kind: 'both', school: 'sjsu', job: 'barista' }],
    [['something else'], '', '', { occupation: 'other', occupation_kind: 'other', school: null, job: null }],
  ];
  for (const [kind, school, job, want] of cases) {
    const { w, d, posted } = boot(() => ({ status: 'ok', live: true }));
    await until(() => typeof w.openWaitlist === 'function');
    w.openWaitlist('hero');
    type(d, 'name', 'Edwin Ruiz'); type(d, 'phone', '5105550123'); pick(d, 'occupation', ...kind);
    if (school) type(d, 'occupation', school, '#foSchool');
    if (job) type(d, 'occupation', job, '#foJob');
    consent(d); submit(d);
    await success(d);
    for (const k of Object.keys(want)) assert.equal(posted[0].body[k], want[k], `${kind}: ${k}`);
  }
  // switching kind drops the other kind's detail
  const { w, d, posted } = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  type(d, 'name', 'Edwin Ruiz'); type(d, 'phone', '5105550123');
  pick(d, 'occupation', 'student'); type(d, 'occupation', 'uc berkeley', '#foSchool');
  assert.ok(field(d, 'occupation').classList.contains('student') && !field(d, 'occupation').classList.contains('working'));
  pick(d, 'occupation', 'i work');
  assert.ok(!field(d, 'occupation').classList.contains('student') && field(d, 'occupation').classList.contains('working'));
  consent(d); submit(d); await success(d);
  assert.equal(posted[0].body.school, null); assert.equal(posted[0].body.occupation, 'working');
});

// ── analytics ──
const STEP_NAMES = ['name', 'phone', 'occupation', 'age', 'gender', 'stats', 'goals', 'obstacle', 'experience', 'equipment', 'days', 'time', 'diet', 'restrictions', 'apps', 'consent'];

test('funnel: open → 16 steps in form order (restrictions counted as passed) → submit live → iMessage tap and SMS tap, tagged with the source; no PII', async () => {
  const { w, d, events } = boot((url) => url.endsWith('/signup/channel')
    ? { status: 'ok', channel: 'sms', hook_sent: true }
    : { status: 'ok', live: true, hook_deferred: true, imessage_link: 'https://photon.test/users/ph-1/redirect' }, { tracker: true });
  await walk(w, d, { source: 'close' });
  const s = await success(d);
  assert.deepEqual(events[0], { name: 'signup-open', data: { source: 'close' } });
  const steps = events.filter(e => e.name === 'signup-step');
  assert.deepEqual(steps.map(e => e.data.step), STEP_NAMES.map((_, i) => i + 1), 'one step event per field, in order, none repeated');
  assert.deepEqual(steps.map(e => e.data.name), STEP_NAMES);
  assert.ok(steps.every(e => e.data.source === 'close'));
  assert.deepEqual(events.filter(e => e.name === 'signup-submit'), [{ name: 'signup-submit', data: { result: 'live', source: 'close' } }]);
  assert.equal(events.length, 1 + STEP_NAMES.length + 1, 'nothing else fired before the success taps');
  s.querySelector('a.co-imsg').addEventListener('click', e => e.preventDefault());
  s.querySelector('a.co-imsg').click();
  s.querySelector('button.co-alt').click();
  await until(() => s.querySelector('.co-imsg-note'));
  assert.deepEqual(events.slice(-2), [{ name: 'signup-imessage', data: { source: 'close' } }, { name: 'signup-sms', data: { source: 'close' } }]);
  const blob = JSON.stringify(events);
  for (const pii of ['Edwin', 'Ruiz', '5105550123', '510', '139']) assert.doesNotMatch(blob, new RegExp(pii), pii);
});

test('a step fires once even if the answer changes; the hairline tracks rows answered', () => {
  const { d, events } = boot(() => ({}), { tracker: true });
  d.defaultView.openWaitlist('hero');
  pick(d, 'gender', 'male'); pick(d, 'gender', 'female'); pick(d, 'gender', 'male');
  assert.equal(events.filter(e => e.name === 'signup-step').length, 1);
  type(d, 'name', 'E'); type(d, 'name', 'Ed'); type(d, 'name', '');
  assert.equal(events.filter(e => e.name === 'signup-step').length, 2);
  // 1 of 16 rows answered (gender) → 6%
  assert.equal(d.getElementById('coProgress').style.getPropertyValue('--p'), '6%');
});

test('submit outcomes: already signed up → live-exists; old backend → waitlist; rejected and network error are named', async () => {
  for (const [respond, result] of [
    [() => ({ status: 'exists', live: true }), 'live-exists'],
    [() => ({ status: 'ok' }), 'waitlist'],
    [() => ({ status: 'exists', message: "you're already on the list." }), 'waitlist-exists'],
    [() => ({ ok: false, status: 'error', message: 'nope' }), 'rejected'],
    [() => new Error('offline'), 'error'],
  ]) {
    const { w, d, events } = boot(respond, { tracker: true });
    await walk(w, d);
    const submit = await until(() => events.find(e => e.name === 'signup-submit'));
    assert.deepEqual(submit.data, { result, source: 'hero' });
  }
});

test('re-opening the card keeps what was filled in and fires no second signup-open', async () => {
  const { w, d, events } = boot(() => ({ status: 'ok', live: true }), { tracker: true });
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  type(d, 'name', 'Edwin Ruiz');
  d.getElementById('waitlistClose').click();
  assert.equal(d.getElementById('waitlistOverlay').getAttribute('aria-hidden'), 'true');
  w.openWaitlist('floating');
  assert.equal(d.getElementById('foName').value, 'Edwin Ruiz');
  assert.deepEqual(events.filter(e => e.name === 'signup-open'), [{ name: 'signup-open', data: { source: 'hero' } }]);
});

test('without the tracker the form runs to the success screen untouched', async () => {
  const { w, d, events } = boot(() => ({ status: 'ok', live: true }));
  await walk(w, d);
  await success(d);
  assert.equal(events.length, 0);
});

test('?src=flyer: one qr-scan on landing, and ref on every funnel event through to submit', async () => {
  const { w, d, events } = boot(() => ({ status: 'ok', live: true }), { tracker: true, url: 'https://cued.fit/demo-site/?src=Flyer%20Moffitt' });
  await until(() => events.some(e => e.name === 'qr-scan'));
  await walk(w, d);
  await success(d);
  assert.deepEqual(events.filter(e => e.name === 'qr-scan'), [{ name: 'qr-scan', data: { src: 'flyer-moffitt', ref: 'flyer-moffitt' } }]);
  assert.deepEqual(events[1], { name: 'signup-open', data: { source: 'hero', ref: 'flyer-moffitt' } });
  const rest = events.filter(e => e.name !== 'qr-scan');
  assert.ok(rest.length >= 17 && rest.every(e => e.data.ref === 'flyer-moffitt'), 'every funnel event carries ref');
  assert.equal(rest.at(-1).name, 'signup-submit');
});

test('?utm_source works too and a late tracker still gets the scan; a plain URL fires nothing extra; the six printed flyer labels arrive as printed', async () => {
  const late = boot(() => ({}), { url: 'https://cued.fit/demo-site/?utm_source=poster', lateTracker: 600 });
  assert.equal(late.events.length, 0);
  await until(() => late.events.length, { timeout: 3000 });
  assert.deepEqual(late.events, [{ name: 'qr-scan', data: { src: 'poster', ref: 'poster' } }]);

  const plain = boot(() => ({ status: 'ok', live: true }), { tracker: true });
  await until(() => typeof plain.w.openWaitlist === 'function');
  await new Promise(r => setTimeout(r, 300));
  plain.w.openWaitlist('nav');
  await until(() => plain.events.length);
  assert.deepEqual(plain.events, [{ name: 'signup-open', data: { source: 'nav' } }]);

  for (const name of ['gym', 'partner', 'food', 'school', 'plan', 'weights']) {
    const label = `poster-${name}`;
    const { events } = boot(() => ({}), { tracker: true, url: `https://cued.fit/demo-site/?src=${label}` });
    await until(() => events.length);
    assert.deepEqual(events, [{ name: 'qr-scan', data: { src: label, ref: label } }], label);
  }
});
