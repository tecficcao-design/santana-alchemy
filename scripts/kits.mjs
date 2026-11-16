import {MODULE_ID, AlchemyError, demand, clone, validateKit, escapeHTML} from "./core.mjs";
import {tr, lang, local, ensureFolders, ensureMacros, worldIndex, contentItem, safeHTML} from "./foundry-adapter.mjs";

export class KitManager {
  #kits = new Map();
  get kits() { return [...this.#kits.values()].map(clone); }
  get(id) { return this.#kits.get(id); }
  register(raw) {
    const index = worldIndex();
    const known = {ingredients:new Set(index.ingredient.keys()), products:new Set(index.product.keys())};
    for (const k of this.#kits.values()) {
      k.ingredients.forEach(i => known.ingredients.add(i.id));
      k.products.forEach(i => known.products.add(i.id));
    }
    const kit = validateKit(raw, known);
    this.#kits.set(kit.id, kit);
    Hooks.callAll("santanaAlchemyKitRegistered", kit.id);
    return kit.id;
  }
  async discover() {
    for (const module of game.modules) {
      if (!module.active) continue;
      const path = module.flags?.[MODULE_ID]?.kit;
      if (!path) continue;
      try {
        demand(typeof path === "string" && /^[a-zA-Z0-9_./-]+\.json$/.test(path) && !path.includes("..") && !path.startsWith("/"), "invalidKit", {detail:"kit path"});
        const response = await fetch(`modules/${module.id}/${path}`);
        demand(response.ok, "kitRead", {name:module.title});
        const text = await response.text();
        demand(text.length <= 5000000, "invalidKit", {detail:"kit exceeds 5 MB"});
        this.register(JSON.parse(text));
      } catch (error) {
        console.error(`${MODULE_ID} | Kit discovery: ${module.id}`, error);
        ui.notifications.warn(tr("kitRead", {name:module.title}));
      }
    }
  }
  async install(id, {update = false} = {}) {
    demand(game.user.isGM, "gmOnly");
    const kit = this.get(id);
    demand(kit, "kitMissing");
    const folders = await ensureFolders();
    await ensureMacros(folders);
    const index = worldIndex(), result = {created:0, reused:0, updated:0};
    const upsert = async (kind, entryId, data) => {
      const existing = index[kind].get(entryId);
      if (existing) {
        if (update) { await existing.update(data); result.updated++; }
        else result.reused++;
        return existing;
      }
      const Class = kind === "recipe" ? JournalEntry : Item;
      const created = await Class.create(data);
      index[kind].set(entryId, created);
      result.created++;
      return created;
    };
    for (const entry of kit.ingredients) await upsert("ingredient", entry.id, contentItem(entry, "ingredient", kit, folders.ingredients));
    for (const entry of kit.products) await upsert("product", entry.id, contentItem(entry, "product", kit, folders.products));
    // A dependent kit is installed after its ingredients/products have been installed.
    for (const recipe of kit.recipes) {
      demand(recipe.ingredients.every(i => index.ingredient.has(i.id)) && index.product.has(recipe.product.id), "dependenciesMissing");
      const recipeName = local(recipe.name);
      const materials = recipe.ingredients.map(i => `<li>${escapeHTML(index.ingredient.get(i.id).name)} × ${i.quantity}</li>`).join("");
      // The image path is validated separately from user-authored rich text.
      const illustration = recipe.img ? `<figure><img src="${escapeHTML(recipe.img)}" alt="${escapeHTML(recipeName)}" style="display:block;max-width:100%;max-height:360px;margin:0 auto;object-fit:contain;border:0"></figure>` : "";
      const html = `<h1>${escapeHTML(recipeName)}</h1>${illustration}<p>C${recipe.complexity}</p>${safeHTML(local(recipe.description))}<ul>${materials}</ul>`;
      const recipeData = {name:recipeName, folder:folders.recipes, ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
        pages:[{name:recipeName, type:"text", text:{content:html, format:1}}],
        flags:{[MODULE_ID]:{kind:"recipe", id:recipe.id, kitId:kit.id, kitVersion:kit.version, recipe:clone(recipe)}}};
      // Preserve page identity on updates so existing UUID links remain valid.
      const old = index.recipe.get(recipe.id);
      if (old?.pages?.contents?.[0]?.id) recipeData.pages[0]._id = old.pages.contents[0].id;
      const note = await upsert("recipe", recipe.id, recipeData);
      const cover = ["", "brown", "green", "blue", "red", "black"][recipe.complexity];
      const bookData = {name:tr("bookTitle", {name:recipeName}), type:"loot", folder:folders.books,
        img:recipe.bookImg ?? `modules/${MODULE_ID}/assets/book-${cover}.svg`,
        system:{quantity:1, weight:{value:recipe.bookWeight ?? 1, units:"lb"},
          description:{value:`<p>${escapeHTML(tr("bookDescription", {complexity:recipe.complexity}))}</p>${html}`, chat:"", unidentified:""}},
        ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
        flags:{[MODULE_ID]:{kind:"book", id:recipe.id, recipeId:recipe.id, journalUuid:note.uuid, cover, kitId:kit.id, kitVersion:kit.version}}};
      if (recipe.bookPrice !== undefined) bookData.system.price = {value:recipe.bookPrice,denomination:"gp"};
      await upsert("book", recipe.id, bookData);
    }
    const installed = clone(game.settings.get(MODULE_ID, "installedKits"));
    installed[id] = {version:kit.version, language:lang(), installedAt:Date.now(), update};
    await game.settings.set(MODULE_ID, "installedKits", installed);
    Hooks.callAll("santanaAlchemyKitInstalled", id, result);
    return result;
  }
}
