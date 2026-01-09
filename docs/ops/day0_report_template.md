# Day-0 本番リハーサル 実行レポート

**実行日**: 2026-XX-XX
**実行者**: [Your Name]
**Environment**: Railway Production

---

## 1. 実行日時

| 項目 | 日時 |
|------|------|
| **リハーサル開始** (UTC) | 2026-XX-XX XX:XX:XX UTC |
| **リハーサル開始** (JST) | 2026-XX-XX XX:XX:XX JST |
| **リハーサル完了** (UTC) | 2026-XX-XX XX:XX:XX UTC |
| **リハーサル完了** (JST) | 2026-XX-XX XX:XX:XX JST |
| **所要時間** | XX 分 |

---

## 2. 環境変数設定

### Kill Switches
```bash
PIPELINE_ENABLED="true"
FETCH_SOURCES_ENABLED="true"
FETCH_DONATIONS_ENABLED="true"
```

### パイプライン制御
```bash
PIPELINE_MAX_ITEMS_PER_RUN="3"          # 初回は 3 件で様子見
PIPELINE_MAX_ITEMS_PER_SOURCE="2"       # 1 ソースあたり 2 件
PIPELINE_MAX_LLM_CALLS_PER_RUN="20"     # コスト管理
PIPELINE_STALE_PROCESSING_MINUTES="120"
PIPELINE_MAX_RETRY_PER_ITEM="2"
```

### レビュー基準
```bash
REVIEW_PASS_SCORE_MIN="65"              # 初回は甘めに設定
REVIEW_PASS_SCORE_AVG="75"              # 初回は甘めに設定
REVIEW_MAX_AUTOFIX_ATTEMPTS="2"
```

### LLM設定
```bash
LLM_PROVIDER="openai"
LLM_MODEL_WRITER="gpt-4o-mini"
LLM_MODEL_REVIEWER="gpt-4o-mini"
LLM_MODEL_CLASSIFY="gpt-4o-mini"
LLM_MODEL_REWRITE="gpt-4o-mini"
```

---

## 3. データ投入結果

### Sources（情報ソース）
| ID | 名前 | URL | カテゴリ | Active |
|----|------|-----|----------|--------|
| source_1 | UNHCR Venezuela News | https://example.com/rss | humanitarian | ✅ |
| source_2 | UNICEF Venezuela | https://example.com/feed | humanitarian | ✅ |
| source_3 | WFP Venezuela | https://example.com/rss | humanitarian | ✅ |

**Sources 登録数**: 3 件

### Campaigns（寄付キャンペーン）
| ID | 名前 | Provider | Priority | Active |
|----|------|----------|----------|--------|
| campaign_1 | UNHCR Venezuela Emergency | UNHCR | 10 | ✅ |

**Campaigns 登録数**: 1 件

---

## 4. Worker 実行結果

### 4.1 fetch-donations (KGI取得)

**実行コマンド**:
```bash
railway run --service web pnpm worker:fetch-donations
```

**サマリーログ**:
```
[fetch-donations] status=success total=1 success=1 failed=0 duration_ms=5432
```

**結果**:
- ✅ 成功
- 取得件数: 1 件
- 失敗件数: 0 件
- 所要時間: 5.4 秒

**Home (/) での確認**:
- ✅ KGI (累計寄付金額) が表示される: $XX,XXX,XXX USD
- ✅ 最終更新日時: 2026-XX-XX XX:XX JST

---

### 4.2 fetch-sources (情報ソース取得)

**実行コマンド**:
```bash
railway run --service web pnpm worker:fetch-sources
```

**サマリーログ**:
```
[fetch-sources] status=success total=3 added=15 skipped=2 duration_ms=9234
```

**結果**:
- ✅ 成功
- Sources 処理数: 3 件
- 新規追加: 15 件
- 重複スキップ: 2 件
- 所要時間: 9.2 秒

**raw_items 増分確認**:
| Status | 件数 |
|--------|------|
| NEW | 15 件 |
| PROCESSING | 0 件 |
| PROCESSED | 0 件 |
| HOLD | 0 件 |
| FAILED | 0 件 |

---

### 4.3 daily-pipeline (日次記事生成)

**実行コマンド**:
```bash
railway run --service web pnpm worker:daily-pipeline
```

