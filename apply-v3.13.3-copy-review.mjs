import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const changedFiles = new Set();
const notes = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`找不到 ${rel}。請在 DataMatters_CareerBoard Repo 根目錄執行。`);
  return fs.readFileSync(p, "utf8");
}

function write(rel, content) {
  const p = path.join(root, rel);
  fs.writeFileSync(p, content, "utf8");
  changedFiles.add(rel);
}

function replaceText(content, oldText, newText, label, required = true) {
  if (content.includes(oldText)) {
    const count = content.split(oldText).length - 1;
    content = content.split(oldText).join(newText);
    notes.push(`更新：${label}（${count} 處）`);
    return content;
  }
  if (content.includes(newText)) {
    notes.push(`略過：${label}（已是新版）`);
    return content;
  }
  if (required) throw new Error(`找不到預期文字：${label}\n舊文字：${oldText}`);
  notes.push(`略過：${label}（此版本未出現）`);
  return content;
}

function applyTextReplacements(rel, replacements) {
  let content = read(rel);
  const before = content;
  for (const item of replacements) {
    const [oldText, newText, label, required = true] = item;
    content = replaceText(content, oldText, newText, `${rel}｜${label}`, required);
  }
  if (content !== before) write(rel, content);
}

function findMatching(source, start, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`無法找到 ${openChar}${closeChar} 的結尾。`);
}

function findStringEnd(source, start) {
  let escaped = false;
  for (let i = start + 1; i < source.length; i++) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') return i;
  }
  throw new Error("無法找到 JSON 文字的結尾。");
}

function updateFamilyField(source, familyKey, field, value) {
  const profilesPos = source.indexOf('"family_profiles"');
  if (profilesPos < 0) throw new Error("careers.json 找不到 family_profiles。");
  const profilesOpen = source.indexOf("{", profilesPos);
  const profilesClose = findMatching(source, profilesOpen, "{", "}");

  const familyToken = JSON.stringify(familyKey);
  const familyPos = source.indexOf(familyToken, profilesOpen);
  if (familyPos < 0 || familyPos > profilesClose) throw new Error(`找不到職涯家族：${familyKey}`);
  const familyOpen = source.indexOf("{", familyPos);
  const familyClose = findMatching(source, familyOpen, "{", "}");

  const fieldToken = JSON.stringify(field);
  const fieldPos = source.indexOf(fieldToken, familyOpen);
  if (fieldPos < 0 || fieldPos > familyClose) throw new Error(`${familyKey} 找不到欄位：${field}`);

  const colon = source.indexOf(":", fieldPos + fieldToken.length);
  let valueStart = colon + 1;
  while (/\s/.test(source[valueStart])) valueStart++;

  let valueEnd;
  if (source[valueStart] === '"') valueEnd = findStringEnd(source, valueStart);
  else if (source[valueStart] === "[") valueEnd = findMatching(source, valueStart, "[", "]");
  else throw new Error(`${familyKey}.${field} 不是可更新的文字或文字陣列。`);

  const encoded = JSON.stringify(value);
  const current = source.slice(valueStart, valueEnd + 1);
  if (current === encoded) {
    notes.push(`略過：careers.json｜${familyKey}.${field}（已是新版）`);
    return source;
  }
  notes.push(`更新：careers.json｜${familyKey}.${field}`);
  return source.slice(0, valueStart) + encoded + source.slice(valueEnd + 1);
}

/* --------------------------------------------------------------------------
   index.html — only wording and version/cache strings
--------------------------------------------------------------------------- */
let index = read("index.html");
if (index.includes('window.DATA_MATTERS_APP_VERSION = "v3.13.1"')) {
  throw new Error("目前仍是 v3.13.1。請先執行 apply-v3.13.2-home-activation.ps1，或直接執行 apply-v3.13.1-to-v3.13.3.ps1。");
}

