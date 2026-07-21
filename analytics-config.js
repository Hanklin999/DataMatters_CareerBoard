/* ==========================================================================
   analytics-config.js — 匿名使用分析設定
   純靜態站（無 bundler）以此檔取代 build-time 環境變數。

   ⚠️ 只能填 Supabase「Project URL」與「anon / publishable key」。
   anon key 依 Supabase 設計本來就會暴露在前端，安全性由 RLS 保證。
   絕對不要把 service_role key 填進這裡或任何前端檔案。

   SUPABASE_URL / SUPABASE_ANON_KEY 留空 = analytics 自動停用（網站功能不受影響）。
   ========================================================================== */
window.ANALYTICS_CONFIG = {
  // ⚠️ 這裡要填「Project API URL」（Settings → API → Project URL），
  //    格式必為 https://<project-ref>.supabase.co
  //    不要貼瀏覽器網址列的 Dashboard 網址（supabase.com/dashboard/...）——
  //    貼錯時 analytics.js 會驗證失敗並自動停用。
  SUPABASE_URL: "https://rmflseoygadbocpkgxyi.supabase.co",
  SUPABASE_ANON_KEY: "",   // Supabase Dashboard → Settings → API → anon public
  ANALYTICS_ENABLED: true, // false = 全域停用
  ANALYTICS_DEBUG: false,  // true = console 顯示事件 payload（開發用）
  APP_VERSION: "v1",
  SCORING_VERSION: "v2"
  // ANALYTICS_ENV 不用手動設定：localhost → local、
  // Netlify deploy preview（hostname 含 "--"）→ deploy_preview、其他 → production
};
