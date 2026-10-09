// Boots card.html in jsdom with the backend stubbed. The page's own script runs
// unmodified; fetch is replaced with an in-memory session that answers like
// card_page.build_state (same keys) so rendering and gestures are testable
// without a browser. Touch events are plain Events carrying a `touches` array —
// that's all the page reads.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../card.html', import.meta.url), 'utf8');

export function set(id, weight, reps, done = false, extra = {}) {
  return { id, index: 0, planned_weight: weight, planned_reps: reps,
           actual_weight: done ? weight : null, actual_reps: done ? reps : null,
           done, edited: false, source: 'card', pr: null, ...extra };
}

export function fixture(overrides = {}) {
  return {
    ok: true,
    session: { id: 7, template_key: 'push_a', status: 'active', weekday: 'thu', started_at: null, finished_at: null },
    exercises: [
      { slug: 'bench_press', label: 'bench press', bodyweight: false, sets: [set(11, 135, 8, false), set(12, 135, 8, true)] },
      { slug: 'cable_fly', label: 'cable fly', bodyweight: false, sets: [set(21, 30, 12, false)] },
    ],
    bodyweight: false, volume_lb: 1080, done_count: 1, set_count: 3, updated_at: 't1',
    ...overrides,
  };
}

export async function until(cond, { timeout = 1500, step = 5 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = cond();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, step));
  }
}

export async function boot(state = fixture()) {
  const calls = [];
  const dom = new JSDOM(html, {
    url: 'http://localhost/card.html?t=tok',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.fetch = async (url, opts = {}) => {
        const method = opts.method || 'GET';
        const path = String(url).replace(/^https?:\/\/[^/]+/, '');
        const body = opts.body ? JSON.parse(opts.body) : undefined;
        calls.push({ method, path, body });
        const m = path.match(/^\/card\/api\/set\/(\d+)$/);
        if (method === 'DELETE' && m) {
          const id = Number(m[1]);
          for (const ex of state.exercises) ex.sets = ex.sets.filter((s) => s.id !== id);
          state.set_count = state.exercises.reduce((n, ex) => n + ex.sets.length, 0);
        }
        if (method === 'POST' && m && body && 'done' in body) {
          for (const ex of state.exercises) for (const s of ex.sets) if (s.id === Number(m[1])) {
            s.done = body.done; s.actual_weight = body.done ? s.planned_weight : null; s.actual_reps = body.done ? s.planned_reps : null;
          }
        }
        state.updated_at = 't' + calls.length;
        return { ok: true, status: 200, json: async () => ({ ...state, ok: true }) };
      };
    },
  });
  const { window } = dom;
  await until(() => window.document.querySelector('.row'));
  const rows = () => [...window.document.querySelectorAll('.row')];
  const rowFor = (id) => rows().find((r) => r.dataset.set === String(id));
  const bodyOf = (row) => row.querySelector('.nums');   // where a finger lands on a row
  function touch(el, type, x, y) {
    const e = new window.Event(type, { bubbles: true, cancelable: true });
    const pts = type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: x, clientY: y }];
    Object.defineProperty(e, 'touches', { value: pts });
    Object.defineProperty(e, 'changedTouches', { value: [{ clientX: x, clientY: y }] });
    el.dispatchEvent(e);
    return e;
  }
  // A finger drag on the row body: start, N moves along (dx, dy), lift.
  function swipe(row, { dx, dy = 0, x0 = 200, y0 = 100, steps = 4 }) {
    const el = bodyOf(row);
    touch(el, 'touchstart', x0, y0);
    for (let i = 1; i <= steps; i++) touch(el, 'touchmove', x0 + (dx * i) / steps, y0 + (dy * i) / steps);
    touch(el, 'touchend', x0 + dx, y0 + dy);
  }
  function tap(el, x = 200, y = 100) { touch(el, 'touchstart', x, y); return touch(el, 'touchend', x, y); }
  // What a browser does with a finger tap: touchstart, touchend, then a synthetic click
  // unless touchend was preventDefault'ed.
  function press(el, x = 200, y = 100) { const end = tap(el, x, y); if (!end.defaultPrevented) el.click(); }
  const settle = () => new Promise((r) => setTimeout(r, 20));
  const posts = () => calls.filter((c) => c.method === 'POST');
  const deletes = () => calls.filter((c) => c.method === 'DELETE');
  const close = () => window.close();
  return { dom, window, document: window.document, state, calls, rows, rowFor, bodyOf, touch, swipe, tap, press, settle, posts, deletes, close };
}
