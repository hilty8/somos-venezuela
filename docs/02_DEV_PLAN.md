# Somos Venezuela（ソモス・ベネズエラ）開発計画 / 実装タスク分解

Version: v0.1
Status: Canon（開発計画の唯一の正本）
Language: 日本語（標準）

---

## 0. このドキュメントの目的
本ドキュメントは、`docs/01_SPEC.md` を実装するための **開発順序**と **タスク粒度**を定義する。
ClaudeCode 等の自動実装においても、ブレずに安全に進めるための「上位計画」として扱う。

参照（上位方針）：
- `docs/00_PHILOSOPHY.md`（価値観・中立性・尊厳・KGI）
- `docs/01_SPEC.md`（仕様の唯一の正本）

---

## 1. 開発の基本方針（ガードレール）

### 1.1 Vertical Slice優先
毎回「動く価値」を出す。
M0→M1→M2 の順で、ユーザー価値（＝公開サイトの成立）を早期に実現する。

### 1.2 KGIは最初から寄付金額（Phase 1から必須）
KGIはクリック数ではなく、必ず **寄付金額（Donation Amount）** を計測・表示する。
寄付金額が取得できないキャンペーンは掲載しない。

### 1.3 外部依存は壊れる前提で設計する
寄付ページのHTML構造は変わる。
よって **金額抽出のパーサ設定（selector/regex/正規化）を管理画面から変更可能**にする。

### 1.4 AIは不確実である（レビューゲート必須）
AI生成記事は誤り得る。
必ず公開前に以下を通す：
- ルールベース検査（Hard Fail）
- LLMレビュー（スコア＋指摘）

### 1.5 Prompt/Templateは事故る前提（版管理とロールバック必須）
プロンプト・テンプレは「資産」であり、変更は事故を起こし得る。
必ず以下を備える：
- バージョン管理
- active切替
- ロールバック
- 監査ログ

### 1.6 表示はアクセシブルに
Fact/推測/未確認は色分けだけに依存せず、必ずラベル併用。

---

## 2. マイルストーン定義（Doneの条件）

### M0：KGIサイトとして成立（最小）
- 公開Homeに **KGI（累計寄付金額）** が表示される
- 管理画面で寄付キャンペーンを登録できる
- 日次で寄付金額を取得し、履歴をDBに保存できる
- 取得失敗時のエラーが管理画面で確認できる

### M1：記事プラットフォームとして成立
- 日次パイプライン（手動実行でも可）が **Fetch→Write→Review→Publish/Hold** まで動く
- 公開サイトで記事を閲覧できる
- Fact/推測/未確認がブロック単位で表示され、出典が示される
- レビュー結果と不合格理由がログとして残る

### M2：自動運用として成立
- CronでKGI取得・日次記事生成が回る
- Review Logs / Hold管理 / ソース管理が運用できる
- 緊急停止（Auto Publish OFF）等の安全装置がある

---

## 3. 全体ロードマップ（推奨順序）

### Sprint 0：セットアップ
- 基盤（Railway / DB / 認証 / 最小Admin）

### Sprint 1：KGI（寄付金額）を最速で実現（M0）
- キャンペーンCRUD → 金額取得Worker → Home表示 → Cron化

### Sprint 2：記事生成の土台
- Sources CRUD → RSS Fetcher → テンプレ管理 → プロンプト管理

### Sprint 3：記事生成→レビュー→公開（M1）
- Writer → Reviewer → Revise/Hold → Public記事表示

### Sprint 4：運用の完成度（M2）
- 実行ログ・安全装置 → リトライ/バックオフ → YouTubeカード → History

---

## 4. Epic / Task / Sub-task（Jira想定の粒度）
本計画は Jira の3階層（Epic / Task / Sub-task）で管理できるように粒度を合わせる。

- **Epic**：価値の塊（成果物単位 / M0-M2に紐づく）
- **Task**：1〜2PRで完了する実装単位（レビュー可能な粒度）
- **Sub-task**：受け入れ条件（DoD）の分解（チェックリスト）

---

## 5. Epic一覧（A〜J）

### EPIC-A：基盤・環境・デプロイ（Railway）
**目的**：動く開発環境とデプロイ基盤を整える

- Task A1：リポジトリ雛形 & 技術スタック確定
  - Sub：Web（Public+Admin）起動
  - Sub：Worker起動（同一プロセスでも可）
  - Sub：README（起動/デプロイ手順）
- Task A2：Railway構成（Web/Worker/DB）
  - Sub：Webデプロイ
  - Sub：Workerデプロイ
  - Sub：Postgres接続

---

### EPIC-B：DB・データモデル（最小）
**目的**：MVPに必要な永続化と運用ログを確立する

- Task B1：ORM導入 & マイグレーション
  - Sub：テーブル作成（01_SPECの最小テーブル）
  - Sub：seed（管理者ユーザー）
- Task B2：監査ログ（audit_logs）基盤
  - Sub：主要CRUDで記録される
  - Sub：誰が/いつ/何を変更したかが残る

---

### EPIC-C：管理画面（Auth + 基本UI）
**目的**：運用の入口を作る（設定と監視）

- Task C1：Admin認証（メール+PW）
  - Sub：ログイン/ログアウト
  - Sub：/admin保護
- Task C2：Admin Dashboard（最低限）
  - Sub：KGIサマリ表示
  - Sub：直近バッチ状況表示（成功/失敗）

---

### EPIC-D：KGI（寄付金額）取得・表示（M0）
**目的**：Phase 1から必須のKGI（寄付金額）を成立させる

- Task D1：DonationCampaign CRUD（Admin）
  - Sub：DB（donation_campaigns）
  - Sub：CRUD API
  - Sub：Admin UI（フォーム）
  - Sub：auditログ
