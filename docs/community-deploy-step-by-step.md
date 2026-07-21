# 留言板：Netlify + Supabase 逐步部署與檢查

## 先理解 `SUPABASE_URL_INVALID`

這代表 Function 找到了 `SUPABASE_URL` 或 `VITE_SUPABASE_URL`，但值不是乾淨的 Supabase Project URL。

唯一正確格式：

```text
https://<project-ref>.supabase.co
```

例如：

```text
https://rmflseoygadbocpkgxyi.supabase.co
```

以下都錯：

```text
https://supabase.com/dashboard/project/rmflseoygadbocpkgxyi
https://rmflseoygadbocpkgxyi.supabase.co/rest/v1
http://rmflseoygadbocpkgxyi.supabase.co
SUPABASE_URL=https://rmflseoygadbocpkgxyi.supabase.co
"https://rmflseoygadbocpkgxyi.supabase.co"
```

v3.8 會逐一檢查 `SUPABASE_URL` 與 `VITE_SUPABASE_URL`。只要其中一個是正確 Project URL，就會使用正確的那一個，不再讓錯誤的 `SUPABASE_URL` 蓋掉正確的 `VITE_SUPABASE_URL`。

## 步驟 1：從 Supabase 複製正確 URL

1. 進入 Supabase Dashboard。
2. 打開 Data Matters 使用的 project。
3. 進入 **Project Settings → API**（部分介面顯示為 **Settings → Data API**）。
4. 找到 **Project URL**。
5. 按 Copy。
6. 貼到純文字編輯器確認，只能有：

```text
https://xxxxxxxxxxxxxxxxxxxx.supabase.co
```

不要手動補 `/rest/v1`。

## 步驟 2：設定 Netlify `SUPABASE_URL`

1. Netlify → Data Matters site。
2. **Site configuration → Environment variables**。
3. 找到 `SUPABASE_URL`；沒有就新增。
4. Value 貼上剛剛複製的 Project URL。
5. `Contains secret values`：不必勾。
6. Scope：選 **Functions**。
7. Deploy context：至少填 **Production**。
8. 儲存。

`VITE_SUPABASE_URL` 可以保留，但建議值與 `SUPABASE_URL` 完全相同。

## 步驟 3：設定伺服器 Key

以下二選一：

```text
SUPABASE_SECRET_KEY
```

或：

```text
SUPABASE_SERVICE_ROLE_KEY
```

設定方式：

- Contains secret values：勾選
- Scope：Functions
- Deploy context：Production
- 不要使用 `VITE_` 前綴
- 不要把 key 放進 GitHub、`analytics-config.js` 或前端程式

`VITE_SUPABASE_ANON_KEY` 不能取代伺服器 Key。

## 步驟 4：設定其他必要變數

### `COMMUNITY_HASH_SALT`

- 至少 32 個字元
- 建議使用隨機 48–64 字元
- Contains secret values：勾選
- Scope：Functions
- Production：填值

### `COMMUNITY_ALLOWED_ORIGINS`

```text
https://datamatters-hanks-career-board.netlify.app
```

- Scope：Functions
- Production：填值
- 若需本機測試，可用逗號追加 `http://localhost:8888`

## 步驟 5：重新部署

環境變數存檔後：

1. Netlify → **Deploys**。
2. 點 **Trigger deploy**。
3. 選 **Clear cache and deploy site**。
4. 等 Production deploy 顯示 Published。

只改環境變數但沒有重新部署時，舊 Function 可能仍使用舊設定。

## 步驟 6：打開健康檢查

開啟：

```text
https://datamatters-hanks-career-board.netlify.app/.netlify/functions/community-health
```

### 成功

```json
{
  "ok": true,
  "database": true,
  "url_source": "SUPABASE_URL",
  "url_host": "rmflseoygadbocpkgxyi.supabase.co",
  "key_source": "SUPABASE_SECRET_KEY",
  "salt_source": "COMMUNITY_HASH_SALT"
}
```

### URL 錯誤

```json
{
  "ok": false,
  "message": "server_not_configured",
  "invalid": ["SUPABASE_URL_INVALID"],
  "invalid_url_sources": ["SUPABASE_URL"]
}
```

代表列出的變數值錯誤。重新複製 Project URL，不要猜。

### 缺 Key

```json
{
  "missing": ["SUPABASE_SERVICE_ROLE_KEY_OR_SECRET_KEY"]
}
```

### Salt 太短

```json
{
  "invalid": ["COMMUNITY_HASH_SALT_MIN_32_CHARS"]
}
```

### 資料表未建立

```json
{"message":"community_schema_missing"}
```

此時執行：

```text
supabase/migrations/002_community_board.sql
supabase/migrations/005_repair_community_read.sql
```

### 權限不足

```json
{"message":"community_permission_missing"}
```

重新執行：

```text
supabase/migrations/005_repair_community_read.sql
```

## 步驟 7：實際發布測試

1. 回到網站留言板。
2. 強制重新整理。
3. 發布一則不含 Email、電話或網址的測試留言。
4. 成功後重新整理，確認留言仍存在。

## Netlify Function 是否真的有部署

開啟：

```text
https://datamatters-hanks-career-board.netlify.app/.netlify/functions/community-health
```

若是 Netlify 404，確認 repository 內有：

```text
netlify/functions/community-health.js
netlify/functions/community-submit.js
netlify/functions/community-read.js
netlify.toml
```

`netlify.toml` 必須包含：

```toml
[build]
  functions = "netlify/functions"
```
