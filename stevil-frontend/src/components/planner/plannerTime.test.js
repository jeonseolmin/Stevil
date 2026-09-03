import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, validatePlan } from './plannerUtils.js';

const prefs = () => ({ ...defaults('2026-08-31'), exerciseWindows: [{ day: 0, start: '17:00', end: '18:30' }] });
const workout = (end = '18:30:00') => ({ id: 'workout', title: '걷기', kind: 'EXERCISE', start: '2026-08-31T17:00:00', end: `2026-08-31T${end}` });

test('Spring seconds at exact exercise boundary are valid', () => {
    assert.equal(validatePlan(prefs(), [workout()]), '');
    assert.equal(validatePlan(prefs(), [workout('18:30')]), '');
});
test('real boundary overruns are still rejected', () => {
    assert.match(validatePlan(prefs(), [workout('18:30:01')]), /운동 일정을/);
    assert.match(validatePlan(prefs(), [workout('18:31')]), /운동 일정을/);
});
test('adjacent fixed slots do not count as overlapping', () => {
    const p = prefs();
    p.busySlots = [{ day: 0, title: '업무', start: '16:00', end: '17:00' }, { day: 0, title: '저녁', start: '18:30', end: '19:00' }];
    assert.equal(validatePlan(p, [workout()]), '');
    p.busySlots[1].start = '18:29';
    assert.match(validatePlan(p, [workout()]), /고정 일정/);
});
test('sleep boundary accepts equivalent precision', () => {
    const p = prefs(); p.sleepTime = '18:30';
    assert.equal(validatePlan(p, [workout()]), '');
});
