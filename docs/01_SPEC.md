# Somos Venezuela（ソモス・ベネズエラ）統合仕様書

Version: v0.1
Status: Canon（システム仕様の唯一の正本）
Language: 日本語（標準）

---

## 0. 概要

### 0.1 プロジェクト名
**Somos Venezuela（ソモス・ベネズエラ）**
ベネズエラの復興を、世界中のチームで支えるための **オープンソース寄付プラットフォーム**。
本プロジェクトは資金を集金せず、信頼できる外部キャンペーンへの寄付を促進し、その **寄付金額（KGI）** を可視化する。

### 0.2 ビジョン（最初の一言）
> **あなたの関心が、ベネズエラへの架け橋になります。**
> ひとりの力では変えられない現状も、
> 世界中から集まる「一歩」が重なれば、大きな変化を生み出します。
> **ベネズエラの未来を、私たちと一緒に耕しませんか。**

### 0.3 対象スコープ
- 対象国：**ベネズエラのみ**
- 将来拡張：他国対応は行わない（必要なら別Webサイトとして構築）
- Phase 1：日本語ローンチ（YouTubeカードは日本語のみ）
- Phase 2：多言語（英語→スペイン語→話者数の多い順）

---

## 1. 北極星（KGI）と指標設計

### 1.1 KGI（Phase 1から必須）
- **KGI：寄付実行金額（Donation Amount）**
  - 本サイトが掲載する外部寄付キャンペーン（Donation Campaign）の **合計寄付金額** を日次取得し、累計として表示する

### 1.2 KGI計測方式（必須要件）
本システムは集金しないため、寄付金額は外部から取得する。
掲載可能なキャンペーンは、以下いずれかの方式で **検証可能な集計値が取得できるもの**に限る。

- **方式A（推奨）**：寄付キャンペーンページ上の公開合計（Total donated 等）を取得（スクレイピング）
- **方式B**：寄付基盤/APIが提供する合計金額を取得（API）
- **方式C（禁止）**：合計金額が取得できない寄付導線のみ（リンクのみ）
  - KGI要件を満たせないため掲載不可

### 1.3 補助KPI（任意）
- 寄付導線クリック数（/go 経由）
- 記事閲覧数、滞在時間等（将来）

---

## 2. 編集方針・品質方針（実装に反映すること）

本仕様は `docs/00_PHILOSOPHY.md` を上位方針として参照する。
本システムが生成・公開する記事は、以下を満たすこと。

- 中立性（政治的評価・断罪・煽り禁止）
- 事実/推測/未確認の明確な分離（色＋ラベル）
- 尊厳の保護（悲惨さの消費をしない）
- 出典の透明性（Factは出典必須）
- レビューゲート必須（ルール＋LLM）

---

## 3. ユーザー・権限・認証

### 3.1 ユーザー種別
- 一般閲覧者：公開サイトの閲覧、寄付導線への遷移
- 管理者：管理画面での設定/編集/運用、バッチ監視

### 3.2 認証
- 管理画面：メール＋パスワード
- 管理者権限はMVPでは単一ロールで良い（将来拡張可能）

### 3.3 監査ログ
- 管理画面での重要操作は監査ログを必ず残す
  - 対象：キャンペーン/ソース/テンプレ/プロンプト/記事の公開切替 等

---

## 4. 画面要件（Public）

### 4.1 Publicページ一覧
- **Home**
  - KGI（累計寄付金額）表示
  - KGIの最終更新日時
  - 最新記事への導線
  - 寄付キャンペーン一覧への導線
  - プロジェクト方針（Policy）への導線
- **Donation（寄付キャンペーン一覧）**
  - 目的別カテゴリで表示（難民/子ども/食料/医療/包括 等）
  - 各キャンペーンの合計金額（取得済みの最新値）
  - 「寄付する」ボタン（/go リダイレクト）
- **Daily記事一覧**
  - 日付/タイトル/要点（3点）/ステータス（公開のみ）
- **Daily記事詳細**
  - 記事本文（ブロック単位で Fact/推測/未確認の表示）
  - 出典リンク一覧
  - 寄付導線（目的別）
  - YouTubeカード（日本語のみ）
- **History**
  - 簡易年表（年/出来事/説明/出典URL）
  - 年表に沿った説明文（中立・事実中心）
- **Sources**
  - ホワイトリスト一覧（透明性）
- **Policy / About**
  - フィロソフィー、編集方針、事実/推測/未確認の定義、訂正方針、免責

### 4.2 Fact / 推測 / 未確認 の表示仕様（必須）
- ブロック単位で表示
- 視覚表現
  - Fact：緑（ラベル「事実」）
  - 推測：黄（ラベル「推測」）
  - 未確認：赤（ラベル「未確認」）
