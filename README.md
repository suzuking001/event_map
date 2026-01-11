# 浜松市 イベントマップ

浜松市のオープンデータ「イベント」CSVを読み込み、地図上でイベントを可視化する静的Webアプリです。

## 機能
- 地図上にイベントをマーカー表示（イベント名 + 開催期間のラベル付き）
- クリックで詳細モーダルを表示（CSVの項目をほぼ全て表示）
- 詳細内にイベントWEBページへのリンクボタン
- 期間（開始日/終了日）で絞り込み
- カテゴリで絞り込み（カテゴリ色分け + 凡例）
- キーワード検索（イベント名/説明/住所/主催者など）
- ズームアウト時にラベルを徐々にフェード

## 使い方
1. ローカルサーバーで配信して `index.html` を開きます。
   - 例: `python -m http.server`
2. メニューから期間・カテゴリ・キーワードで絞り込んで利用します。

※ `file://` で直接開くと、ブラウザ制限でデータ取得に失敗する場合があります。

## データソース
- 静岡県オープンデータポータル（浜松市イベント）
  - https://opendata.pref.shizuoka.jp/dataset/12574.html
- CSV（Shift_JIS）
  - https://static.hamamatsu.odpf.net/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.csv

## 技術要素
- Leaflet
- OpenStreetMapタイル
- 純粋なHTML/CSS/JavaScript（ビルド不要）

## ライセンス
- データ: CC BY（浜松市オープンデータ）
- 地図: OpenStreetMap contributors (ODbL)
- Leaflet: MIT
