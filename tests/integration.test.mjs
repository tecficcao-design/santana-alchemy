import test,{beforeEach} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {MODULE_ID} from "../scripts/core.mjs";
import {KitManager} from "../scripts/kits.mjs";
import {ensureFolders,ensureMacros,worldIndex,toActorItem,toolInfo} from "../scripts/foundry-adapter.mjs";
import {request,initializeService} from "../scripts/service.mjs";
import {openAlchemy} from "../scripts/ui.mjs";

const kit=JSON.parse(await readFile(new URL("../examples/demo-kit.json",import.meta.url),"utf8"));
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
test("setup and repeated kit installation reuse folders, macros, ingredients and recipe books",async()=>{
  const {manager}=await populated();const before={folders:game.folders.length,items:game.items.length,journal:game.journal.length,macros:game.macros.length};
  const result=await manager.install(kit.id);await ensureMacros(await ensureFolders());
  assert.deepEqual({folders:game.folders.length,items:game.items.length,journal:game.journal.length,macros:game.macros.length},before);
  assert.equal(result.created,0);assert.equal(result.reused,5);assert.equal(game.folders.length,5);assert.equal(game.macros.length,2);
});
test("world recipes are journals and never stockable recipe items",async()=>{
  await populated();assert.equal(game.journal.length,1);assert.equal(game.items.filter(i=>i.flags[MODULE_ID].kind==="recipe").length,0);
  assert.equal(worldIndex().book.size,1);
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
  const ingredients=actor.items.filter(i=>i.flags?.[MODULE_ID]?.kind==="ingredient");assert.ok(ingredients.every(i=>i.system.quantity===0));
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