- 色覚配慮：必ずラベル併用
- Factには出典リンク（1つ以上）を紐づける

### 4.3 YouTubeカード（日本語のみ・手動キュレーション）
- 各カード項目
  - サムネイルURL
  - タイトル
  - チャンネル名
  - 動画内容の説明（100〜200字）
  - おすすめ理由（箇条書き2〜3）
  - 注意書き（本サイトが主張に同意するものではない等）
  - 動画リンク
- 表示箇所：Daily記事詳細の下部（推奨）
- 登録方法：管理画面から手動

---

## 5. 画面要件（Admin）

### 5.1 Adminページ一覧（MVP必須）
- **Dashboard**
  - KGI（累計/当日/直近推移）
  - 直近のバッチ実行結果（KGI取得・日次記事生成）
  - 重大エラー（パース失敗、取得失敗等）
- **Donation Campaigns**
  - キャンペーンCRUD
  - 金額取得テスト（手動チェック）
  - エラー表示（パース失敗理由等）
- **Sources（ホワイトリスト）**
  - ソースCRUD（RSS/スクレイプ、カテゴリ等）
  - 取得停止（is_active）
- **Articles**
  - 記事一覧（Published/Hold/Draft等）
  - 再生成、手動公開/非公開（緊急時）
- **Review Logs**
  - レビュー結果（カテゴリスコア、Fail理由）
  - ソース別の不合格率（将来）
- **Templates**
  - 記事テンプレの編集、バージョン発行、ロールバック
- **Prompts**
  - Writer/Reviewer/Revise の編集、バージョン管理、ロールバック
  - テスト実行（サンプル入力でReviewer確認）
- **YouTube Cards**
  - カードCRUD
- **History Editor**
  - 年表エントリCRUD、説明文編集

### 5.2 緊急停止スイッチ（推奨）
- Auto Publish をOFFにできる
- OFFの時は、合格しても公開せず Hold に送る（運用安全）

---

## 6. 情報源（ホワイトリスト）仕様

### 6.1 初期ホワイトリスト（v0）
- UNHCR
- UN Crisis Relief（Venezuela Humanitarian Fund 等）
- R4V
- UNICEF
- WFP
- MSF

### 6.2 取得方式
- RSS優先
- RSSが無い場合のみ低頻度スクレイピング
- 倫理配慮
  - robots.txt尊重
  - 低頻度
  - ETag/Last-Modified活用
  - リトライ上限、バックオフ

### 6.3 SNSの扱い
- 原則参照しない
- 例外：公式アカウントで、ホワイトリストに明記した場合のみ（MVPは原則未使用）

---

## 7. 記事生成（Daily）仕様

### 7.1 更新頻度
- 基本：日次
- 変化が小さい場合：3日〜週次に調整可能（運用設定）

### 7.2 記事の目的（品質）
- 30秒で状況が掴める
- "知りたい"が続く（次の疑問が自然に生まれる）
- 寄付まで迷いなく到達できる
- 中立性と尊厳を損なわない

### 7.3 記事テンプレ（差し替え可能）
- 記事はテンプレ定義（JSON）に沿って生成する
- テンプレは管理画面で更新し、バージョン管理/ロールバックできる
- 新規記事は最新テンプレで生成
- 過去記事は原則維持（必要なら再生成）

---

## 8. 歴史ページ（History）仕様

### 8.1 構成
- 簡易年表（年/出来事/説明/出典URL）
- 年表に沿った説明文（中立・事実中心）

### 8.2 更新頻度
- 週次目安（手動運用）

---

## 9. AIパイプライン（自動生成→レビュー→公開）

### 9.1 全体フロー（G0: 手動実行 / G1: 自動化）
1. **Fetch**: ホワイトリストから情報収集（RSS/スクレイプ） → raw_items (status=NEW)
2. **Pipeline実行**:
   - raw_items (NEW) を取得してPROCESSINGにロック
   - 記事生成（writer prompt + template）
   - ブロック検証（FACT must have evidence_urls）
   - 分類（classify prompt）
   - レビュー（Hard Fail + LLM scoring 0-100）
   - 不合格の場合: リライト（最大2回）
   - 合格: PUBLISHED
   - 不合格: HOLD
3. **状態更新**: raw_items を PROCESSED/HOLD/FAILED に更新
4. **Log**: PipelineRun に stats と logs を保存

### 9.2 raw_items 状態遷移（G1）
```
NEW → PROCESSING → PROCESSED (成功: 記事PUBLISHED)
               → HOLD (レビュー不合格)
               → FAILED (エラー)
```

**状態の説明:**
- **NEW**: 未処理（パイプライン実行対象）
- **PROCESSING**: 処理中（他のパイプラインからロック）
- **PROCESSED**: 記事が公開された（成功）
- **HOLD**: 記事が保留（レビュー不合格、管理者が手動で再実行可能）
- **FAILED**: 生成エラー（retry_count < MAX_RETRY なら再試行可能）

