# 浜松市 イベントマップ
![浜松市イベントマップの画面](%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-02-07%20182216.png)


浜松市のオープンデータ「イベント」CSVと、各ウェブページを参照して整理したイベント情報を読み込み、地図上で可視化する静的Webアプリです。

## デモ
- https://suzuking001.github.io/event_map/

## 特徴
- CSVからイベントを読み込み、地図上にマーカー表示
- 期間（開始日/終了日）、カテゴリ、キーワードで絞り込み
- 初回起動時に使い方とデータ利用上の注意を案内
- クリックでイベントの開催日・時間・会場を優先した詳細カードを表示
- イベント単位または現在の絞り込み条件をWeb Share API／リンクコピーで共有
- イベント参照元ページへのリンクボタン + Google検索ボタン
- 詳細画面でWEBサイトのファビコンを表示（簡易プレビュー）
- 累計・当日・直近7日間の訪問人数を匿名の概算値で表示
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
- `?from=YYYY-MM-DD&to=YYYY-MM-DD` で表示期間を指定できます。
- `?q=` で検索語、繰り返し可能な `?cat=` でカテゴリを指定できます。
- `?event=` でイベントを直接開けます。イベント共有時に自動生成されます。
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

## アクセスカウンター
- 公開版（`suzuking001.github.io`）へのアクセスだけを集計します。ローカル版では件数を増やさず、現在値をプレビュー表示します。
- 同じ端末からの同日アクセスは1人として扱い、累計訪問者・今日の訪問者・直近7日間の日別人数を表示します。
- 重複防止にはブラウザのローカルストレージを使用し、Cookie、氏名、位置情報は収集しません。
- 静的サイトから件数を共有するため、匿名のカウント値は [CounterAPI](https://counterapi.dev/) に保存します。
- ブラウザのデータ削除、別端末・別ブラウザの利用などにより重複するため、表示人数は概算です。

## データソース
- 浜松市オープンデータ「イベント」（CC BY 2.1 日本）
  - https://opendata.pref.shizuoka.jp/dataset/12874.html
  - https://static.hamamatsu.odpf.net/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.csv
- ウェブ参照情報
  - `data/current_and_future_events.csv`
  - イベント主催者、会場、施設等のウェブページや情報掲載ページを参照して、客観的な事実情報を整理したデータです。
  - 各行の `URL` が参照元です。浜松市オープンデータのCC BYライセンスは適用されません。

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
- 浜松市オープンデータ「イベント」: CC BY 2.1 日本
- ウェブ参照情報: CC BYの対象外。各参照元の権利・利用条件が適用されます
- 地図: OpenStreetMap contributors (ODbL)
- Leaflet: MIT
