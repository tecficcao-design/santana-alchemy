# Development and validation

Use Node 20+ for the test suite. There is no build step and no external runtime dependency.

```sh
node --test tests/*.test.mjs
```

Pure rule tests are in `tests/core.test.mjs`; recoverable writes in `tests/transaction.test.mjs`; mocked Foundry document/API integration in `tests/integration.test.mjs`. The integration harness intentionally does not claim to emulate Foundry's DataModel validation, native dialog rendering, HTML sanitizer DOM behavior or the complete native dice implementation.

## Real-world release gate

Before declaring a verified release, install in a clean Foundry 14/dnd5e world and verify:

1. Module discovery, activation and setup with a GM.
2. Demo import twice, with no duplicate folders, recipes or items.
3. Book and ingredient drag/drop to a character with a real tool item.
4. First study, creation success/failure and ingredient quantities.
5. A non-GM owner request processed by a connected GM.
6. Two rapid player requests cannot spend one set of ingredients twice.
7. Memorization persists after the book is removed.
8. Portuguese and English dialogs and kit import.
9. The supported dnd5e version's native item/weight/tool data models.

The package intentionally omits `compatibility.verified` until live validation is complete. Version 0.1.4 adds public `manifest`/`download` URLs for direct installation as a public test build. Public hosting is not evidence of successful live crafting validation.

## Public distribution

The repository root contains the module source. Versioned installation files are stored under `releases/<version>/`. `module.json` at the root is the stable latest manifest. Its `download` URL points to the matching versioned ZIP. Each versioned ZIP contains only the `santana-alchemy/` module directory, without repository-only release archives.

Keep each published `releases/<version>/` directory unchanged. For a future update, increment the version in `module.json` and `package.json`, prepare a new version directory, test it, then update the root manifest. Preserve old version directories so previous installation URLs continue to work. If catalog submission is later approved, provide that release's version-specific `releases/<version>/module.json` URL.

Only the engine and the C1 demonstration belong in this public repository. Do not upload the complete book, the commercial C1–C5 packs, or foraging. Review actual authorship and maintenance requirements in Foundry's current policies before official catalog submission; this publication does not make a catalog-compliance claim.

## Primary technical references

- Foundry module development: https://foundryvtt.com/article/module-development/
- Foundry content packaging: https://foundryvtt.com/article/packaging-guide/
- Foundry 14 DialogV2: https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
- Foundry 14 Actor: https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html
- Foundry 14 Folder: https://foundryvtt.com/api/v14/classes/foundry.documents.Folder.html
- Foundry 14 module manifest data: https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.ModuleManifestData.html
- Foundry 14 scene controls: https://foundryvtt.com/api/v14/functions/hookEvents.getSceneControlButtons.html
- Official dnd5e tool guide: https://github.com/foundryvtt/dnd5e/wiki/Active-Effect-Guide

Rule authority: the project's `Compendio_de_Alquimia_FINAL_PT-BR.pdf`, checked during implementation. The five-formula C1 demo includes Water Preservative, Rustic Antiseptic, Unstable Fire, Distracting Smoke and Revealing Ink (source pages 66, 64, 67, 68 and 74). Only the selected formulas, their ten ingredients and the general engine rules are included. Recipe and ingredient IDs match the complete C1 pack.
