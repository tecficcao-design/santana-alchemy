import test,{beforeEach} from "node:test";
import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";
import {MODULE_ID,validateKit} from "../scripts/core.mjs";
import {KitManager} from "../scripts/kits.mjs";
import {ensureFolders,ensureMacros,worldIndex,toActorItem,toolInfo} from "../scripts/foundry-adapter.mjs";
import {request,initializeService} from "../scripts/service.mjs";
import {openAlchemy} from "../scripts/ui.mjs";

const kit=JSON.parse(await readFile(new URL("../examples/demo-kit.json",import.meta.url),"utf8"));
const legacyKit=JSON.parse(await readFile(new URL("fixtures/demo-kit-1.0.0.json",import.meta.url),"utf8"));
const fiveFormulaKit=JSON.parse(await readFile(new URL("fixtures/demo-kit-1.1.0.json",import.meta.url),"utf8"));
const labels=JSON.parse(await readFile(new URL("../lang/en.json",import.meta.url),"utf8")).SAA;
let sequence=0,handlers;
const copy=x=>structuredClone(x);
function collection(items=[]){const arr=[...items];arr.get=id=>arr.find(x=>x.id===id);Object.defineProperty(arr,"contents",{get:()=>arr});return arr;}
function get(object,path){return path.split(".").reduce((x,k)=>x?.[k],object);}
function set(object,path,value){const keys=path.split(".");const last=keys.pop();let node=object;for(const k of keys)node=node[k]??={};node[last]=copy(value);}
class Doc{
  constructor(data,type){Object.assign(this,copy(data));this.id=data._id??`id${++sequence}`;this._id=this.id;this.documentName=type;this.flags??={};this._source=copy(data);}
  get uuid(){return `${this.documentName}.${this.id}`;}
  getFlag(scope,key){return get(this.flags[scope],key);}
  async setFlag(scope,key,value){this.flags[scope]??={};set(this.flags[scope],key,value);return this;}
  async update(changes){for(const [key,value]of Object.entries(changes)){if(key.includes("."))set(this,key,value);else this[key]=copy(value);}return this;}
  toObject(){const data={};for(const key of ["name","type","img","system","flags","folder","ownership"])if(this[key]!==undefined)data[key]=copy(this[key]);data._id=this.id;return data;}
}
class Actor extends Doc{
  constructor(){super({name:"Test Alchemist",system:{abilities:{int:{mod:3,value:16}},attributes:{prof:2},tools:{alchemist:{value:1}}}},"Actor");this.items=collection();this.allowed=new Set(["owner"]);this.isOwner=true;}
  testUserPermission(user){return this.allowed.has(user.id);}
  getRollData(){return {};}
  async updateEmbeddedDocuments(type,changes){for(const update of changes){const item=this.items.get(update._id);if(!item)throw Error("missing embedded item");await item.update(update);}return changes;}
  async createEmbeddedDocuments(type,data){const docs=data.map(d=>new Doc(d,"Item"));this.items.push(...docs);return docs;}
  async deleteEmbeddedDocuments(type,ids){for(const id of ids){const n=this.items.findIndex(d=>d.id===id);if(n>=0)this.items.splice(n,1);}}
}
function documentClass(type,target){return class{static async create(data){const doc=new Doc(data,type);if(type==="JournalEntry")doc.pages=collection((data.pages??[]).map(p=>new Doc(p,"JournalEntryPage")));game[target].push(doc);return doc;}};}
beforeEach(()=>{
  sequence=0;handlers=new Map();
  globalThis.Hooks={callAll:()=>{},on:(name,fn)=>{const list=handlers.get(name)??[];list.push(fn);handlers.set(name,list);return list.length;},off:()=>{}};
  const settings=new Map([["contentLanguage","en"],["installedKits",{}]]);
  const gm={id:"gm",isGM:true,active:true},owner={id:"owner",isGM:false,active:true},attacker={id:"attacker",isGM:false,active:true};
  globalThis.game={user:gm,users:collection([gm,owner,attacker]),items:collection(),journal:collection(),folders:collection(),macros:collection(),actors:collection(),modules:collection(),
    settings:{get:(scope,key)=>settings.get(key),set:async(scope,key,val)=>settings.set(key,copy(val))},
    i18n:{lang:"en",localize:key=>typeof key==="string"?key:"BAD LABEL",format:(key,data={})=>(labels[key.replace("SAA.","")]??key).replace(/\{([^}]+)\}/g,(_,k)=>data[k]??`{${k}}`)}};
  globalThis.CONFIG={DND5E:{tools:{alchemist:{label:"Alchemist's Supplies"},brewer:"Brewer's Supplies"}}};
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{NONE:0,OBSERVER:2,OWNER:3},CHAT_MESSAGE_STYLES:{ROLL:5}};
  globalThis.document={createElement:()=>({innerHTML:"",content:{querySelectorAll:()=>[]}})};
  globalThis.Folder=documentClass("Folder","folders");globalThis.Item=documentClass("Item","items");globalThis.JournalEntry=documentClass("JournalEntry","journal");globalThis.Macro=documentClass("Macro","macros");
  globalThis.ui={notifications:{warn:()=>{},error:()=>{},info:()=>{}}};
  globalThis.foundry={utils:{randomID:()=>`random${++sequence}`}};
  globalThis.fromUuid=async uuid=>game.actors.find(a=>a.uuid===uuid);
  globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),create:async data=>new Doc(data,"ChatMessage")};
  globalThis.Roll=class{
    static natural=15;static throws=false;static validate=()=>true;
    constructor(formula){this.formula=formula;Roll.lastFormula=formula;}
    async evaluate(){if(Roll.throws)throw Error("dice unavailable");this.total=Roll.natural+5;this.dice=[{faces:20,results:[{active:true,result:Roll.natural}]}];return this;}
  };
});
async function populated(){
  const manager=new KitManager();manager.register(kit);await manager.install(kit.id);
  const actor=new Actor();game.actors.push(actor);const index=worldIndex();
  const inventory=[...index.ingredient.values(),...index.book.values()].map(doc=>toActorItem(doc));
  inventory.push({name:"Alchemist's Supplies",type:"tool",system:{quantity:1,type:{baseItem:"alchemist",value:"art"}}});
  await actor.createEmbeddedDocuments("Item",inventory);
  return {manager,actor,index};
}
test("the public demo is twelve bilingual C1–C3 formulas with complete local ingredients and art",async()=>{
  validateKit(kit);
  assert.equal(kit.id,legacyKit.id);assert.equal(kit.version,"1.2.1");
  assert.deepEqual(new Set(kit.recipes.map(r=>r.id)),new Set([
    "base:water-preservative","base:rustic-antiseptic","base:unstable-fire","base:distracting-smoke","base:revealing-ink",
    "base:bottled-light","base:lesser-healing-potion","base:alchemical-adhesive","base:chemical-alarm-powder",
    "base:wayfinding-serum","base:restrictive-resin-flask","base:leaping-elixir"
  ]));
  assert.equal(kit.ingredients.length,24);assert.equal(kit.products.length,12);
  assert.deepEqual(new Set(kit.ingredients.map(i=>i.id)),new Set(kit.recipes.flatMap(r=>r.ingredients.map(i=>i.id))));
  assert.deepEqual(new Set(kit.products.map(p=>p.id)),new Set(kit.recipes.map(r=>r.product.id)));
  const tiers = [
    {tier:1, count:5, dc:9, minutes:1, bookPrice:25},
    {tier:2, count:5, dc:12, minutes:10, bookPrice:100},
    {tier:3, count:2, dc:15, minutes:60, bookPrice:500}
  ];
  for (const {tier, count, dc, minutes, bookPrice} of tiers) {
    const recipes = kit.recipes.filter(recipe => recipe.complexity === tier);
    assert.equal(recipes.length, count);
    for (const recipe of recipes) {
      assert.equal(recipe.dc, dc);
      assert.equal(recipe.timeMinutes, minutes);
      assert.equal(recipe.bookPrice, bookPrice);
      assert.equal(recipe.product.quantity, 1);
    }
  }
  for(const entry of [...kit.ingredients,...kit.products,...kit.recipes]){
    for(const language of ["en","pt-BR"]){
      assert.ok(entry.name[language]?.trim());assert.ok(entry.description[language]?.length>80);
    }
    for(const path of [entry.img,entry.bookImg].filter(Boolean)){
      assert.ok(path.startsWith("modules/santana-alchemy/"));
      await access(new URL("../"+path.replace("modules/santana-alchemy/",""),import.meta.url));
    }
  }
});
test("0.1.7 templates receive distinct C2 and C3 artwork when the GM updates the demo", async () => {
  const oldKit = copy(kit);
  oldKit.version = "1.2.0";
  const advancedRecipes = kit.recipes.filter(recipe => recipe.complexity > 1);
  const productIds = new Set(advancedRecipes.map(recipe => recipe.product.id));
  const ingredientIds = new Set(advancedRecipes.flatMap(recipe => recipe.ingredients.map(entry => entry.id)));
  for (const recipe of oldKit.recipes.filter(recipe => recipe.complexity > 1)) {
    delete recipe.img;
    delete recipe.bookImg;
  }
  for (const product of oldKit.products.filter(product => productIds.has(product.id))) {
    product.img = "modules/santana-alchemy/assets/flask.svg";
  }
  for (const ingredient of oldKit.ingredients.filter(ingredient => ingredientIds.has(ingredient.id))) {
    ingredient.img = "modules/santana-alchemy/assets/ingredient.svg";
  }
  const manager = new KitManager();
  manager.register(oldKit);
  await manager.install(oldKit.id);
  const originals = worldIndex();
  manager.register(kit);
  const upgrade = await manager.install(kit.id, {update:true});
  assert.deepEqual(upgrade, {created:0, reused:0, updated:60});
  const updated = worldIndex();
  const icons = new Set();
  for (const ingredient of kit.ingredients.filter(entry => ingredientIds.has(entry.id))) {
    const template = updated.ingredient.get(ingredient.id);
    assert.equal(template.id, originals.ingredient.get(ingredient.id).id);
    assert.equal(template.img, ingredient.img);
    icons.add(template.img);
  }
  for (const recipe of advancedRecipes) {
    const book = updated.book.get(recipe.id);
    const journal = updated.recipe.get(recipe.id);
    const product = updated.product.get(recipe.product.id);
    assert.equal(book.id, originals.book.get(recipe.id).id);
    assert.equal(book.img, recipe.bookImg);
    assert.equal(book.flags[MODULE_ID].cover, recipe.complexity === 2 ? "green" : "blue");
    assert.equal(product.img, recipe.img);
    assert.ok(book.system.description.value.includes(`src="${product.img}"`));
    assert.ok(journal.pages[0].text.content.includes(`src="${product.img}"`));
    icons.add(book.img);
    icons.add(product.img);
  }
  assert.equal(icons.size, 28);
  for (const icon of icons) assert.match(icon, /^modules\/santana-alchemy\/assets\/demo\/(books|ingredients|products)\/.+\.svg$/);
});

