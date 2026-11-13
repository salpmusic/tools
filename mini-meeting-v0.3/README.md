# salp Mini Meeting v0.3

既存 v0.1 / v0.2 とホームページを変更せずに追加した、LiveKit Cloud 利用の通話版です。

- 公開画面: https://salpmusic.github.io/tools/salp-mini-meeting-v0.3.html
- 静的画面: GitHub Pages、`main` の `/`（既存設定）
- 認証・発行: Cloudflare Worker 1本 + LiveKit 公式 Server SDK。DB は不要です。
- 会議番号・名前・参加コードで入室。マイクは入室時に許可を求め、カメラは初期 OFF。
- 発話者を大きく表示。名前で固定、自動表示へ戻すことも可能です。
- 低解像度: 320×240 / 10fps / 最大150kbps、通常: 640×360 / 20fps / 最大450kbps。回線・端末によって実際の値は変わります。
- 表示対象1人の映像を受信。音声優先ではカメラ送信と全映像受信を停止し、全員の音声を受信します。
- H.264 を優先し、マイクはエコー除去・ノイズ抑制を要求します。
- LiveKit のルーム設定で最大10人を制限します。10人の実機動作・性能は未検証です。

## 現在の公開状態

`config.js` の `tokenEndpoint` は公開された Cloudflare Worker に設定しています。LiveKit の公開 Project URL も `wrangler.toml` に反映しています。API Key・API Secret・会議設定は Cloudflare の Secret に別途登録します。**画面の公開と、実際の通話ができる状態は別です。** 以下の設定を完了すると、同じページで通話できます。

