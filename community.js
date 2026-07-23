/* Data Matters community board — anonymous, one-level replies, server-validated. */
(() => {
  "use strict";
  const USER_TYPES=["","高中生","大學生","研究生","轉職中","在職","其他"];
  const EVENTS=(window.DMAnalyticsEvents&&window.DMAnalyticsEvents.EVENTS)||{};
  const API_BASE="/.netlify/functions";
  const state={sort:"latest",posts:[],loaded:false,loading:false};
  function uuid(){
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16);});
  }
  const sessionId=(()=>{try{let id=sessionStorage.getItem("dm_community_session");if(!id){id=uuid();sessionStorage.setItem("dm_community_session",id);}return id;}catch(_){return uuid();}})();
  const nickname=(()=>{try{let n=sessionStorage.getItem("dm_community_nickname");if(!n){n=`匿名探險者 ${Math.floor(100+Math.random()*900)}`;sessionStorage.setItem("dm_community_nickname",n);}return n;}catch(_){return `匿名探險者 ${Math.floor(100+Math.random()*900)}`;}})();

  function trackCommunity(name,props){if(!name)return;try{track(name,Object.assign({source_page:"community",environment:(window.DMAnalytics&&window.DMAnalytics.environment)||undefined},props||{}));}catch(_){}}
  function esc(v){return String(v??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}
  function relativeTime(value){const t=new Date(value).getTime();if(!Number.isFinite(t))return "剛剛";const s=Math.max(0,Math.round((Date.now()-t)/1000));if(s<60)return "剛剛";if(s<3600)return `${Math.floor(s/60)} 分鐘前`;if(s<86400)return `${Math.floor(s/3600)} 小時前`;if(s<604800)return `${Math.floor(s/86400)} 天前`;return new Intl.DateTimeFormat("zh-TW",{month:"short",day:"numeric"}).format(new Date(t));}
  function bucket(n){if(n===0)return "0";if(n<=2)return "1-2";if(n<=5)return "3-5";return "6+";}
  function validateNickname(v){const s=v.trim();if(s.length<2||s.length>20)return "暱稱需為 2–20 字。";if(/@|https?:\/\/|www\.|\d{8,}/i.test(s))return "暱稱不可包含 Email、電話或網址。";return "";}
  function validateContent(v,min,max){
    const s=v.trim();
    if(s.length<min||s.length>max)return `內容需為 ${min}–${max} 字。`;
    if(/<[^>]+>|\[[^\]]+\]\([^\)]+\)/.test(s))return "請直接輸入文字，不要貼入網頁程式碼或特殊排版語法。";
    const hasPersonalData = [
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
      /(?:\+?886[-\s]?)?0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/,
      /\b[A-Z][12]\d{8}\b/i,
      /https?:\/\/|www\./i,
      /(?:台|臺)?(?:北|中|南|東)?(?:市|縣|區|鄉|鎮).{0,18}(?:路|街|巷|弄)\s*\d{1,4}(?:號|樓)/
    ].some(pattern => pattern.test(s));
    if(hasPersonalData)return "請移除 Email、電話或其他個人資料後再發布。";
    return "";
  }

  const Community={
    async load(force=false){
      if(state.loading||(!force&&state.loaded))return;
      state.loading=true;Community.renderControls();document.getElementById("community-list").innerHTML='<div class="loading-state">正在載入留言…</div>';
      if(!state.loaded)trackCommunity(EVENTS.COMMUNITY_VIEWED);
      try{
        const url=new URL(`${location.origin}${API_BASE}/community-read`);url.searchParams.set("sort",state.sort);
        const res=await fetch(url,{headers:{"Accept":"application/json"}});const data=await res.json().catch(()=>({}));if(!res.ok){const error=new Error(data.message||"read_failed");error.details=data;throw error;}state.posts=Array.isArray(data.posts)?data.posts:[];state.loaded=true;Community.renderList();
      }catch(err){
        const setupMessages={
          server_not_configured:"留言板尚未連接資料庫，網站管理者需完成 Netlify 伺服器設定。",
          community_schema_missing:"留言板資料表尚未建立。",
          community_permission_missing:"留言板資料庫權限尚未完成設定。"
        };
        const message=setupMessages[err.message]||"留言板目前無法載入。請稍後再試；測驗與其他頁面不受影響。";
        const diagnostics=[...(err.details?.missing||[]),...(err.details?.invalid||[]),...(err.details?.invalid_url_sources||[])];
        const diagnosticHTML=diagnostics.length?`<div class="community-setup-note">檢查項目：${diagnostics.map(esc).join("、")}</div>`:"";
        document.getElementById("community-list").innerHTML=`<div class="error-state">${message}<br><button class="btn btn-ghost" onclick="Community.load(true)">重新載入</button>${setupMessages[err.message]?'<div class="community-setup-note">網站管理者可查看部署文件完成設定。</div>':''}${diagnosticHTML}</div>`;
      }
      finally{state.loading=false;}
    },
    renderControls(){
      const el=document.getElementById("community-controls");if(!el)return;
      el.innerHTML=`<div class="community-toolbar"><label class="community-sort-label">排序<select class="community-sort" aria-label="留言排序" onchange="Community.setSort(this.value)"><option value="latest" ${state.sort==="latest"?"selected":""}>最新</option><option value="replies" ${state.sort==="replies"?"selected":""}>回覆最多</option></select></label></div>`;
    },
    setSort(sort){state.sort=sort;trackCommunity(EVENTS.COMMUNITY_SORT_CHANGED,{sort});Community.load(true);},
    renderList(){
      const el=document.getElementById("community-list");if(!el)return;
      if(!state.posts.length){el.innerHTML='<div class="empty-state">目前還沒有留言。你可以成為第一個提問的人。</div>';return;}
      el.className="community-list";el.innerHTML=state.posts.map(p=>Community.card(p)).join("");
    },
    card(p){
      const replies=Array.isArray(p.replies)?p.replies:[];
      return `<article class="community-card" id="post-${esc(p.id)}"><div class="community-meta"><strong>${esc(p.nickname)}</strong>${p.user_type?`<span class="user-type">${esc(p.user_type)}</span>`:""}<span>${relativeTime(p.created_at)}</span></div><div class="community-content clamped" id="content-${esc(p.id)}">${esc(p.content)}</div>${String(p.content||"").length>180?`<button class="link-button" onclick="Community.toggleContent('${esc(p.id)}',this)">展開全文</button>`:""}<div class="community-actions"><button class="link-button" onclick="Community.openReplyForm('${esc(p.id)}')">回覆（${Number(p.reply_count||replies.length)}）</button><button class="link-button" onclick="Community.openReport('post','${esc(p.id)}')">檢舉</button></div>${replies.length?`<div class="community-replies">${replies.map(r=>`<div class="reply-card"><div class="community-meta"><strong>${esc(r.nickname)}</strong>${r.user_type?`<span class="user-type">${esc(r.user_type)}</span>`:""}<span>${relativeTime(r.created_at)}</span></div><div class="community-content">${esc(r.content)}</div><button class="link-button" onclick="Community.openReport('reply','${esc(r.id)}')">檢舉</button></div>`).join("")}</div>`:""}</article>`;
    },
    toggleContent(id,btn){const el=document.getElementById(`content-${id}`);el.classList.toggle("clamped");btn.textContent=el.classList.contains("clamped")?"展開全文":"收合";trackCommunity(EVENTS.COMMUNITY_POST_OPENED);},
    openPostForm(){trackCommunity(EVENTS.COMMUNITY_POST_FORM_OPENED);Community.openForm({type:"post"});},
    openReplyForm(postId){trackCommunity(EVENTS.COMMUNITY_REPLY_FORM_OPENED,{reply_count_bucket:bucket(state.posts.find(p=>p.id===postId)?.reply_count||0)});Community.openForm({type:"reply",postId});},
    openForm({type,postId}){
      const isPost=type==="post",started=Date.now();
      Modal.open(`<form class="form-grid" id="community-form" onsubmit="Community.submit(event,'${type}','${postId||""}',${started})"><h2>${isPost?"發布留言":"回覆留言"}</h2><p class="form-hint">身分由留言者自行選擇，網站不會另外驗證。請勿留下 Email、電話或其他個人資料。</p><div class="form-field"><label for="community-nickname">暱稱</label><input id="community-nickname" name="nickname" maxlength="20" value="${esc(nickname)}" required><span class="field-error" data-error="nickname"></span></div><div class="form-field"><label for="community-user-type">身分（選填）</label><select id="community-user-type" name="user_type">${USER_TYPES.map(u=>`<option value="${esc(u)}">${u||"不顯示"}</option>`).join("")}</select></div><div class="form-field"><label for="community-content">內容</label><textarea id="community-content" name="content" minlength="${isPost?10:2}" maxlength="${isPost?500:300}" placeholder="${isPost?"例如：我對資料分析有興趣，但不知道該先學 SQL 還是 Python……":"留下你的回覆……"}" required oninput="Community.updateCount(this,${isPost?500:300})"></textarea><div class="char-count" id="community-char-count">0 / ${isPost?500:300}</div><span class="field-error" data-error="content"></span></div><input class="honeypot" type="text" name="website" tabindex="-1" autocomplete="off"><label class="consent-row"><input type="checkbox" name="consent" required><span>我會尊重不同背景，不發布個人資料、廣告或攻擊內容。</span></label><div id="community-form-error" class="field-error" role="alert"></div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="Modal.close()">取消</button><button type="submit" class="btn btn-primary">${isPost?"發布留言":"送出回覆"}</button></div></form>`);
    },
    updateCount(el,max){const c=document.getElementById("community-char-count");if(c)c.textContent=`${el.value.length} / ${max}`;},
    async submit(event,type,postId,started){
      event.preventDefault();const form=event.currentTarget,fd=new FormData(form),isPost=type==="post";const nick=String(fd.get("nickname")||""),content=String(fd.get("content")||"");form.querySelector('[data-error="nickname"]').textContent=validateNickname(nick);form.querySelector('[data-error="content"]').textContent=validateContent(content,isPost?10:2,isPost?500:300);if(validateNickname(nick)||validateContent(content,isPost?10:2,isPost?500:300))return;
      const btn=form.querySelector('button[type="submit"]');btn.disabled=true;const payload={type,post_id:postId||undefined,nickname:nick.trim(),user_type:String(fd.get("user_type")||"")||null,content:content.trim(),consent:Boolean(fd.get("consent")),website:String(fd.get("website")||""),form_started_at:Number(started),session_id:sessionId};
      try{const res=await fetch(`${API_BASE}/community-submit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));if(!res.ok){const error=new Error(data.message||"submit_failed");error.details=data;throw error;}try{sessionStorage.setItem("dm_community_nickname",nick.trim());}catch(_){}Modal.close();Toast.show(isPost?"留言已發布":"回覆已發布");trackCommunity(isPost?EVENTS.COMMUNITY_POST_SUBMITTED:EVENTS.COMMUNITY_REPLY_SUBMITTED,{user_type:payload.user_type||"unspecified",content_length_bucket:content.length<50?"short":content.length<180?"medium":"long"});state.loaded=false;await Community.load(true);}
      catch(err){
        const messages={
          rate_limited:"發布太頻繁，請稍後再試。",
          personal_data:"請移除 Email、電話或其他個人資料後再發布。",
          submitted_too_fast:"請確認內容後稍等一下再發布。",
          blocked_content:"內容可能包含廣告、攻擊或垃圾訊息，請修改後再發布。",
          invalid_content:"請確認內容長度與格式。",
          invalid_nickname:"請使用 2–20 字的暱稱。",
          duplicate_content:"相同內容剛剛已發布，請勿重複送出。",
          consent_required:"請先同意留言板規範。",
          server_not_configured:"留言功能尚未連接資料庫，網站管理者需完成 Netlify 伺服器設定。",
          community_schema_missing:"留言資料表尚未建立，請通知網站管理者。",
          community_permission_missing:"留言資料庫權限尚未完成，請通知網站管理者。",
          community_schema_outdated:"留言資料庫版本尚未更新，請通知網站管理者。"
        };
        const errorBox=document.getElementById("community-form-error");
        if(errorBox){const diagnostics=[...(err.details?.missing||[]),...(err.details?.invalid||[]),...(err.details?.invalid_url_sources||[])];errorBox.textContent=(messages[err.message]||"目前無法發布，請稍後再試。")+(diagnostics.length?`（檢查：${diagnostics.join("、")}）`:"");}
        trackCommunity(isPost?EVENTS.COMMUNITY_POST_FAILED:EVENTS.COMMUNITY_REPLY_FAILED,{error_type:String(err.message||"unknown").slice(0,40)});
        btn.disabled=false;
      }
    },
    openReport(targetType,targetId){trackCommunity(EVENTS.COMMUNITY_REPORT_OPENED,{target_type:targetType});const reasons=["垃圾訊息","不當內容","人身攻擊","洩露個人資料","廣告或詐騙","其他"];Modal.open(`<form class="form-grid" onsubmit="Community.submitReport(event,'${targetType}','${targetId}')"><h2>檢舉內容</h2><div class="report-reasons">${reasons.map((r,i)=>`<label class="option"><input type="radio" name="reason" value="${r}" ${i===0?"required":""}><span>${r}</span></label>`).join("")}</div><div class="form-field"><label>補充說明（選填）</label><textarea name="detail" maxlength="200"></textarea></div><div id="report-error" class="field-error"></div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="Modal.close()">取消</button><button class="btn btn-primary" type="submit">送出檢舉</button></div></form>`);},
    async submitReport(event,targetType,targetId){event.preventDefault();const form=event.currentTarget,fd=new FormData(form),btn=form.querySelector('button[type="submit"]');btn.disabled=true;try{const res=await fetch(`${API_BASE}/community-report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({target_type:targetType,target_id:targetId,reason:String(fd.get("reason")||""),detail:String(fd.get("detail")||"").trim(),session_id:sessionId})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||"report_failed");Modal.close();Toast.show("已收到檢舉，謝謝你協助維護留言板。");trackCommunity(EVENTS.COMMUNITY_REPORT_SUBMITTED,{target_type:targetType,reason:String(fd.get("reason")||"")});}catch(_){document.getElementById("report-error").textContent="目前無法送出檢舉，請稍後再試。";btn.disabled=false;}}
  };
  window.Community=Community;
})();
