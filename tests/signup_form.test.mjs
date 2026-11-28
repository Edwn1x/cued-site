// The root page's sign-up FORM (built 2026-11-14 at /demo-site, promoted to the root
// 2026-11-15): the previous generation's conversational chat (now at /demo-site) was too
// slow for readers who just want to fill in the boxes — this page opens a plain form. Same questions, same
// /waitlist payload, same success states (live + link → iMessage tap / SMS fallback;
// no link → "just texted you"; exists; an older backend's waitlist copy), same Umami
// funnel (signup-open / -step / -submit / -imessage / -sms, ?src → qr-scan + ref).
// Walked in jsdom with fetch stubbed — never against the real backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAGE = 'index.html';   // the root since 2026-11-15 (built at /demo-site, promoted)
const CTA_IDS = ['floatCta', 'heroCta', 'heroCtaTop', 'closeCta'];
const html = readFileSync(new URL('../' + PAGE, import.meta.url), 'utf8');

async function until(cond, { timeout = 4000, step = 10 } = {}) {
  const t0 = Date.now();
  for (;;) { const v = cond(); if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('timeout');
    await new Promise(r => setTimeout(r, step)); }
}

function boot(respond, { tracker = false, url = 'https://cued.fit/', lateTracker = 0, language = 'en-US' } = {}) {
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
const read = (d, name) => field(d, name).querySelector('.fo-in').value;
const submit = d => d.getElementById('coSubmit').click();
const success = d => until(() => d.querySelector('#coMsgs .co-success'));

// The questions after occupation, in the form's own order (so the funnel's steps fire 1…21), answered
// so a submit goes through.
function rest(d, { times = ['evenings'], goals = ['lose fat'], apps = ['nothing yet'], days = ['mon', 'tue', 'thu', 'fri'], experience = '6 months – 2 years', metric = false } = {}) {
  type(d, 'age', '20'); pick(d, 'gender', 'male'); stats(d, { metric });
  pick(d, 'activity', 'some walking'); pick(d, 'obstacle', 'knowing what to do');
  pick(d, 'goals', ...goals); pick(d, 'experience', experience);
  pick(d, 'routine', experience === 'just starting' ? 'no, build me one' : 'push / pull / legs');
  pick(d, 'equipment', 'full gym'); pick(d, 'injuries', 'none');
  pick(d, 'days', ...days); pick(d, 'time', ...times); pick(d, 'sleep', '7 – 9', '10 – 12');
  pick(d, 'apps', ...apps);
  pick(d, 'cooking', 'dining hall'); pick(d, 'diet', 'no restrictions');
}
// Fills top to bottom the way a reader would, then submits.
async function walk(w, d, { source = 'hero', referral = '', email = '', ...opts } = {}) {
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist(source);
  type(d, 'name', 'Edwin Ruiz');
  type(d, 'phone', '5105550123');
  pick(d, 'occupation', 'student'); type(d, 'occupation', 'uc berkeley', '#foSchool');
  rest(d, opts);
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
  // six short screens since 2026-11-27 (the accordion's 17 look-alike rows were "hard to digest"): one .fo-page each, in this order, with these questions
  assert.deepEqual([...d.querySelectorAll('#coForm > .fo-page')].map(pg => [pg.querySelector('.fo-sec-h').firstChild.textContent.trim(), [...pg.querySelectorAll('.fo-field')].map(f => f.dataset.f)]), [
    ['about you', ['name', 'phone', 'occupation']],
    ['a bit about you', ['age', 'gender', 'stats', 'activity', 'obstacle']],
    ['your training', ['goals', 'experience', 'routine', 'equipment', 'injuries']],
    ['your week', ['days', 'time', 'sleep', 'apps']],
    ['your food', ['cooking', 'diet', 'restrictions']],
    ['last things', ['email', 'referral']]]);
  assert.equal(d.getElementById('coNext').textContent.trim(), 'next'); assert.equal(d.getElementById('coBack').textContent.trim(), 'back');
  assert.equal(d.querySelectorAll('#coSteps button').length, 6, 'one step dot per screen');
  assert.equal(d.querySelector('#coForm .fo-next'), null, 'no per-row next buttons');
  assert.ok(d.querySelector('#waitlistOverlay #coPreview #pvThread'), 'the live preview pane is in the card');
  assert.deepEqual([...d.querySelectorAll('#coForm .fo-field')].map(f => f.dataset.f), ['name', 'phone', 'occupation', 'age', 'gender', 'stats', 'activity', 'obstacle', 'goals', 'experience', 'routine', 'equipment', 'injuries', 'days', 'time', 'sleep', 'apps', 'cooking', 'diet', 'restrictions', 'email', 'referral']);
  // the days question asks WHICH days (chips mon…sun), not how many
  assert.deepEqual([...field(d, 'days').querySelectorAll('.fo-chip')].map(c => c.dataset.v), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  // only "last things" (gmail, referral code) is marked optional — every question row is required again (founder, 2026-11-20)
  assert.deepEqual([...d.querySelectorAll('#coForm .fo-sec.opt .fo-sec-h')].map(h => h.firstChild.textContent.trim()), ['last things']);
  assert.deepEqual([...d.querySelectorAll('#coForm .fo-sec-h small')].map(x => x.textContent), ['optional']);
  assert.doesNotMatch(d.querySelector('#coForm').textContent, /everything from here is optional/);
  assert.match(fine.textContent, /recurring automated texts/);
  assert.deepEqual([...fine.querySelectorAll('a')].map(a => a.getAttribute('href')), ['terms.html', 'privacy.html']);   // relative: this page is the root
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
  assert.deepEqual(p.workout_days, ['mon', 'tue', 'thu', 'fri'], 'which days, in week order'); assert.equal(p.workout_time, 'evening'); assert.equal(p.workout_times, null);
  // the questions that joined the form 2026-11-27, in the shapes the backend's columns hold
  assert.equal(p.injuries, 'none'); assert.equal(p.current_split, 'ppl'); assert.equal(p.cooking_situation, 'dining_hall');
  assert.equal(p.activity_level, 'lightly active — some walking'); assert.equal(p.wake_time, '08:00'); assert.equal(p.sleep_time, '23:00');
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
  type(d, 'name', 'Pat Lee'); type(d, 'phone', '5105550124'); pick(d, 'occupation', 'i work');
  rest(d, { experience: 'just starting' });
  type(d, 'stats', '168', '.fo-in[data-k=cm]'); type(d, 'stats', '63.5', '.fo-in[data-k=kg]');
  consent(d); submit(d);
  await success(d);
  const p = posted[0].body;
  assert.equal(p.height_cm, 168); assert.equal(p.weight_kg, 63.5);
  assert.equal(p.height_ft, undefined); assert.equal(p.weight_lbs, undefined);
  assert.equal(p.current_split, 'none', 'the routine question is asked of everyone — a beginner answers it too');
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
  // age is required and comes before height & weight: a blank age is the next flag
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'age').classList.contains('bad') && isOpen(d, 'age'), 'age is required'); assert.equal(posted.length, 0);
  type(d, 'age', '2'); pick(d, 'gender', 'male');
  // a half-typed height & weight is refused (never a wrong fact); a blank one is a required gap
  type(d, 'stats', '5', '.fo-in[data-k=ft]'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'stats').classList.contains('bad') && isOpen(d, 'stats')); assert.equal(posted.length, 0);
  type(d, 'stats', '', '.fo-in[data-k=ft]'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'stats').classList.contains('bad') && isOpen(d, 'stats'), 'blank height & weight is flagged, not skipped'); assert.equal(posted.length, 0);
  assert.ok(!field(d, 'age').classList.contains('bad'), 'a 1-digit age is a valid age');
  type(d, 'age', '20'); stats(d); pick(d, 'activity', 'on my feet'); pick(d, 'obstacle', 'time'); pick(d, 'goals', 'endurance');
  // the routine question is asked of everyone (founder, 2026-11-27), "just starting" included
  pick(d, 'experience', 'just starting'); pick(d, 'equipment', 'bodyweight only');
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'routine').classList.contains('bad') && isOpen(d, 'routine'), 'the routine question is required, for a beginner too'); assert.equal(posted.length, 0);
  pick(d, 'routine', 'no, build me one'); submit(d); await new Promise(r => setTimeout(r, 20));
  // injuries: required; "something else" on its own has to say what
  assert.ok(field(d, 'injuries').classList.contains('bad') && isOpen(d, 'injuries'), 'injuries is required — the first card cannot be built without it'); assert.equal(posted.length, 0);
  pick(d, 'injuries', 'something else'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'injuries').classList.contains('bad') && field(d, 'injuries').classList.contains('noted'), '"something else" alone needs the note'); assert.equal(posted.length, 0);
  type(d, 'injuries', 'left knee, no deep squats', '#foInjNote');
  pick(d, 'days', 'tue', 'sat'); pick(d, 'time', 'mornings');
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'sleep').classList.contains('bad') && isOpen(d, 'sleep'), 'wake + sleep is required'); assert.equal(posted.length, 0);
  pick(d, 'sleep', 'before 7'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'sleep').classList.contains('bad'), 'one of the two picks is not an answer'); assert.equal(posted.length, 0);
  pick(d, 'sleep', 'before 10');
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'apps').classList.contains('bad') && isOpen(d, 'apps'), '"track anything?" is required too'); assert.equal(posted.length, 0);
  pick(d, 'apps', 'whoop');
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'cooking').classList.contains('bad') && isOpen(d, 'cooking'), 'the food situation is required'); assert.equal(posted.length, 0);
  pick(d, 'cooking', 'a mix'); pick(d, 'diet', 'halal');
  type(d, 'email', 'not-an-email'); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'email').classList.contains('bad')); assert.equal(posted.length, 0);
  type(d, 'email', ''); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'consent').classList.contains('bad'), 'consent is required'); assert.equal(posted.length, 0);
  consent(d); submit(d);
  await success(d);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].body.email, null);
  assert.equal(posted[0].body.injuries, 'left knee, no deep squats'); assert.deepEqual(posted[0].body.workout_days, ['tue', 'sat']);
  assert.equal(posted[0].body.wake_time, '06:00'); assert.equal(posted[0].body.sleep_time, '21:30'); assert.equal(posted[0].body.cooking_situation, 'mix');
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