iPhone だけで初回の会議設定を行う場合は、[参加コードの準備ページ](https://salpmusic.github.io/tools/mini-meeting-v0.3/setup.html)でコードと `MEETINGS_JSON` を作成できます。会議番号は `family-01`、期限は作成から30日間です。「Cloudflare 用の設定をコピー」でコピーした JSON を、Worker の Runtime variables and secrets に `MEETINGS_JSON`（Secret）として登録します。生成ページは外部送信・保存をしないため、参加コードを安全な場所に控えてから閉じてください。既存の複数会議設定を残す運用では、置き換えずに JSON を統合してください。

## 安全なトークン発行

Pages だけでは API Secret を隠せないため、トークン発行サーバーが必要です。フロントの SDK は LiveKit Client 2.24.0 に固定し、CDN ファイルを SRI で検証します。

ブラウザ → HTTPS `/token` → 会議コード・期限確認 → LiveKit ルーム作成/取得 → 最長5分の JWT → ブラウザ → LiveKit Cloud、の順に接続します。

Worker の Secret へ登録するもの:

| 名前 | 内容 |
| --- | --- |
| `LIVEKIT_API_KEY` | LiveKit Cloud のプロジェクトの API Key |
| `LIVEKIT_API_SECRET` | 同じ API Key の Secret。HTML・JS・GitHub・チャットへ書かない |
| `MEETINGS_JSON` | 会議番号ごとの参加コード SHA-256 と ISO 8601 の有効期限 |

公開してよい設定:

| 場所 | 設定 |
| --- | --- |
| `server/wrangler.toml` の `LIVEKIT_URL` | Dashboard の Project URL (`wss://…livekit.cloud`) |
| 同 `ALLOWED_ORIGIN` | `https://salpmusic.github.io`（パス `/tools` を付けない） |
| `config.js` の `tokenEndpoint` | 公開した Worker の HTTPS URL + `/token` |

アクセス制御は会議ごとのランダムな参加コードです。名前は本人認証ではなく表示名です。家族・少人数の招待制を想定し、参加コードを安全な経路で個別に共有してください。CORS はブラウザの呼び出し元制限であり、認証の代わりにはなりません。

- 参加コードは暗号学的乱数18バイト（144ビット）。Worker に原文を置かずハッシュを Secret として登録。
- トークンはサーバー指定の会議1室だけ。カメラ・マイクの送信と受信だけを許可し、管理・録画・データ送信の権限を渡しません。
- リクエストは最大2KB、名前40文字。IP ごと10回/60秒の Cloudflare Rate Limiting binding を使用（Cloudflare ロケーション単位、全世界を通じた厳密なカウンターではありません）。同じ Wi-Fi の10人が一斉に再試行した場合は少し待ってください。
- トークン・コードを URL、localStorage、sessionStorage、アプリのログへ保存しません。送信ボディをログに追加しないでください。
- 期限は新規発行を止めるためのものです。既存の通話を終了する時刻ではありません。LiveKit は接続中のトークンを更新することがあり、JWT の5分は通話時間の上限ではありません。
- コードの削除・変更でも、発行済みトークンは期限まで利用できる場合があります。緊急停止は LiveKit Dashboard でルーム/参加者を終了し、必要なら API Key を失効してください。
- 会議ごとのアカウント認証・主催者承認・待機室は未実装です。一般公開の大規模運用では追加が必要です。

## 最小セットアップ

Cloudflare アカウント、Workers 利用権限、Node.js 22 以降、LiveKit Cloud プロジェクトが必要です。利用量に応じて各サービスの料金が発生します。

```sh
cd mini-meeting-v0.3/server
npm ci
npx wrangler login
```

1. `wrangler.toml` の `LIVEKIT_URL` を変更します。`namespace_id = "10303"` は同じ Cloudflare アカウントで他の Rate Limit binding が使っていない番号にしてください。
2. LiveKit Dashboard → 対象プロジェクト → Settings / API Keys でキーを確認または作成します。次のコマンドに表示される入力欄に登録します（コマンド引数やチャットには貼らない）。

```sh
npx wrangler secret put LIVEKIT_API_KEY
npx wrangler secret put LIVEKIT_API_SECRET
```

3. 会議番号と**未来の有効期限**を決めます。次は形式例です。実行時に実際の日時へ変更してください。

```sh
node create-meeting.mjs family-01 2026-12-01T12:00:00Z
```

参加コードと Secret 登録用 JSON がローカルの端末に表示されます。参加コードは参加者へ個別に渡します。出力を GitHub やチャットへ貼らないでください。JSON の1行をコピーして次へ入力します。

```sh
npx wrangler secret put MEETINGS_JSON
npm test
npm run check
npm run deploy
```

複数会議は JSON のキーを追加します。`secret put` は値全体を置き換えるため、既存会議を残す場合は全体を登録します。

4. 表示された `https://salp-mini-meeting-token.…workers.dev` に `/token` を付け、`../config.js` の `tokenEndpoint` へ設定して GitHub に反映します。**ここに置くのは公開URLだけです。**
5. 既存の Pages ビルド完了を待ち、ページを再読み込みします。「接続設定待ち」が消えたら設定完了です。`GET /token` は意図的に拒否されます。URL を直接開いただけでは動作確認になりません。

LiveKit Cloud 以外のセルフホスト接続先は、この Worker の URL 検証では許可していません。

## iPhone と Windows で2人通話を確認

両端末で次のURLを開きます（会議番号を変更した場合は置き換え）。

https://salpmusic.github.io/tools/salp-mini-meeting-v0.3.html?meeting=family-01

1. iPhone は Safari、Windows は最新 Edge または Chrome を使用します。最初は別々の部屋、またはイヤホンを使い、ハウリングを避けます。
2. それぞれ別の名前と同じ参加コードを入力し、低解像度で「会議に入る」を押します。マイクは「許可」にします。
3. 参加者が2人になり、お互いの声が聞こえるか確認します。iPhone で聞こえなければ「相手の声を聞く」を押します。
4. 両方で「カメラ：切」を押し、カメラを許可します。相手の映像が出るか確認します。
5. 交互に話し、大きい画面が発話者に切り替わるか確認します。名前を押して固定し、「自動で切り替える」で戻します。
6. マイクを切ると相手に声が届かず、入れると戻るか確認します。カメラの ON/OFF も同様に確認します。
7. iPhone で音声優先へ切り替え、映像が消えて声は続くか確認します。「映像も使う」で受信を戻し、自分のカメラはボタンで入れます。
8. 一時的にネット接続を切り、再接続の表示と復帰を確認します。復帰できなければ退室して再入室します。
9. 「会議を出る」を押し、端末のマイク・カメラ使用表示が消えるか確認します。再入室できることも確認します。

iPad は低解像度か音声優先から始めます。WebRTC と SDK に対応する Safari が必要で、古い機種すべての対応は保証できません。バックグラウンド移行・画面ロックで iOS が音声・映像を停止する場合があるため、通話中はページを前面にしてください。

## 開発・検証

```sh
cd mini-meeting-v0.3/server
npm ci
npm test
npm run check
```

ブラウザテストは Playwright が必要です。プロジェクトとは別の作業フォルダーへインストールして実行できます。

```sh
npm install --prefix /tmp/salp-browser-tests playwright
/tmp/salp-browser-tests/node_modules/.bin/playwright install chromium webkit
# リポジトリのルートから実行
NODE_PATH=/tmp/salp-browser-tests/node_modules node mini-meeting-v0.3/tests/browser.cjs
```

`SALP_SDK_PATH` に公式 npm パッケージの `dist/livekit-client.umd.js` の絶対パスを指定すると、実SDKと SRI のスモークテストも実行します。署名付きトークンを実発行するテストには架空のテストキーを使い、ルーム作成APIだけを差し替えています。UIテストは SDK テストダブルを使用します。これらは LiveKit Cloud を通した通話・実機テストの代替にはなりません。

検証結果は [TEST-RESULTS.md](TEST-RESULTS.md) を参照してください。
