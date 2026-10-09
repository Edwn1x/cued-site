// Swipe-left on a set row reveals a delete action; the edit-panel 'remove set'
// stays as the visible route. Red-first for the swipe (new), green guard for the
// panel button (existing).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boot, fixture } from './harness.mjs';

// The 'delete' action is parked at translateX(100%) by CSS (inline '' = closed) and
// slides to translateX(0) when open; the row's numbers never move.
const OPEN = 'translateX(0px)';
const open = (row) => row.classList.contains('open');
const tx = (c, row) => row.querySelector('.swipeact')?.style.transform ?? '';

test('rows carry their set id and render a swipe action', async () => {
  const c = await boot();
  try {
    assert.ok(c.rowFor(11), 'row tagged with data-set');
    assert.equal(c.rowFor(11).querySelector('.swipeact')?.textContent, 'delete');
  } finally { c.close(); }
});

test('a left swipe past half the action width opens the row (undone and done sets alike)', async () => {
  const c = await boot();
  try {
    c.swipe(c.rowFor(11), { dx: -70 });
    assert.ok(open(c.rowFor(11)));
    assert.equal(tx(c, c.rowFor(11)), OPEN);
    assert.equal(c.posts().length, 0, 'a swipe never toggles done');

    c.swipe(c.rowFor(12), { dx: -70 });     // done set
    assert.ok(open(c.rowFor(12)));
    assert.ok(!open(c.rowFor(11)), 'opening another row closes the first');
    assert.equal(tx(c, c.rowFor(11)), '');
  } finally { c.close(); }
});

test('a short swipe snaps back closed', async () => {
  const c = await boot();
  try {
    c.swipe(c.rowFor(11), { dx: -30 });
    assert.ok(!open(c.rowFor(11)));
    assert.equal(tx(c, c.rowFor(11)), '');
    assert.equal(c.posts().length, 0);
  } finally { c.close(); }
});

test('tapping the revealed delete removes that set (DELETE /card/api/set/<id>)', async () => {
  const c = await boot();
  try {
    c.swipe(c.rowFor(11), { dx: -70 });
    c.press(c.rowFor(11).querySelector('.swipeact'));   // a real finger tap: touch events, then click
    await c.settle();
    assert.deepEqual(c.deletes().map((d) => d.path), ['/card/api/set/11']);
    assert.equal(c.rowFor(11), undefined, 'row gone');
    assert.equal(c.rows().length, 2);
    assert.equal(c.posts().length, 0);
  } finally { c.close(); }
});

test('a vertical drag is a scroll: no open, no translate, no toggle', async () => {
  const c = await boot();
  try {
    c.swipe(c.rowFor(11), { dx: -6, dy: 80 });
    assert.ok(!open(c.rowFor(11)));
    assert.equal(tx(c, c.rowFor(11)), '');
    assert.equal(c.posts().length, 0);
  } finally { c.close(); }
});

test('a plain tap still toggles done', async () => {
  const c = await boot();
  try {
    c.tap(c.rowFor(11).querySelector('.circle'));   // the numbers are the edit target; the rest of the row toggles
    await c.settle();
    assert.equal(c.posts().length, 1);
    assert.deepEqual(c.posts()[0], { method: 'POST', path: '/card/api/set/11', body: { done: true } });
  } finally { c.close(); }
});

test('with a row open, a tap anywhere just closes it — no toggle', async () => {
  const c = await boot();
  try {
    c.swipe(c.rowFor(11), { dx: -70 });
    c.tap(c.bodyOf(c.rowFor(21)));           // a different row
    await c.settle();
    assert.ok(!open(c.rowFor(11)));
    assert.equal(c.posts().length, 0, 'the closing tap is consumed');

    c.swipe(c.rowFor(11), { dx: -70 });
    c.tap(c.bodyOf(c.rowFor(11)));           // the open row itself
    await c.settle();
    assert.ok(!open(c.rowFor(11)));
    assert.equal(c.posts().length, 0);
  } finally { c.close(); }
});

test('a swipe that starts at the right screen edge is left to the system', async () => {
  const c = await boot();
  try {
    c.swipe(c.rowFor(11), { dx: -70, x0: c.window.innerWidth - 10 });
    assert.ok(!open(c.rowFor(11)));
    assert.equal(tx(c, c.rowFor(11)), '');
  } finally { c.close(); }
});

test('scrolling closes an open row', async () => {
  const c = await boot();
  try {
    c.swipe(c.rowFor(11), { dx: -70 });
    c.window.dispatchEvent(new c.window.Event('scroll'));
    assert.ok(!open(c.rowFor(11)));
  } finally { c.close(); }
});

test('a row in edit mode does not swipe', async () => {
  const c = await boot();
  try {
    c.rowFor(11).querySelector('.nums').click();
    assert.ok(c.rowFor(11).classList.contains('editing'));
    c.swipe(c.rowFor(11), { dx: -70 });
    assert.ok(!open(c.rowFor(11)));
  } finally { c.close(); }
});

test('a finished session has no swipe', async () => {
  const st = fixture(); st.session.status = 'done';
  const c = await boot(st);
  try {
    c.swipe(c.rowFor(11), { dx: -70 });
    assert.ok(!open(c.rowFor(11)));
    assert.equal(c.rowFor(11).querySelector('.swipeact'), null);
  } finally { c.close(); }
});

test('guard: the edit panel still has remove set, and it deletes', async () => {
  const c = await boot();
  try {
    c.rows()[0].querySelector('.nums').click();   // render() rebuilds rows — re-query
    const rm = c.rows()[0].querySelector('.edit .rm');
    assert.equal(rm?.textContent, 'remove set');
    rm.click();
    await c.settle();
    assert.deepEqual(c.deletes().map((d) => d.path), ['/card/api/set/11']);
    assert.equal(c.rows().length, 2);
  } finally { c.close(); }
});
