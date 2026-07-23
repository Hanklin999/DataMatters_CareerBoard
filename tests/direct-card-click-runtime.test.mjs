import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function makeClassList(){
  const values=new Set();
  return {
    add(name){values.add(name);},
    remove(name){values.delete(name);},
    toggle(name,on){if(on)values.add(name);else values.delete(name);},
    contains(name){return values.has(name);}
  };
}

test("a direct non-active role-card click centers and opens details in one action",()=>{
  const app=readFileSync("app.js","utf8");
  const start=app.indexOf("const Encyclopedia = {");
  const end=app.indexOf("/* ---------------------------------------------------------------------\n   Modal",start);
  const source=app.slice(start,end).replace("const Encyclopedia =","globalThis.Encyclopedia =");

  const listeners={};
  const track={style:{}};
  const arrows=[{},{}];
  const cards=[0,420,840].map((left,index)=>({
    dataset:{cardIndex:String(index),famKey:["A","B","C"][index]},
    offsetLeft:left,offsetWidth:400,tabIndex:index===0?0:-1,
    classList:makeClassList(),setAttribute(){},
  }));
  const viewport={
    clientWidth:800,dataset:{},style:{setProperty(){}},classList:makeClassList(),
    addEventListener(type,handler){listeners[type]=handler;},
    querySelector(sel){return sel===".ency-track"?track:null;},
    querySelectorAll(sel){return sel===".ency-card"?cards:[];},
    closest(){return {querySelectorAll(){return arrows;}};},
    contains(node){return cards.includes(node);}
  };
  const pager={innerHTML:""};
  const opened=[];
  const context={
    document:{getElementById(id){return id==="ency-carousel"?viewport:id==="ency-pagination"?pager:null;}},
    window:{matchMedia:()=>({matches:false}),addEventListener(){}},
    requestAnimationFrame:fn=>{fn();return 1;},deferFrame:fn=>{fn();return 1;},
    State:{careers:{meta:{family_profiles:{}}}},track(){},
    Modal:{open(){}},familyDetailHTML(){return "";},famVars(){return "";},portraitHTML(){return "";},iconDotHTML(){return "";},
    Date,Math,Number,ResizeObserver:undefined
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  const E=context.Encyclopedia;
  E.openFamily=fam=>opened.push(fam);
  E.bindCarousel();
  E.syncCarousel(0);

  const clickedCard=cards[2];
  listeners.click({
    target:{closest(sel){return sel===".ency-card"?clickedCard:null;}},
    preventDefault(){},stopPropagation(){}
  });

  assert.equal(E._activeIndex,2);
  assert.equal(track.style.transform,"translate3d(-640px,0,0)");
  assert.deepEqual(opened,["C"]);
});

test("atlas card shows technical learning copy",()=>{
  const app=readFileSync("app.js","utf8");
  const css=readFileSync("product-v3.css","utf8");
  assert.match(app, /技術學習/);
  assert.match(app, /tlevel_range/);
  assert.match(app,/roleTechnicalRequirement\(p\)/);
  assert.match(app,/需要 \$\{skills\.join\("、"\)\} 能力/);
  assert.match(css,/\.tech-difficulty\{display:flex;flex-direction:column/);
});

