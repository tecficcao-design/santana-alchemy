import {MODULE_ID, AlchemyError, demand, clone, moduleFlags, quantity, availableRecipes, inventoryPlan,
  productionPlan, memoryTarget, classifyResult, recordSuccess, progression, SerialQueue, escapeHTML, validExtraBonus} from "./core.mjs";
import {tr, lang, local, activeGM, isCoordinator, assertOwner, getState, recipesInWorld, worldIndex, toolInfo, actorNumbers, toActorItem, safeHTML} from "./foundry-adapter.mjs";
import {failureText, failureProductQuantity} from "./failures.mjs";
import {craftingTransaction} from "./transaction.mjs";

const queue = new SerialQueue();
function currentActor(uuid) { return fromUuid(uuid); }
function recipeFor(actor, id) {
  const recipe = availableRecipes(recipesInWorld(), actor.items.contents, getState(actor)).find(r => r.id === id);
  demand(recipe, "noRecipe");
  return recipe;
}
function catalog(actor) {
  const state = getState(actor), numbers = actorNumbers(actor), index = worldIndex();
  const recipes = availableRecipes(recipesInWorld(), actor.items.contents, state).map(recipe => ({...recipe,
    name:local(recipe.name), description:safeHTML(local(recipe.description)),
    tools:(recipe.tools ?? ["alchemist"]).map(t => toolInfo(actor, t)),
    ingredients:recipe.ingredients.map(i => ({...i, name:index.ingredient.get(i.id)?.name ?? i.id})),
    inventory:inventoryPlan(actor.items.contents, recipe.ingredients).rows,
    productName:index.product.get(recipe.product.id)?.name ?? recipe.product.id
  }));
  return {recipes, state, numbers, progress:progression(state)};
}
async function study(actor, payload) {
  const r = recipeFor(actor, payload.recipeId);
  demand(r.hasBook, "bookMissing");
  demand(payload.timeAcknowledged === true, "timeRequired");
  demand(!actor.getFlag(MODULE_ID, "pending"), "pendingRecovery");
  const state = getState(actor);
  state.recipes ??= {};
  state.recipes[r.id] = {...(state.recipes[r.id] ?? {successes:0, memorized:false}), studied:true, complexity:r.complexity};
  await actor.setFlag(MODULE_ID, "state", state);
  return {name:local(r.name)};
}
export async function craft(actor, payload, requestId) {
  const state = getState(actor);
  const previous = state.history?.find(x => x.id === requestId);
  if (previous) return previous.result;
  const recipe = recipeFor(actor, payload.recipeId);
  demand(recipe.studied || recipe.memorized, "notStudied");
  demand((state.level ?? 1) >= recipe.complexity, "levelRequired");
  demand(payload.timeAcknowledged === true, "timeRequired");
  demand((recipe.tools ?? ["alchemist"]).includes(payload.tool), "toolMissing");
  const tool = toolInfo(actor, payload.tool);
  demand(tool.present, "toolMissing");
  const mentor = payload.mentor === true && state.mentor === true;
  demand(recipe.complexity <= 2 || tool.proficient || (recipe.complexity === 3 && mentor), "proficiencyRequired");
  const plan = inventoryPlan(actor.items.contents, recipe.ingredients);
  demand(plan.complete, "ingredientsMissing");
  const production = productionPlan(recipe, payload);
  const numbers = actorNumbers(actor);
  demand(Number.isFinite(numbers.intelligence) && Number.isFinite(numbers.proficiency), "invalidActor");
  const extra = payload.bonus ?? "";
  demand(validExtraBonus(extra), "invalidBonus");
  demand(!payload.heroic || ["memory","enhancement"].includes(payload.heroicBenefit), "invalidOptions");
  const bonusParts = [numbers.intelligence, Math.floor(numbers.proficiency * tool.proficiency)];
  // Preserve system-wide, ability-specific and tool-specific check bonuses from dnd5e 5.x/6.x.
  const ability = actor.system.abilities.int;
  const globalBonuses = actor.system.rolls?.ability;
  // Modern fields take precedence even when blank; migrated legacy aliases must not stack.
  const systemBonuses = [globalBonuses?.check?.bonus ?? actor.system.bonuses?.abilities?.check,
    globalBonuses?.tool?.bonus, ability.check?.roll?.bonus ?? ability.bonuses?.check, tool.bonus];
  for (const bonus of [...systemBonuses, extra]) if (bonus !== undefined && bonus !== null && String(bonus).trim()) bonusParts.push(`(${bonus})`);
  const d20 = production.rollMode === "advantage" ? "2d20kh1" : production.rollMode === "disadvantage" ? "2d20kl1" : "1d20";
  const formula = [d20, ...bonusParts].join(" + ");
  demand(Roll.validate(formula), "invalidBonus");
  const productDoc = worldIndex().product.get(recipe.product.id);
  demand(productDoc, "productMissing");
  const adapter = {
    pending:() => actor.getFlag(MODULE_ID, "pending"),
    writePending:pending => actor.setFlag(MODULE_ID, "pending", pending),
    quantity:id => { const item = actor.items.get(id); demand(item, "inventoryChanged"); return quantity(item); },
    writeQuantities:updates => actor.updateEmbeddedDocuments("Item", updates.map(i => ({_id:i._id, "system.quantity":i.quantity}))),
    createProducts:items => actor.createEmbeddedDocuments("Item", items),
    deleteProducts:ids => actor.deleteEmbeddedDocuments("Item", ids),
    committed:id => getState(actor).history?.find(h => h.id === id)?.result,
    commit:async (newState, result, id) => {
      newState.history = [...(newState.history ?? []).slice(-49), {id, result, at:Date.now()}];
      await actor.update({[`flags.${MODULE_ID}.state`]:newState, [`flags.${MODULE_ID}.pending`]:null});
    }
  };
  let rolled;
  const result = await craftingTransaction(adapter, {id:requestId, deductions:plan.updates, calculate:async () => {
    rolled = await new Roll(formula, actor.getRollData()).evaluate();
    const die = rolled.dice.find(d => d.faces === 20);
    const natural = die?.results.filter(r => r.active !== false && !r.discarded).map(r => r.result)[0];
    const outcome = classifyResult(natural, rolled.total, production.dc, tool.proficient);
    const target = memoryTarget(recipe.complexity, numbers.permanentIntelligence, numbers.proficiency, tool.proficient);
    const newState = outcome.success ? recordSuccess(state, recipe, target, {heroicMemory:payload.heroic === true && payload.heroicBenefit === "memory"}) : clone(state);
    const note = outcome.success ? (payload.heroic && payload.heroicBenefit === "enhancement" ? local(recipe.heroicDescription) || tr("heroicManual") : "") : failureText(recipe, outcome.severity, lang());
    const amount = outcome.success ? recipe.product.quantity : failureProductQuantity(recipe, outcome.severity);
    let product = amount ? toActorItem(productDoc, amount) : null;
    if (product) {
      product.flags[MODULE_ID].crafted = {recipeId:recipe.id, creatorUuid:actor.uuid, requestId,
        at:Date.now(), flawed:!outcome.success, needsReview:!outcome.success || (payload.heroic && payload.heroicBenefit === "enhancement")};
      if (!outcome.success || note) {
        product.system.description.value = `<p><strong>${escapeHTML(tr(outcome.success ? "heroicProduct" : "flawedProduct"))}</strong></p><p>${escapeHTML(note)}</p>${product.system.description.value}`;
        if (!outcome.success) product.name += ` (${tr("flawed")})`;
      }
    }
    // The C3 severe extra loss is a distinct pending consequence; the GM chooses the ingredient.
    // This preserves the book's choice and is stated explicitly in the result card.
    return {product, state:newState, result:{recipeId:recipe.id, name:local(recipe.name), ...outcome,
      natural, total:rolled.total, dc:production.dc, minutes:production.minutes, note,
      quantity:amount, productName:productDoc.name, memorized:!!newState.recipes?.[recipe.id]?.memorized,
      successes:newState.recipes?.[recipe.id]?.successes ?? 0, target,
      consumed:plan.rows.map(row => ({name:worldIndex().ingredient.get(row.id)?.name ?? row.id, quantity:row.needed}))}};
  }});
  // Publication failure never rolls back a committed inventory mutation.
  try {
    const consumed = result.consumed.map(i => `${escapeHTML(i.name)} × ${i.quantity}`).join(" · ");
    const title = tr(result.success ? "success" : result.severity);
    const content = `<div class="saa-chat"><h3>${escapeHTML(result.name)}</h3><p><strong>${escapeHTML(title)}</strong> · ${result.total} / ${tr("dc")} ${result.dc}</p><p>${escapeHTML(tr("minutes", {n:result.minutes}))}</p><p>${consumed}</p>${result.note ? `<p>${escapeHTML(result.note)}</p>` : ""}${result.quantity ? `<p>${escapeHTML(result.productName)} × ${result.quantity}</p>` : ""}${result.memorized ? `<p>${escapeHTML(tr("memorized"))}</p>` : ""}</div>`;
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}), content, ...(rolled ? {rolls:[rolled],style:CONST.CHAT_MESSAGE_STYLES.ROLL} : {}), flags:{[MODULE_ID]:{kind:"result", requestId}}});
  } catch (e) { console.error(`${MODULE_ID} | result card`, e); }
  Hooks.callAll("santanaAlchemyCrafted", actor, clone(result));
  return result;
}
async function configure(actor, payload, user) {
  demand(user.isGM, "gmOnly");
  const state = getState(actor);
  demand(Number.isInteger(payload.level) && payload.level >= 1 && payload.level <= 5, "invalidOptions");
  state.level = payload.level;
  state.mentor = !!payload.mentor;
  if (payload.memoryInt !== null && payload.memoryInt !== undefined) {
    demand(Number.isInteger(payload.memoryInt) && payload.memoryInt >= -10 && payload.memoryInt <= 30, "invalidOptions");
    state.memoryInt = payload.memoryInt;
  } else delete state.memoryInt;
  state.tools ??= {};
  for (const [id, tool] of Object.entries(payload.tools ?? {})) {
    demand(/^[a-z][a-z0-9-]{0,40}$/.test(id) && [0,0.5,1,2].includes(tool.proficiency), "invalidOptions");
    if (tool.enabled) state.tools[id] = {available:!!tool.available, proficiency:tool.proficiency};
    else delete state.tools[id];
  }
  await actor.setFlag(MODULE_ID, "state", state);
  return {level:state.level};
}
async function recover(actor, payload, user) {
  demand(user.isGM && payload.reconciled === true, "gmOnly");
  const pending = actor.getFlag(MODULE_ID, "pending");
  demand(pending && pending.id === payload.requestId, "invalidOptions");
  await actor.setFlag(MODULE_ID, "pending", null);
  return {cleared:true};
}
async function dispatch(op, actor, payload, user, id) {
  assertOwner(actor, user);
  if (op === "catalog") return catalog(actor);
  if (op === "study") return study(actor, payload);
  if (op === "craft") return craft(actor, payload, id);
  if (op === "configure") return configure(actor, payload, user);
  if (op === "recover") return recover(actor, payload, user);
  throw new AlchemyError("invalidOptions");
}