const indexReplacements = [
  ['點任一張卡也能開始測驗，選哪張都不會影響配對結果。', '點任一張卡也能開始測驗，選哪張都不會影響推薦結果。', '卡牌提示'],
  ['選填，不影響配對。', '選填，不會影響推薦結果。', '測驗前清楚度說明'],
  ['這一站只整理環境偏好，不影響職涯角色排名。', '這一站只了解你對工作環境的偏好，不會改變前面的職涯推薦。', '工作環境說明'],
  ['先顯示最接近你的方向，不用先完成兩層篩選。', '先顯示最接近你結果的職缺，也可以再切換方向或工作領域。', '職缺說明'],
  ['先看真實職能，再用角色設定幫你記住差異。', '先看每種工作的日常內容，再用角色形象幫你記住差異。', '職涯圖鑑說明'],
  ['技術投入怎麼看？', '需要多少技術學習？', '技術說明標題'],
  ['較少：以試算表、報表與溝通為主。中等：常用 SQL 或 Python 做分析。較多：需要模型、系統或軟體工程。', '較少：主要使用試算表、報表工具和溝通。中等：常用 SQL（查詢資料）或 Python（分析資料）。較多：需要學習建模、系統開發或軟體工程。', '技術程度說明'],
  ['平台與制度', '工具與規則', '工作重心象限'],
  ['分析與洞察', '分析與發現', '工作重心象限'],
  ['幫助沒有背景知識的使用者，看懂資料職涯差異並找到可探索方向。', '幫助還不熟悉資料工作的學生，看懂不同職涯在做什麼，找到下一個值得探索的方向。', '關於網站'],
  ['測驗不要求姓名、Email，也不建立個人帳號。網站使用匿名 session ID，可能記錄頁面瀏覽、測驗進度、角色開啟、職缺點擊、分享、留言板操作與評分，用於改善題目、閱讀體驗與使用流程。', '測驗不要求姓名、Email，也不用建立帳號。網站會用隨機代碼區分每次瀏覽，可能記錄看過哪些頁面、測驗進度、開啟的角色、職缺點擊、分享和評分，用來改善題目與操作流程。', '匿名使用分析'],
  ['資料不出售、不用於徵才或能力判斷；留言內容與暱稱不會傳入 Analytics。', '資料不會出售，也不會用來判斷求職或工作能力；留言內容與暱稱不會送進使用分析系統。', '資料用途說明'],
  ['結果來自自陳偏好，不是能力測驗。', '結果來自你自己填寫的偏好，不是能力測驗。', '限制說明'],
  ['尚未完成正式心理計量驗證。', '尚未完成正式的心理測驗驗證。', '限制說明'],
  ['product-v3.css?v=3.13.2', 'product-v3.css?v=3.13.3', 'CSS 版本'],
  ['window.DATA_MATTERS_APP_VERSION = "v3.13.2"', 'window.DATA_MATTERS_APP_VERSION = "v3.13.3"', '網站版本'],
  ['app.js?v=3.13.2', 'app.js?v=3.13.3', 'app.js 版本'],
  ['product-v3.js?v=3.13.2', 'product-v3.js?v=3.13.3', 'product-v3.js 版本'],
  ['community.js?v=3.10.0', 'community.js?v=3.13.3', 'community.js 版本', false]
];
for (const item of indexReplacements) {
  const [oldText, newText, label, required = true] = item;
  index = replaceText(index, oldText, newText, `index.html｜${label}`, required);
}
write("index.html", index);

