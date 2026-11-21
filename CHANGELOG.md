# Changelog

## 0.1.8 — 2026-11-21

- Seven C2/C3 books now have individual covers and show their finished product inside the book and recipe Journal. Each product and its cover share an emblem.
- Added individual SVG icons for all seven C2/C3 products and their fourteen ingredients, including the existing C1 pack vectors for Qor Sap and Hive Chitin.
- To refresh imported 0.1.7 world templates, reinstall the demo kit with the update-existing-templates option. This also replaces world template edits. Existing actor copies keep their original art.

## 0.1.7 — 2026-11-21

- Expanded the free kit to 12 recipes (5 C1, 5 C2, 2 C3) and 24 ingredients. All recipes use the IDs of the full packs.
- Added Chemical Alarm Powder and Wayfinding Serum alongside the ten recipes in the printed sampler, so a character can meet the five distinct C2 successes required for C3 within the free kit. The GM confirms advancement.
- Kept the existing kit ID and added automated tests for the five-formula upgrade and C1-to-C3 progression. The engine rules are unchanged.

## 0.1.6 — 2026-11-16

- Recorded native GM workflow validation on Foundry VTT 14 build 370 with dnd5e 6.1.0 and declared verified core version 14.
- Checked study, successful production and memorization of all five demo formulas, exact ingredient consumption, retained books, a mild-failure product, and successful crafting from memory without book access.
- Documented the scope of the native GM checks and the automated tests.
- Runtime code, demo data and assets are unchanged from 0.1.5. This release changes compatibility metadata and documentation only; previous versioned downloads remain unchanged.

## 0.1.5 — 2026-11-15

- Expanded the bilingual free C1 kit from one formula to five: Water Preservative, Rustic Antiseptic, Unstable Fire, Distracting Smoke and Revealing Ink.
- Included exactly the ten required ingredients, five product templates and local SVG icons. Each formula generates its own brown-covered physical book and recipe Journal.
- Preserved the `base-c1-demo` kit ID and all shared recipe/ingredient IDs. Existing worlds can reimport without duplicates, and character inventory and memorization remain unchanged.
- Added crafting coverage for every included formula in both content languages and an upgrade regression for the original one-formula demo.
- Full live crafting validation and official Foundry catalog submission remain pending.

## 0.1.4 — 2026-11-15

- Added public manifest and versioned ZIP download URLs for direct Foundry installation and update checks.
- Added English and Portuguese installation instructions, use permission, and links to the book.
- Kept the `santana-alchemy` identifier and all runtime code from 0.1.3 unchanged for compatibility with existing content packs.
- Updated automated validation records to 51 passing tests. Full live crafting validation and official catalog submission remain pending.
- Public content remains limited to the engine and one C1 demonstration; the complete C1–C5 packs and foraging are not included.

## 0.1.3 — 2026-11-14

- Added optional per-recipe book cover images and a product illustration in recipe Journals and book descriptions.
- Existing format-1 kits retain their normal complexity-colored book covers when no custom cover is provided.
- Added validation and import regression coverage for illustrated kits.

## 0.1.2 — 2026-11-14

- Added optional recipe book prices and persistent ingredient/product catalog metadata for content packs.
- Existing format-1 kits remain compatible.
- Reused the latest 0.1.1 code and dnd5e 5/6 bonus handling.

## 0.1.1 — 2026-11-12

- Read dnd5e 6 global ability-check and tool-check bonuses from their modern fields.
- Keep dnd5e 5 legacy check-bonus fallbacks without stacking migrated aliases; modern blank fields are authoritative.
- Add three crafting-formula regression cases for modern, legacy and mixed field layouts.
- Live Foundry validation remains pending; this patch does not claim complete support for every system roll modifier or Applied Rule.

## 0.1.0 — 2026-11-12

- Initial free engine for Foundry 14 / dnd5e, with Portuguese and English interfaces.
- World setup, stable kit identities, recipe Journals, physical books and products.
- Inventory book lookup and per-character memorization.
- Core production rules, tool checks, pacing, failure classification, progress and recipe output.
- GM-validated serialized requests and recoverable inventory mutations.
- One C1 demonstration, kit format documentation, source and automated tests.
- Live Foundry validation and public manifest/catalog publication remain pending.