### 9.3 自動改修ルール
- 最大2回までリライト（合計3回レビュー）
- 3回目のレビューでも不合格: raw_item → HOLD
- HOLDは管理画面で原因確認し、ソース見直しまたは手動再実行の判断材料にする

### 9.4 リトライ方針（G1）
- **HOLD**: 自動リトライしない（管理者が手動で再実行）
- **FAILED**: retry_count < MAX_RETRY_PER_ITEM なら自動リトライ可能
- リトライ時は last_attempt_at を更新
- エラー理由は errorReason に保持

### 9.5 暴走防止（G1 必須）
日次パイプライン実行時の上限を環境変数で制御:
- `PIPELINE_MAX_ITEMS_PER_RUN="10"` - 1回の実行で処理する最大アイテム数
- `PIPELINE_MAX_ITEMS_PER_SOURCE="5"` - 1ソースあたりの最大アイテム数
- `PIPELINE_MAX_LLM_CALLS_PER_RUN="50"` - 1回の実行での最大LLM呼び出し数
- `PIPELINE_STALE_PROCESSING_MINUTES="120"` - PROCESSINGを stale とみなす時間（分）
- `PIPELINE_MAX_RETRY_PER_ITEM="2"` - アイテムごとの最大リトライ回数

### 9.6 Stale PROCESSING 回収（G1）
- PROCESSINGのまま `PIPELINE_STALE_PROCESSING_MINUTES` 以上経過したアイテムは "stale"
- 管理画面で手動回収（NEW に戻すか FAILED にする）
- 原因: プロセスクラッシュ、タイムアウト、デプロイ中断等

---

## 10. レビュー仕様（品質ゲート）

### 10.1 レビュー観点（カテゴリ別スコア：0-100）
- **Evidence（出典充足）**: FACTブロックに適切な出典があるか、数値に完全な情報（時期・範囲）があるか
- **Neutrality（中立性）**: 政治的評価語・感情語を避け、客観的な記述になっているか
- **Overclaim（過度な主張）**: 因果関係を断定していないか、推論を事実として提示していないか
- **Dignity（尊厳）**: 人々を数字だけで扱わず、差別的表現がないか
- **Scope（スコープ）**: ベネズエラ人道問題の範囲内か、政治的議論に踏み込んでいないか

### 10.2 スコア尺度（0-100統一）
- **90-100点**: 優秀 - 出典が完全、表現が完璧に中立的
- **70-89点**: 良好 - 出典あり、わずかな改善余地
- **40-69点**: 不十分 - 出典不足または中立性に問題
- **0-39点**: 不合格 - 出典なし、または重大な問題

### 10.3 合格基準（必須要件）
1. **Hard Fail違反がない**（以下を即座に検出）
   - 政治的評価語（独裁、圧政、弾圧、腐敗、暴君、専制、悪政、暴政、圧制）
   - 断罪表現（非難すべき、許されない、糾弾、断罪、批判すべき、責めるべき、罪深い、悪質）
   - 煽動表現（戦うべき、立ち上がるべき、打倒、革命、蜂起、闘争、抵抗すべき、反旗）
   - 過度な主観語（3箇所以上：悲劇的な、恐ろしい、ひどい、酷い、残虐な、衝撃的な、悲惨な）
   - クリックベイト（！！（連続）、衝撃、驚愕、必見、緊急）
2. **全カテゴリで70点以上**
3. **平均スコアが80.0以上**
4. **FACTブロックに evidence_urls が必須**（最低1つ。なければUNVERIFIEDに自動変換）

### 10.4 環境変数
- `REVIEW_PASS_SCORE_MIN="70"` - カテゴリ別最低スコア（0-100）
- `REVIEW_PASS_SCORE_AVG="80"` - 平均最低スコア（0-100）
- `REVIEW_FACT_EVIDENCE_REQUIRED="true"` - FACT必須出典チェック
- `REVIEW_MAX_AUTOFIX_ATTEMPTS="2"` - リライト最大回数

### 10.5 即Fail条件（Hard Fail Rules）
- FACTブロックに出典URLがない
- 政治的評価語・断罪表現・煽動表現が存在
- 過度な主観的・感情的表現（3箇所以上）
- タイトルに煽情的表現（クリックベイト）
- 扱わない話題が主題として含まれる
- 差別/侮蔑/個人特定の危険がある

### 10.6 ログ要件（必須）
- article_id、対象ソース、レビュー結果（スコア・Hard Fail理由・改善提案）
- 自動改修の差分（attemptNumber、Before/After）
- 採用テンプレ版本、採用プロンプト版本
- Fail原因の集計（ソース別・パターン別）

