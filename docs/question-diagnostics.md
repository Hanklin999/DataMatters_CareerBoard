# 題目層級診斷

## 記錄欄位

`quiz_question_answered` 只記錄結構化欄位：`question_id`、`quiz_step`、`selected_option`、`response_time_ms`、`changed_answer`、`previous_option`、`role_weight_mapping_version`、`app_version`、匿名 `session_id`。

不得記錄題目文字、姓名、Email、電話、暱稱、完整個人資料或留言內容。

## 核心指標

- **選項分布**：每題各選項比例。
- **平均／中位作答時間**：中位數較不受離群值影響。
- **修改率**：同一 session 同題第二次選擇不同答案的比例。
- **退出率**：看到某步驟後未進入下一步的 session 比例。
- **選項偏斜**：單一選項占比是否超過 80%。
- **區辨力**：選項是否能拉開最終角色分數或角色分群。
- **資訊量**：答案分布與結果關聯是否足以保留題目。

## 問題題目的判定標準

至少符合兩項才建議改題，避免因短期小樣本誤刪：

1. 樣本數至少 100，單一選項占比 > 80%。
2. 中位作答時間顯著高於全題中位數 1.5 倍。
3. 修改率 > 20%。
4. 該題所在步驟退出率高於其他步驟 10 個百分點。
5. 移除該題後，主角色分布與信心幾乎不變。
6. 訪談顯示使用者反覆誤解題意或認為選項有「正確答案」。

## SQL 範例

以下假設事件表為 `analytics_events`；請依實際欄位名稱調整。

### 選項分布

```sql
select
  question_id,
  selected_option,
  count(*) as answers,
  round(count(*)::numeric / sum(count(*)) over (partition by question_id), 4) as share
from analytics_events
where event_name = 'quiz_question_answered'
  and occurred_at >= now() - interval '30 days'
group by 1, 2
order by 1, answers desc;
```

### 作答時間與修改率

```sql
select
  question_id,
  percentile_cont(0.5) within group (order by response_time_ms) as median_ms,
  avg(response_time_ms) as average_ms,
  avg(changed_answer::int) as changed_rate
from analytics_events
where event_name = 'quiz_question_answered'
group by 1
order by median_ms desc;
```

### 步驟退出率

```sql
with viewed as (
  select distinct session_id, quiz_step
  from analytics_events
  where event_name = 'quiz_step_viewed'
), progressed as (
  select distinct session_id, quiz_step - 1 as prior_step
  from analytics_events
  where event_name = 'quiz_step_viewed' and quiz_step > 1
)
select
  v.quiz_step,
  count(*) as viewed_sessions,
  count(p.session_id) as progressed_sessions,
  1 - count(p.session_id)::numeric / nullif(count(*), 0) as exit_rate
from viewed v
left join progressed p
  on p.session_id = v.session_id and p.prior_step = v.quiz_step
group by 1
order by 1;
```

### 高偏斜題目

```sql
with shares as (
  select question_id, selected_option,
         count(*)::numeric / sum(count(*)) over (partition by question_id) as option_share
  from analytics_events
  where event_name = 'quiz_question_answered'
  group by 1, 2
)
select question_id, max(option_share) as largest_option_share
from shares
group by 1
having max(option_share) > 0.8
order by 2 desc;
```

## 刪除低資訊量題目的流程

1. 先確認埋點與版本沒有混用。
2. 切分新舊使用者、裝置與背景，確認偏斜不是樣本組成造成。
3. 先改文案或選項，再做版本比較。
4. 用離線重算比較移除前後的 Top 1、Top 3、低信心率與角色分布。
5. 確認沒有讓特定角色失去唯一辨識訊號。
6. 更新 `role_weight_mapping_version`、方法文件與測試。
7. 上線後至少觀察一個完整流量週期，再決定永久刪除。
