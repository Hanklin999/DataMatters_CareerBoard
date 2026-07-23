import fs from "node:fs";

const targets = {
  direct: "tests/direct-card-click-runtime.test.mjs",
  home: "tests/home-card-fan.test.mjs",
  mobile: "tests/mobile-role-readability.test.mjs",
};

for (const path of Object.values(targets)) {
  if (!fs.existsSync(path)) {
    throw new Error(`找不到 ${path}。請在 Repo 根目錄執行。`);
  }
}

function replaceExact(text, oldText, newText, label, { allowAlready = true } = {}) {
  if (text.includes(oldText)) {
    console.log(`更新：${label}`);
    return text.split(oldText).join(newText);
  }
  if (allowAlready && text.includes(newText)) {
    console.log(`略過：${label} 已是新版`);
    return text;
  }
  throw new Error(`找不到預期內容：${label}\n舊內容：${oldText}`);
}

function updateFile(path, transform) {
  const original = fs.readFileSync(path, "utf8");
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(path, updated, "utf8");
    console.log(`已寫入：${path}`);
  } else {
    console.log(`無需寫入：${path}`);
  }
}

// 1) Atlas 卡片：不要再綁死 template literal 的空白與 fallback 寫法。
//    改成確認「技術學習」與資料欄位 tlevel_range 都仍存在。
updateFile(targets.direct, (text) => {
  text = replaceExact(
    text,
    '/技術學習：\\$\\{p\\.tlevel_range\\|\\|"—"\\}/',
    '/技術學習/',
    "atlas 技術學習標題 assertion"
  );

  // 同一個 test 若還有舊的技術難度／技術深度說法，一併同步名稱。
  text = text
    .replaceAll("two-line technical difficulty copy", "technical learning copy")
    .replaceAll("技術難度", "技術學習")
    .replaceAll("技術深度", "技術學習");

  // 確保測試仍驗證資料欄位，而不是只驗證一段中文字。
  if (!/assert\.match\([^;\n]+\/tlevel_range\/\);/.test(text)) {
    const anchor = /(^[ \t]*)assert\.match\(([^,\r\n]+),\s*\/技術學習\/\);/m;
    const match = text.match(anchor);
    if (!match) throw new Error("無法在 direct-card test 找到技術學習 assertion。");
    text = text.replace(
      anchor,
      `${match[1]}assert.match(${match[2]}, /技術學習/);\n${match[1]}assert.match(${match[2]}, /tlevel_range/);`
    );
    console.log("新增：atlas tlevel_range 結構 assertion");
  }
  return text;
});

// 2) 首頁：同步目前真正存在的 CTA、提示文字與 v3.13.3 cache。
updateFile(targets.home, (text) => {
  text = replaceExact(
    text,
    "/翻開我的職涯角色/",
    "/開始 3 分鐘職涯測驗/",
    "首頁主要 CTA assertion"
  );

  text = text
    .replaceAll("/每次打開都會遇見不同角色/", "/點任一張卡也能開始測驗/")
    .replaceAll("3\\.13\\.2", "3\\.13\\.3")
    .replaceAll("3.13.2", "3.13.3");

  // 若仍殘留首頁舊 CTA 文案，直接阻止測試，避免下一輪才爆。
  const staleHomePhrases = [
    "翻開我的職涯角色",
    "每次打開都會遇見不同角色",
  ];
  for (const phrase of staleHomePhrases) {
    if (text.includes(phrase)) {
      throw new Error(`首頁測試仍殘留舊文案：${phrase}`);
    }
  }
  return text;
});

// 3) 手機角色詳情：不再綁死完整中文句子，改驗證技術學習標題與欄位來源。
updateFile(targets.mobile, (text) => {
  text = replaceExact(
    text,
    '/技術學習：\\$\\{p\\.tlevel_range/',
    '/技術學習/',
    "手機角色詳情技術學習 assertion"
  );

  text = replaceExact(
    text,
    "/需要 Python、統計建模與解釋模型結果的能力/",
    "/tlevel_range/",
    "手機角色詳情資料欄位 assertion"
  );

  text = text
    .replaceAll("角色詳情使用技術深度文字且不再顯示星星", "角色詳情使用技術學習文字且不再顯示星星")
    .replaceAll("技術難度", "技術學習")
    .replaceAll("技術深度", "技術學習");

  return text;
});

console.log("\n三個 product test 檔案已同步完成。");
