import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function makeClassList(){
  const set=new Set();
  return {toggle(name,on){if(on)set.add(name);else set.delete(name);},contains:name=>set.has(name)};
}

test("carousel arrow click advances exactly one card and centers it immediately", () => {
  const app=readFileSync("app.js","utf8");
  const start=app.indexOf("const Encyclopedia = {");
  const end=app.indexOf("/* ---------------------------------------------------------------------\n   Modal",start);
  const source=app.slice(start,end).replace("const Encyclopedia =","globalThis.Encyclopedia =");

  const cards=[0,420,840].map((left,index)=>({
    offsetLeft:left,
    offsetWidth:400,
    classList:makeClassList(),
    setAttribute(){},
    tabIndex:index===0?0:-1
  }));
  const inner={style:{}};
  const arrows=[{},{}];
  const viewport={
    clientWidth:800,
    dataset:{bound:"1"},
    style:{setProperty(){}},
    querySelector(sel){return sel===".ency-track"?inner:null;},
    querySelectorAll(sel){return sel===".ency-card"?cards:[];},
    closest(){return {querySelectorAll(){return arrows;}};}
  };
  const pager={innerHTML:""};
  const context={
    document:{getElementById(id){return id==="ency-carousel"?viewport:id==="ency-pagination"?pager:null;}},
    window:{matchMedia:()=>({matches:false})},
    requestAnimationFrame:fn=>{fn();return 1;},
    deferFrame:fn=>{fn();return 1;},
    cancelAnimationFrame(){},
    setTimeout:fn=>{fn();return 1;},
    clearTimeout(){},
    State:{careers:{meta:{family_profiles:{}}}},
    track(){},Modal:{open(){}},familyDetailHTML(){return "";},famVars(){return "";},portraitHTML(){return "";},iconDotHTML(){return "";},Date,Math,Number
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  const E=context.Encyclopedia;
  E._activeIndex=0;
  E.syncCarousel(0);

  E.scroll(1);
  assert.equal(E._activeIndex,1);
  assert.equal(inner.style.transform,"translate3d(-220px,0,0)");
  assert.equal(cards[1].classList.contains("is-active"),true);

  E.scroll(1);
  assert.equal(E._activeIndex,2);
  assert.equal(inner.style.transform,"translate3d(-640px,0,0)");
  assert.equal(cards[2].classList.contains("is-active"),true);
});
