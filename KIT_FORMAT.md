# Kit format 1 — Sant Ana Alchemy

The free engine provides behavior. A kit provides ingredients, product templates, recipes and the physical books automatically generated for those recipes.

## Complete reference

`examples/demo-kit.json` is a working bilingual kit. Use it as the source template for future C1–C5 and advanced collections.

| Field | Meaning |
|---|---|
| `formatVersion` | Exactly `1` |
| `id` | Stable kit ID, such as `basic-c1` or `advanced-c1` |
| `version` | Content version string |
| `title` | String, or object with `en` and `pt-BR` text |
| `ingredients` | Ingredient definitions with permanent `id`, localized `name` and `description` |
| `products` | Product definitions with permanent `id`, localized text and optional `item` system data |
| `recipes` | Recipe definitions, materials, tools, complexity and output |

Every recipe declares:

```json
{
  "id": "basic:example-formula",
  "name": {"en": "Example Formula", "pt-BR": "Fórmula de Exemplo"},
  "complexity": 1,
  "dc": 9,
  "timeMinutes": 1,
  "tools": ["alchemist"],
  "ingredients": [{"id": "basic:example-ingredient", "quantity": 1}],
  "product": {"id": "basic:example-product", "quantity": 1},
  "description": {"en": "Production instructions.", "pt-BR": "Instruções de produção."}
}
```

The ingredient and product IDs in this example must be defined in the same kit or already available from another installed kit. The example above is an illustration, not a standalone valid kit.

Engine 0.1.2 also accepts recipe `bookPrice` (a nonnegative gp value) and stores each ingredient/product's optional JSON `metadata` under its module flags. These fields are optional, so existing format-1 kits remain compatible. Kits depending on these fields should require engine 0.1.2 or later.

Engine 0.1.3 accepts optional recipe `bookImg` for an individual physical book cover and recipe `img` for a product illustration in the recipe Journal and the book's description. Both must be local Foundry asset paths. When `bookImg` is omitted, the complexity's standard cover remains in use. These fields do not change stable identities, character inventory copies, or crafting rules. Illustrated kits depending on these fields should require engine 0.1.3 or later.

IDs use lowercase ASCII letters, digits, colons, hyphens and underscores. Keep IDs identical across languages, renames and corrections. A recipe and its product may share an ID because their kinds are distinct. Two kits sharing an ingredient must use the same ingredient ID.

## Ingredient and product definitions

Each entry accepts `id`, `name`, `description`, `img`, `weight`, `price` and `item`.

- `name`, `description` and recipe `heroicDescription` may be strings or bilingual objects.
- `weight` is nonnegative and expressed in pounds in this version; ingredient default is 0.01 lb.
- `price` is an optional nonnegative number of gp.
- `img` is optional and must be a local `icons/`, `modules/` or `worlds/` path without parent traversal.
- `item` may contain a supported physical `type` and dnd5e `system` data. The importer supplies identity, names, quantity, description, ownership and folders.
- Supported item types: `loot`, `consumable`, `equipment`, `weapon`, `tool`.
- Root item `flags`, `effects` and `command` are rejected in format 1. Kits do not install macros or arbitrary scripts. Product effects beyond supported system data need a future explicitly designed extension.
- Description HTML is sanitized on import and before display.

`dc` and `timeMinutes` may be omitted to use the complexity defaults. Tools default to `alchemist`; alternative tools must be explicitly listed alongside it. dnd5e tool IDs include `alchemist`, `herb`, `pois`, `brewer` and `cook`.

Optional `failures` can replace a severity's text and output quantity:

```json
{
  "failures": {
    "mild": {
      "text": {"en": "A specific limitation.", "pt-BR": "Uma limitação específica."},
      "productQuantity": 1
    }
  }
}
```

Allowed severities are `mild`, `moderate`, `severe`, `critical`. Failure outputs never advance success/progression and receive a GM review flag. Narrative failure effects are instructions for the GM, not executable code.

## Distribution as JSON

The GM opens the manager, chooses **Load JSON kit**, selects the file, and then chooses **Install kit**. Loading validates/registers the content; installing creates/reuses its world documents. Books are created automatically, one per recipe, with the complexity's cover color. Install all dependencies before dependent kits.

## Distribution as a Foundry content module

Create a separate module, require the free engine, and declare its JSON in the manifest:

```json
{
  "id": "santana-alchemy-basic-c1",
  "title": "Sant Ana Alchemy — Basic C1",
  "version": "1.0.0",
  "compatibility": {"minimum": "14", "maximum": "14"},
  "relationships": {
    "requires": [{"id": "santana-alchemy", "type": "module", "compatibility": {"minimum": "0.1.0"}}],
    "systems": [{"id": "dnd5e", "type": "system"}]
  },
  "flags": {"santana-alchemy": {"kit": "data/kit.json"}}
}
```

When activated, the engine discovers the kit and lists it in the manager. The GM selects installation; content is not silently placed into player inventories. For independent sale, include all ingredients required by that complexity so the buyer does not need the PDF or a second paid pack.

## Public API

After `ready`, use:

```js
const api = game.modules.get("santana-alchemy").api;
api.registerKit(kitData);
await api.installKit(kitData.id); // GM only
await api.open(actor);           // Owned actor; active GM required
await api.manage();              // GM only
```

Hooks: `santanaAlchemyReady(api)`, `santanaAlchemyKitRegistered(kitId)`, `santanaAlchemyKitInstalled(kitId, result)`, `santanaAlchemyCrafted(actor, result)`.

Persisted world/actor documents use `flags.santana-alchemy`. Actor `state` contains level, per-recipe study/success/memory, GM tool overrides and a bounded history. `pending` is a recoverable transaction record. Third-party kits must not write character progress directly.

New recipes and ingredients fitting these rules only need a data kit. New mechanics require an engine update and an appropriate minimum engine version in the content module manifest.