- Task D2：金額取得Worker（PUBLIC_TOTAL_SCRAPE）
  - Sub：HTTP fetch（timeout/retry/backoff）
  - Sub：parse_config（selector/regex）実装
  - Sub：数値正規化（通貨記号/カンマ/小数）
  - Sub：donation_snapshots保存
  - Sub：失敗ログ保存（理由付き）
- Task D3：手動チェック（Admin）
  - Sub：check endpoint（取得テスト）
  - Sub：結果表示（成功/失敗理由）
- Task D4：Public HomeにKGI表示
  - Sub：API集計（最新snapshotsの合計）
  - Sub：表示UI（累計＋最終更新）
- Task D5：Cronで日次KGI取得
  - Sub：Railway cron設定
  - Sub：実行ログ反映（Dashboard）

---

### EPIC-E：情報ソース（ホワイトリスト）管理
**目的**：一次情報（ホワイトリスト）収集を運用可能にする

- Task E1：Sources CRUD（Admin）
  - Sub：DB（sources）
  - Sub：CRUD API
  - Sub：Admin UI
  - Sub：is_activeで取得対象制御
- Task E2：Fetcher（RSS優先）
  - Sub：RSS取得→raw_items保存
  - Sub：URL重複排除（ユニーク制約）
  - Sub：最小スクレイプ対応（必要な場合）

---

### EPIC-F：テンプレ・プロンプト管理（Prompt as Code）
**目的**：記事の型とレビュー基準を安全に更新できるようにする

- Task F1：template_versions管理（Admin）
  - Sub：CRUD
  - Sub：active切替
  - Sub：ロールバック
  - Sub：auditログ
- Task F2：prompt_versions管理（Admin）
  - Sub：Writer/Reviewer/Revise別にCRUD
  - Sub：active切替
  - Sub：ロールバック
  - Sub：テスト実行（Reviewerをサンプル入力で走らせる）

---

### EPIC-G：日次記事生成パイプライン（M1）
**目的**：Fetch→Write→Review→Publish/Hold を成立させる

- Task G1：Writer（LLM）で記事生成
  - Sub：raw_items入力→articles生成
  - Sub：article_blocks生成（Fact/推測/未確認）
  - Sub：テンプレ版本/プロンプト版本を保存
- Task G2：Reviewer（ルール＋LLM）
  - Sub：ルール検査（Hard Fail条件）
  - Sub：LLMレビュー（スコア＋指摘）
  - Sub：review_runs保存
- Task G3：自動改修（最大2回）とHold
  - Sub：Revise promptで修正→再レビュー
  - Sub：2回失敗→Hold
  - Sub：差分保存（Before/After）
- Task G4：Publish & Public表示
  - Sub：Publishedのみ公開
  - Sub：記事一覧/詳細表示
  - Sub：ブロック色＋ラベル表示
  - Sub：出典リンク一覧表示

---

### EPIC-H：YouTubeカード（日本語のみ）
**目的**：日本語サイトに限り、理解を助ける参照動画を提示する

- Task H1：YouTubeカードCRUD（Admin）
  - Sub：DB（youtube_cards）
  - Sub：CRUD API
  - Sub：Admin UI
- Task H2：Public記事詳細への表示
  - Sub：日本語サイトのみ表示
  - Sub：カードUI（サムネ/説明/おすすめ理由/注意書き）

---

### EPIC-I：History（年表）
**目的**：状況理解の土台として、年表と説明を提供する

- Task I1：history_entries CRUD（Admin）
  - Sub：DB（history_entries）
  - Sub：CRUD API
  - Sub：Admin UI（並び順含む）
- Task I2：Public History表示
  - Sub：年表表示（出典付き）
  - Sub：説明文表示

---

### EPIC-J：運用・観測・安全装置（M2）
**目的**：継続運用できる安全性と観測性を持たせる

- Task J1：バッチ実行ログ（監視）
  - Sub：実行結果（成功/失敗）を保存
  - Sub：Dashboard表示
- Task J2：緊急停止スイッチ（Auto Publish OFF）
  - Sub：設定の保存
  - Sub：OFF時の挙動（合格でもHold）
- Task J3：例外・リトライ・バックオフ（取得系共通）
  - Sub：リトライ上限
  - Sub：バックオフ
  - Sub：エラー理由の可視化

---

## 6. 受け入れ条件（DoD）テンプレ
各Taskには最低限、以下を明記する。

- **目的**（Why）
- **参照**（00/01の該当章）
- **DoD（受け入れ条件）**
- **例外時挙動**（失敗時にどうするか）
- **ログ**（何を記録するか）
- **テスト観点**（最低限）

---

## 7. ClaudeCodeへの依頼テンプレ（推奨）
ClaudeCodeに各Taskを依頼する際は、以下の形式で渡す。

- Context：
  - `docs/00_PHILOSOPHY.md` / `docs/01_SPEC.md` / `docs/02_DEV_PLAN.md` を前提とする
- Goal：
  - 今回のTaskのゴール（何ができればDoneか）
- Constraints：
  - 中立性、レビューゲート、監査ログ、ロールバック等の制約
- DoD：
  - 受け入れ条件（チェック可能な形）
- Scope：
  - 触って良いファイル/範囲（必要なら）
- Tests：
  - 追加/更新すべきテストと観点

---

## 8. 重要な注意（地雷）
- 寄付金額取得は壊れる前提：**パーサ設定を管理画面で直せる**こと
- LLM出力は不確実：**ルール検査（Hard Fail）を併設**すること
- プロンプト変更は事故る：**版管理/ロールバック/監査ログ**を必ず入れること
- 色分けは色だけに頼らない：**ラベル併用**すること

---
