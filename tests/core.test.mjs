import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {MODULE_ID, AlchemyError, validateKit, inventoryPlan, availableRecipes, productionPlan,
  classifyResult, memoryTarget, recordSuccess, progression, SerialQueue, localText, validExtraBonus} from "../scripts/core.mjs";
const demo=JSON.parse(await readFile(new URL("../examples/demo-kit.json",import.meta.url),"utf8"));
const recipe=demo.recipes[0];
const item=(id,kind,quantity,stableId,extra={})=>({id,system:{quantity,...extra},flags:{[MODULE_ID]:{kind,id:stableId,recipeId:stableId}}});
test("demonstration kit validates and keeps permanent identities across languages",()=>{
  assert.equal(validateKit(demo).recipes[0].id,"base:water-preservative");
  assert.notEqual(localText(recipe.name,"pt-BR"),localText(recipe.name,"en"));
});
test("invalid or repeated identities and dangling ingredients are rejected before import",()=>{
  for(const mutate of [k=>k.ingredients.push(k.ingredients[0]),k=>k.recipes[0].ingredients[0].id="not-installed",k=>k.recipes[0].product.id="missing",k=>k.recipes[0].complexity=6,k=>k.recipes[0].ingredients[0].quantity=-1]){
    const kit=structuredClone(demo);mutate(kit);assert.throws(()=>validateKit(kit),AlchemyError);
  }
});
test("unsafe JSON properties and executable item data are rejected",()=>{
  assert.throws(()=>validateKit(JSON.parse('{"formatVersion":1,"__proto__":{}}')),AlchemyError);
  const kit=structuredClone(demo);kit.products[0].item.effects=[{flags:{macro:"bad"}}];assert.throws(()=>validateKit(kit),AlchemyError);
});
test("a kit may reuse ingredients supplied by a different installed kit",()=>{
  const kit=structuredClone(demo);kit.ingredients=[];
  assert.equal(validateKit(kit,{ingredients:new Set(demo.ingredients.map(i=>i.id)),products:new Set()}).id,demo.id);
});
test("book illustrations accept local asset paths and reject external or traversing paths",()=>{
  const local=structuredClone(demo);local.recipes[0].bookImg="modules/example/assets/book.webp";
  assert.equal(validateKit(local).recipes[0].bookImg,local.recipes[0].bookImg);
  for(const path of ["https://example.com/book.png","data:image/png;base64,AA","modules/example/../book.png",17,null]){
    const bad=structuredClone(demo);bad.recipes[0].bookImg=path;assert.throws(()=>validateKit(bad),AlchemyError);
  }
});
test("inventory combines stacks and ingredients inside bags on the same actor",()=>{
  const stock=[item("a","ingredient",0.5,"salt",{container:"bag"}),item("b","ingredient",1.5,"salt"),item("c","ingredient",10,"wood")];
  const plan=inventoryPlan(stock,[{id:"salt",quantity:2}]);
  assert.equal(plan.complete,true);assert.equal(plan.updates.length,2);assert.deepEqual(plan.updates.map(i=>i.after),[0,0]);
  assert.equal(stock[0].system.quantity,0.5);
});
test("books and unrelated items never satisfy ingredient requirements",()=>{
  const plan=inventoryPlan([item("a","book",9,"salt"),item("b","product",8,"salt")],[{id:"salt",quantity:1}]);
  assert.equal(plan.complete,false);assert.equal(plan.rows[0].available,0);assert.equal(plan.updates.length,0);
});
test("missing materials report exact quantities; inventory is never mutated by a check",()=>{
  const stock=[item("a","ingredient",1,"salt")];const before=structuredClone(stock);
  const plan=inventoryPlan(stock,[{id:"salt",quantity:3}]);assert.deepEqual(plan.missing,[{id:"salt",needed:3,available:1}]);assert.deepEqual(stock,before);
});
test("a memorized recipe survives losing its book and does not reveal other recipes",()=>{
  const recipes=[{...recipe,id:"a"},{...recipe,id:"b"}];
  assert.deepEqual(availableRecipes(recipes,[],{recipes:{a:{memorized:true}}}).map(r=>r.id),["a"]);
  assert.equal(availableRecipes(recipes,[item("book","book",1,"b")],{} )[0].id,"b");
  assert.equal(availableRecipes(recipes,[item("empty","book",0,"b")],{}).length,0);
});
test("possession and study are independent of memorization",()=>{
  const r=availableRecipes([recipe],[item("b","book",1,recipe.id)],{recipes:{[recipe.id]:{studied:true,successes:1}}})[0];
  assert.equal(r.studied,true);assert.equal(r.memorized,false);assert.equal(r.hasBook,true);
});
test("all five complexities have the right base DC and duration",()=>{
  for(let c=1;c<=5;c++)assert.deepEqual(productionPlan({complexity:c}),{dc:[9,12,15,18,21][c-1],minutes:[1,10,60,120,240][c-1],rollMode:"normal"});
});
test("rush never falls below one minute and safe increases one time band",()=>{
  assert.equal(productionPlan({complexity:1},{pace:"fast"}).minutes,1);
  assert.equal(productionPlan({complexity:3},{pace:"fast"}).minutes,10);
  assert.equal(productionPlan({complexity:3},{pace:"safe"}).minutes,120);
  assert.equal(productionPlan({complexity:3},{pace:"fast"}).rollMode,"disadvantage");
});
test("custom recipe timing is respected and modified by the nearest time band",()=>{
  assert.equal(productionPlan({complexity:2,timeMinutes:30},{pace:"fast"}).minutes,10);
  assert.equal(productionPlan({complexity:2,timeMinutes:30},{pace:"safe"}).minutes,60);
});
test("safe C5 and heroic plus safe are rejected",()=>{
  assert.throws(()=>productionPlan({complexity:5},{pace:"safe"}),AlchemyError);
  assert.throws(()=>productionPlan({complexity:2},{pace:"safe",heroic:true}),AlchemyError);
});
test("advantage and disadvantage cancel without stacking condition penalties",()=>{
  assert.equal(productionPlan({complexity:3},{pace:"fast",advantage:true}).rollMode,"normal");
  assert.equal(productionPlan({complexity:3},{pace:"safe",disadvantage:true}).rollMode,"normal");
  assert.equal(productionPlan({complexity:3},{condition:2,heroic:true}).dc,19);
});
test("natural 1 stays critical despite total and tool proficiency",()=>{
  assert.equal(classifyResult(1,99,9,true).severity,"critical");
});
test("natural 20 succeeds even when its total is below the final DC",()=>{
  assert.equal(classifyResult(20,15,23).success,true);
});
test("failure margins and mitigation follow the book",()=>{
  assert.equal(classifyResult(2,8,9).severity,"mild");
  assert.equal(classifyResult(2,4,9).severity,"moderate");
  assert.equal(classifyResult(2,-1,9).severity,"severe");
  assert.equal(classifyResult(2,4,9,true).severity,"mild");
  assert.equal(classifyResult(2,-1,9,true).severity,"moderate");
});
test("memorization uses permanent INT and one proficiency bonus with a minimum of one",()=>{
  assert.equal(memoryTarget(3,3,2,true),7);
  assert.equal(memoryTarget(1,4,3,true),1);
  assert.equal(memoryTarget(2,2,3,false),6);
});
test("heroic memorization counts twice but distinct progression counts once",()=>{
  const next=recordSuccess({level:1,recipes:{}},recipe,2,{heroicMemory:true});
  assert.equal(next.recipes[recipe.id].memorized,true);assert.equal(next.recipes[recipe.id].successes,2);
  assert.equal(progression(next)[1],1);
  assert.equal(progression(recordSuccess(next,recipe,2))[1],1);
});
test("requests on the same actor are serialized; one failure does not poison the queue",async()=>{
  const q=new SerialQueue(),events=[];
  const a=q.run("actor",async()=>{events.push("a");await new Promise(r=>setTimeout(r,3));events.push("b");throw Error("test");});
  const b=q.run("actor",async()=>events.push("c"));await Promise.allSettled([a,b]);assert.deepEqual(events,["a","b","c"]);
});
test("additional bonus formulas allow bounded dice arithmetic and reject runaway dice",()=>{
  for(const valid of ["","1d4","2 + 1d6","(@abilities.int.mod + 2)","-1"])assert.equal(validExtraBonus(valid),true,valid);
  for(const invalid of ["1d1r1","999999999d6","1d999999","1d6!","Math.random()", "(((((((((1)))))))))"] )assert.equal(validExtraBonus(invalid),false,invalid);
});
test("malformed localized names and negative prices fail kit validation",()=>{
  for(const mutate of [k=>k.recipes[0].name.en={},k=>k.ingredients[0].price=-1,k=>k.recipes[0].failures={wrong:{text:"invalid"}}]){
    const bad=structuredClone(demo);mutate(bad);assert.throws(()=>validateKit(bad),AlchemyError);
  }
  assert.equal(localText({en:"", "pt-BR":"Texto"},"en"),"Texto");
});
