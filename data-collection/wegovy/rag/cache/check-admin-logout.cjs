const {chromium}=require('C:/Users/human-01/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 for(const fail of [false,true]) {
  const page=await browser.newPage();let authenticated=true,calls=0;
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(!path.startsWith('/api/'))return route.continue();
   if(path==='/api/auth/logout'){
    calls++;if(!fail)authenticated=false;
    return route.fulfill({status:fail?503:204,body:''});
   }
   if(!authenticated)return route.fulfill({status:401,body:''});
   return route.fulfill({contentType:'application/json',body:JSON.stringify(path.endsWith('/me')?{id:1,email:'test@example.invalid',role:'ROLE_ADMIN'}:{totalUsers:1,newUsersToday:0,completedOnboardingUsers:1,adminUsers:1,totalInjectionLogs:0,totalExerciseLogs:0})});
  });
  await page.goto('http://127.0.0.1:3001/admin');
  await page.getByRole('button',{name:'로그아웃',exact:true}).click();
  if(fail){await page.getByRole('alert').waitFor();if(!page.url().endsWith('/admin'))throw Error('failure navigated away');}
  else {await page.waitForURL('http://127.0.0.1:3001/');if(await page.getByRole('button',{name:'로그아웃',exact:true}).count())throw Error('logout still visible');}
  if(calls!==1)throw Error(`expected 1 logout request, got ${calls}`);
  await page.close();
 }
 await browser.close();console.log('PASS: admin logout calls API once, success navigates, failure stays with an error');
})();
