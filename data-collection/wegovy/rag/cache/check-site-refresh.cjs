const {chromium}=require('C:/Users/human-01/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Synthetic responses are limited to this local visual test browser.
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith("/api/")) return route.continue();
  let data=[];
  if(path.endsWith('/users/me'))data={id:1,nickname:'디자인 테스트',role:'ROLE_ADMIN',onboardingCompleted:true,weight:78,targetWeight:72};
  if(path.endsWith('/community'))data={content:[],totalPages:0};
  if(path.endsWith('/admin/dashboard'))data={totalUsers:24,newUsersToday:2,completedOnboardingUsers:18,adminUsers:1,totalInjectionLogs:35,totalExerciseLogs:48};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 const results=[];
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/login','/weight','/exercise','/diary','/community','/onboarding','/partnership','/admin']){
   await page.goto('http://127.0.0.1:3001'+path);await page.locator("h1").first().waitFor(); await page.waitForTimeout(350);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   results.push({width,path,overflow});
   await page.screenshot({path:`C:/Users/human-01/Desktop/stevil/data-collection/wegovy/rag/cache/site-${width}-${path.replaceAll('/','')||'home'}.png`});
  }
 }
 console.log(JSON.stringify({results,errors}));await browser.close();
 if(errors.length||results.some(x=>x.overflow))process.exitCode=1;
})();
