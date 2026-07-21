# Community server troubleshooting

部署後開啟：

`https://datamatters-hanks-career-board.netlify.app/.netlify/functions/community-health`

## server_not_configured

查看 JSON 的 `missing` 與 `invalid`：

- `SUPABASE_URL_OR_VITE_SUPABASE_URL`：Functions scope 的 Production context 沒有 Supabase Project URL。
- `SUPABASE_SERVICE_ROLE_KEY_OR_SECRET_KEY`：缺少 server-side key。
- `COMMUNITY_HASH_SALT`：沒有 salt，且沒有 server key fallback。
- `COMMUNITY_HASH_SALT_MIN_32_CHARS`：salt 少於 32 字元。
- `SUPABASE_URL_INVALID`：URL 不是乾淨的 `https://<project-ref>.supabase.co`。

所有變數修改後都要重新 Production Deploy。

## community_schema_missing

執行 `supabase/migrations/002_community_board.sql`。

## community_permission_missing

執行 `supabase/migrations/005_repair_community_read.sql`。

## community_database_unavailable

確認：

1. Supabase Project URL 與 secret/service-role key 來自同一個 project。
2. 若使用 `sb_secret_...`，新版程式只會送 `apikey` header。
3. Supabase 專案沒有 paused。
4. Netlify deploy logs 中沒有 Functions bundling error。
