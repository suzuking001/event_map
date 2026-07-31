# 浜松市 イベントマップ
![浜松市イベントマップの画面](%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-02-07%20182216.png)


浜松市のオープンデータ「イベント」CSVを読み込み、地図上でイベントを可視化する静的Webアプリです。

## デモ
- https://suzuking001.github.io/event_map/

## 特徴
- CSVからイベントを読み込み、地図上にマーカー表示
- 期間（開始日/終了日）、カテゴリ、キーワードで絞り込み
- 初回起動時に使い方とデータ利用上の注意を案内
- クリックで詳細モーダルを表示（CSVの項目をほぼ全て表示）
- イベントWebページへのリンクボタン + Google検索ボタン
- 詳細画面でWEBサイトのファビコンを表示（簡易プレビュー）
- ズームアウト時にラベルを徐々にフェード
- 初回起動を軽くするため、CSV取得/解析はWeb Workerで実行
- 保存済みイベントを即時表示し、最新版があれば画面を自動更新
- Service Workerで静的ファイル/CSV/タイルをキャッシュ

## 使い方
1. アプリのインストールは不要です。次のいずれかでブラウザから開きます。
   - 公開版: https://suzuking001.github.io/event_map/
   - Windows: 同梱の `イベントマップを開く.url` をダブルクリック
   - ローカル開発: `start_local_server.bat` を実行（Python 3が必要）
   - 手動でローカル起動する場合:
     ```bash
     python -m http.server
     ```
2. メニューから期間・カテゴリ・キーワードで絞り込んで利用します。

### デフォルト挙動
- データの期間内に「今日」が含まれる場合、開始日/終了日は自動で今日〜1週間後に設定されます。
- 期間が未選択の場合はマーカーを表示しません（起動時の負荷軽減）。

### URLパラメータ
- `?tiles=` でタイルURLを差し替えできます。
  - 例: `index.html?tiles=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

## キャッシュ（高速化）
Service Workerにより、次回以降の読み込みが速くなります。
- 静的ファイル: cache-first
- CSV: 保存データを優先表示し、バックグラウンドで最新版を取得
- OSMタイル: cache-first

注意:
- `file://` 直開きではService Workerが動作しません。
- HTTPS/localhost上でのみ有効です。

## データソース
- 静岡県オープンデータポータル（浜松市イベント）
  - https://opendata.pref.shizuoka.jp/dataset/10987.html
- CSV（Shift_JIS）
  - https://static.hamamatsu.odpf.net/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.csv

## 技術要素
- Leaflet
- OpenStreetMapタイル
- 純粋なHTML/CSS/JavaScript（ビルド不要）

## フォルダ構成
```
.
├─ index.html
├─ sw.js
├─ assets/
│  ├─ app.js
│  ├─ styles.css
│  └─ js/
│     ├─ config.js
│     ├─ csv.js
│     ├─ utils.js
│     └─ event-csv-worker.js
```

## トラブルシューティング
- WindowsのSmart App Controlでバッチファイルが開けない:
  - Smart App Controlを無効にする必要はありません。`イベントマップを開く.url` または公開版URLを利用してください。
  - 公開版の利用にはPythonや専用アプリのインストールは不要です。
- `file://` で開くとCSVが読み込めない:
  - ブラウザのCORS制限により発生します。`python -m http.server` などで起動してください。
- キャッシュを更新したい:
  - ブラウザのDevToolsでService Workerのキャッシュを削除するか、`sw.js` のキャッシュ名を更新してください。

## ライセンス
- データ: CC BY（浜松市オープンデータ）
- 地図: OpenStreetMap contributors (ODbL)
- Leaflet: MIT
