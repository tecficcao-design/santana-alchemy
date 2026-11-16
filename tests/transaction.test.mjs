import test from "node:test";
import assert from "node:assert/strict";
import {craftingTransaction} from "../scripts/transaction.mjs";
const fixture=()=>{
  const state={pending:null,quantities:{a:2,b:1},products:[],history:{}};
  const adapter={
    pending:()=>state.pending,
    writePending:async p=>{state.pending=p;},
    quantity:id=>state.quantities[id],
    writeQuantities:async updates=>{for(const i of updates)state.quantities[i._id]=i.quantity;},
    createProducts:async data=>{state.products=data.map((d,i)=>({...d,id:String(i)}));return state.products;},
    deleteProducts:async ids=>{state.products=state.products.filter(p=>!ids.includes(p.id));},
    committed:id=>state.history[id],
    commit:async(s,result,id)=>{state.history[id]=result;state.pending=null;}
  };
  const deductions=[{_id:"a",before:2,after:1,take:1},{_id:"b",before:1,after:0,take:1}];
  const spec={id:"request",deductions,calculate:async()=>({state:{},product:{name:"Product"},result:{success:true}})};
  return {state,adapter,spec};
};
test("successful crafting consumes exactly once and commits a product",async()=>{
  const f=fixture();assert.equal((await craftingTransaction(f.adapter,f.spec)).success,true);
  assert.deepEqual(f.state.quantities,{a:1,b:0});assert.equal(f.state.products.length,1);assert.equal(f.state.pending,null);
});
test("a failed crafting roll still spends ingredients but creates no normal product",async()=>{
  const f=fixture();f.spec.calculate=async()=>({state:{},product:null,result:{success:false}});
  assert.equal((await craftingTransaction(f.adapter,f.spec)).success,false);assert.deepEqual(f.state.quantities,{a:1,b:0});assert.equal(f.state.products.length,0);
});
test("a pre-existing interrupted transaction blocks new crafting",async()=>{
  const f=fixture();f.state.pending={id:"old"};await assert.rejects(craftingTransaction(f.adapter,f.spec),{code:"pendingRecovery"});
  assert.deepEqual(f.state.quantities,{a:2,b:1});
});
test("inventory changed before mutation is left untouched",async()=>{
  const f=fixture();f.state.quantities.a=3;await assert.rejects(craftingTransaction(f.adapter,f.spec),{code:"inventoryChanged"});
  assert.deepEqual(f.state.quantities,{a:3,b:1});assert.equal(f.state.pending,null);
});
test("a dice evaluation exception refunds ingredients",async()=>{
  const f=fixture();f.spec.calculate=async()=>{throw Error("dice failed");};await assert.rejects(craftingTransaction(f.adapter,f.spec),/dice failed/);
  assert.deepEqual(f.state.quantities,{a:2,b:1});assert.equal(f.state.pending,null);
});
test("a product creation exception refunds ingredients",async()=>{
  const f=fixture();f.adapter.createProducts=async()=>{throw Error("create failed");};await assert.rejects(craftingTransaction(f.adapter,f.spec),/create failed/);
  assert.deepEqual(f.state.quantities,{a:2,b:1});assert.equal(f.state.products.length,0);
});
test("a failed state write removes new products and refunds ingredients",async()=>{
  const f=fixture();f.adapter.commit=async()=>{throw Error("state failed");};await assert.rejects(craftingTransaction(f.adapter,f.spec),/state failed/);
  assert.equal(f.state.products.length,0);assert.deepEqual(f.state.quantities,{a:2,b:1});assert.equal(f.state.pending,null);
});
test("a lost final acknowledgement does not refund a committed product",async()=>{
  const f=fixture();f.adapter.commit=async(s,result,id)=>{f.state.history[id]=result;f.state.pending=null;throw Error("ack lost");};
  assert.equal((await craftingTransaction(f.adapter,f.spec)).success,true);assert.equal(f.state.products.length,1);assert.deepEqual(f.state.quantities,{a:1,b:0});
});
test("partial quantity writes are compensated only where they actually occurred",async()=>{
  const f=fixture();let first=true;
  f.adapter.writeQuantities=async updates=>{for(const i of updates){f.state.quantities[i._id]=i.quantity;if(first){first=false;throw Error("partial");}}};
  await assert.rejects(craftingTransaction(f.adapter,f.spec),/partial/);assert.deepEqual(f.state.quantities,{a:2,b:1});assert.equal(f.state.pending,null);
});
test("ambiguous rollback leaves a durable recovery record rather than overwriting external edits",async()=>{
  const f=fixture();f.spec.calculate=async()=>{f.state.quantities.a=7;throw Error("external edit");};
  await assert.rejects(craftingTransaction(f.adapter,f.spec),{code:"pendingRecovery"});
  assert.equal(f.state.quantities.a,7);assert.equal(f.state.pending.stage,"recovery");
});
test("failed product rollback does not refund ingredients into a still-existing product",async()=>{
  const f=fixture();f.adapter.commit=async()=>{throw Error("failed");};f.adapter.deleteProducts=async()=>{throw Error("delete failed");};
  await assert.rejects(craftingTransaction(f.adapter,f.spec),{code:"pendingRecovery"});
  assert.equal(f.state.products.length,1);assert.deepEqual(f.state.quantities,{a:1,b:0});assert.equal(f.state.pending.stage,"recovery");
});
