# 留言板管理與審核

## 原則

- 優先保留不同背景與選擇的正常討論。
- 個資、詐騙、廣告、仇恨、色情、威脅與人身攻擊應隱藏。
- 一般情況只改 `status`，不實體刪除。
- 留言是使用者觀點，不代表 Data Matters 背書。

## 查詢待處理檢舉

```sql
select r.*, p.nickname as post_nickname, p.content as post_content,
       rp.nickname as reply_nickname, rp.content as reply_content
from community_reports r
left join community_posts p
  on r.target_type = 'post' and r.target_id = p.id
left join community_replies rp
  on r.target_type = 'reply' and r.target_id = rp.id
where r.status = 'open'
order by r.created_at asc;
```

## 隱藏與恢復

```sql
update community_posts
set status = 'hidden', moderation_reason = 'personal_data', updated_at = now()
where id = '<post_uuid>';

update community_posts
set status = 'visible', moderation_reason = null, updated_at = now()
where id = '<post_uuid>';

update community_replies
set status = 'hidden', moderation_reason = 'harassment'
where id = '<reply_uuid>';
```

## 邏輯刪除

```sql
update community_posts
set status = 'deleted', moderation_reason = 'confirmed_spam', updated_at = now()
where id = '<post_uuid>';
```

## 結案檢舉

```sql
update community_reports
set status = 'resolved'
where id = '<report_uuid>';
```

## 查詢重複濫用來源

```sql
select fingerprint_hash, count(*) as posts_24h
from community_posts
where created_at >= now() - interval '24 hours'
  and fingerprint_hash is not null
group by 1
having count(*) >= 5
order by 2 desc;
```

第一版沒有永久封鎖表。需要封鎖時可先將該 fingerprint 的新內容改為 `pending`，並建立獨立 blocklist migration；不要在前端硬編碼。

## 個資外洩處理

1. 立即將內容改為 `hidden`。
2. 不在 Analytics、Issue 或公開討論複製原文。
3. 記錄最少必要的 moderation reason。
4. 若屬高風險個資，完成備份需求確認後改為 `deleted`，必要時再依資料保留政策實體刪除。
5. 檢查同一 fingerprint 是否有其他內容。
6. 檢討規則是否需要新增，但避免把具體個資寫入測試樣本。