for (const previous of [legacyKit, fiveFormulaKit]) {
  test(`upgrading kit ${previous.version} preserves documents, inventory and character progress`, async () => {
    const manager=new KitManager();manager.register(previous);await manager.install(previous.id);
    const before=worldIndex();
    const actor=new Actor();game.actors.push(actor);
    await actor.createEmbeddedDocuments("Item",[...before.ingredient.values(),...before.book.values()].map(d=>toActorItem(d)));
    await actor.setFlag(MODULE_ID,"state",{level:1,recipes:{"base:water-preservative":{studied:true,successes:2,memorized:true}}});
    const snapshot=JSON.stringify({items:actor.items.map(i=>i.toObject()),state:actor.getFlag(MODULE_ID,"state")});
    manager.register(kit);const upgraded=await manager.install(kit.id,{update:true});
    const previousDocuments = previous.ingredients.length + 3 * previous.recipes.length;
    assert.equal(upgraded.created,60 - previousDocuments);assert.equal(upgraded.updated,previousDocuments);
    const after=worldIndex();
    for(const kind of ["ingredient","product","book","recipe"])for(const [id,doc]of before[kind])assert.equal(after[kind].get(id).id,doc.id);
    assert.equal(after.ingredient.size,24);assert.equal(after.product.size,12);assert.equal(after.book.size,12);assert.equal(after.recipe.size,12);
    assert.equal(JSON.stringify({items:actor.items.map(i=>i.toObject()),state:actor.getFlag(MODULE_ID,"state")}),snapshot);
    const repeat=await manager.install(kit.id);assert.equal(repeat.created,0);assert.equal(repeat.reused,60);
  });
}
for(const language of ["en","pt-BR"])for(const recipe of kit.recipes){
  test(`${language}: ${recipe.name.en} can be studied and crafted using only its book and required ingredients`,async()=>{
    await game.settings.set(MODULE_ID,"contentLanguage",language);game.i18n.lang=language;
    const manager=new KitManager();manager.register(kit);await manager.install(kit.id);const index=worldIndex();
    const actor=new Actor();game.actors.push(actor);
    await actor.createEmbeddedDocuments("Item",[
      toActorItem(index.book.get(recipe.id)),
      ...recipe.ingredients.map(i=>toActorItem(index.ingredient.get(i.id),i.quantity)),
      {name:"Tools",type:"tool",system:{quantity:1,type:{baseItem:"alchemist"}}}
    ]);
    await request("configure",actor,{level:recipe.complexity});
    const args={recipeId:recipe.id,tool:"alchemist",timeAcknowledged:true};
    await request("study",actor,args);const result=await request("craft",actor,args);
    assert.equal(result.success,true);assert.equal(result.quantity,1);assert.equal(result.recipeId,recipe.id);
    assert.equal(index.recipe.get(recipe.id).name,recipe.name[language]);
    const product=actor.items.find(i=>i.flags?.[MODULE_ID]?.crafted);
    assert.equal(product.flags[MODULE_ID].id,recipe.product.id);
    assert.equal(product.img,recipe.img);
    assert.equal(product.name,kit.products.find(p=>p.id===recipe.product.id).name[language]);
    assert.ok(actor.items.filter(i=>i.flags?.[MODULE_ID]?.kind==="ingredient").every(i=>i.system.quantity===0));
    assert.equal(actor.items.find(i=>i.flags?.[MODULE_ID]?.kind==="book").system.quantity,1);
    await assert.rejects(request("craft",actor,args),{code:"ingredientsMissing"});
  });
}
test("the free kit supports progress from C1 to crafting C3 through GM confirmation", async () => {
  const {actor,index} = await populated();
  const recipesAt = tier => kit.recipes.filter(recipe => recipe.complexity === tier);
  async function make(recipe) {
    for (const material of recipe.ingredients) {
      await actor.createEmbeddedDocuments("Item", [toActorItem(index.ingredient.get(material.id), material.quantity)]);
    }
    const args = {recipeId:recipe.id, tool:"alchemist", timeAcknowledged:true};
    await request("study", actor, args);
    assert.equal((await request("craft", actor, args)).success, true);
  }
  for (const recipe of recipesAt(1).slice(0, 3)) await make(recipe);
  assert.equal((await request("catalog", actor)).progress[1], 3);
  await request("configure", actor, {level:2});
  const fundamental = recipesAt(2);
  for (const recipe of fundamental.slice(0, 4)) await make(recipe);
  await make(fundamental[0]);
  assert.equal((await request("catalog", actor)).progress[2], 4);
  await make(fundamental[4]);
  const catalog = await request("catalog", actor);
  assert.equal(catalog.progress[2], 5);
  assert.equal(catalog.state.level, 2);
  const advanced = recipesAt(3)[0];
  const args = {recipeId:advanced.id, tool:"alchemist", timeAcknowledged:true};
  await request("study", actor, args);
  await assert.rejects(request("craft", actor, args), {code:"levelRequired"});
  await request("configure", actor, {level:3});
  await make(advanced);
  assert.equal((await request("catalog", actor)).progress[3], 1);
});
for(const [recipeId,tool]of [["base:water-preservative","brewer"],["base:rustic-antiseptic","herb"],["base:revealing-ink","painter"]]){
  test(`${recipeId} accepts its approved alternative tool ${tool}`,async()=>{
    const {actor}=await populated();
    actor.items=collection(actor.items.filter(i=>i.type!=="tool"));
    actor.system.tools={[tool]:{value:1}};
    await actor.createEmbeddedDocuments("Item",[{name:tool,type:"tool",system:{quantity:1,type:{baseItem:tool}}}]);
    const args={recipeId,tool,timeAcknowledged:true};
    await request("study",actor,args);assert.equal((await request("craft",actor,args)).success,true);
  });
}
test("setup and repeated kit installation reuse folders, macros, ingredients and recipe books",async()=>{
  const {manager}=await populated();const before={folders:game.folders.length,items:game.items.length,journal:game.journal.length,macros:game.macros.length};
  const result=await manager.install(kit.id);await ensureMacros(await ensureFolders());
  assert.deepEqual({folders:game.folders.length,items:game.items.length,journal:game.journal.length,macros:game.macros.length},before);
  assert.equal(result.created,0);assert.equal(result.reused,60);assert.equal(game.folders.length,5);assert.equal(game.macros.length,2);
});
test("world recipes are journals and never stockable recipe items",async()=>{
  await populated();assert.equal(game.journal.length,12);assert.equal(game.items.filter(i=>i.flags[MODULE_ID].kind==="recipe").length,0);
  assert.equal(worldIndex().book.size,12);
});
test("content kits may specify physical book prices and preserve ingredient metadata",async()=>{
  const priced=copy(kit);priced.recipes[0].bookPrice=25;priced.ingredients[0].metadata={foragingDC:11,biomes:["Desert"]};
  const manager=new KitManager();manager.register(priced);await manager.install(priced.id);
  assert.equal([...worldIndex().book.values()][0].system.price.value,25);
  assert.deepEqual(worldIndex().ingredient.get(priced.ingredients[0].id).flags[MODULE_ID].metadata,{foragingDC:11,biomes:["Desert"]});
});
test("illustrated kits import a distinct book cover and show the recipe image in its journal",async()=>{
  const illustrated=copy(kit);const recipe=illustrated.recipes[0];
  recipe.bookImg="modules/example/assets/book.webp";recipe.img="modules/example/assets/product.webp";
  const manager=new KitManager();manager.register(illustrated);await manager.install(illustrated.id);
  assert.equal(worldIndex().book.get(recipe.id).img,recipe.bookImg);
  assert.ok(worldIndex().recipe.get(recipe.id).pages[0].text.content.includes(`src="${recipe.img}"`));
  assert.ok(worldIndex().book.get(recipe.id).system.description.value.includes(`src="${recipe.img}"`));
  const repeat=await manager.install(illustrated.id,{update:true});assert.equal(repeat.created,0);
  assert.equal((worldIndex().recipe.get(recipe.id).pages[0].text.content.match(/<figure>/g)??[]).length,1);
});
test("catalog access does not grant formula access without a book or memory",async()=>{
  const {actor}=await populated();actor.items=collection(actor.items.filter(i=>i.flags?.[MODULE_ID]?.kind!=="book"));
  assert.equal((await request("catalog",actor)).recipes.length,0);
});
test("studying, crafting, consuming ingredients and memorizing form a complete flow",async()=>{
  const {actor}=await populated();const id=kit.recipes[0].id;
  await request("study",actor,{recipeId:id,timeAcknowledged:true});
  const result=await request("craft",actor,{recipeId:id,tool:"alchemist",timeAcknowledged:true});
  assert.equal(result.success,true);assert.equal(result.memorized,true);
  const spent=new Set(kit.recipes[0].ingredients.map(i=>i.id));
  const ingredients=actor.items.filter(i=>i.flags?.[MODULE_ID]?.kind==="ingredient");
  for(const item of ingredients)assert.equal(item.system.quantity,spent.has(item.flags[MODULE_ID].id)?0:1);
  assert.equal(actor.items.find(i=>i.flags?.[MODULE_ID]?.kind==="book").system.quantity,1);
  assert.equal(actor.items.filter(i=>i.flags?.[MODULE_ID]?.crafted).length,1);
  actor.items=collection(actor.items.filter(i=>i.flags?.[MODULE_ID]?.kind!=="book"));
  assert.equal((await request("catalog",actor)).recipes[0].memorized,true);
});
test("no study, missing tool or inadequate level rejects a craft without spending stock",async()=>{
  const {actor}=await populated();const id=kit.recipes[0].id;
  await assert.rejects(request("craft",actor,{recipeId:id,tool:"alchemist",timeAcknowledged:true}),{code:"notStudied"});
  await request("study",actor,{recipeId:id,timeAcknowledged:true});actor.items.find(i=>i.type==="tool").system.quantity=0;
  await assert.rejects(request("craft",actor,{recipeId:id,tool:"alchemist",timeAcknowledged:true}),{code:"toolMissing"});
  assert.ok(actor.items.filter(i=>i.flags?.[MODULE_ID]?.kind==="ingredient").every(i=>i.system.quantity===1));
});
test("two simultaneous requests cannot spend the same single set of ingredients",async()=>{
  const {actor}=await populated();const payload={recipeId:kit.recipes[0].id,tool:"alchemist",timeAcknowledged:true};
  await request("study",actor,payload);
  const results=await Promise.allSettled([request("craft",actor,payload),request("craft",actor,payload)]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(results.filter(r=>r.status==="rejected")[0].reason.code,"ingredientsMissing");
  assert.equal(actor.items.filter(i=>i.flags?.[MODULE_ID]?.crafted).length,1);
});
test("native dice exceptions do not cost the character any ingredients",async()=>{
  const {actor}=await populated(),payload={recipeId:kit.recipes[0].id,tool:"alchemist",timeAcknowledged:true};
  await request("study",actor,payload);Roll.throws=true;
  await assert.rejects(request("craft",actor,payload),/dice unavailable/);
  assert.ok(actor.items.filter(i=>i.flags?.[MODULE_ID]?.kind==="ingredient").every(i=>i.system.quantity===1));assert.equal(actor.getFlag(MODULE_ID,"pending"),null);
});
test("natural one consumes stock and never records a successful recipe",async()=>{
  const {actor}=await populated(),payload={recipeId:kit.recipes[0].id,tool:"alchemist",timeAcknowledged:true};
  await request("study",actor,payload);Roll.natural=1;
  const result=await request("craft",actor,payload);assert.equal(result.severity,"critical");assert.equal(result.success,false);
  assert.equal(actor.getFlag(MODULE_ID,"state").recipes[payload.recipeId].successes,0);assert.equal(actor.items.filter(i=>i.flags?.[MODULE_ID]?.crafted).length,0);
});
test("tool proficiency comes from the actor, with typed tool presence and explicit GM overrides",async()=>{
  const {actor}=await populated();assert.equal(toolInfo(actor,"alchemist").proficient,true);assert.equal(toolInfo(actor,"alchemist").present,true);
  await request("configure",actor,{level:1,memoryInt:null,tools:{alchemist:{enabled:true,available:true,proficiency:0}}});
  assert.equal(toolInfo(actor,"alchemist").proficient,false);
});
test("dnd5e 6 crafting includes each global, Intelligence and tool bonus once",async()=>{
  const {actor}=await populated();
  actor.system.rolls={ability:{check:{bonus:"2"},tool:{bonus:"2"}}};
  actor.system.abilities.int.check={roll:{bonus:"1d4"}};
  actor.system.tools.alchemist.roll={bonus:"@prof"};
  const payload={recipeId:kit.recipes[0].id,tool:"alchemist",timeAcknowledged:true,bonus:"1"};
  await request("study",actor,payload);await request("craft",actor,payload);
  // These are independent +2 bonuses: both belong in the actual native Roll formula.
  assert.equal(Roll.lastFormula,"1d20 + 3 + 2 + (2) + (2) + (1d4) + (@prof) + (1)");
});
test("dnd5e 5 crafting preserves legacy global, Intelligence and tool bonuses",async()=>{
  const {actor}=await populated();
  actor.system.bonuses={abilities:{check:"2"}};
  actor.system.abilities.int.bonuses={check:"3"};
  actor.system.tools.alchemist.bonuses={check:"4"};
  const payload={recipeId:kit.recipes[0].id,tool:"alchemist",timeAcknowledged:true};
  await request("study",actor,payload);await request("craft",actor,payload);
  assert.equal(Roll.lastFormula,"1d20 + 3 + 2 + (2) + (3) + (4)");
});
test("modern bonus fields override migrated legacy aliases including intentionally blank values",async()=>{
  const {actor}=await populated();
  actor.system.rolls={ability:{check:{bonus:""},tool:{bonus:"2"}}};
  actor.system.bonuses={abilities:{check:"100"}};
  actor.system.abilities.int.check={roll:{bonus:"3"}};
  actor.system.abilities.int.bonuses={check:"3"};
  actor.system.tools.alchemist.roll={bonus:""};
  actor.system.tools.alchemist.bonuses={check:"100"};
  const payload={recipeId:kit.recipes[0].id,tool:"alchemist",timeAcknowledged:true};
  await request("study",actor,payload);await request("craft",actor,payload);
  assert.equal(Roll.lastFormula,"1d20 + 3 + 2 + (2) + (3)");
});
test("a forged request claiming GM authority still uses the authenticated hook user",async t=>{
  t.mock.method(console,"error",()=>{});
  const {actor}=await populated();initializeService();
  const message=new Doc({flags:{[MODULE_ID]:{request:{v:1,op:"configure",actorUuid:actor.uuid,userId:"gm",payload:{level:5}}}}},"ChatMessage");
  for(const listener of handlers.get("createChatMessage"))listener(message,{},"attacker");
  await new Promise(r=>setTimeout(r,10));
  assert.equal(message.getFlag(MODULE_ID,"request.response").code,"notOwner");assert.notEqual(actor.getFlag(MODULE_ID,"state")?.level,5);
});
test("an owner may not elevate level through a crafted private request",async t=>{
  t.mock.method(console,"error",()=>{});
  const {actor}=await populated();initializeService();
  const message=new Doc({flags:{[MODULE_ID]:{request:{v:1,op:"configure",actorUuid:actor.uuid,payload:{level:5}}}}},"ChatMessage");
  for(const listener of handlers.get("createChatMessage"))listener(message,{},"owner");
  await new Promise(r=>setTimeout(r,10));assert.equal(message.getFlag(MODULE_ID,"request.response").code,"gmOnly");
});
test("the workshop dialog flow reaches study, ingredient review, confirmation and crafted output",async()=>{
  const {actor}=await populated(),id=kit.recipes[0].id;
  const actions=["books","books",null],forms=[{recipe:id},{timeAcknowledged:true},{recipe:id},
    {tool:"alchemist",pace:"normal",condition:0,bonus:"",heroicBenefit:"memory"},{timeAcknowledged:true}];
  const rendered=[];
  foundry.applications={api:{DialogV2:{wait:async opts=>{rendered.push(opts.content);return actions.shift();},
    input:async opts=>{rendered.push(opts.content);return forms.shift();},prompt:async opts=>{rendered.push(opts.content);return null;}}}};
  await openAlchemy(actor);
  assert.equal(forms.length,0);assert.equal(actions.length,0);
  assert.ok(rendered.some(html=>html.includes('name="timeAcknowledged"')));
  assert.ok(rendered.some(html=>html.includes("Salt Beetle")&&html.includes("Required")));
  assert.equal(actor.items.filter(i=>i.flags?.[MODULE_ID]?.crafted).length,1);
});