/* --------------------------------------------------------------------------
   app.js — questions, result explanations, role-detail labels
--------------------------------------------------------------------------- */
applyTextReplacements("app.js", [
  ['coding: "程式能力"', 'coding: "程式基礎"', '背景名稱'],
  ['math_stats: "統計與數學"', 'math_stats: "統計與數學基礎"', '背景名稱'],
  ['business_domain: "商業與領域知識"', 'business_domain: "商業與產業理解"', '背景名稱'],
  ['software_eng: "軟體工程基礎"', 'software_eng: "程式開發基礎"', '背景名稱'],

  ['high: "你追求收入高上限，能接受波動"', 'high: "你追求更高的收入機會，也能接受一些變動"', '環境摘要'],
  ['label: "品牌與頭銜"', 'label: "公司名氣與職稱"', '環境摘要'],
  ['high: "你在意品牌與頭銜"', 'high: "你在意公司名氣與職稱"', '環境摘要'],
  ['low: "你對品牌與頭銜沒有強烈偏好"', 'low: "你對公司名氣與職稱沒有強烈偏好"', '環境摘要'],
  ['label: "工作保障"', 'label: "工作穩定"', '環境摘要'],
  ['high: "你能承受高壓與常態性衝刺"', 'high: "你能接受較快、較忙的工作節奏"', '環境摘要'],

  ['統計、資管、財工等（商管學院，程式比重高）', '商管相關，課程常用程式（例如統計、資管、財工）', '科系選項'],
  ['國貿、財金、會計等（商管學院，程式比重低）', '商管相關，課程較少用程式（例如國貿、財金、會計）', '科系選項'],
  ['電機、資工等（理工學院，程式比重高）', '理工相關，課程常用程式（例如資工、電機）', '科系選項'],
  ['物理、材料、土木、生科等（理工學院，程式比重低）', '理工相關，課程較少用程式（例如物理、材料、土木、生科）', '科系選項'],
  ['非商學院、非理工學院', '人文、社會、教育、設計或其他科系', '科系選項'],

  ['使用一個工具時，你多想理解背後原理？', '使用一個工具時，你會想花多少力氣了解它怎麼運作？', '測驗題目'],
  ['想徹底搞懂', '想深入了解', '測驗選項'],
  ['在限制下找出最佳安排', '在時間、預算有限時找出更好的安排', '測驗選項'],
  ['讓模型提供推薦或答案', '讓系統自動提供推薦或答案', '測驗選項'],
  ['在成本與時間限制下找最佳方案', '在成本與時間有限時找出更好的方案', '測驗選項'],
  ['哪一種責任最吸引你？', '哪一種工作責任最吸引你？', '測驗題目'],
  ['事情卡住時，你多喜歡找大家確認需求？', '事情卡住時，你比較喜歡怎麼釐清問題？', '測驗題目'],
  ['找大家一起確認', '和相關的人一起確認', '測驗選項'],
  ['你有多享受把事情做得穩定、可以反覆使用？', '你有多喜歡把成果做得穩定，之後能一直使用？', '測驗題目'],
  ['品牌與頭銜對你重要嗎？', '公司名氣與職稱對你重要嗎？', '測驗題目'],
  ['你需要多少工作保障？', '你有多重視工作穩定？', '測驗題目'],
  ['可階段性衝刺', '必要時可以忙一陣子', '測驗選項'],
  ['生活品質很重要', '生活平衡很重要', '測驗選項'],
  ['你能承受多高強度的工作節奏？', '你能接受多快、多忙的工作節奏？', '測驗題目'],
  ['能承受常態衝刺', '經常需要加快步調', '測驗選項'],

  ['你願意花時間練程式這種很難但很強的技能', '你願意花時間累積程式能力', '推薦理由'],
  ['你會想搞懂工具背後是怎麼運作的', '你想了解工具背後怎麼運作', '推薦理由'],
  ['你享受把事情做到穩定、每次都不出錯', '你喜歡把成果做得穩定、可以重複使用', '推薦理由'],
  ['你喜歡在有限資源下排出最好的安排', '你喜歡在資源有限時找出更好的安排', '推薦理由'],
  ['你喜歡打造讓資料自動運作的系統', '你喜歡建立能自動整理資料的工具', '推薦理由'],
  ['你擅長揪出錯誤與風險', '你喜歡找出錯誤與風險', '推薦理由'],
  ['你想做讓資料自動歸檔流動的幕後工具', '你想做讓資料自動整理與更新的工具', '推薦理由'],
  ['你想做會推薦、會回覆的 AI 系統', '你想做會推薦或回答問題的人工智慧（AI）系統', '推薦理由'],
  ['「從紀錄猜中未來」的謎題最吸引你', '用過去資料預測未來最吸引你', '推薦理由'],
  ['「限制下排出最好計畫」的謎題最吸引你', '在限制下找出更好的計畫最吸引你', '推薦理由'],
  ['你願意扛「確保零錯誤」的把關責任', '你願意負責把關資料與流程品質', '推薦理由'],
  ['你願意扛金錢與風險評估的責任', '你願意負責金錢與風險評估', '推薦理由'],

  ['你重視生活平衡，但「${p.cn_name}」的生活穩定屬性偏低，選擇公司與產業時需特別留意。', '你重視生活平衡，但「${p.cn_name}」在部分公司可能較忙或較不固定，選公司與產業時要多留意。', '環境取捨'],
  ['你重視工作保障，這條路線的穩定屬性偏低，兩者存在取捨。', '你重視工作穩定，但這類工作在部分公司可能較忙或較不固定，選公司時要多留意。', '環境取捨'],
  ['你追求收入上限，這條路線的薪資天花板屬性中等偏低，可能需要靠產業選擇彌補。', '你重視更高的收入機會，但這類工作的收入差異常和產業、公司及經驗有關。', '環境取捨'],
  ['這條路線常見高強度節奏，與你偏好的步調存在取捨。', '這類工作在部分公司步調較快，和你偏好的穩定節奏可能不同。', '環境取捨'],

  ['你較偏向用資料理解商業問題、協助團隊做決策，而不是投入底層系統與模型建置。', '你較喜歡用資料理解商業問題、協助團隊做決定，而不是深入建立系統或模型。', '結果摘要'],
  ['你偏向深入技術與模型本身，享受長時間把系統或演算法做深做穩，勝過頻繁的跨部門討論。', '你較喜歡深入研究技術與模型，也享受長時間把系統做穩，而不是頻繁開會討論。', '結果摘要'],
  ['你同時願意投入技術深度、也享受跨部門協作，適合站在技術與業務之間的橋樑型角色。', '你願意深入學習技術，也喜歡和不同團隊合作，適合連結技術與實際需求的角色。', '結果摘要'],
  ['你在技術投入與商業導向之間保持彈性，適合先從泛用型的資料分析角色開始探索。', '你對技術工作與商業問題都保持彈性，適合先從入門選擇較多的資料分析工作開始探索。', '結果摘要'],
  ['平台思維', '喜歡建立共用工具', '偏好標籤'],
  ['產品流程導向', '喜歡改善產品流程', '偏好標籤'],

  ['需要 SQL、報表與把數據說清楚的能力。', '常用 SQL（查詢資料）、報表工具，以及清楚解釋數字的能力。', '技術學習說明'],
  ['需要 Python、統計建模與解釋模型結果的能力。', '常用 Python、統計方法與預測模型，也要能解釋模型結果。', '技術學習說明'],
  ['需要機器學習、軟體工程與模型上線能力。', '需要機器學習、程式開發，以及把模型穩定放進產品中。', '技術學習說明'],
  ['需要 SQL、資料建模與穩定維護資料流程的能力。', '需要 SQL、資料表設計，以及建立穩定的資料處理流程。', '技術學習說明'],
  ['需要數學建模、最佳化與程式實作能力。', '需要數學建模、找出較佳方案的方法，以及程式實作。', '技術學習說明'],
  ['需要問題拆解、商業判斷與溝通推動能力。', '需要拆解問題、理解商業情境，以及清楚溝通與推動。', '技術學習說明'],
  ['需要需求拆解、流程設計與跨部門協作能力。', '需要理解需求、設計流程，以及和不同團隊合作。', '技術學習說明'],
  ['需要財務風險、統計分析與程式能力。', '需要理解財務風險、統計分析與程式工具。', '技術學習說明'],
  ['需要資料品質、規則設計與跨部門治理能力。', '需要檢查資料品質、制定規則，以及協調不同部門。', '技術學習說明'],

  ['🧭 為什麼推薦這條路線', '🧭 為什麼推薦這個方向', '角色詳情標題'],
  ['理由僅來自你的「工作內容偏好」作答；科系與環境偏好不會出現在這裡，也不影響排名。', '理由只根據你對工作內容的偏好；科系和工作環境不會影響推薦順序。', '角色詳情說明'],
  ['🎓 你的入門優勢與差距', '🎓 你目前的起點與可補強項目', '角色詳情標題'],
  ['還需補強（目前約 ${g.have}/5，常見起點約 ${g.need}/5）。', '可以再補強，會更接近這類工作的常見入門要求。', '背景差距說明'],
  ['起點為主觀參考值，用於估計補強成本，不代表能力上限。', '這裡只提供準備方向，不是能力評分，也不代表未來上限。', '背景說明'],
  ['你偏好的工作環境（不影響配對）', '你偏好的工作環境（不會改變推薦）', '環境標題'],
  ['配對程度：', '偏好相近程度：', '結果標籤'],
  ['技術深度：', '需要的技術學習：', '角色詳情標籤'],
  ['必學技能', '建議先學', '角色詳情標題'],
  ['🛠️ 第一個作品集', '🛠️ 第一個練習作品', '角色詳情標題'],
  ['日常工作與需要留意的地方', '平常做什麼、有哪些現實面', '角色詳情標題'],
  ['薪資、路徑與入行門檻', '薪資、發展路線與入門準備', '角色詳情標題'],
  ['🛤️ 職涯路徑', '🛤️ 常見發展路線', '角色詳情標籤'],
  ['🎫 入行門檻', '🎫 常見入門要求', '角色詳情標籤'],
  ['📌 小提醒', '📌 現實提醒', '角色詳情標籤'],
  ['🔎 可搜尋的實習職稱', '🔎 找實習時可搜尋的職稱', '角色詳情標籤'],
  ['角色設定與特性圖', '角色形象與工作特性', '角色詳情標題'],
  ['主觀啟發式評分，非統計量測', '用來幫助比較的簡化圖，不是正式測驗分數。', '特性圖說明'],
  ['哪些公司開過這種缺', '哪些公司曾招募這類工作', '角色詳情標題'],
  ['此家族目前尚無收錄的種子職缺。', '這個方向目前還沒有收錄範例職缺。', '無職缺提示'],
  ['技術難度：', '需要的技術：', '圖鑑卡片標籤'],

  ['工作內容偏好最契合，現階段最值得優先準備', '最接近你的工作偏好，建議先認識', '路線說明'],
  ['與主路線工作內容相近，技能重疊高、容易轉換', '工作內容相近，許多技能可以共用', '路線說明'],
  ['偏好有相當契合，但背景或技術需要額外補強', '你可能有興趣，但通常需要補更多技術或背景', '路線說明']
]);

