import {MODULE_ID, AlchemyError, demand, escapeHTML as h, productionPlan, BASE_DC, TIME_STEPS, ADVANCEMENT} from "./core.mjs";
import {tr, local, getState, ensureFolders, ensureMacros, notifyError, worldIndex, toolInfo} from "./foundry-adapter.mjs";
import {request} from "./service.mjs";

const D = () => foundry.applications.api.DialogV2;
const shell = content => `<div class="saa">${content}</div>`;
const heading = (title, subtitle = "") => `<header class="saa-header"><span class="saa-eyebrow">SANT ANA ALCHEMY</span><h2>${h(title)}</h2>${subtitle ? `<p>${h(subtitle)}</p>` : ""}</header>`;
const option = (value, label, selected = false) => `<option value="${h(value)}" ${selected ? "selected" : ""}>${h(label)}</option>`;
const field = (label, body) => `<div class="form-group"><label>${h(label)}</label><div class="form-fields">${body}</div></div>`;
const checkbox = (name, label, checked = false) => `<label class="saa-check"><input type="checkbox" name="${h(name)}" ${checked ? "checked" : ""}>${h(label)}</label>`;
async function info(title, content) {
  return D().prompt({window:{title}, classes:["saa-dialog"], position:{width:640}, content:shell(content), ok:{label:tr("close")}, rejectClose:false});
}
async function input(title, content, label = tr("continue")) {
  return D().input({window:{title}, classes:["saa-dialog"], position:{width:660}, content:shell(content), ok:{label}, rejectClose:false});
}
export async function chooseActor(actor) {
  if (actor) return actor;
  const selected = canvas?.tokens?.controlled ?? [];
  demand(selected.length <= 1, "selectOne");
  if (selected[0]?.actor) return selected[0].actor;
  if (game.user.character) return game.user.character;
  const choices = game.actors.filter(a => a.isOwner && ["character", "npc"].includes(a.type));
  demand(choices.length, "noActor");
  if (choices.length === 1) return choices[0];
  const fd = await input(tr("chooseActor"), field(tr("character"), `<select name="actor">${choices.map(a => option(a.uuid, a.name)).join("")}</select>`));
  if (!fd) return null;
  return fromUuid(fd.actor);
}
export async function openAlchemy(providedActor) {
  try {
    const actor = await chooseActor(providedActor);
    if (!actor) return;
    let repeat = true;
    while (repeat) {
      const data = await request("catalog", actor);
      const books = data.recipes.filter(r => r.hasBook).length, memory = data.recipes.filter(r => r.memorized).length;
      const action = await D().wait({window:{title:tr("title")}, classes:["saa-dialog"], position:{width:640}, rejectClose:false,
        content:shell(`${heading(actor.name, tr("workbenchSubtitle"))}<div class="saa-stats"><div><strong>C${data.state.level ?? 1}</strong><span>${h(tr("alchemicalLevel"))}</span></div><div><strong>${books}</strong><span>${h(tr("books"))}</span></div><div><strong>${memory}</strong><span>${h(tr("memory"))}</span></div></div>${!books && !memory ? `<p class="saa-note">${h(tr("emptyHint"))}</p>` : ""}`),
        buttons:[{action:"books",label:tr("inventoryBooks"),icon:"fa-solid fa-book",default:true},
          {action:"memory",label:tr("memorizedRecipes"),icon:"fa-solid fa-brain"},
          {action:"progress",label:tr("progress"),icon:"fa-solid fa-chart-line"}]});
      if (!action) break;
      if (action === "progress") { await showProgress(actor, data); continue; }
      const recipes = data.recipes.filter(r => action === "books" ? r.hasBook : r.memorized)
        .sort((a,b) => a.complexity-b.complexity || a.name.localeCompare(b.name));
      if (!recipes.length) { await info(tr("title"), `<p>${h(tr(action === "books" ? "noBooks" : "noMemory"))}</p>`); continue; }
      const selected = await input(tr("chooseRecipe"), field(tr("recipe"), `<select name="recipe">${recipes.map(r => option(r.id, `C${r.complexity} · ${r.name}${r.memorized ? " · " + tr("memorized") : ""}`)).join("")}</select>`));
      if (!selected) continue;
      const recipe = recipes.find(r => r.id === selected.recipe);
      if (!recipe) continue;
      if (!recipe.studied && !recipe.memorized) {
        const study = await input(tr("firstStudy"), `${heading(recipe.name)}<div class="saa-recipe">${recipe.description}</div><p class="saa-note">${h(tr("studyNotice"))}</p>${checkbox("timeAcknowledged", tr("studyTimeAcknowledged"))}`, tr("recordStudy"));
        if (study) { await request("study", actor, {recipeId:recipe.id, timeAcknowledged:!!study.timeAcknowledged}); ui.notifications.info(tr("studyRecorded")); }
        continue;
      }
      await craftingDialog(actor, recipe, data);
    }
  } catch (error) { notifyError(error); }
}
async function craftingDialog(actor, recipe, data) {
  const complete = recipe.inventory.every(row => row.available >= row.needed);
  const rows = recipe.inventory.map(row => `<tr class="${row.available < row.needed ? "saa-missing" : ""}"><td>${h(recipe.ingredients.find(i => i.id === row.id)?.name ?? row.id)}</td><td>${row.needed}</td><td>${row.available}</td><td>${h(tr(row.available < row.needed ? "missing" : "ready"))}</td></tr>`).join("");
  const tools = recipe.tools;
  const preferred = tools.find(t => t.present && t.proficient) ?? tools.find(t => t.present) ?? tools[0];
  const toolOptions = tools.map(t => option(t.id, `${t.label} · ${tr(t.present ? "available" : "unavailable")} · ${tr(t.proficient ? "proficient" : "untrained")}`, t.id === preferred.id)).join("");
  const base = `${tr("dc")} ${recipe.dc ?? BASE_DC[recipe.complexity]} · ${tr("minutes", {n:recipe.timeMinutes ?? TIME_STEPS[recipe.complexity-1]})}`;
  const conditions = [[-1,"favorable"],[0,"normal"],[1,"unfavorable"],[2,"extreme"]].map(([v,k]) => option(v, tr(k), v === 0)).join("");
  const content = `${heading(recipe.name, `C${recipe.complexity} · ${base}`)}<div class="saa-recipe">${recipe.description}</div>
    <table class="saa-table"><thead><tr><th>${h(tr("ingredient"))}</th><th>${h(tr("required"))}</th><th>${h(tr("inventory"))}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    ${!complete ? `<p class="saa-warning">${h(tr("ingredientsMissing"))}</p>` : ""}
    ${(data.state.level ?? 1) < recipe.complexity ? `<p class="saa-warning">${h(tr("levelRequired"))}</p>` : ""}
    ${field(tr("tool"), `<select name="tool">${toolOptions}</select>`)}
    ${field(tr("pace"), `<select name="pace">${option("normal",tr("normalPace"))}${option("fast",tr("fastPace"))}${recipe.complexity < 5 ? option("safe",tr("safePace")) : ""}</select>`)}
    ${field(tr("conditions"), `<select name="condition">${conditions}</select>`)}
    <div class="saa-grid">${checkbox("advantage",tr("advantage"))}${checkbox("disadvantage",tr("disadvantage"))}${checkbox("heroic",tr("heroic"))}${data.state.mentor ? checkbox("mentor",tr("mentor")) : ""}</div>
    ${field(tr("heroicBenefit"), `<select name="heroicBenefit">${option("memory",tr("heroicMemory"))}${option("enhancement",tr("heroicEnhancement"))}</select>`)}
    ${field(tr("extraBonus"), '<input type="text" name="bonus" maxlength="120" placeholder="1d4">')}
    <p class="saa-note">${h(tr("bonusNotice"))}</p>`;
  const selected = await input(tr("craft"), content, tr("reviewCraft"));
  if (!selected) return;
  demand(complete, "ingredientsMissing");
  const options = {recipeId:recipe.id, tool:selected.tool, pace:selected.pace, condition:Number(selected.condition),
    bonus:String(selected.bonus ?? "").trim(), advantage:!!selected.advantage, disadvantage:!!selected.disadvantage,
    heroic:!!selected.heroic, heroicBenefit:selected.heroicBenefit, mentor:!!selected.mentor};
  const production = productionPlan(recipe, options);
  const confirm = await input(tr("confirmCraft"), `${heading(recipe.name, `${tr("dc")} ${production.dc} · ${tr("minutes", {n:production.minutes})}`)}
    <p>${h(tr(production.rollMode))}</p><p>${h(tr("consumptionNotice"))}</p>
    ${checkbox("timeAcknowledged",tr("timeAcknowledged"))}`, tr("resolveCraft"));
  if (!confirm) return;
  options.timeAcknowledged = !!confirm.timeAcknowledged;
  const result = await request("craft", actor, options);
  await info(tr("result"), `${heading(result.name, tr(result.success ? "success" : result.severity))}
    <div class="saa-result-number">${result.total}<span> / ${tr("dc")} ${result.dc}</span></div>
    ${result.note ? `<p class="saa-note">${h(result.note)}</p>` : ""}
    ${result.quantity ? `<p>${h(result.productName)} × ${result.quantity}</p>` : ""}
    <p>${h(tr("memoryCount", {n:result.successes, target:result.target}))}</p>${result.memorized ? `<p class="saa-good">${h(tr("memorized"))}</p>` : ""}`);
}
async function showProgress(actor, data) {
  const rows = data.recipes.map(r => `<tr><td>${h(r.name)}</td><td>C${r.complexity}</td><td>${r.successes}</td><td>${h(tr(r.memorized ? "memorized" : r.studied ? "studied" : "notStudiedLabel"))}</td></tr>`).join("");
  const levels = [1,2,3,4].map(c => `<li>C${c}: ${data.progress[c]} / ${ADVANCEMENT[c]} ${h(tr("distinctFormulas"))}</li>`).join("");
  await info(tr("progress"), `${heading(actor.name)}<ul>${levels}</ul><p class="saa-note">${h(tr("advancementNotice"))}</p><table class="saa-table"><thead><tr><th>${h(tr("recipe"))}</th><th>C</th><th>${h(tr("successes"))}</th><th>${h(tr("status"))}</th></tr></thead><tbody>${rows}</tbody></table>`);
}
export async function manageAlchemy(api) {
  try {
    demand(game.user.isGM, "gmOnly");
    let action;
    do {
      const index=worldIndex();
      action=await D().wait({window:{title:tr("manager")}, classes:["saa-dialog"], position:{width:680}, rejectClose:false,
        content:shell(`${heading(tr("manager"),tr("managerSubtitle"))}<div class="saa-stats"><div><strong>${api.kits.kits.length}</strong><span>${h(tr("kits"))}</span></div><div><strong>${index.recipe.size}</strong><span>${h(tr("recipes"))}</span></div><div><strong>${index.ingredient.size}</strong><span>${h(tr("ingredients"))}</span></div></div>`),
        buttons:[{action:"install",label:tr("installKit"),icon:"fa-solid fa-box-open",default:true},
          {action:"file",label:tr("importFile"),icon:"fa-solid fa-file-import"},
          {action:"character",label:tr("configureCharacter"),icon:"fa-solid fa-user-gear"},
          {action:"setup",label:tr("prepareWorld"),icon:"fa-solid fa-folder-plus"},
          {action:"help",label:tr("help"),icon:"fa-solid fa-circle-question"}]});
      if (action === "setup") { const folders=await ensureFolders();await ensureMacros(folders);ui.notifications.info(tr("worldPrepared")); }
      if (action === "help") await showHelp();
      if (action === "character") { const actor=await chooseActor();if(actor)await configureCharacter(actor); }
      if (action === "file") {
        const file=await D().wait({window:{title:tr("importFile")}, rejectClose:false,
          content:shell('<input type="file" name="kit" accept=".json,application/json">'),
          buttons:[{action:"import",label:tr("continue"),default:true,callback:(event,button)=>button.form.querySelector('input[type="file"]').files[0] ?? null}]});
        if (file) { demand(file.size<=5000000,"invalidKit",{detail:"kit exceeds 5 MB"});api.kits.register(JSON.parse(await file.text()));ui.notifications.info(tr("kitRegistered")); }
      }
      if (action === "install") {
        const kits=api.kits.kits;
        demand(kits.length,"kitMissing");
        const choice=await input(tr("installKit"),`${field(tr("kit"),`<select name="kit">${kits.map(k=>option(k.id,`${local(k.title)} · ${k.version}`)).join("")}</select>`)}${checkbox("update",tr("updateModels"))}<p class="saa-note">${h(tr("installNotice"))}</p>`,tr("install"));
        if (choice) {const result=await api.kits.install(choice.kit,{update:!!choice.update});ui.notifications.info(tr("kitInstalled",result));}
      }
    } while(action);
  } catch(error) {notifyError(error);}
}
async function configureCharacter(actor) {
  const state=getState(actor), pending=actor.getFlag(MODULE_ID,"pending");
  const ids=new Set(["alchemist","herb","pois","brewer","cook",...Object.keys(state.tools??{}),...Object.keys(actor.system?.tools??{})]);
  const tools=[...ids].sort().map((id,n)=>({id,n,info:toolInfo(actor,id),override:state.tools?.[id]}));
  const rows=tools.map(({id,n,info,override})=>`<tr><td>${h(info.label)}</td><td><input type="checkbox" name="t${n}enabled" ${override?"checked":""}></td><td><input type="checkbox" name="t${n}available" ${override?.available?"checked":""}></td><td><select name="t${n}prof">${[0,0.5,1,2].map(v=>option(v,String(v),v===(override?.proficiency??info.proficiency))).join("")}</select></td></tr>`).join("");
  const fd=await input(tr("configureCharacter"),`${heading(actor.name)}${field(tr("alchemicalLevel"),`<select name="level">${[1,2,3,4,5].map(c=>option(c,`C${c}`,c===(state.level??1))).join("")}</select>`)}${checkbox("mentor",tr("mentorQualified"),state.mentor)}
    ${field(tr("permanentInt"),`<input type="number" name="memoryInt" min="-10" max="30" step="1" value="${state.memoryInt??""}" placeholder="${h(tr("automatic"))}">`)}
    <p class="saa-note">${h(tr("toolOverrideNotice"))}</p><table class="saa-table"><thead><tr><th>${h(tr("tool"))}</th><th>${h(tr("manual"))}</th><th>${h(tr("physicalAccess"))}</th><th>${h(tr("proficiency"))}</th></tr></thead><tbody>${rows}</tbody></table>`,tr("save"));
  if(fd){
    const configured={};for(const {id,n}of tools)configured[id]={enabled:!!fd[`t${n}enabled`],available:!!fd[`t${n}available`],proficiency:Number(fd[`t${n}prof`])};
    await request("configure",actor,{level:Number(fd.level),mentor:!!fd.mentor,memoryInt:fd.memoryInt===""||fd.memoryInt===null?null:Number(fd.memoryInt),tools:configured});
    ui.notifications.info(tr("saved"));
  }
  if(pending){
    const confirmation=await input(tr("recovery"),`<p class="saa-warning">${h(tr("recoveryNotice"))}</p><pre>${h(JSON.stringify(pending,null,2))}</pre>${checkbox("reconciled",tr("reconciled"))}`,tr("clearPending"));
    if(confirmation?.reconciled)await request("recover",actor,{requestId:pending.id,reconciled:true});
  }
}
export async function showHelp() {
  await info(tr("help"),`${heading(tr("title"))}<ol>${["help1","help2","help3","help4","help5"].map(k=>`<li>${h(tr(k))}</li>`).join("")}</ol><p class="saa-note">${h(tr("scopeNotice"))}</p>`);
}