/** Chat document hook supplies the authenticated acting userId; never trust a payload user ID. */
export function initializeService() {
  Hooks.on("createChatMessage", (message, options, userId) => {
    if (!isCoordinator()) return;
    const request = message.getFlag(MODULE_ID, "request");
    if (!request || request.response || request.status) return;
    const user = game.users.get(userId);
    if (!user || request.v !== 1 || typeof request.actorUuid !== "string" || request.actorUuid.length > 250) return;
    queue.run(request.actorUuid, async () => {
      if (!isCoordinator()) return;
      try {
        await message.update({[`flags.${MODULE_ID}.request.status`] : "processing"});
        const actor = await currentActor(request.actorUuid);
        const result = await dispatch(request.op, actor, request.payload ?? {}, user, message.id);
        await message.update({[`flags.${MODULE_ID}.request.response`]:{ok:true, result}, [`flags.${MODULE_ID}.request.status`] : "done"});
      } catch (error) {
        console.error(`${MODULE_ID} | request`, error);
        await message.update({[`flags.${MODULE_ID}.request.response`]:{ok:false, code:error.code ?? "unexpected", data:error.data ?? {}},
          [`flags.${MODULE_ID}.request.status`] : "failed"});
      }
    }).catch(error => console.error(`${MODULE_ID} | queue`, error));
  });
}
export async function request(op, actor, payload = {}) {
  assertOwner(actor, game.user);
  demand(activeGM(), "gmRequired");
  // The coordinator's own UI uses the same queue, without an extra private chat card.
  if (isCoordinator()) return queue.run(actor.uuid, () => dispatch(op, actor, payload, game.user, foundry.utils.randomID(16)));
  const nonce = foundry.utils.randomID(24);
  return new Promise((resolve, reject) => {
    let hook, timer;
    const finish = (error, result) => { Hooks.off("updateChatMessage", hook); clearTimeout(timer); error ? reject(error) : resolve(result); };
    hook = Hooks.on("updateChatMessage", (message, changes, options, userId) => {
      if (!game.users.get(userId)?.isGM) return;
      const req = message.getFlag(MODULE_ID, "request");
      if (req?.nonce !== nonce || !req.response) return;
      if (req.response.ok) finish(null, req.response.result);
      else finish(new AlchemyError(req.response.code, req.response.data));
    });
    timer = setTimeout(() => finish(new AlchemyError("requestTimeout")), 45000);
    ChatMessage.create({content:escapeHTML(tr("privateRequest", {name:actor.name})), whisper:[game.user.id, ...game.users.filter(u => u.isGM).map(u => u.id)],
      flags:{[MODULE_ID]:{kind:"request", request:{v:1, nonce, op, actorUuid:actor.uuid, payload:clone(payload)}}}})
      .then(message => { const response=message.getFlag(MODULE_ID, "request.response"); if (response) response.ok ? finish(null,response.result) : finish(new AlchemyError(response.code,response.data)); })
      .catch(error => finish(error));
  });
}