/* --------------------------------------------------------------------------
   product-v3.js — result-page wording and comparisons
--------------------------------------------------------------------------- */
applyTextReplacements("product-v3.js", [
  ['更偏向限制下的最佳安排', '更偏向在限制下找出更好的安排', '角色差異'],
  ['更偏向金錢、風險與量化判斷', '更偏向用數字評估金錢與風險', '角色差異'],
  ['享受最佳化', '喜歡找出更好的安排', '精簡理由'],
  ['高度相符', '偏好很接近', '結果信心'],
  ['你最像', '最接近你的方向', '結果主標'],
  ['工作偏好匹配', '根據你的工作偏好', '結果區塊標籤'],
  ['這個訊號來自你的工作內容偏好，不是科系或收入期待。', '這個理由只根據你對工作內容的偏好，不會看科系或收入期待。', '推薦理由說明'],
  ['先認識真實職稱', '看看職場上的真實名稱', '工作名稱標籤'],
  ['查看完整職涯輪廓', '查看完整結果', '結果摘要入口'],
  ['了解你的工作偏好與技術投入。', '了解你偏好的工作方式與需要準備的技術。', '結果摘要說明'],
  ['你的技術投入：', '你願意投入的技術學習：', '結果摘要標題'],
  ['目前起點不決定適合度。', '目前的科系與基礎不會決定你是否適合。', '背景說明'],
  ['可補強：', '可以先補強：', '背景說明'],
  ['讀 5 份職缺', '讀 5 份真實職缺', '下一步'],
  ['工作環境偏好 不影響職涯角色排名。', '工作環境偏好 不會改變推薦順序。', '環境說明'],
  ['技術投入', '需要的技術學習', '角色比較標籤'],
  ['適合的成就感', '常見的成就感', '角色比較標籤'],
  ['最容易混淆', '常見誤解', '角色比較標籤']
]);

