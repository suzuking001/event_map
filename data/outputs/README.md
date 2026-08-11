# 公開用イベントデータ

このフォルダの各サブフォルダが1自治体に対応する。

設定済み自治体は `hamamatsu` などの既存IDを使う。収集中に見つかった未設定自治体は `municipality-<6桁自治体コード>` として自動作成される。

- `events.csv`: 浜松市イベントオープンデータ互換の38列CSV
- `events.provenance.csv`: 公開用の最小来歴
- `manifest.json`: 全都市の件数とイベント・来歴CSVのSHA-256

`outputs/` 全体をアップロードすれば、全自治体の公開成果物を同時に配布できる。棄却CSV、監査CSV、ログ、チェックポイント、バックアップ、診断JSONはここへ置かない。

イベントマップは起動時に `manifest.json` の `cities[].events.path` を読み取り、記載された全階層の `events.csv` を都市や現在の地図範囲にかかわらず自動登録する。`events.provenance.csv` は来歴情報のため、地図データとしては読み込まない。CSVを追加・移動した場合は、公開前に `manifest.json` も再生成すること。
