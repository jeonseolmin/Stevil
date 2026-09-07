import test from 'node:test';
import assert from 'node:assert/strict';
import { snackRecommendations } from './snackRecommendations.js';
import { dayNutrition, defaults, validatePlan } from './plannerUtils.js';

const date='2026-09-07';
const p={...defaults(date),nutritionGoal:{weightKg:70,proteinPerKg:1,calories:1800,confirmed:true}};
const evidence=(kcal,protein)=>({servingWeight:'300',nutrition:{INFO_ENG:String(kcal),INFO_PRO:String(protein),INFO_CAR:String((kcal-protein*4-90)/4),INFO_FAT:'10'}});
const meals=[8,12,18].map((hour,i)=>({id:String(i),kind:'MEAL',title:'식사',start:`${date}T${hour.toString().padStart(2,'0')}:00`,end:`${date}T${hour.toString().padStart(2,'0')}:30`,foodEvidence:evidence(400,15)}));
const catalog=[{id:'snack',category:'egg',title:'계란',foodEvidence:evidence(150,10)}];

test('suggestions do not count until selected, and selected snack fills a free meal gap',()=>{
    const before=dayNutrition(meals);
    const offer=snackRecommendations(p,date,meals,catalog);
    assert.equal(offer.gap,25);assert.equal(offer.candidates.length,1);
    assert.deepEqual(dayNutrition(meals),before);
    const snack={id:'added',kind:'SNACK',title:'계란',start:offer.start,end:offer.end,foodEvidence:catalog[0].foodEvidence};
    assert.equal(validatePlan(p,[...meals,snack]),'');
    assert.equal(dayNutrition([...meals,snack]).protein,55);
    assert.equal(snackRecommendations(p,date,[...meals,snack],catalog),null);
});
test('does not invent a deficit or override calorie/availability constraints',()=>{
    assert.equal(snackRecommendations({...p,nutritionGoal:null},date,meals,catalog),null);
    assert.equal(snackRecommendations({...p,allergies:'계란'},date,meals,catalog),null);
    assert.equal(snackRecommendations(p,date,meals.map(e=>({...e,foodEvidence:null})),catalog),null);
    assert.equal(snackRecommendations({...p,nutritionGoal:{...p.nutritionGoal,calories:1200}},date,meals,catalog).candidates.length,0);
    const blocked={...p,busySlots:[{day:0,start:'08:30',end:'18:00',title:'일정'}]};
    assert.equal(snackRecommendations(blocked,date,meals,catalog).candidates.length,0);
    assert.equal(snackRecommendations(p,date,meals.map(e=>({...e,foodEvidence:evidence(400,25)})),catalog),null);
});