---

## 11. 寄付キャンペーンとKGI取得

### 11.1 Donation Campaign（掲載単位）
- 掲載対象：方式A/Bで寄付金額が取得できるキャンペーンのみ
- 目的別カテゴリを持つ（将来：複数カテゴリ）
- 外部リンクはホワイトリスト方式（改ざん防止）

### 11.2 金額取得（必須）
- 日次で各キャンペーンの合計金額を取得し履歴保存（donation_snapshots）
- 取得失敗時：
  - エラー理由をログに保存
  - 前回値を維持
  - 管理画面に"要対応"として表示

### 11.3 /go リダイレクト（任意だが推奨）
- /go/{campaign_id} で外部寄付ページへ302
- click log を保存（補助KPI）

---

## 12. システム構成・実行環境

### 12.1 デプロイ
- Railway
- Web（Public + Admin）
- Worker（cron/バッチ）
- DB（PostgreSQL推奨）

### 12.2 非機能（MVP目安）
- 低運用コスト（1人運用を想定）
- 障害時に原因が追えるログ
- 変更がロールバックできる（テンプレ/プロンプト）

---

## 13. データモデル（最小）

### 13.1 主テーブル案（MVP）
- `admin_users`
- `audit_logs`
- `donation_campaigns`
- `donation_snapshots`
- `click_events`
- `sources`
- `fetch_runs`（任意だが推奨）
- `raw_items`
- `articles`
- `article_blocks`
- `review_runs`
- `template_versions`
- `prompt_versions`
- `youtube_cards`
- `history_entries`

---

## 14. API（概要）

### 14.1 Public
- `GET /api/public/home`：KGI、最終更新、最新記事
- `GET /api/public/donations`：キャンペーン一覧（最新金額）
- `GET /api/public/articles?from=&to=`
- `GET /api/public/articles/{id}`
- `GET /api/public/history`
- `GET /api/public/sources`
- `GET /go/{campaign_id}`：302 + click log

### 14.2 Admin（認証必須）
- `CRUD /api/admin/donation-campaigns`
- `POST /api/admin/donation-campaigns/{id}/check`
- `CRUD /api/admin/sources`
- `POST /api/admin/pipeline/run`
- `CRUD /api/admin/articles`（公開切替、再生成）
- `GET  /api/admin/review-logs`
- `CRUD /api/admin/templates`
- `CRUD /api/admin/prompts`
- `CRUD /api/admin/youtube-cards`
- `CRUD /api/admin/history`

---

## 15. ジョブ / スケジュール（Worker）

### 15.1 Donation Fetch（KGI取得）
- 日次で実行
- 各キャンペーンの合計金額を取得し `donation_snapshots` に保存
- KGI表示は最新スナップショットの合計で算出

### 15.2 Daily Pipeline（記事生成）
- 日次で実行（運用で時間設定）
- Fetch → Write → Review → Revise(最大2) → Publish/Hold → Log

### 15.3 Weekly History（運用）
- 週1回目安で管理者が手動更新（リマインド表示は任意）

---

## 16. セキュリティ・コンプライアンス・著作権配慮

### 16.1 外部リンク制御（必須）
- 外部リンクは `donation_campaigns` / `sources` / `youtube_cards` に登録済みのみ許可
- 任意URL入力の公開は禁止

### 16.2 著作権配慮
- 文章の転載を避け、要約中心
- 引用が必要な場合は最小限＋出典明示（Policyに明記）

### 16.3 免責・訂正
- AI生成の限界、誤りがあり得ることを明記
- 訂正方針と問い合わせ先を明記

---

## 17. Appendix A：DailyテンプレJSON例（v1）

```json
{
  "template_id": "daily_v1",
  "sections": [
    {
      "section_id": "headline_3points",
      "title": "今日わかったこと（3点）",
      "prompt_hint": "30秒で理解できる要点を3つ。政治評価語は禁止。Fact/推測/未確認を明示。",
      "required": true
    },
    {
      "section_id": "impact_life",
      "title": "生活への影響（事実中心）",
      "prompt_hint": "医療/食料/教育/移動など生活項目で整理。Factには出典必須。",
      "required": true
    },
    {
      "section_id": "numbers",
      "title": "数字で見る（時点つき）",
      "prompt_hint": "数字は時点/対象期間/単位/出典URLをセットで提示。",
      "required": false
    },
    {
      "section_id": "unknowns",
      "title": "未確認・わからないこと",
      "prompt_hint": "推測で埋めず、Unverifiedとして理由を添える。",
      "required": true
    },
    {
      "section_id": "donate",
      "title": "支援する（寄付）",
      "prompt_hint": "目的別に寄付キャンペーンを提示。過剰な煽りは禁止。",
      "required": true
    }
  ]
}
```
