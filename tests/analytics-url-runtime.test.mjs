import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const registryCode=readFileSync("analytics-events.js","utf8");
const code=readFileSync("analytics.js","utf8");

function run(url){
  const calls=[];
  const store=new Map();
  const context={
    window:{
      ANALYTICS_CONFIG:{ANALYTICS_ENABLED:true,ANALYTICS_ENV:"production",SUPABASE_URL:url,SUPABASE_ANON_KEY:"anon-key"},
      DATA_MATTERS_APP_VERSION:"v3.4",
      crypto:{randomUUID:()=>"11111111-1111-4111-8111-111111111111"}
    },
    location:{hostname:"example.com",pathname:"/",search:""},
    document:{referrer:""},navigator:{maxTouchPoints:0},screen:{width:1200},
    sessionStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
    fetch:(...args)=>{calls.push(args);return Promise.resolve({ok:true,status:201});},
    URL,URLSearchParams,console,setTimeout,Uint8Array,Math
  };
  Object.assign(context.window,{window:context.window,location:context.location,document:context.document,navigator:context.navigator,screen:context.screen,sessionStorage:context.sessionStorage,fetch:context.fetch,URL,URLSearchParams,setTimeout});
  vm.createContext(context);
  vm.runInContext(registryCode,context);
  vm.runInContext(code,context);
  context.window.DMAnalytics.track(context.window.DMAnalyticsEvents.EVENTS.LANDING_VIEWED,{});
  return calls;
}

test("analytics only accepts a clean https Supabase project origin",()=>{
  for(const url of [
    "https://supabase.com/dashboard/project/rmflseoygadbocpkgxyi",
    "https://rmflseoygadbocpkgxyi.supabase.co/rest/v1",
    "http://rmflseoygadbocpkgxyi.supabase.co",
    "https://rmflseoygadbocpkgxyi.evil.com"
  ]) assert.equal(run(url).length,0,url);

  const calls=run("https://rmflseoygadbocpkgxyi.supabase.co");
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],"https://rmflseoygadbocpkgxyi.supabase.co/rest/v1/analytics_events");
});