// Screens (founder 2026-11-27, replacing the 2026-11-14 accordion): five short screens, one shown at a
// time, every question on the current one open; "next" checks only the current screen, "back" checks
// nothing, Enter walks the typed fields, a step dot jumps back, submit goes to the first gap's screen.
const isOpen = (d, name) => field(d, name).classList.contains('open');   // = the question is on the current screen
const screen = d => [...d.querySelectorAll('#coForm > .fo-page')].findIndex(pg => !pg.hidden);
const next = d => d.getElementById('coNext').click();
const enter = (w, el) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
test('screens: the first one shows with all its questions open; next refuses a gap and stays; Enter walks the typed fields; back and the dots go back', async () => {
  const { w, d } = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  const ov = d.getElementById('waitlistOverlay');
  assert.equal(screen(d), 0);
  assert.ok(isOpen(d, 'name') && isOpen(d, 'phone') && isOpen(d, 'occupation'), 'every question on the screen is open');
  assert.ok(!isOpen(d, 'age') && d.querySelectorAll('#coForm > .fo-page:not([hidden])').length === 1, 'the other screens are hidden');
  assert.ok(ov.classList.contains('first') && !ov.classList.contains('last'));
  // next with nothing typed: the first blank question is flagged, and the screen does not move
  next(d);
  assert.equal(screen(d), 0); assert.ok(field(d, 'name').classList.contains('bad'));
  type(d, 'name', 'Edwin Ruiz');
  assert.ok(field(d, 'name').classList.contains('done') && !field(d, 'name').classList.contains('bad'), 'answered: the tick, and the flag clears');
  // Enter in the name box goes to the number box; a bad number blocks next
  enter(w, d.getElementById('foName'));
  assert.equal(screen(d), 0, 'Enter on a field that has another after it stays on the screen');
  type(d, 'phone', '510555012'); next(d);
  assert.equal(screen(d), 0); assert.ok(field(d, 'phone').classList.contains('bad'), 'a 9-digit number is refused');
  type(d, 'phone', '5105550123'); next(d);
  assert.equal(screen(d), 0); assert.ok(field(d, 'occupation').classList.contains('bad'), 'occupation is required');
  // occupation: the pick reveals its detail box; Enter in the last typed field of the screen is "next"
  pick(d, 'occupation', 'student');
  assert.ok(field(d, 'occupation').classList.contains('student'));
  assert.equal(screen(d), 0, 'a pick alone never changes the screen');
  type(d, 'occupation', 'uc berkeley', '#foSchool');
  enter(w, d.getElementById('foSchool'));
  assert.equal(screen(d), 1, 'Enter in the last typed field moves on');
  assert.ok(isOpen(d, 'age') && isOpen(d, 'gender') && isOpen(d, 'stats') && isOpen(d, 'activity') && isOpen(d, 'obstacle') && !isOpen(d, 'name'));
  assert.ok(!ov.classList.contains('first'));
  // back keeps what was typed and checks nothing
  d.getElementById('coBack').click();
  assert.equal(screen(d), 0); assert.equal(d.getElementById('foName').value, 'Edwin Ruiz');
  next(d); assert.equal(screen(d), 1);
  type(d, 'age', '20'); pick(d, 'gender', 'male'); pick(d, 'activity', 'mostly sitting'); pick(d, 'obstacle', 'time');
  next(d); assert.equal(screen(d), 1); assert.ok(field(d, 'stats').classList.contains('bad'), 'height & weight is required');
  stats(d);
  // Enter in height & weight walks the row's empty boxes first, then is "next"
  enter(w, field(d, 'stats').querySelector('.fo-in[data-k=lbs]'));
  assert.equal(screen(d), 2);
  // every question on the screen is there for everyone, the routine one included
  assert.ok(isOpen(d, 'routine'));
  pick(d, 'goals', 'lose fat', 'build muscle'); pick(d, 'experience', 'just starting'); pick(d, 'equipment', 'full gym'); pick(d, 'injuries', 'knee', 'shoulder');
  pick(d, 'injuries', 'none');
  assert.deepEqual([...field(d, 'injuries').querySelectorAll('.fo-chip.sel')].map(c => c.textContent), ['none'], '"none" clears the others');
  next(d); assert.equal(screen(d), 2); assert.ok(field(d, 'routine').classList.contains('bad'), 'required for a beginner too');
  pick(d, 'routine', 'upper / lower'); next(d);
  assert.equal(screen(d), 3);
  // the dots: a screen already seen is one click away; one not reached yet is not
  const dots = [...d.querySelectorAll('#coSteps button')];
  assert.ok(dots[3].classList.contains('cur') && dots[0].classList.contains('seen') && !dots[4].classList.contains('seen'));
  dots[5].click(); assert.equal(screen(d), 3, 'cannot jump ahead of what has been filled in');
  dots[1].click(); assert.equal(screen(d), 1);
  dots[3].click(); assert.equal(screen(d), 3);
  pick(d, 'days', 'mon', 'wed', 'fri'); pick(d, 'time', 'evenings'); pick(d, 'sleep', '9 – 11', '12 – 2'); pick(d, 'apps', 'nothing yet');
  next(d);
  assert.equal(screen(d), 4); assert.ok(isOpen(d, 'cooking') && isOpen(d, 'diet') && isOpen(d, 'restrictions'));
  pick(d, 'cooking', 'i cook'); pick(d, 'diet', 'vegan'); next(d);
  assert.equal(screen(d), 5); assert.ok(ov.classList.contains('last'), 'the last screen: consent and "sign up" take over from "next"');
});

