import {MODULE_ID, AlchemyError, demand, clone, moduleFlags, localText, quantity, validId} from "./core.mjs";

export const tr = (key, data = {}) => game.i18n.format(`SAA.${key}`, data);
export const lang = () => {
  const setting = game.settings.get(MODULE_ID, "contentLanguage");
  return setting === "auto" ? (game.i18n.lang.startsWith("pt") ? "pt-BR" : "en") : setting;
};
export const local = value => localText(value, lang());
export const getState = actor => clone(actor.getFlag(MODULE_ID, "state") ?? {level:1, recipes:{}, history:[]});
export const activeGM = () => game.users.filter(u => u.active && u.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
export const isCoordinator = () => activeGM()?.id === game.user.id;
export function notifyError(error) {
  console.error(`${MODULE_ID} |`, error);
  ui.notifications.error(error instanceof AlchemyError ? tr(error.code, error.data) : tr("unexpected"));
}
export function assertOwner(actor, user) {
  demand(actor && actor.documentName === "Actor" && user && (user.isGM || actor.testUserPermission(user, "OWNER")), "notOwner");
}
export function toolInfo(actor, id) {
  const items = actor.items.filter(item => item.type === "tool" && quantity(item) > 0 &&
    [item.system?.type?.baseItem, item.system?.type?.value, item.system?.baseItem, item.system?.toolType].includes(id));
  const actorTool = actor.system?.tools?.[id];
  const override = getState(actor).tools?.[id];
  // Actor tool proficiency is authoritative. Item proficiency is a fallback for old imports.
  let proficiency = actorTool?.value;
  if (proficiency === undefined) proficiency = Math.max(0, ...items.map(i => Number(i.system?.proficient) || 0));
  if (override?.proficiency !== undefined) proficiency = override.proficiency;
  proficiency = [0,0.5,1,2].includes(Number(proficiency)) ? Number(proficiency) : 0;
  const configured = CONFIG.DND5E?.tools?.[id];
  const label = game.i18n.localize(typeof configured === "string" ? configured : configured?.label ?? id);
  return {id, label, present:items.length > 0 || !!override?.available, proficiency,
    proficient:proficiency >= 1,
    bonus:actorTool?.roll?.bonus ?? actorTool?.bonuses?.check ?? ""};
}
export function actorNumbers(actor) {
  const state = getState(actor);
  const sourceAbility = actor._source?.system?.abilities?.int?.value;
  return {
    intelligence:Number(actor.system.abilities.int.mod),
    permanentIntelligence:Number.isFinite(state.memoryInt) ? state.memoryInt : Number.isFinite(sourceAbility)
      ? Math.floor((sourceAbility-10)/2) : Number(actor.system.abilities.int.mod),
    proficiency:Number(actor.system.attributes.prof)
  };
}
const folderSpecs = [
  ["ingredients", "Item", "folderIngredients", "#4f9d69"],
  ["recipes", "JournalEntry", "folderRecipes", "#a688c7"],
  ["books", "Item", "folderBooks", "#be965c"],
  ["products", "Item", "folderProducts", "#569ca9"],
  ["macros", "Macro", "folderMacros", "#be965c"]
];
export async function ensureFolders() {
  demand(game.user.isGM, "gmOnly");
  const result = {};
  for (const [key, type, label, color] of folderSpecs) {
    let folder = game.folders.find(f => f.type === type && f.getFlag(MODULE_ID, "folder") === key);
    // Safely adopt an existing same-type folder with the exact localized name.
    folder ??= game.folders.find(f => f.type === type && f.name === tr(label));
    if (!folder) folder = await Folder.create({name:tr(label), type, color, sorting:"a", flags:{[MODULE_ID]:{folder:key}}});
    else if (!folder.getFlag(MODULE_ID, "folder")) await folder.setFlag(MODULE_ID, "folder", key);
    result[key] = folder.id;
  }
  return result;
}
export function worldIndex() {
  const index = {ingredient:new Map(), product:new Map(), book:new Map(), recipe:new Map()};
  for (const doc of [...game.items, ...game.journal]) {
    const flags = moduleFlags(doc);
    if (index[flags.kind] && validId(flags.id)) index[flags.kind].set(flags.id, doc);
  }
  return index;
}
export function recipesInWorld() {
  return [...worldIndex().recipe.values()].map(doc => clone(moduleFlags(doc).recipe)).filter(Boolean);
}
export function contentItem(entry, kind, kit, folder) {
  const item = clone(entry.item ?? {type:"loot", system:{}});
  const name = local(entry.name);
  const plainDescription = local(entry.description);
  item.name = name;
  item.img = entry.img ?? `modules/${MODULE_ID}/assets/${kind === "ingredient" ? "ingredient" : "flask"}.svg`;
  item.folder = folder;
  item.ownership = {default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  item.system ??= {};
  item.system.quantity = 1;
  // Setting only value works with both 5.x and the modern WeightField defaults.
  item.system.weight = {value:entry.weight ?? (kind === "ingredient" ? 0.01 : 0.1), units:"lb"};
  if (entry.price !== undefined) item.system.price = {value:entry.price, denomination:"gp"};
  item.system.description = {value:safeHTML(plainDescription), chat:"", unidentified:""};
  item.flags = {[MODULE_ID]:{kind, id:entry.id, kitId:kit.id, kitVersion:kit.version, metadata:clone(entry.metadata ?? {})}};
  return item;
}
export function safeHTML(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  for (const node of template.content.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button,svg,math")) node.remove();
  for (const el of template.content.querySelectorAll("*")) {
    for (const attr of [...el.attributes]) {
      const val = attr.value.replace(/[\u0000-\u0020]/g, "");
      if (attr.name.startsWith("on") || !["href","class","title","colspan","rowspan"].includes(attr.name) ||
          (/^(?:javascript|data|vbscript):/i.test(val))) el.removeAttribute(attr.name);
    }
  }
  return template.innerHTML;
}
export function toActorItem(doc, count = 1) {
  const data = doc.toObject();
  for (const key of ["_id","folder","ownership","_stats","sort"]) delete data[key];
  data.system.quantity = count;
  return data;
}
export async function ensureMacros(folders) {
  const owner = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  for (const [key, title, method] of [["craft", "macroCraft", "open"], ["manager", "macroManager", "manage"]]) {
    let macro = game.macros.find(m => m.getFlag(MODULE_ID, "shortcut") === key);
    const command = `const api = game.modules.get("${MODULE_ID}")?.api;\nif (!api) ui.notifications.warn("Sant Ana Alchemy: activate the module / ative o módulo.");\nelse await api.${method}();`;
    const data = {name:tr(title), type:"script", img:`modules/${MODULE_ID}/assets/flask.svg`, folder:folders.macros,
      command, ownership:{default:key === "craft" ? owner.OBSERVER : owner.NONE}, flags:{[MODULE_ID]:{shortcut:key}}};
    if (!macro) macro = await Macro.create(data);
    // User-customized shortcut bodies are preserved on later loads.
  }
}
