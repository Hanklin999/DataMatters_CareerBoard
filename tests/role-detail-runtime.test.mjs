import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("atlas role detail opens the shared modal through an exported global API",()=>{
  const registry=readFileSync("analytics-events.js","utf8");
  const app=readFileSync("app.js","utf8");
  const start=app.indexOf("const Encyclopedia = {");
  const end=app.indexOf("/* ---------------------------------------------------------------------\n   Boot",start);
  const source=app.slice(start,end)
    .replace("const Encyclopedia =","globalThis.Encyclopedia =")
    .replace("const Modal =","globalThis.Modal =");

  const modalBody={innerHTML:""};
  const overlay={style:{display:"none"}};
  const close={focus(){}};
  const events=[];
  const context={
    window:{},
    State:{careers:{meta:{family_profiles:{DS:{cn_name:"資料科學",class_title:"機率鍊金術士"}}}}},
    Nav:{},Results:{},
    document:{
      activeElement:null,
      getElementById(id){return id==="modal-body"?modalBody:id==="modal-overlay"?overlay:null;},
      querySelector(sel){return sel===".modal-close"?close:null;},
      addEventListener(){},removeEventListener(){}
    },
    track(name,payload){events.push({name,payload});},
    familyDetailHTML(famKey){return `<section data-role="${famKey}">detail</section>`;},
    console,Date,Math,Number,Object,
    famVars(){return "";},portraitHTML(){return "";},iconDotHTML(){return "";},
    deferFrame(fn){fn();},setTimeout(fn){fn();},clearTimeout(){},
    requestAnimationFrame(fn){fn();},ResizeObserver:undefined
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(registry,context);
  context.APP_EVENTS=context.window.DMAnalyticsEvents.EVENTS;
  vm.runInContext(source,context);

  assert.equal(typeof context.window.Encyclopedia.openFamily,"function");
  assert.equal(typeof context.window.DataMattersRoleDetail.open,"function");
  context.window.Encyclopedia.openFamily("DS");
  assert.equal(overlay.style.display,"flex");
  assert.match(modalBody.innerHTML,/data-role="DS"/);
  assert.equal(events.at(-1).payload.source,"career_guide");
});
