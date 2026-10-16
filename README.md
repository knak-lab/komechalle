# 米チャレ！つながりマップ

カモの小屋の姉妹アプリ「米チャレ！」のメンバー名簿です。
顔写真付きのメンバーを、家族・友だち・同僚・ご近所などの線でつないで表示します。

- 画面: React（Vite）。GitHub Pages で公開します
- データ: Google スプレッドシート ＋ Google Apps Script（GAS）
- 写真: カモの小屋アカウントの Google ドライブ（フォルダ ID は `gas/Code.gs` の `FOLDER_ID`）

GAS の URL を設定しないあいだは**デモモード**（架空のサンプルデータ）で動きます。
デモモードの変更は、そのブラウザの中にだけ保存されます。

## しくみ

```
スマホ・パソコン ── GitHub Pages（React の画面）
                      │  読み込み: GET  ?action=all
                      │  保存:     POST {action: ...}
                      ▼
               GAS ウェブアプリ ── スプレッドシート（nodes / edges / log）
                      └─────── Google ドライブ（顔写真）
```

| シート | 中身 |
|---|---|
| `nodes` | 点。`kind` が `member`（メンバー）、`field`（田んぼ）、`event`（イベント）、`skill`（得意なこと） |
| `edges` | 線。`type` が family / partner / friend / colleague / neighbor / intro / work / event / mentor / other / skill |
| `log` | 変更履歴（だれでも編集できるので、何かあったときに戻せるように） |

## はじめての準備

### 1. スプレッドシートと GAS（カモの小屋アカウントで）

1. Google スプレッドシートを新しく作る（名前の例：「米チャレ！名簿」）
2. メニューの「拡張機能」→「Apps Script」を開く
3. `gas/Code.gs` の中身を `コード.gs` に貼りつける
4. 左の「プロジェクトの設定」で「appsscript.json をエディタで表示する」をオンにし、`gas/appsscript.json` の中身を貼りつける
5. 関数 `setup` を選んで「実行」。権限の確認が出たら許可する
   - シート `nodes` `edges` `log` ができます
   - 実行ログに**運営の合言葉**が出ます（スクリプトプロパティ `ADMIN_KEY`。好きな言葉に変えても OK）
6. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**
7. 表示された URL（末尾が `/exec`）を控える

> `Code.gs` を直したときは「デプロイを管理」→ 鉛筆マーク → バージョン「新バージョン」で更新すると、URL が変わりません。

### 2. 田んぼ・イベントの登録

田んぼとイベントは、運営がスプレッドシートの `nodes` シートに直接書きます（`x` `y` は空欄で OK。アプリが近くに配置します）。

| id | kind | name | size | variety | date |
|---|---|---|---|---|---|
| f1 | field | 上の田んぼ | 12a | コシヒカリ | |
| ev1 | event | 田植え | | | 2026-05-17 |

### 3. 画面の公開（GitHub Pages）

1. GitHub のリポジトリの Settings → Pages → Source を「**GitHub Actions**」にする
2. Settings → Secrets and variables → Actions → **Variables** に `VITE_GAS_URL` を追加し、手順 1-7 の URL を入れる
3. `main` ブランチに push すると自動で公開されます（Actions タブで進み具合が見られます）

## 手元で動かす

```bash
npm install
npm run dev          # デモモードで起動
```

本物のデータにつなぐときは、`.env.example` を `.env.local` にコピーして `VITE_GAS_URL` を書きます。

## 使い方のルール（いまの設定）

- URL を知っている人はだれでも見られて、登録・編集・線の追加ができます（ログインなし）
- 削除は**運営モード**（合言葉）のときだけできます
- 人と人の線は「承認待ち」から始まり、「承認」を押すと確定します
- 顔の配置はみんなで共有されます。「自動で並べる」はみんなの配置を変えるので、2回押しで実行します
- 変更はすべて `log` シートに残ります

## ファイル

| 場所 | 中身 |
|---|---|
| `src/config.js` | 線の種類・色・アイコン・並び順・最初から表示する線 |
| `src/App.jsx` | 画面全体と、保存の流れ |
| `src/components/MapView.jsx` | つながりマップ（ドラッグ、ズーム、ホバーで拡大） |
| `src/components/Panel.jsx` | 右側（スマホでは下側）のプロフィール |
| `src/components/Dialogs.jsx` | 登録・編集・線をつなぐ・運営モードの画面 |
| `src/api.js` | GAS との通信とデモモード |
| `gas/Code.gs` | GAS の API |