**サマリーログ**:
```
[daily-pipeline] status=success processed=3 published=2 hold=1 failed=0 duration_ms=45231
```

**結果**:
- ✅ 成功
- 処理数: 3 件
- 公開 (PUBLISHED): 2 件 (66.7%)
- 保留 (HOLD): 1 件 (33.3%)
- 失敗 (FAILED): 0 件 (0%)
- 所要時間: 45.2 秒

**Pipeline Run 詳細** (from `/admin/ops`):
| Run ID | Status | Started At | Finished At | Results |
|--------|--------|-----------|-------------|---------|
| run_xxx | COMPLETED | 2026-XX-XX XX:XX | 2026-XX-XX XX:XX | published: 2, hold: 1, failed: 0 |

**raw_items 状態遷移確認**:
| Status | 変更前 | 変更後 | 差分 |
|--------|--------|--------|------|
| NEW | 15 | 12 | -3 (処理された) |
| PROCESSING | 0 | 0 | 0 (全て完了) |
| PROCESSED | 0 | 2 | +2 |
| HOLD | 0 | 1 | +1 |
| FAILED | 0 | 0 | 0 |

---

## 5. 公開記事の確認

### 記事一覧 (/news)
- ✅ 記事一覧が表示される
- 表示件数: 2 件 (PUBLISHED のみ)

### 記事詳細 (/news/[slug])

**確認した記事**:
1. **記事タイトル**: [記事1のタイトル]
   - ✅ FACT/INFERENCE/UNVERIFIED ブロックが色分けされて表示
   - ✅ FACT ブロックに evidence_urls のリンクが表示 (X 件)
   - ✅ 支援ボタンが表示される (Provider: UNHCR)

2. **記事タイトル**: [記事2のタイトル]
   - ✅ FACT/INFERENCE/UNVERIFIED ブロックが色分けされて表示
   - ✅ FACT ブロックに evidence_urls のリンクが表示 (X 件)
   - ✅ 支援ボタンが表示される (Provider: UNHCR)

---

## 6. 支援ボタンとクリック追跡

### /go リダイレクト確認
- ✅ `/news/[slug]` の支援ボタンをクリック
- ✅ `/go/{campaign_id}` にリダイレクト (302)
- ✅ 寄付ページ (UNHCR) が開く

### click_events 記録確認
| ID | Campaign ID | Clicked At | User Agent | Referer |
|----|-------------|-----------|-----------|---------|
| event_1 | campaign_1 | 2026-XX-XX XX:XX | Mozilla/5.0... | https://your-app.up.railway.app/news/... |

**click_events 記録件数**: 1 件 ✅

---

## 7. Admin Ops ダッシュボード確認

### Stats Overview
| Metric | Count |
|--------|-------|
| **Raw Items - NEW** | 12 |
| **Raw Items - PROCESSING** | 0 |
| **Raw Items - PROCESSED** | 2 |
| **Raw Items - HOLD** | 1 |
| **Raw Items - FAILED** | 0 |
| **Articles - PUBLISHED** | 2 |
| **Articles - HOLD** | 1 |
| **Articles - DRAFT** | 0 |
| **Stale PROCESSING** | 0 ✅ |
| **Retryable FAILED** | 0 ✅ |

### Today's Pipeline Runs
- Run ID: `run_xxx`
- Status: COMPLETED ✅
- Results: published=2, hold=1, failed=0

### Failed Items (もしあれば)
**件数**: 0 件 ✅

### Hold Articles (保留記事)
**件数**: 1 件

**Hold Article 詳細**:
| Title | Category | Created At | Review Result |
|-------|----------|-----------|---------------|
| [記事タイトル] | humanitarian | 2026-XX-XX | Score: 72.5/100 (平均), Hard Fail: なし |

**レビュースコア詳細**:
- Evidence: 75/100
- Neutrality: 70/100
- Overclaim: 72/100
- Dignity: 73/100
- Scope: 73/100
- **平均**: 72.6/100 (基準: 75.0 以上)

**不合格理由**:
- 平均スコアが基準（75.0）を下回った
- Hard Fail 違反はなし

**改善案**（LLM提案）:
1. [改善案1]
2. [改善案2]
3. [改善案3]

---

## 8. 気づき・問題点

### 成功した点 ✅
- すべての worker が正常に動作した
- 記事生成から公開まで一気通貫で動作した
- 支援ボタンとクリック追跡が正常に動作した
- /admin/ops でリアルタイム監視ができた

