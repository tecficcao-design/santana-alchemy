import {MODULE_ID, FORMAT_VERSION, validateKit} from "./core.mjs";
import {tr, isCoordinator, ensureFolders, ensureMacros, notifyError} from "./foundry-adapter.mjs";
import {KitManager} from "./kits.mjs";
import {initializeService, request} from "./service.mjs";
import {openAlchemy, manageAlchemy, showHelp} from "./ui.mjs";

let api;
Hooks.once("init",()=>{
  game.settings.register(MODULE_ID,"contentLanguage",{name:"SAA.contentLanguage",hint:"SAA.contentLanguageHint",scope:"world",config:true,type:String,default:"auto",choices:{auto:"SAA.automatic",en:"English","pt-BR":"Português (Brasil)"}});
  game.settings.register(MODULE_ID,"installedKits",{scope:"world",config:false,type:Object,default:{}});
  game.settings.registerMenu(MODULE_ID,"manager",{name:"SAA.manager",label:"SAA.openManager",icon:"fa-solid fa-flask",restricted:true,
    type:class extends foundry.applications.api.ApplicationV2 {
      render(){manageAlchemy(api);return this;}
    }});
  const kits=new KitManager();
  api=Object.freeze({formatVersion:FORMAT_VERSION,kits,validateKit,registerKit:raw=>kits.register(raw),
    installKit:(id,options)=>kits.install(id,options),open:actor=>openAlchemy(actor),manage:()=>manageAlchemy(api),help:showHelp,
    prepare:async()=>{const folders=await ensureFolders();await ensureMacros(folders);return folders;},
    getCharacter:actor=>request("catalog",actor)});
  game.modules.get(MODULE_ID).api=api;
});
Hooks.once("ready",async()=>{
  if(game.system.id!=="dnd5e"){ui.notifications.error(tr("systemRequired"));return;}
  initializeService();
  await api.kits.discover();
  if(isCoordinator()){
    try{await api.prepare();}catch(error){notifyError(error);}
  }
  Hooks.callAll("santanaAlchemyReady",api);
});
Hooks.on("getSceneControlButtons",controls=>{
  if(!controls.tokens?.tools)return;
  controls.tokens.tools.santanaAlchemy={name:"santanaAlchemy",title:"SAA.title",icon:"fa-solid fa-flask",button:true,
    order:Object.keys(controls.tokens.tools).length,onChange:()=>api?.open()};
  if(game.user.isGM)controls.tokens.tools.santanaAlchemyManager={name:"santanaAlchemyManager",title:"SAA.manager",icon:"fa-solid fa-box-open",button:true,
    order:Object.keys(controls.tokens.tools).length,onChange:()=>api?.manage()};
});
