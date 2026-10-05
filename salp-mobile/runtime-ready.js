// Both entry pages must finish isolation setup before importing CheerpX.
window.salpRuntimeReady = (async () => {
  const report = (message) => window.salpStage?.('2/7 起動環境', message);
  const bounded = (promise, ms, message) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); });
  });
  if (!window.isSecureContext) throw new Error('HTTPSで公開したURLをSafari/Chromeで開いてください。ZIP内のHTMLを直接開く方法には対応していません。');
  if (!window.crossOriginIsolated) {
    if (!('serviceWorker' in navigator)) throw new Error('Service Workerが使えません。Safari/ChromeでHTTPSのURLを開いてください。');
    report('Service Workerを準備中');
    const registration = await bounded(navigator.serviceWorker.register('./coi-serviceworker.js?v=1114'), 15000, 'Service Worker登録がタイムアウトしました。通信とHTTPSを確認してください。');
    await bounded(navigator.serviceWorker.ready, 15000, 'Service Workerを有効にできませんでした。ページを再読み込みしてください。');
    if (!navigator.serviceWorker.controller) {
      await bounded(new Promise(resolve => {
        const changed = () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.removeEventListener('controllerchange', changed);
            resolve();
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', changed);
        changed(); // Catch a controller acquired during register()/ready.
      }), 15000, 'ページの制御を取得できませんでした。再読み込みしてください。');
    }
    const key = 'salpIsolationReload1114';
    if (sessionStorage.getItem(key) === location.href) throw new Error('共有メモリを有効にできませんでした。Safari/Chromeで直接開き、サイト側のCOOP/COEP設定を確認してください。');
    sessionStorage.setItem(key, location.href);
    report('準備完了・再読み込み中');
    location.reload();
    await new Promise(() => {}); // Never import a VM into the old document.
  }
  sessionStorage.removeItem('salpIsolationReload1114');
  if (typeof SharedArrayBuffer === 'undefined' || typeof WebAssembly === 'undefined') throw new Error('このブラウザではLinux実行に必要な共有メモリ/WebAssemblyが使えません。');
  report('共有メモリの準備完了');
})();
window.salpRuntimeReady.catch(error => {
  window.salpFatal?.('起動環境エラー', error);
  const notice = document.createElement('p');
  notice.setAttribute('role', 'alert');
  notice.style.cssText = 'color:#ffb5b5;padding:16px;white-space:pre-wrap';
  notice.textContent = error.message;
  document.body.prepend(notice);
});