### 問題点・改善が必要な点 ⚠️
1. **HOLD 記事が 33% 発生**:
   - 原因: 平均スコアが基準（75.0）を下回った
   - 対応: REVIEW_PASS_SCORE_AVG を 70 に下げるか、プロンプト改善

2. **[その他の問題点があれば記載]**:
   - 原因: [原因を記載]
   - 対応: [対応方針を記載]

### コスト・パフォーマンス
- 処理時間: 約 45 秒 / 3 件 = **15 秒/記事**
- 推定 LLM 呼び出し: 3 件 × 平均 3 回 = **約 9 calls** (実測値は Railway ログで確認)
- 推定コスト: $X.XX (OpenAI Dashboard で確認)

---

## 9. 次のアクション

### 即座に実施
- [ ] **レビュー基準の調整**: `REVIEW_PASS_SCORE_AVG="70"` に下げる（合格率を上げる）
- [ ] **daily-pipeline の Cron を有効化**: `0 0 * * *` (UTC 0:00 = JST 9:00)
- [ ] **1週間の動作監視**: 毎朝 `/admin/ops` で結果を確認

### 中期的に実施（1〜2週間後）
- [ ] **プロンプト改善**: `prompts/writer.md` で中立表現を強調
- [ ] **Sources 追加**: 信頼性の高い sources を 3 → 5 件に増やす
- [ ] **パイプライン上限引き上げ**: `PIPELINE_MAX_ITEMS_PER_RUN="5"` に増やす

### Phase 2 移行（安定後）
- [ ] **fetch-sources の Cron 有効化**: `0 */12 * * *` (12時間ごと)
- [ ] **fetch-donations の Cron 有効化**: `0 */6 * * *` (6時間ごと)
- [ ] **レビュー基準の厳格化**: `REVIEW_PASS_SCORE_MIN="70"`, `REVIEW_PASS_SCORE_AVG="80"` に戻す

---

## 10. 運用開始判定

### 判定基準
- [x] すべての worker が正常に動作した
- [x] 最低 1 件の記事が公開された
- [x] 支援ボタンとクリック追跡が動作した
- [x] `/admin/ops` で運用状態を確認できた
- [ ] HOLD 記事の対応方針が決定した（レビュー基準調整 or プロンプト改善）

### 判定結果
**✅ Day-0 リハーサル完了 - Cron 自動運用を開始可能**

---

## 付録: 実行ログ（抜粋）

### fetch-donations ログ
```
🚀 Starting donation fetch worker...
Found 1 active campaigns

📊 Fetching: UNHCR Venezuela Emergency
✅ Success: 1234567.89 USD

✅ Donation fetch worker completed
[fetch-donations] status=success total=1 success=1 failed=0 duration_ms=5432
```

### fetch-sources ログ
```
🚀 Starting source fetch worker...
Found 3 active sources

📰 Processing: UNHCR Venezuela News (rss)
  📡 Fetching RSS from: https://example.com/rss
  Found 8 items in feed
  ✅ Success: 5 added, 3 skipped (duplicates)

[... 他の sources ...]

✅ Source fetch worker completed
📊 Total: 15 items added, 2 duplicates skipped
[fetch-sources] status=success total=3 added=15 skipped=2 duration_ms=9234
```

### daily-pipeline ログ
```
=== Daily Pipeline Worker Started ===
Max items per run: 3
Max items per source: 2
Max retry per item: 2
Found 3 active sources
Source "UNHCR Venezuela News": 2 NEW + 0 FAILED (retry) = 2 items
Source "UNICEF Venezuela": 1 NEW + 0 FAILED (retry) = 1 items
Total items to process: 3 (3)
Starting pipeline execution...

Pipeline started (runId: run_xxx)
Found 3 raw items to process
Processing raw item: raw_1 (UNHCR: Venezuela Crisis Update)
[... 処理ログ ...]
Article published: article_1

[... 他の raw items ...]

Pipeline completed: 2 published, 1 hold, 0 failed

[daily-pipeline] status=success processed=3 published=2 hold=1 failed=0 duration_ms=45231

=== Daily Pipeline Worker Completed ===
```

---

**レポート作成日**: 2026-XX-XX
**レポート作成者**: [Your Name]
