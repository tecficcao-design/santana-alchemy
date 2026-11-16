/** Pure rules and kit validation. No Foundry globals, I/O, or executable kit data. */
export const MODULE_ID = "santana-alchemy";
export const FORMAT_VERSION = 1;
export const BASE_DC = [0, 9, 12, 15, 18, 21];
export const TIME_STEPS = [1, 10, 60, 120, 240];
export const ADVANCEMENT = [0, 3, 5, 7, 10];
export const KINDS = ["ingredient", "product", "recipe", "book"];
const PHYSICAL_TYPES = new Set(["loot", "consumable", "equipment", "weapon", "tool"]);
const BAD_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ID = /^[a-z0-9][a-z0-9:_-]{0,119}$/;
export class AlchemyError extends Error {
  constructor(code, data = {}) { super(code); this.name = "AlchemyError"; this.code = code; this.data = data; }
}
export function demand(test, code, data) { if (!test) throw new AlchemyError(code, data); }
export function clone(value) { return structuredClone(value); }
export function validId(id) { return typeof id === "string" && ID.test(id); }
export function localText(value, lang = "en") {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return [value[lang], lang.startsWith("pt") ? value["pt-BR"] : value.en, value.en, value["pt-BR"]]
    .find(text => typeof text === "string" && text.trim()) ?? "";
}
export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
}
export function numeric(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
export function quantity(item) { return Math.max(0, numeric(item?.system?.quantity)); }
export function moduleFlags(doc) { return doc?.flags?.[MODULE_ID] ?? {}; }
function checkPlainTree(node, depth = 0, budget = {n: 0}) {
  demand(depth <= 24 && ++budget.n <= 100000, "invalidKit", {detail:"data too large/deep"});
  if (node === null || typeof node !== "object") {
    demand(!["function", "symbol", "undefined"].includes(typeof node), "invalidKit", {detail:"non-JSON value"});
    if (typeof node === "number") demand(Number.isFinite(node), "invalidKit", {detail:"non-finite number"});
    return;
  }
  demand(Array.isArray(node) || Object.getPrototypeOf(node) === Object.prototype || Object.getPrototypeOf(node) === null,
    "invalidKit", {detail:"non-plain object"});
  for (const [key, value] of Object.entries(node)) {
    demand(!BAD_KEYS.has(key), "invalidKit", {detail:"unsafe property"});
    checkPlainTree(value, depth + 1, budget);
  }
}
function hasText(value) {
  return typeof value === "string" ? !!value.trim() : !!value && !Array.isArray(value) &&
    Object.values(value).every(x => typeof x === "string") && [value.en, value["pt-BR"]].some(x => typeof x === "string" && x.trim());
}
export function validateKit(raw, known = {ingredients: new Set(), products: new Set()}) {
  checkPlainTree(raw);
  demand(raw && raw.formatVersion === FORMAT_VERSION, "invalidKit", {detail:"formatVersion must be 1"});
  demand(validId(raw.id) && typeof raw.version === "string" && raw.version.length <= 40 && hasText(raw.title),
    "invalidKit", {detail:"id/version/title"});
  for (const field of ["ingredients", "products", "recipes"]) {
    demand(Array.isArray(raw[field]) && raw[field].length <= 5000, "invalidKit", {detail:field});
    const seen = new Set();
    for (const entry of raw[field]) {
      demand(validId(entry.id) && !seen.has(entry.id) && hasText(entry.name), "invalidKit", {detail:`${field}: id/name/duplicate`});
      seen.add(entry.id);
      if (entry.img) demand(typeof entry.img === "string" && /^(icons\/|modules\/|worlds\/)/.test(entry.img) && !entry.img.includes(".."),
        "invalidKit", {detail:"image must be a local Foundry path"});
      if (entry.weight !== undefined) demand(Number.isFinite(entry.weight) && entry.weight >= 0, "invalidKit", {detail:"weight"});
      if (entry.price !== undefined) demand(Number.isFinite(entry.price) && entry.price >= 0, "invalidKit", {detail:"price"});
      if (entry.item) {
        demand(PHYSICAL_TYPES.has(entry.item.type), "invalidKit", {detail:"physical item type"});
        // Kits never install scripts, macros, ActiveEffects, or third-party flags.
        demand(!entry.item.flags && !entry.item.effects && !entry.item.command, "invalidKit", {detail:"item contains executable/foreign data"});
      }
    }
  }
  const ingredients = new Set([...known.ingredients, ...raw.ingredients.map(x => x.id)]);
  const products = new Set([...known.products, ...raw.products.map(x => x.id)]);
  for (const r of raw.recipes) {
    demand(Number.isInteger(r.complexity) && r.complexity >= 1 && r.complexity <= 5, "invalidKit", {detail:"complexity"});
    demand(r.dc === undefined || (Number.isInteger(r.dc) && r.dc >= 1 && r.dc <= 99), "invalidKit", {detail:"dc"});
    demand(r.timeMinutes === undefined || (Number.isFinite(r.timeMinutes) && r.timeMinutes >= 1 && r.timeMinutes <= 525600),
      "invalidKit", {detail:"timeMinutes"});
    demand(r.bookWeight === undefined || (Number.isFinite(r.bookWeight) && r.bookWeight >= 0), "invalidKit", {detail:"bookWeight"});
    demand(r.bookPrice === undefined || (Number.isFinite(r.bookPrice) && r.bookPrice >= 0), "invalidKit", {detail:"bookPrice"});
    demand(r.bookImg === undefined || (typeof r.bookImg === "string" && /^(icons\/|modules\/|worlds\/)/.test(r.bookImg) && !r.bookImg.includes("..")),
      "invalidKit", {detail:"bookImg must be a local Foundry path"});
    demand(Array.isArray(r.ingredients) && r.ingredients.length > 0 && r.ingredients.length <= 100, "invalidKit", {detail:"recipe ingredients"});
    const used = new Set();
    for (const i of r.ingredients) {
      demand(ingredients.has(i.id) && !used.has(i.id) && Number.isFinite(i.quantity) && i.quantity > 0 && i.quantity <= 100000,
        "invalidKit", {detail:`ingredient reference/quantity: ${i.id}`});
      used.add(i.id);
    }
    demand(r.product && products.has(r.product.id) && Number.isInteger(r.product.quantity) && r.product.quantity > 0 && r.product.quantity <= 1000,
      "invalidKit", {detail:"product reference/quantity"});
    demand(r.tools === undefined || (Array.isArray(r.tools) && r.tools.length > 0 && r.tools.length <= 20
      && r.tools.every(t => validId(t))), "invalidKit", {detail:"tools"});
    demand(!r.tools || r.tools.includes("alchemist"), "invalidKit", {detail:"primary alchemist tool required"});
    for (const [severity, failure] of Object.entries(r.failures ?? {})) {
      demand(["mild","moderate","severe","critical"].includes(severity), "invalidKit", {detail:"failure severity"});
      demand(hasText(failure.text) && (failure.productQuantity === undefined ||
        (Number.isInteger(failure.productQuantity) && failure.productQuantity >= 0 && failure.productQuantity <= 1000)),
        "invalidKit", {detail:"failure override"});
    }
  }
  return clone(raw);
}
export function inventoryPlan(items, requirements) {
  const updates = [], missing = [], rows = [];
  for (const needed of requirements) {
    const matches = items.filter(i => moduleFlags(i).kind === "ingredient" && moduleFlags(i).id === needed.id && quantity(i) > 0)
      .sort((a,b) => String(a.id ?? a._id).localeCompare(String(b.id ?? b._id)));
    const available = matches.reduce((n, i) => n + quantity(i), 0);
    rows.push({id:needed.id, needed:needed.quantity, available});
    if (available + 1e-8 < needed.quantity) missing.push({id:needed.id, needed:needed.quantity, available});
    let remaining = needed.quantity;
    for (const item of matches) {
      if (remaining <= 1e-8) break;
      const take = Math.min(quantity(item), remaining);
      updates.push({_id:item.id ?? item._id, before:quantity(item), after:Math.max(0, quantity(item) - take), take, ingredientId:needed.id});
      remaining -= take;
    }
  }
  return {updates, missing, rows, complete:missing.length === 0};
}
export function availableRecipes(recipes, items, state = {}) {
  const books = new Set(items.filter(i => quantity(i) > 0 && moduleFlags(i).kind === "book").map(i => moduleFlags(i).recipeId));
  return recipes.filter(r => books.has(r.id) || state.recipes?.[r.id]?.memorized).map(r => ({
    ...clone(r), hasBook:books.has(r.id), studied:!!state.recipes?.[r.id]?.studied,
    memorized:!!state.recipes?.[r.id]?.memorized, successes:numeric(state.recipes?.[r.id]?.successes)
  }));
}
export function memoryTarget(complexity, intelligence, proficiency, proficient) {
  return Math.max(1, 4 * complexity - (intelligence + (proficient ? proficiency : 0)));
}
/** Bounded, ordinary bonus arithmetic; no exploding/rerolling dice modifiers. */
export function validExtraBonus(formula) {
  if (typeof formula !== "string" || formula.length > 120) return false;
  const referenced = formula.replace(/@[a-zA-Z_][a-zA-Z0-9_.]*/g, "0");
  let valid = true;
  const arithmetic = referenced.replace(/(\d*)[dD](\d+)/g, (term, count, faces) => {
    if (Number(count || 1) < 1 || Number(count || 1) > 50 || Number(faces) < 1 || Number(faces) > 1000) valid = false;
    return "0";
  });
  if (!valid || !/^[\d\s.()+*/-]*$/.test(arithmetic)) return false;
  let depth=0;
  for (const char of arithmetic) { if(char === "(" && ++depth > 8) return false; if(char === ")" && --depth < 0) return false; }
  return depth === 0;
}
export function productionPlan(recipe, options = {}) {
  const pace = options.pace ?? "normal", condition = Number(options.condition ?? 0);
  demand(["normal", "fast", "safe"].includes(pace), "invalidOptions");
  demand([-1, 0, 1, 2].includes(condition), "invalidOptions");
  demand(!(pace === "safe" && recipe.complexity === 5), "safeC5");
  demand(!(pace === "safe" && options.heroic), "heroicSafe");
  const base = recipe.timeMinutes ?? TIME_STEPS[recipe.complexity - 1];
  let minutes = base;
  if (pace === "fast") minutes = [...TIME_STEPS].reverse().find(t => t < base) ?? 1;
  if (pace === "safe") {
    minutes = TIME_STEPS.find(t => t > base);
    demand(minutes !== undefined, "safeC5");
  }
  const advantage = options.advantage || pace === "safe";
  const disadvantage = options.disadvantage || pace === "fast";
  return {dc:(recipe.dc ?? BASE_DC[recipe.complexity]) + condition + (options.heroic ? 2 : 0), minutes,
    rollMode:advantage === disadvantage ? "normal" : advantage ? "advantage" : "disadvantage"};
}
export function classifyResult(natural, total, dc, proficient = false) {
  demand(Number.isInteger(natural) && natural >= 1 && natural <= 20 && Number.isFinite(total) && Number.isFinite(dc), "invalidRoll");
  if (natural === 1) return {success:false, severity:"critical", original:"critical", margin:dc-total};
  if (natural === 20 || total >= dc) return {success:true, severity:null, original:null, margin:dc-total};
  const margin = dc-total;
  const original = margin <= 4 ? "mild" : margin <= 9 ? "moderate" : "severe";
  const severity = proficient ? ({mild:"mild", moderate:"mild", severe:"moderate"}[original]) : original;
  return {success:false, severity, original, margin};
}
export function recordSuccess(state, recipe, target, {heroicMemory = false} = {}) {
  const next = clone(state ?? {});
  next.recipes ??= {};
  const record = next.recipes[recipe.id] ??= {studied:true, successes:0, memorized:false, complexity:recipe.complexity};
  record.successes = numeric(record.successes) + (heroicMemory ? 2 : 1);
  record.complexity = recipe.complexity;
  if (record.successes >= target) record.memorized = true;
  return next;
}
export function progression(state = {}) {
  const counts = [0,0,0,0,0,0];
  for (const record of Object.values(state.recipes ?? {})) {
    if (record.successes > 0 && Number.isInteger(record.complexity) && record.complexity >= 1 && record.complexity <= 5) counts[record.complexity]++;
  }
  return counts;
}
/** Only one processor at a time per actor, including requests from different players. */
export class SerialQueue {
  #tails = new Map();
  run(key, task) {
    const previous = this.#tails.get(key) ?? Promise.resolve();
    const result = previous.catch(() => {}).then(task);
    const tail = result.catch(() => {});
    this.#tails.set(key, tail);
    tail.finally(() => { if (this.#tails.get(key) === tail) this.#tails.delete(key); });
    return result;
  }
}