test('screens: the skippable questions (allergies, gmail, referral) never block next; a bad email does; submit with a gap goes to that gap\'s screen', async () => {
  const { w, d, posted } = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  type(d, 'name', 'Edwin Ruiz'); type(d, 'phone', '5105550123'); pick(d, 'occupation', 'i work'); next(d);
  type(d, 'age', '20'); pick(d, 'gender', 'male'); stats(d); pick(d, 'activity', 'on my feet'); pick(d, 'obstacle', 'time'); next(d);
  pick(d, 'goals', 'lose fat'); pick(d, 'experience', 'just starting'); pick(d, 'routine', 'no, build me one'); pick(d, 'equipment', 'full gym'); pick(d, 'injuries', 'none'); next(d);
  pick(d, 'days', 'mon', 'wed', 'fri'); pick(d, 'time', 'evenings'); pick(d, 'sleep', '7 – 9', '10 – 12'); pick(d, 'apps', 'nothing yet'); next(d);
  pick(d, 'cooking', 'eating out'); pick(d, 'diet', 'vegan');
  assert.equal(read(d, 'restrictions'), ''); next(d);
  assert.equal(screen(d), 5, 'blank allergies do not hold the screen');
  for (const n of ['restrictions', 'email', 'referral']) assert.match(field(d, n).querySelector('.fo-q').textContent, /optional/, n + ' says it is optional');
  // the last screen's "sign up" checks everything: a bad email is flagged where it is
  type(d, 'email', 'nope'); consent(d); submit(d); await new Promise(r => setTimeout(r, 20));
  assert.ok(field(d, 'email').classList.contains('bad')); assert.equal(posted.length, 0);
  type(d, 'email', '');
  // a gap on an earlier screen: submit goes back to it
  d.querySelectorAll('#coSteps button')[1].click(); type(d, 'age', ''); d.querySelectorAll('#coSteps button')[5].click();
  assert.equal(screen(d), 5);
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.equal(screen(d), 1, 'the gap\'s screen comes back'); assert.ok(field(d, 'age').classList.contains('bad') && isOpen(d, 'age')); assert.equal(posted.length, 0);
  type(d, 'age', '20'); submit(d);
  await success(d);
  assert.equal(posted.length, 1); assert.equal(posted[0].body.restrictions, null); assert.equal(posted[0].body.email, null);
  assert.deepEqual(posted[0].body.workout_days, ['mon', 'wed', 'fri']); assert.equal(posted[0].body.current_split, 'none');
});

