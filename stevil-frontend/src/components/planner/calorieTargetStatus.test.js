import test from 'node:test';
import assert from 'node:assert/strict';
import { calorieTargetStatus } from './plannerUtils.js';

const p={nutritionGoal:{confirmed:true,calories:3000,weightKg:70,proteinPerKg:1}};
const food=(kind,kcal)=>({kind,foodEvidence:{servingWeight:'500',nutrition:{INFO_ENG:String(kcal),INFO_PRO:String(kcal*.1/4),INFO_CAR:String(kcal*.65/4),INFO_FAT:String(kcal*.25/9)}}});
test('target status includes snacks and updates when removed',()=>{
    const meals=Array.from({length:3},()=>food('MEAL',900));
    assert.equal(calorieTargetStatus(p,[...meals,food('SNACK',300)]).state,'within');
    assert.equal(calorieTargetStatus(p,meals).state,'low');
    assert.match(calorieTargetStatus(p,meals).text,/300 kcal 부족/);
    assert.equal(calorieTargetStatus(p,[...meals,food('SNACK',500)]).state,'high');
});
test('missing evidence is unknown, missing meals and boundaries are visible',()=>{
    assert.equal(calorieTargetStatus(p,[food('MEAL',1000),{kind:'MEAL'}]).state,'unknown');
    assert.equal(calorieTargetStatus(p,[food('MEAL',1000)]).state,'missing');
    assert.equal(calorieTargetStatus(p,[...Array.from({length:3},()=>food('MEAL',900)),food('SNACK',150)]).state,'within');
    assert.equal(calorieTargetStatus(p,[...Array.from({length:3},()=>food('MEAL',900)),food('SNACK',450)]).state,'within');
});

test('an exact daily total does not hide a 1200 kcal meal',()=>{
    const result=calorieTargetStatus({nutritionGoal:{confirmed:true,calories:2500}},[food('MEAL',650),food('MEAL',650),food('MEAL',1200)]);
    assert.equal(result.state,'unbalanced');
});

test('daily calorie and meal balance cannot hide excess fat',()=>{
    const meals=Array.from({length:3},()=>food('MEAL',900));
    for(const meal of meals) meal.foodEvidence.nutrition={INFO_ENG:'900',INFO_PRO:'25',INFO_CAR:'65',INFO_FAT:'60'};
    assert.equal(calorieTargetStatus(p,[...meals,food('SNACK',300)]).state,'macro_unbalanced');
});
