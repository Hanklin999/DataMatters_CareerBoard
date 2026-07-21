/* ==========================================================================
   analytics-config.js — 匿名使用分析設定
   純靜態站（無 bundler）以此檔取代 build-time 環境變數。

   ⚠️ 只能填 Supabase「Project URL」與「anon / publishable key」。
   anon key 依 Supabase 設計本來就會暴露在前端，安全性由 RLS 保證。
   絕對不要把 service_role key 填進這裡或任何前端檔案。

   SUPABASE_URL / SUPABASE_ANON_KEY 留空 = analytics 自動停用（網站功能不受影響）。
   ========================================================================== */
window.ANALYTICS_CONFIG = {
  SUPABASE_URL: "https://supabase.com/dashboard/project/rmflseoygadbocpkgxyi",        // 例："https://xxxx.supabase.co"
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZmxzZW95Z2FkYm9jcGtneHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1OTI4NzgsImV4cCI6MjEwMDE2ODg3OH0.QR_VZcp58lHkcR8YzToJz8TDyRUfz-1QiiWUsRX_Z9s",   // Supabase Dashboard → Settings → API → anon public
  ANALYTICS_ENABLED: true, // false = 全域停用
  ANALYTICS_DEBUG: false,  // true = console 顯示事件 payload（開發用）
  APP_VERSION: "v1",
  SCORING_VERSION: "v2"
  // ANALYTICS_ENV 不用手動設定：localhost → local、
  // Netlify deploy preview（hostname 含 "--"）→ deploy_preview、其他 → production
};
