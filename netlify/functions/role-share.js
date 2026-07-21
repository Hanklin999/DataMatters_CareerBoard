const ROLE_MAP={
  "data-science-applied-modeling":{title:"機率鍊金術師",role:"資料科學與應用建模",image:"probability-alchemist.jpg"},
  "machine-learning-ai-engineering":{title:"智龍馴服者",role:"機器學習與 AI 工程",image:"wise-dragon-tamer.jpg"},
  "data-analytics-business-intelligence":{title:"真相追跡者",role:"資料分析與商業智慧",image:"truth-tracker.jpg"},
  "data-engineering-analytics-engineering":{title:"資料機甲鍛造師",role:"資料工程與分析工程",image:"data-mecha-smith.jpg"},
  "operations-research-decision-optimization":{title:"天元棋聖",role:"作業研究與決策優化",image:"tengen-go-sage.jpg"},
  "strategy-operations-consulting":{title:"星海領航士",role:"策略、營運與顧問",image:"star-sea-navigator.jpg"},
  "product-systems-solutions":{title:"系統構築法師",role:"產品、系統與解決方案",image:"system-weaving-mage.jpg"},
  "finance-risk-quantitative-analytics":{title:"不破盾衛",role:"金融、風險與量化分析",image:"unbreaking-shield-guard.jpg"},
  "data-governance-quality-responsible-data":{title:"資料律法王",role:"資料治理、品質與負責任資料",image:"king-of-data-law.jpg"}
};

function esc(value){
  return String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function originFrom(event){
  const candidates=[process.env.URL,process.env.DEPLOY_PRIME_URL,`https://${event.headers?.host||""}`];
  for(const value of candidates){
    try{
      const parsed=new URL(String(value||"").trim());
      if(parsed.protocol==="https:"||parsed.hostname==="localhost")return parsed.origin;
    }catch(_){}
  }
  return "https://datamatters-hanks-career-board.netlify.app";
}

exports.handler=async(event)=>{
  if(event.httpMethod!=="GET")return {statusCode:405,headers:{Allow:"GET"},body:"Method Not Allowed"};
  const roleId=String(event.queryStringParameters?.role||"").toLowerCase().trim();
  const role=ROLE_MAP[roleId]||ROLE_MAP["data-analytics-business-intelligence"];
  const origin=originFrom(event);
  const imageUrl=`${origin}/images/${encodeURIComponent(role.image)}`;
  const landing=new URL(origin+"/");
  landing.searchParams.set("utm_source","share_link");
  landing.searchParams.set("utm_medium","social");
  landing.searchParams.set("utm_campaign","result_share");
  landing.searchParams.set("utm_content",roleId||"data-analytics-business-intelligence");
  const shareUrl=`${origin}/share/${encodeURIComponent(roleId||"data-analytics-business-intelligence")}`;
  const title=`我的資料職涯角色是「${role.title}」｜Data Matters`;
  const description=`${role.role}。你是哪一種資料職涯角色？`;
  const html=`<!doctype html>
<html lang="zh-Hant"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(shareUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Data Matters">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:secure_url" content="${esc(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="${esc(role.title)}｜${esc(role.role)}角色圖片">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(imageUrl)}">
<meta http-equiv="refresh" content="1;url=${esc(landing.toString())}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090c16;color:#f0ecdd;font:16px/1.6 system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}main{max-width:520px}img{width:min(360px,82vw);aspect-ratio:1;object-fit:contain;border-radius:24px;display:block;margin:0 auto 24px;background:#11182a}a{color:#e8c86e}</style>
</head><body><main><img src="${esc(imageUrl)}" alt="${esc(role.title)}"><h1>${esc(role.title)}</h1><p>${esc(role.role)}</p><p>正在開啟 Data Matters…</p><p><a href="${esc(landing.toString())}">沒有自動跳轉時，點這裡繼續</a></p></main><script>setTimeout(()=>location.replace(${JSON.stringify(landing.toString())}),250);</script></body></html>`;
  return {statusCode:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=300, s-maxage=300","X-Content-Type-Options":"nosniff"},body:html};
};
