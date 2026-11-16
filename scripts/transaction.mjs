import {AlchemyError, demand} from "./core.mjs";

/** Recoverable multi-document mutation. An unfinished record blocks further crafts. */
export async function craftingTransaction(adapter, {id, deductions, calculate}) {
  demand(!adapter.pending(), "pendingRecovery");
  const pending = {id, stage:"prepared", startedAt:Date.now(), deductions, createdIds:[]};
  await adapter.writePending(pending);
  let touched = false, products = [], calculated;
  try {
    for (const row of deductions) demand(Math.abs(adapter.quantity(row._id)-row.before) < 1e-8, "inventoryChanged");
    pending.stage = "consuming";
    await adapter.writePending(pending);
    touched = true;
    await adapter.writeQuantities(deductions.map(row => ({_id:row._id, quantity:row.after})));
    calculated = await calculate();
    if (calculated.product) {
      products = await adapter.createProducts([calculated.product]);
      pending.createdIds = products.map(p => p.id);
      pending.stage = "produced";
      await adapter.writePending(pending);
    }
    await adapter.commit(calculated.state, calculated.result, id);
    return calculated.result;
  } catch (error) {
    // A lost acknowledgement may follow a successful final write. Never refund a committed craft.
    const committed = adapter.committed(id);
    if (committed) return committed;
    try {
      if (products.length) await adapter.deleteProducts(products.map(p => p.id));
      if (touched) {
        const refunds = [];
        for (const row of deductions) {
          const now = adapter.quantity(row._id);
          if (Math.abs(now-row.after) < 1e-8) refunds.push({_id:row._id, quantity:row.before});
          else demand(Math.abs(now-row.before) < 1e-8, "inventoryChanged");
        }
        if (refunds.length) await adapter.writeQuantities(refunds);
      }
      await adapter.writePending(null);
    } catch (rollbackError) {
      // Retain enough information for the GM to reconcile; do not silently unlock.
      try { await adapter.writePending({...pending, stage:"recovery", error:String(error.message), rollbackError:String(rollbackError.message)}); }
      catch { /* The previously written pending record still blocks subsequent requests. */ }
      throw new AlchemyError("pendingRecovery");
    }
    throw error;
  }
}
