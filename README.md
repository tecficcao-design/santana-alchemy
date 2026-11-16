# Sant Ana Alchemy — Free Crafting Engine

Version 0.1.4 • Marcelo Sant Ana / Sant Ana RPG Press

For Foundry VTT 14 and the dnd5e system. English and Brazilian Portuguese UI. This is a public test build; complete live crafting validation remains pending.

**Português (Brasil):** motor gratuito de Alquimia para Foundry 14/dnd5e, com interface em português e inglês. Inclui a demonstração Conservante de Água (dois ingredientes e uma fórmula). [Instruções completas em português](README_PT-BR.md). Os pacotes completos C1–C5 e o forrageamento continuam exclusivos dos compradores do livro.

The free package contains the engine, two demonstration ingredients and one formula. The complete C1–C5 content packs and foraging module are separate book bonuses. [Book and complete content / Livro e conteúdo completo](https://payhip.com/SantAnaRPGPress).

## Install

In Foundry's Setup screen, open **Add-on Modules → Install Module**, paste the following address into **Manifest URL**, and click **Install**:

```text
https://raw.githubusercontent.com/tecficcao-design/santana-alchemy/main/module.json
```

Enable **Sant Ana Alchemy — Crafting Engine** in a dnd5e world and join as GM. The same manifest address is used for future update checks. Catalog listing has not been requested; installation currently uses this direct URL. Use a test world for this public test build.

### Manual alternative

Extract `santana-alchemy/` into your Foundry user data `Data/modules/` directory, restart Foundry, enable the module in a dnd5e world, and join as GM. The expected manifest location is `Data/modules/santana-alchemy/module.json`. Uploading an unextracted ZIP is not sufficient.

The module creates Ingredient, Book and Finished Product Item folders, a Recipe Journal folder, and two macro shortcuts. You can also use the flask buttons in token controls or open its manager from Module Settings.

Installation files are hosted in this public repository. Full live validation and the official submission process are still required before catalog publication.

## Try it

1. Open **Alchemy — Manage → Install kit** and install **C1 Demo — Water Preservative**.
2. Drag its physical book and both ingredients from the Item folders to a test character.
3. Add Alchemist's Supplies or approved physical tool access through the GM manager.
4. Select the character token and run **Alchemy — Craft Item**.
5. Record first study (one hour of agreed game time), choose the formula again, review ingredients and pacing, and resolve the crafting check.

A GM must be online. Requests are validated against the character's ownership, book or memorization, tools and inventory; the active GM processes them serially. No Socketlib, Item Macro, Midi-QOL or Item Piles dependency is required.

The book stays in inventory. Ingredients are consumed on a resolved check. Successful crafting creates the product and advances memorization. Once memorized, the recipe remains available without its book. Acquisition of alchemical levels is confirmed by the GM after the study/proficiency/narrative requirements are met.

## Scope

Core C1–C5 rules, natural 1/20, failure severity/mitigation, pacing, overall conditions, Heroic Challenge and memorization are implemented. Half proficiency is rounded down. The GM manages game time and narrative requirements.

Damage, conditions, contamination, flawed product limitations, C3 severe additional ingredient loss, and heroic enhancements require GM adjudication; the consequence is displayed. Optional specialties, batches, quality, installations and other optional book subsystems remain table-managed in this version. The engine does not automatically apply Alchemist class features. Product-use automation belongs to the individual kit; the demo produces a reference item whose application is handled by the table.

Foraging and the commercial C1–C5 content packs are separate. This free build contains one demonstration formula, not the complete paid book.

## Kits and maintenance

See `KIT_FORMAT.md`. Kits supply data, while the free engine supplies behavior. Stable ingredient/recipe/product IDs survive translation and prevent duplicate imports. No item-name guessing or automatic migration of legacy compendia occurs. Drag items imported by this module to character inventories.

Reimporting reuses existing templates; explicit update can replace world template edits. Character inventory copies are not rewritten. Items in containers on the same character are counted; another actor's stock must be transferred first.

Interrupted writes are compensated when safe. If reconciliation is uncertain, an actor is locked with a recovery record. The GM inspects inventory, reconciles it manually and unlocks requests in **Manage → Configure character**. Unlocking does not itself change quantities.

## Validation

Automated Node tests cover rules, idempotent import, complete crafting flow, permission checks, simultaneous requests and error recovery. **A real Foundry 14/dnd5e session remains to be validated.** The manifest intentionally omits a `verified` claim until that step is complete.

Run `node --test tests/*.test.mjs`; no npm dependencies are required. Source and tests are included.

Detailed Portuguese instructions: `README_PT-BR.md`.

## Permission to use

Free of charge for use in Foundry VTT. Copyright and all other rights remain reserved to Marcelo Sant Ana; this package is not offered under an open-source license. See [LICENSE.md](LICENSE.md). This permission does not include the book or the separate commercial content packs.
