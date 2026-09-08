const { chromium } = require('C:/Users/human-01/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const draft=JSON.parse(fs.readFileSync('data-collection/wegovy/rag/cache/nutrition/verified-draft.json','utf8'));
  const current=new Date();current.setDate(current.getDate()-(current.getDay()+6)%7);
  const date=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const offset=(new Date(date(current)+'T12:00:00')-new Date(draft.preferences.weekStart+'T12:00:00'))/86400000;
  draft.preferences.weekStart=date(current);
  for(const e of draft.events) for(const field of ['start','end']) {const d=new Date(e[field]);d.setDate(d.getDate()+offset);e[field]=date(d)+e[field].slice(10);}
  let saved={revision:1,preferences:draft.preferences,events:draft.events};
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];
    page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
    await page.route('**/src/main.jsx',route=>route.fulfill({contentType:'application/javascript',body:`import React from '/node_modules/.vite/deps/react.js'; import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js'; import WeeklyPlanner from '/src/components/planner/WeeklyPlanner.jsx'; ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(WeeklyPlanner));`}));
    await page.route(/^http:\/\/127\.0\.0\.1:3001\/api\//,async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.pathname.endsWith('/profile'))return route.fulfill({json:{weightKg:null}});
      if(request.method()==='PUT'){saved={...request.postDataJSON(),revision:saved.revision+1};}
      return route.fulfill({json:saved});
    });
    await page.goto('http://127.0.0.1:3001/');
    const planner=page.locator('.weekly-planner');
    await planner.locator('.planner-event--meal').first().waitFor({timeout:10000}).catch(async e=>{console.log('BODY',await page.locator('body').innerText());throw e;});
    await planner.locator('.planner-event--meal > button').first().click();
    assert.equal(await page.locator('.planner-meal-components > details').count(),3);
    await page.locator('.planner-meal-components summary').first().click();
    assert.match(await page.locator('.planner-meal-components').innerText(),/원문 100.0g 기준 → 제안량/);
    assert.equal(await page.locator('.planner-meal-components a').first().getAttribute('href'),'https://www.data.go.kr/data/15127578/openapi.do');
    await planner.locator('.planner-event--meal input').first().check();
    assert.match(await planner.locator('.planner-nutrition-cards > div').nth(2).innerText(),/1\s*\/ 3끼/);
    await planner.getByRole('button',{name:'확정하고 저장'}).click();
    await page.reload();
    await planner.locator('.planner-event--meal').first().waitFor();
    assert.equal(await planner.locator('.planner-event--meal input').first().isChecked(),true);
    await planner.locator('.planner-event--meal > button').first().click();
    assert.equal(await page.locator('.planner-meal-components > details').count(),3);
    await page.setViewportSize({width:390,height:844});
    await page.locator('.planner-detail').screenshot({path:'data-collection/wegovy/rag/cache/nutrition/composed-meal-mobile.png'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: real generated meal data renders 3 sources, scaled amounts, completion, mocked API persistence, mobile layout');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