/* --------------------------------------------------------------------------
   community.js — public-facing form and moderation wording
--------------------------------------------------------------------------- */
applyTextReplacements("community.js", [
  ['請使用純文字，不要加入 HTML 或 Markdown。', '請直接輸入文字，不要貼入網頁程式碼或特殊排版語法。', '輸入格式提醒'],
  ['身分為使用者自行選擇，未經驗證。', '身分由留言者自行選擇，網站不會另外驗證。', '身分說明'],
  ['最多回覆', '回覆最多', '排序名稱']
]);

/* --------------------------------------------------------------------------
   data/careers.json — nine core career-family descriptions
--------------------------------------------------------------------------- */
let careersRaw = read("data/careers.json");
JSON.parse(careersRaw); // validate before changing

const profiles = {
  "Strategy, Operations & Consulting": {
    tagline: "把模糊的商業問題拆清楚，用資料找出原因並提出可行建議。",
    role_description: "把公司的問題拆成可以研究的小題目，用資料和訪談找出原因，再整理成主管或客戶能採取的建議。重點是問題拆解、商業判斷與溝通。",
    entry_requirements: "不限特定科系。常見準備包括 Excel、SQL、簡報，以及把大問題拆成小問題的能力；程式通常不是主要門檻。",
    tip: "這類工作很重視把複雜內容講清楚。技術要求通常較低，但競爭者背景很多元，顧問公司也可能有較長工時。",
    daily_tasks: ["把商業問題拆成可以分析的小題目", "用 Excel 或 SQL 整理營運資料", "把分析整理成簡報與行動建議", "訪談不同部門，確認真正的問題"],
    starter_skills: ["Excel 資料整理與基本模型", "SQL（查詢資料）", "簡報與數據說明", "把大問題拆成小問題"],
    starter_portfolio: "挑一家熟悉的公司，用公開資料做一份 10 頁內的改善提案，清楚說明問題、證據和三項建議。"
  },
  "Finance, Risk & Quantitative Analytics": {
    cn_name: "金融風險與量化分析",
    tagline: "用資料和模型找出詐欺、評估信用與交易風險，幫金融公司降低損失。",
    role_description: "用資料和統計模型判斷哪些交易可能有詐欺、哪些借款可能違約，幫金融公司降低損失。因為結果會影響金錢與客戶，工作特別重視準確、可解釋與符合法規。",
    entry_requirements: "常見背景包含統計、財金、財工或資工。需要 Python、SQL、基本機器學習，以及金融或法規常識。",
    tip: "不同職位差異很大：有些偏財務分析與法規，有些偏程式和模型。看職缺時要先確認實際工作內容。",
    daily_tasks: ["檢查交易、信用或市場資料中的風險", "建立或使用模型協助判斷風險", "追蹤模型與規則是否仍然有效", "向業務、稽核或法規團隊說明結果"],
    starter_skills: ["統計與機率", "Python 與 SQL", "基本分類模型（判斷不同類別）", "金融與風險基本概念"],
    starter_portfolio: "用公開或模擬資料做一個信用或詐欺風險分析，說明風險指標、判斷方法、結果與限制。"
  },
  "Product, Systems & Solutions": {
    tagline: "分析使用者怎麼使用產品，和產品團隊一起決定下一步要改善什麼。",
    role_description: "分析使用者怎麼使用網站或 App，例如在哪一步離開、哪些功能真的有幫助，再和產品經理、設計師與工程師一起決定下一步要改善什麼。",
    entry_requirements: "常用 SQL 和 Python，也要了解 A/B 測試（比較兩個版本）與使用者流程分析。工作需要產品思考與跨部門溝通。",
    tip: "這類工作不只做報表，也要理解使用者、提出問題並推動改進。不同公司的職稱可能是 Product Analyst、Business Analyst 或 Product Data Scientist。",
    daily_tasks: ["分析使用者從進入到完成目標的每一步", "比較兩個版本，判斷哪個效果較好", "定義產品需要追蹤的指標", "和產品、設計與工程團隊討論下一步"],
    starter_skills: ["SQL（查詢資料）", "A/B 測試（比較兩個版本）", "使用者流程與回訪分析", "一種網站或 App 分析工具"],
    starter_portfolio: "分析公開電商資料，畫出使用者從瀏覽到購買的流程，找出最多人離開的步驟並提出三項改善建議。",
    next_step: "先完成一份回答「使用者在哪裡離開、可能為什麼」的產品流程分析，不需要一開始就學機器學習。",
    tradeoffs: ["分析是否產生影響，仍取決於團隊是否採用建議", "需要常向非技術同事解釋數據", "有些時間會花在確認追蹤資料是否正確"]
  },
  "Data Analytics & Business Intelligence": {
    cn_name: "資料分析與商業智慧（BI）",
    tagline: "把散落的資料整理成報表和重點指標，幫團隊看懂目前發生什麼。",
    role_description: "從不同系統找出需要的資料，整理成可信的報表與指標，追蹤業務發生什麼、哪裡不正常，幫主管與團隊做決定。這是常見的資料職涯入門方向。",
    entry_requirements: "SQL 是主要工具，接著學一種報表工具，例如 Tableau 或 Power BI。理解業務問題和說清楚數字，通常比複雜程式更重要。",
    tip: "這是常見的入門方向，但工作不只是做圖表。好的分析師要能確認數字正確，也要回答數字背後的原因。",
    daily_tasks: ["用 SQL 找出需要的資料", "建立與維護視覺化報表", "追蹤重要指標並找出異常", "向團隊解釋數字代表什麼"],
    starter_skills: ["SQL（查詢資料）", "一種報表工具", "試算表資料整理", "指標定義與數據說明"],
    starter_portfolio: "選一個商業問題，使用公開資料建立互動報表，清楚標出重要指標、異常與三項行動建議。",
    next_step: "先完成一份能回答商業問題的互動報表。學會 SQL 加一種報表工具，就能開始準備相關實習與初階職缺。"
  },
  "Data Governance, Quality & Responsible Data": {
    tagline: "確保公司的資料有清楚定義、品質可靠，而且被正確、安全地使用。",
    role_description: "訂出公司資料的共同定義、品質標準與使用規則，避免不同團隊用同一個名稱卻算出不同答案，也確保資料使用符合法規。",
    entry_requirements: "需要 SQL 和基本資料庫概念，也要細心、能寫清楚規則並協調不同部門。程式通常不是主要門檻。",
    tip: "這類工作不像資料科學那樣常做預測模型，但對金融、醫療與大型企業非常重要，也常和法規、資安及資料工程合作。",
    daily_tasks: ["定義重要資料與指標的共同標準", "檢查資料是否完整、正確和一致", "整理資料由哪裡來、被誰使用", "和法規、資安與各部門協調資料規則"],
    starter_skills: ["SQL 與資料庫基本概念", "資料品質檢查", "資料定義表（data dictionary）", "規則撰寫與跨部門溝通"],
    starter_portfolio: "為一份公開資料建立資料定義表、品質檢查規則、負責人與使用權限，說明如何讓不同使用者得到一致答案。"
  },
  "Data Science & Applied Modeling": {
    cn_name: "資料科學與預測模型",
    tagline: "用過去資料建立預測模型，幫公司估計需求、風險或使用者行為。",
    role_description: "用過去資料找出規律並建立預測模型，例如預測需求、顧客是否離開或價格變化。除了做模型，也要確認結果可靠，並向團隊說明模型能做什麼、不能做什麼。",
    entry_requirements: "常見需要 Python、SQL、統計和機器學習。部分職缺偏好碩士，但也可以用完整作品與實習經驗證明能力。",
    tip: "工作不只是在調整模型準確率。資料整理、問題定義、結果解釋與後續使用，通常占了更多時間。",
    daily_tasks: ["整理資料並挑選有幫助的資訊", "建立與比較預測模型", "檢查模型在新資料上是否可靠", "向團隊說明結果、限制與使用方式"],
    starter_skills: ["Python 與 SQL", "統計與機率", "如何建立與評估預測模型", "清楚解釋模型結果"],
    starter_portfolio: "用公開資料做一個完整預測專案，包含資料整理、模型比較與結果檢查，重點說明問題、方法、結果與限制。"
  },
  "Operations Research & Decision Optimization": {
    tagline: "用數學方法，在時間、成本和人力有限時找出更好的排程、路線或資源安排。",
    role_description: "把排班、庫存、配送路線或定價問題轉成數學條件，再用程式找出成本較低或效率較高的方案。",
    entry_requirements: "常見背景包括工業工程、應用數學、資工或供應鏈。需要把現實問題轉成數學條件，部分研究型職缺偏好碩士以上。",
    tip: "這類工作很適合喜歡數學與營運問題的人，但職稱不一定寫作 Operations Research，也可能叫 Decision Scientist、Optimization Scientist 或 Supply Chain Scientist。",
    daily_tasks: ["把營運問題整理成可以計算的條件", "用最佳化工具找出較好的方案", "比較不同方案的成本與限制", "和營運或供應鏈團隊實際試行"],
    starter_skills: ["基本數學最佳化", "Python", "作業研究或工業工程基礎", "把現實問題轉成計算條件"],
    starter_portfolio: "用最佳化工具 OR-Tools 做一個排班、配送或庫存安排專案，比較原本做法與新方案的成本和限制。",
    next_step: "先修一門作業研究或最佳化入門課，再用一個小型排程或路線問題練習把現實限制寫成計算條件。"
  },
  "Data Engineering & Analytics Engineering": {
    tagline: "建立會自動收集、整理與更新資料的流程，讓其他人能放心使用資料。",
    role_description: "建立與維護自動收集、清理和更新資料的流程，把散落各處的原始資料整理成分析師和模型可以直接使用的資料表。",
    entry_requirements: "需要 SQL、Python 和程式開發基礎，再學一種雲端平台，以及自動處理資料的工具。",
    tip: "這份工作很像專門處理資料的軟體工程。比起做漂亮分析，更重視資料是否準時、正確、穩定。",
    daily_tasks: ["建立自動收集、清理與更新資料的流程", "設計資料表和資料儲存方式", "檢查資料是否準時、正確", "改善查詢速度與雲端使用成本"],
    starter_skills: ["SQL（進階）", "Python", "雲端平台基本操作", "自動化資料工具（Airflow 或 dbt）"],
    starter_portfolio: "建立一個每天自動抓取公開資料、清理後寫入資料庫的流程，加入錯誤檢查、測試與簡單說明文件。"
  },
  "Machine Learning & AI Engineering": {
    tagline: "把機器學習模型做成使用者真的能使用、而且能穩定運作的產品功能。",
    role_description: "把機器學習模型放進真實產品，例如推薦內容、辨識風險或生成文字，並確保大量使用者同時使用時仍然快速、穩定。這份工作同時需要軟體工程與機器學習。",
    entry_requirements: "需要扎實的程式開發、機器學習和系統設計。許多職缺偏好資工或資料科學碩士，是九個方向中通常需要準備較久的一種。",
    tip: "這類職位不是只會呼叫 AI 工具就能勝任。公司通常期待你能寫可靠的程式、測試系統，並處理模型上線後的問題。",
    daily_tasks: ["訓練模型並放進正式產品", "建立讓產品呼叫模型的服務", "監控模型是否變慢、失準或出錯", "和資料科學家與軟體工程師一起整合功能"],
    starter_skills: ["Python 與軟體工程", "一種深度學習工具（例如 PyTorch）", "系統設計入門", "模型部署與監控概念"],
    starter_portfolio: "建立一個可透過網頁或 API 使用的小型 AI 功能，加入測試、速度紀錄、錯誤處理與模型表現說明。",
    next_step: "先把程式開發基礎打穩，包括 Git、測試和 API。這個方向首先要能把軟體做穩。"
  }
};

for (const [familyKey, fields] of Object.entries(profiles)) {
  for (const [field, value] of Object.entries(fields)) {
    careersRaw = updateFamilyField(careersRaw, familyKey, field, value);
  }
}
JSON.parse(careersRaw); // validate after changing
write("data/careers.json", careersRaw);

console.log("");
console.log("完成：Data Matters v3.13.3 全站文字易讀性調整");
console.log("只修改文字內容、版本字串與靜態檔案快取版本；未調整 DOM、CSS、互動、計分或資料架構。");
console.log("");
console.log("修改檔案：");
for (const file of changedFiles) console.log(`- ${file}`);
console.log("");
console.log("請執行：");
console.log("npm run validate");
console.log("git diff -- index.html app.js product-v3.js community.js data/careers.json");
console.log('git add index.html app.js product-v3.js community.js data/careers.json');
console.log('git commit -m "Simplify site copy for student audiences"');
console.log("git push");
