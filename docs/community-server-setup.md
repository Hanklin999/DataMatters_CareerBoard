# 留言板伺服器設定

留言板寫入經過 Netlify Functions，因此正式站至少需要一個 Supabase Project URL 和一個僅限伺服器使用的密鑰。

## Netlify Production 環境變數

在 Netlify 的 **Site configuration → Environment variables** 設定：

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<legacy service_role JWT>
```

Supabase Dashboard 若提供新版 server secret key，可改用：

```text
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SERVICE_ROLE_KEY` 與 `SUPABASE_SECRET_KEY` 二擇一。不可加上 `VITE_` 前綴，也不可提交到 GitHub。

另外建議設定：

```text
COMMUNITY_HASH_SALT=<至少 32 字元亂數>
COMMUNITY_ALLOWED_ORIGINS=https://datamatters-hanks-career-board.netlify.app
COMMUNITY_REQUIRE_TURNSTILE=false
```

若 Netlify 已有 `VITE_SUPABASE_URL`，v3.6 Function 可直接沿用；仍然必須存在一個 server-only secret key。

## 設定後要重新部署

儲存環境變數後，前往 **Deploys → Trigger deploy → Deploy site**。已部署的 Function 不會因為只儲存變數而自動更新 runtime。

## 健康檢查

部署完成後開啟：

```text
https://datamatters-hanks-career-board.netlify.app/.netlify/functions/community-health
```

正常結果：

```json
{"ok":true,"database":true}
```

常見錯誤：

- `server_not_configured`：缺 Project URL、server secret，或 hash salt／secret 長度不足。
- `community_schema_missing`：尚未執行 Community migration。
- `community_permission_missing`：service role／secret 沒有資料表權限。
- `community_database_unavailable`：Supabase 暫時無法連線或 URL／key 不屬於同一專案。
