# 浜松市 イベントマップ
![浜松市イベントマップの画面](%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-02-07%20182216.png)


浜松市・大阪府・鳥取県・岡崎市・会津若松市・川崎市のイベントオープンデータを読み込み、地図上で可視化する静的Webアプリです。

## デモ
- https://suzuking001.github.io/event_map/

## 特徴
- 外部APIとCSVからイベントを読み込み、地図上にマーカー表示
- 表示中の地図付近にある地域データだけを遅延取得し、取得済みデータは再利用
- 期間（開始日/終了日）、カテゴリ、キーワードで絞り込み
- 「大阪」「鳥取」「岡崎」「会津」「川崎」などの地域名で検索すると対象地域へ自動移動
- 初回起動時に使い方とデータ利用上の注意を案内
- クリックでイベントの開催日・時間・会場を優先した詳細カードを表示
- イベント単位または現在の絞り込み条件をX・Facebook・リンクコピーで共有
- Instagramストーリーズ向けの1080×1920画像をブラウザ内で生成し、共有リンクも同時にコピー
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
- 大阪府イベント一覧（CC BY 4.0）
  - https://data.bodik.jp/dataset/270008_event
  - ブラウザからBODIK CKAN API（JSONP）を直接取得
- とっとりイベントナビ（同サイトのオープンデータ利用条件）
  - https://tottori-eventnavi.jp/opendata
  - `data/tottori_events.csv`
- 岡崎市イベント一覧（CC BY 4.0）
  - https://data.bodik.jp/dataset/232025_event
  - ブラウザからBODIK CKAN API（JSONP）を直接取得
- 会津若松市のイベント情報（クリエイティブ・コモンズ 表示）
  - https://data.data4citizen.jp/dataset/10060001
  - ブラウザからDATA for CITIZEN CKAN API（JSONP）を直接取得
- 川崎市のイベント情報のオープンデータ（CC BY 2.1 日本）
  - https://eventapp.city.kawasaki.jp/data/api/v1/reference.html
  - 公式APIをGitHub Actionsが毎日取得し、現在から1年分を地図用CSVへ変換
  - リポジトリへの不必要な再掲載を避けるため、メールアドレスと電話番号は生成時に除外

### 地域オープンデータの取得方式

大阪府・岡崎市はBODIK CKAN API、会津若松市はDATA for CITIZEN CKAN APIのJSONPレスポンスから、ブラウザが現在・未来のイベントを直接取得します。会津若松市は全履歴を読み込まず、CKAN SQL APIで本日以降のデータだけを取得します。

各地域のデータは、その地域が地図の表示範囲付近に入った時点で初めて取得します。初期表示が浜松周辺の場合は浜松市データだけを読み込み、ズームアウトして複数地域が見える場合は該当する地域を追加で読み込みます。一度取得したデータは同じ閲覧中に再利用します。

とっとりイベントナビのCSV配信はブラウザ向けCORSに対応しておらず、鳥取県データ連携基盤のリアルタイムAPIはアクセストークンが必要です。そのため鳥取については、現在・未来の行をUTF-8 CSVとして保存しています。

川崎市公式イベントAPIもブラウザ向けCORSに対応していないため、GitHub Actionsが1日1回取得します。複数開催日は1イベントにまとめたまま `開催日一覧` として保存し、日付検索では実際の開催日だけに一致させます。メールアドレスと電話番号は生成時に除外し、残っていた場合は更新を中止します。川崎市データは川崎周辺が地図に入るまでブラウザへ配信しません。データ固有の帰属表示と加工内容は [`data/README.md`](data/README.md) に記載しています。

```bash
node scripts/update-regional-event-data.mjs
```

`.github/workflows/update-event-data.yml` が鳥取・川崎CSVを毎日自動更新し、取得件数が異常に少ない場合は既存ファイルを上書きしません。

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
├─ data/
│  ├─ tottori_events.csv
│  └─ kawasaki_events.csv
└─ scripts/
   └─ update-regional-event-data.mjs
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
- 大阪府イベント一覧・岡崎市イベント一覧: CC BY 4.0
- 会津若松市のイベント情報: クリエイティブ・コモンズ 表示
- 川崎市のイベント情報のオープンデータ: CC BY 2.1 日本
- とっとりイベントナビ: 同サイトのオープンデータ利用条件
- 地図: OpenStreetMap contributors (ODbL)
- Leaflet: MIT
