# Changelog

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
