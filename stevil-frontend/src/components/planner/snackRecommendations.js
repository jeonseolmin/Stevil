import { dayNutrition, busyAllows } from './plannerUtils.js';

const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3,5));
const time = value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;

export function snackRecommendations(preferences, date, events, catalog) {
    const goal=preferences.nutritionGoal;
    if(!goal?.confirmed || preferences.allergies?.trim() && !['없음','없어요','해당 없음'].includes(preferences.allergies.trim()) || preferences.limitations?.trim()) return null;
    const dayEvents=events.filter(e=>e.start.slice(0,10)===date);
    const meals=dayEvents.filter(e=>e.kind==='MEAL').sort((a,b)=>a.start.localeCompare(b.start));
    const totals=dayNutrition(dayEvents);
    if(meals.length!==3 || totals.partial || !totals.available || dayEvents.filter(e=>e.kind==='SNACK').length>=2) return null;
    const gap=Math.max(0,Math.round((goal.weightKg*goal.proteinPerKg-totals.protein)*10)/10);
    const calorieGap=Math.max(0,Math.round(goal.calories-totals.calories));
    if(gap<1 && calorieGap<=goal.calories*.05) return null;
    const remaining=goal.calories-totals.calories;
    const weekday=(new Date(`${date}T12:00:00`).getDay()+6)%7;
    const occupied=[...dayEvents.map(e=>[minutes(e.start.slice(11)),minutes(e.end.slice(11))]),
        ...preferences.busySlots.filter(s=>s.day===weekday && !busyAllows(s,'SNACK')).map(s=>[minutes(s.start),minutes(s.end)])];
    let start=null;
    // Prefer the lunch/dinner gap. Keep a 30-minute margin from meals and a 10-minute slot.
    for(const i of [1,0]) {
        if(dayEvents.some(e=>e.kind==='SNACK' && e.start>=meals[i].end && e.start<meals[i+1].start)) continue;
        const low=Math.max(minutes(meals[i].end.slice(11))+30,minutes(preferences.wakeTime));
        const high=Math.min(minutes(meals[i+1].start.slice(11))-30,minutes(preferences.sleepTime))-10;
        const candidates=[];
        for(let t=Math.ceil(low/5)*5;t<=high;t+=5) candidates.push(t);
        start=candidates.sort((a,b)=>Math.abs(a-(low+high)/2)-Math.abs(b-(low+high)/2)).find(t=>occupied.every(([a,b])=>t+10<=a || t>=b));
        if(start!==undefined) break;
    }
    if(start===undefined || start===null) return {gap,calorieGap,reason:'식사 사이에 여유 시간이 없어 간식을 배치하지 않았어요.',candidates:[]};
    const types=new Set();
    const candidates=catalog.filter(c=>{
        const n=dayNutrition([{kind:'SNACK',foodEvidence:c.foodEvidence}]);
        return n.available===1 && n.calories<=remaining && n.protein>0;
    }).sort((a,b)=>Math.abs(Number(a.foodEvidence.nutrition.INFO_PRO)-gap)-Math.abs(Number(b.foodEvidence.nutrition.INFO_PRO)-gap))
        .filter(c=>types.has(c.category)?false:(types.add(c.category),true)).slice(0,3);
    return {gap,calorieGap,start:`${date}T${time(start)}`,end:`${date}T${time(start+10)}`,candidates,
        reason:candidates.length?'': '현재 목표 열량 안에 추가할 수 있는 간식 후보가 없어요. 식사 구성을 조정해 주세요.'};
}