// The live preview (2026-11-27): what cued would text back, built from the answers as they are given.
// It lives in the card only — typed answers never reach an analytics event (the funnel test checks that).
test('live preview: a hello by first name, the days they picked lit on a week card, the goal line; the mascot\'s pose follows the screen', async () => {
  const { w, d } = boot(() => ({ status: 'ok', live: true }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  const pv = d.getElementById('pvThread'), text = k => pv.querySelector(`[data-k="${k}"]`)?.textContent ?? null;
  assert.ok(pv.querySelector('[data-k="hi"].pv-dots'), 'three dots until there is a name');
  type(d, 'name', 'Edwin Ruiz');
  assert.equal(text('hi'), 'hey edwin.');
  pick(d, 'occupation', 'student'); type(d, 'occupation', 'UC Berkeley', '#foSchool');
  assert.match(text('who'), /a student at uc berkeley/);
  type(d, 'phone', '5105550123'); next(d);
  assert.ok(d.querySelector('.co-avatar.pose img[data-pose="ball"]').classList.contains('on'), 'the header mascot changes pose with the screen');
  assert.equal(d.getElementById('pvStatus').textContent, 'doing the math…');
  type(d, 'age', '20'); pick(d, 'gender', 'male'); stats(d); pick(d, 'activity', 'some walking'); pick(d, 'obstacle', 'time');
  assert.match(text('stats'), /5'6, 139 lbs/);
  next(d);
  pick(d, 'goals', 'build muscle', 'get stronger'); pick(d, 'equipment', 'home gym');
  assert.match(text('goal'), /build muscle \+ get stronger, with a home gym/);
  pick(d, 'experience', '2+ years'); pick(d, 'routine', 'upper / lower');
  assert.match(text('split'), /upper \/ lower/);
  pick(d, 'injuries', 'knee', 'lower back');
  assert.match(text('inj'), /work around your lower back and knee/);
  pick(d, 'injuries', 'none'); assert.equal(text('inj'), null, 'no injuries line for "none"');
  next(d);
  assert.equal(pv.querySelector('[data-k="week"]'), null, 'no week card before the days are picked');
  pick(d, 'days', 'mon', 'wed', 'fri', 'sat'); pick(d, 'time', 'evenings');
  const wk = pv.querySelector('[data-k="week"]');
  assert.deepEqual([...wk.querySelectorAll('.pv-wk i')].map(c => c.classList.contains('on')), [true, false, true, false, true, true, false], 'exactly the days they picked are lit');
  assert.match(wk.textContent, /4 days · evenings/);
  pick(d, 'days', 'sat');
  assert.equal(wk.querySelectorAll('.pv-wk i.on').length, 3, 'the card follows a changed answer');
  pick(d, 'sleep', '7 – 9', '12 – 2');
  assert.match(text('sleep'), /up around 8, asleep around 1/);
  pick(d, 'apps', 'apple watch', 'strava'); next(d);
  pick(d, 'cooking', 'dining hall'); pick(d, 'diet', 'vegan'); type(d, 'restrictions', 'Peanuts');
  assert.match(text('food'), /dining hall, vegan, minus peanuts/);
  assert.match(text('apps'), /read your apple watch \+ strava/);
  assert.match(d.querySelector('#coPeek span').textContent, /dining hall/, 'phones get the latest line as one bubble');
  // a typed answer is text, never markup
  type(d, 'restrictions', '<img src=x onerror=alert(1)>');
  assert.equal(pv.querySelector('img'), null);
});

test('copy: "estimate is fine", never "ballpark"', () => {
  const { d } = boot(() => ({}));
  assert.doesNotMatch(d.body.innerHTML, /ballpark/);
  assert.match(field(d, 'stats').textContent, /estimate is fine/);
});

// Every question row is required (founder 2026-11-20, reverting the 11-14 middle ground):
// the backend creates the account from name, number and consent, but the coach needs the
// profile to build targets and the first card — three of the first four readers on the
// optional form skipped it all and spent the first five minutes answering it over text.
test('required form: name + number + occupation + consent alone are refused at the first blank question; only allergies, gmail and the referral code are optional; the button always reads "sign up"', async () => {
  const { w, d, posted } = boot(() => ({ status: 'ok', live: true, imessage_link: null }));
  await until(() => typeof w.openWaitlist === 'function');
  w.openWaitlist('hero');
  assert.equal(d.getElementById('coSubmit').textContent, 'sign up');
  type(d, 'name', 'Edwin Ruiz'); type(d, 'phone', '5105550123'); pick(d, 'occupation', 'i work');
  consent(d);
  assert.equal(d.getElementById('coSubmit').textContent, 'sign up', 'no "ask the rest over text" offer');
  // only the three skippable questions say "optional"
  assert.deepEqual([...d.querySelectorAll('#coForm .fo-field')].filter(f => /optional/.test(f.querySelector('.fo-q').textContent)).map(f => f.dataset.f), ['restrictions', 'email', 'referral']);
  submit(d); await new Promise(r => setTimeout(r, 20));
  assert.equal(posted.length, 0, 'nothing posts');
  assert.ok(field(d, 'age').classList.contains('bad') && isOpen(d, 'age'), 'the first blank question (age) is flagged and opened');
  type(d, 'age', '20'); pick(d, 'gender', 'female'); stats(d); pick(d, 'activity', 'physical job or sport'); pick(d, 'obstacle', 'time');
  pick(d, 'goals', 'build muscle'); pick(d, 'experience', '2+ years'); pick(d, 'routine', 'no, build me one'); pick(d, 'equipment', 'full gym'); pick(d, 'injuries', 'shoulder');
  pick(d, 'days', 'mon', 'wed', 'fri'); pick(d, 'time', 'evenings'); pick(d, 'sleep', 'after 11', 'after 2'); pick(d, 'apps', 'nothing yet');
  pick(d, 'cooking', 'i cook'); pick(d, 'diet', 'vegan');
  assert.equal(d.getElementById('coSubmit').textContent, 'sign up');
  submit(d);
  const s = await success(d);
  assert.equal(s.querySelector('h3').textContent, "you're in, Edwin.");
  const p = posted[0].body;
  assert.equal(p.occupation, 'working'); assert.equal(p.age, 20); assert.equal(p.gender, 'female');
  assert.equal(p.height_ft, 5); assert.equal(p.weight_lbs, 139); assert.deepEqual(p.goal, ['muscle_building']);
  assert.equal(p.biggest_obstacle, 'time'); assert.equal(p.experience, 'advanced'); assert.equal(p.equipment, 'full_gym');
  assert.deepEqual(p.workout_days, ['mon', 'wed', 'fri']); assert.equal(p.workout_time, 'evening'); assert.equal(p.diet, 'vegan'); assert.deepEqual(p.existing_tools, ['none']);
  assert.equal(p.injuries, 'shoulder'); assert.equal(p.current_split, 'none'); assert.equal(p.activity_level, 'very active — physical job or sport');
  assert.equal(p.cooking_situation, 'cook_myself'); assert.equal(p.wake_time, '12:00'); assert.equal(p.sleep_time, '03:00');
  // the three skippable rows post null when blank
  assert.equal(p.restrictions, null); assert.equal(p.email, null); assert.equal(p.referral_code, null);
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
    rest(d);   // every question is required
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
  rest(d); consent(d); submit(d); await success(d);
  assert.equal(posted[0].body.school, null); assert.equal(posted[0].body.occupation, 'working');
});

// ── analytics ──
const STEP_NAMES = ['name', 'phone', 'occupation', 'age', 'gender', 'stats', 'activity', 'obstacle', 'goals', 'experience', 'routine', 'equipment', 'injuries', 'days', 'time', 'sleep', 'apps', 'cooking', 'diet', 'restrictions', 'consent'];

test('funnel: open → 21 steps in form order (restrictions counted as passed) → submit live → iMessage tap and SMS tap, tagged with the source; no PII', async () => {
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
  for (const pii of ['Edwin', 'Ruiz', '5105550123', '510', '139', 'berkeley']) assert.doesNotMatch(blob, new RegExp(pii), pii);
});

test('a step fires once even if the answer changes; the hairline tracks rows answered', () => {
  const { d, events } = boot(() => ({}), { tracker: true });
  d.defaultView.openWaitlist('hero');
  pick(d, 'gender', 'male'); pick(d, 'gender', 'female'); pick(d, 'gender', 'male');
  assert.equal(events.filter(e => e.name === 'signup-step').length, 1);
  type(d, 'name', 'E'); type(d, 'name', 'Ed'); type(d, 'name', '');
  assert.equal(events.filter(e => e.name === 'signup-step').length, 2);
  // 1 of 21 questions answered (gender) → 5%
  assert.equal(d.getElementById('coProgress').style.getPropertyValue('--p'), '5%');
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
  const { w, d, events } = boot(() => ({ status: 'ok', live: true }), { tracker: true, url: 'https://cued.fit/?src=Flyer%20Moffitt' });
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
  const late = boot(() => ({}), { url: 'https://cued.fit/?utm_source=poster', lateTracker: 600 });
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
    const { events } = boot(() => ({}), { tracker: true, url: `https://cued.fit/?src=${label}` });
    await until(() => events.length);
    assert.deepEqual(events, [{ name: 'qr-scan', data: { src: label, ref: label } }], label);
  }
});
