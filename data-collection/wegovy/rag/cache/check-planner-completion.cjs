const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/human-01/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3001/__design');
    const planner = page.locator('.weekly-planner');
    await planner.getByRole('button', { name: '나의 한 주 만들기' }).click();
    await planner.getByRole('button', { name: '샘플 주간 계획 만들기' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.planner-event').length === 24);
    const days = planner.locator('.planner-day');
    const first = days.first().locator('.planner-event--meal input[type=checkbox]').first();
    const completed = planner.locator('.planner-nutrition-cards > div').nth(2);
    await first.check();
    assert.match(await completed.innerText(), /1\s*\/ 3끼/);
    assert.match(await completed.innerText(), /완료 반영됨/);
    assert.equal(await days.first().locator('.planner-day-select').getAttribute('aria-pressed'), 'true');
    await first.uncheck();
    assert.match(await completed.innerText(), /0\s*\/ 3끼/);
    await first.check();
    await days.nth(1).locator('.planner-day-select').click();
    assert.match(await completed.innerText(), /0\s*\/ 3끼/);
    await days.first().locator('.planner-day-select').click();
    assert.match(await completed.innerText(), /1\s*\/ 3끼/);
    await planner.getByRole('button', { name: '미리보기에서 확정' }).click();
    await planner.getByText('미리보기 안에서 저장했어요. 새로고침하면 초기화됩니다.').waitFor();
    await planner.getByRole('button', { name: '다음 주', exact: true }).click();
    await planner.getByRole('button', { name: '이전 주', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.planner-event').length === 24);
    await days.first().locator('.planner-day-select').click();
    assert.equal(await first.isChecked(), true);
    assert.match(await completed.innerText(), /1\s*\/ 3끼/);
    assert.deepEqual(errors, []);
    console.log('PASS: completion count, missing nutrition, uncheck, date selection, preview save retention');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
