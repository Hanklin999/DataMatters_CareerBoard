import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

function classList(){const set=new Set();return{add:x=>set.add(x),remove:x=>set.delete(x),toggle(x,on){on?set.add(x):set.delete(x)},contains:x=>set.has(x)}}

test("a small pointer tap anywhere on a card opens details on pointerup",()=>{
  const app=readFileSync("app.js","utf8");
  const start=app.indexOf("const Encyclopedia = {");
  const end=app.indexOf("/* ---------------------------------------------------------------------\n   Modal",start);
  const source=app.slice(start,end).replace("const Encyclopedia =","globalThis.Encyclopedia =");
  const listeners={};
  const track={style:{}};
  const card={dataset:{cardIndex:"1",famKey:"B"},offsetLeft:420,offsetWidth:400,tabIndex:0,classList:classList(),setAttribute(){}};
  const first={dataset:{cardIndex:"0",famKey:"A"},offsetLeft:0,offsetWidth:400,tabIndex:0,classList:classList(),setAttribute(){}};
  const viewport={clientWidth:800,dataset:{},style:{setProperty(){}},classList:classList(),
    addEventListener(type,fn){listeners[type]=fn;},querySelector(sel){return sel===".ency-track"?track:null;},
    querySelectorAll(sel){return sel===".ency-card"?[first,card]:[];},closest(){return{querySelectorAll(){return[{},{}]}}},
    contains(node){return node===first||node===card;},setPointerCapture(){},releasePointerCapture(){}};
  const context={document:{getElementById(id){return id==="ency-carousel"?viewport:id==="ency-pagination"?{innerHTML:""}:null;}},
    window:{matchMedia:()=>({matches:false}),addEventListener(){}},requestAnimationFrame:fn=>{fn();return 1;},deferFrame:fn=>{fn();return 1;},
    State:{careers:{meta:{family_profiles:{}}}},track(){},Modal:{open(){}},familyDetailHTML(){return""},famVars(){return""},portraitHTML(){return""},iconDotHTML(){return""},
    Date,Math,Number,ResizeObserver:undefined};
  vm.createContext(context);vm.runInContext(source,context);
  const opened=[];context.Encyclopedia.openFamily=fam=>opened.push(fam);context.Encyclopedia.bindCarousel();context.Encyclopedia.syncCarousel(0);
  const target={closest(sel){return sel===".ency-card"?card:null;}};
  listeners.pointerdown({button:0,target,pointerId:7,clientX:220});
  listeners.pointerup({target,pointerId:7,clientX:223});
  assert.equal(context.Encyclopedia._activeIndex,1);
  assert.deepEqual(opened,["B"]);
});
