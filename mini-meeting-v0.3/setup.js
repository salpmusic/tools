(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  function message(text) { el('setup-status').textContent = text; }
  el('generate').onclick = async function () {
    if (el('generate').disabled) return;
    el('generate').disabled = true;
    try {
      if (!window.isSecureContext || !window.crypto || !crypto.subtle) throw new Error();
      var bytes = crypto.getRandomValues(new Uint8Array(18));
      var code = btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
      var hash = Array.from(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      var expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      el('meeting-json').value = JSON.stringify({ 'family-01': { codeSha256: hash, expiresAt: expiry.toISOString() } });
      el('meeting-code').value = code;
      el('expiry').textContent = '有効期限：' + expiry.toLocaleString('ja-JP');
      el('result').hidden = false;
      message('作成しました。このタブは設定が終わるまで開いたままにしてください。');
      el('generate').textContent = '作成済み';
    } catch (_) {
      el('generate').disabled = false;
      message('作成できませんでした。最新の Safari / Edge / Chrome で HTTPS のページを開いてください。');
    }
  };
  ['name', 'json', 'code'].forEach(function (kind) {
    var target = kind === 'name' ? 'variable-name' : kind === 'json' ? 'meeting-json' : 'meeting-code';
    el('copy-' + kind).onclick = async function () {
      try {
        await navigator.clipboard.writeText(el(target).value);
        message(kind === 'json' ? '設定をコピーしました。Cloudflare の Value に貼り付けます。' : kind === 'name' ? '名前をコピーしました。Cloudflare の Key に貼り付けます。' : '参加コードをコピーしました。安全な場所に控えてください。');
      } catch (_) {
        el(target).focus(); el(target).select(); el(target).setSelectionRange(0, el(target).value.length);
        message('コピーできませんでした。選択した文字を長押ししてコピーしてください。');
      }
    };
  });
})();
