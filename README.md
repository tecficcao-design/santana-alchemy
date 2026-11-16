# Sant Ana Alchemy — Alchemy Crafting for Foundry VTT

**Free crafting engine with five C1 formulas · Foundry VTT 14 + dnd5e · English and Brazilian Portuguese**

[Português (Brasil)](README_PT-BR.md) · [Installation](#install) · [The complete compendium](#the-complete-alchemy-compendium)

Give alchemy a place in your adventures: books to discover, formulas to study, ingredients to manage, and useful preparations to craft.

**Sant Ana Alchemy** brings the crafting rules from Marcelo Sant Ana's *The Alchemy Compendium* to Foundry VTT. Characters learn from physical recipe books, prepare their ingredients, resolve crafting checks, and work toward memorizing formulas they can use without carrying the book.

## What you can do

- **Learn from alchemy books.** Each physical book holds a formula; study it before the first attempt and consult it until the formula is memorized.
- **Craft from your character's inventory.** The engine checks access to the formula, tools and ingredient quantities, resolves the crafting check, consumes ingredients and creates the product on a success.
- **Build lasting knowledge.** Successful crafting advances memorization, while the GM manages alchemical levels and narrative requirements.
- **Play in English or Portuguese.** The interface and included content support both languages.
- **Expand the collection.** The same free engine powers the complete C1–C5 content packs supplied with the book.

## Five free C1 formulas

The demonstration includes five different ways to use alchemy at the table:

| Formula | Português | Use in an adventure |
|---|---|---|
| **Unstable Fire** | Fogo Instável | Throw an alchemical preparation that deals Fire damage. |
| **Distracting Smoke** | Fumaça Distrativa | Create light obscurement that hinders sight-based Perception. |
| **Rustic Antiseptic** | Antisséptico Rústico | Stabilize a creature at 0 Hit Points. |
| **Revealing Ink** | Tinta Reveladora | Reveal recent organic traces such as blood or saliva. |
| **Water Preservative** | Conservante de Água | Preserve drinking water for an expedition. |

Included: **10 ingredients, five physical recipe books, five recipe Journals and five finished-product templates**, with bilingual descriptions and local icons. All five formulas are C1, with a normal crafting time of one minute and DC 9.

The product descriptions contain the complete use rules and limits. Applying damage, conditions and other product effects remains a table decision; the free demo handles crafting and inventory.

## The complete Alchemy Compendium

The complete book expands your collection to:

- **125 formulas** across complexities C1–C5.
- **110 ingredients** for your alchemical adventures.
- **Complete C1–C5 Foundry content packs and a foraging module**, supplied as bonuses with the book.

The complete packs use this same crafting engine. Your demo formulas and their permanent identifiers are reused when you import the full C1 pack.

**[Get the English book and Foundry bonus](https://payhip.com/b/6Z0ru)** · **[Edição em português com bônus para Foundry](https://payhip.com/b/sUa8I)**

By **Marcelo Sant Ana · Sant Ana RPG Press**. [Visit the store](https://payhip.com/SantAnaRPGPress).

## Português (Brasil)

**Leve a alquimia para as suas aventuras:** encontre livros, estude fórmulas, reúna ingredientes e fabrique preparações úteis.

O **Sant Ana Alchemy** é um motor gratuito para Foundry VTT 14 e dnd5e, com interface e conteúdo em português e inglês. A demonstração inclui **cinco fórmulas C1 e dez ingredientes**, além dos livros e modelos dos produtos. O sistema acompanha fabricação, consumo de ingredientes e memorização.

O livro completo reúne **125 fórmulas C1–C5 e 110 ingredientes**, com os pacotes completos para Foundry e o módulo de forrageamento como bônus. Todos utilizam este mesmo motor gratuito.

**[Instruções completas em português](README_PT-BR.md)** · **[Conheça o livro e os bônus](https://payhip.com/b/sUa8I)**

## Current status and requirements

**Version 0.1.6 has a live GM crafting check on Foundry VTT 14 (build 370) and dnd5e 6.1.0.** Requires Foundry VTT 14, the dnd5e system and a connected GM to process crafting requests. No Socketlib, Item Macro, Midi-QOL or Item Piles dependency is required.

**66 automated tests passed**, including crafting all five formulas in both languages and upgrading the original demo without duplicates. All five formulas were also studied, crafted and memorized through the native Portuguese interface as GM. Ingredient consumption, a mild failure, retained books and crafting from memory without book access were checked. See [VALIDATION.json](VALIDATION.json) for the test scope and remaining checks.

## Install

In Foundry's Setup screen, open **Add-on Modules → Install Module**, paste the following address into **Manifest URL**, and click **Install**:

```text
https://raw.githubusercontent.com/tecficcao-design/santana-alchemy/main/module.json
```

Enable **Sant Ana Alchemy — Crafting Engine** in a dnd5e world and join as GM. The same manifest address is used for future update checks. This direct installation URL works independently of catalog availability. Try the module in a test world first.

### Manual alternative

Extract `santana-alchemy/` into your Foundry user data `Data/modules/` directory, restart Foundry, enable the module in a dnd5e world, and join as GM. The expected manifest location is `Data/modules/santana-alchemy/module.json`. Uploading an unextracted ZIP is not sufficient.

The module creates Ingredient, Book and Finished Product Item folders, a Recipe Journal folder, and two macro shortcuts. You can also use the flask buttons in token controls or open its manager from Module Settings.

Installation files are hosted in this public repository. The official package page is [Sant Ana Alchemy](https://foundryvtt.com/packages/santana-alchemy); its displayed versions are the authority for catalog availability.

## Try it

1. Open **Alchemy — Manage → Install kit** and install **C1 Demo — Five Formulas**.
2. Pick a formula and drag its physical book and required ingredients from the Item folders to a test character. Water Preservative is a simple first example.
3. Add Alchemist's Supplies or approved physical tool access through the GM manager.
4. Select the character token and run **Alchemy — Craft Item**.
5. Record first study (one hour of agreed game time), choose the formula again, review ingredients and pacing, and resolve the crafting check.

A GM must be online. Requests are validated against the character's ownership, book or memorization, tools and inventory; the active GM processes them serially. No Socketlib, Item Macro, Midi-QOL or Item Piles dependency is required.

The book stays in inventory. Ingredients are consumed on a resolved check. Successful crafting creates the product and advances memorization. Once memorized, the recipe remains available without its book. Acquisition of alchemical levels is confirmed by the GM after the study/proficiency/narrative requirements are met.

## Scope

Core C1–C5 rules, natural 1/20, failure severity/mitigation, pacing, overall conditions, Heroic Challenge and memorization are implemented. Half proficiency is rounded down. The GM manages game time and narrative requirements.

Damage, conditions, contamination, flawed product limitations, C3 severe additional ingredient loss, and heroic enhancements require GM adjudication; the consequence is displayed. Optional specialties, batches, quality, installations and other optional book subsystems remain table-managed in this version. The engine does not automatically apply Alchemist class features. Product-use automation belongs to the individual kit; the demo produces a reference item whose application is handled by the table.

Foraging and the complete C1–C5 content packs are separate. This free build contains a five-formula selection from C1. The complete C1 pack has 25 formulas, and the book has 125 formulas across C1–C5.

## Updating an existing demo world

Update the engine in Foundry and install **C1 Demo — Five Formulas** in the manager again. The kit keeps its original identifier: existing Water Preservative documents are reused and the four additional formulas are added. Choose the explicit template-update option to apply the expanded descriptions, prices and icons to existing world templates. Character inventory copies and study/memorization progress are preserved. The same permanent recipe and ingredient IDs are used in the complete C1 pack, so its import reuses the demo content.

## Kits and maintenance

See `KIT_FORMAT.md`. Kits supply data, while the free engine supplies behavior. Stable ingredient/recipe/product IDs survive translation and prevent duplicate imports. No item-name guessing or automatic migration of legacy compendia occurs. Drag items imported by this module to character inventories.

Reimporting reuses existing templates; explicit update can replace world template edits. Character inventory copies are not rewritten. Items in containers on the same character are counted; another actor's stock must be transferred first.

Interrupted writes are compensated when safe. If reconciliation is uncertain, an actor is locked with a recovery record. The GM inspects inventory, reconciles it manually and unlocks requests in **Manage → Configure character**. Unlocking does not itself change quantities.

## Validation

Automated Node tests cover rules, idempotent import, complete crafting flow, permission checks, simultaneous requests and error recovery. On 2026-11-16, the unchanged 0.1.5 runtime passed native GM workflow checks on Foundry 14 build 370 with dnd5e 6.1.0: all five demo formulas, study, stock consumption, success and mild failure, products, retained books, memorization and crafting without book access. Version 0.1.6 records this compatibility and validation; its runtime, demo data and assets are unchanged from 0.1.5.

The live check used Portuguese, approved manual alchemist tool access, and a separate test character in an existing world with other modules, including the full content packs. Success-path checks used a +10 test bonus and a permanent Intelligence modifier override of +3 for the memory target. Non-GM requests, simultaneous clients, native English dialogs, clean-world isolation and native tool-item detection remain additional live checks; their automated coverage does not replace those checks. See [DEVELOPMENT.md](DEVELOPMENT.md) and [VALIDATION.json](VALIDATION.json).

Run `node --test tests/*.test.mjs`; no npm dependencies are required. Source and tests are included.

Detailed Portuguese instructions: `README_PT-BR.md`.

## Permission to use

Free of charge for use in Foundry VTT. Copyright and all other rights remain reserved to Marcelo Sant Ana; this package is not offered under an open-source license. See [LICENSE.md](LICENSE.md). This permission does not include the book or the separate commercial content packs.
