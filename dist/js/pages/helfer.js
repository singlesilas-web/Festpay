/* Fest-bound demo scanner. Membership is checked on entry, scan and booking. */
(async function () {
  const root = document.getElementById('root');
  const festId = UI.param('fest');
  const fest = festId ? await API.getFest(festId) : null;
  const festivalUrl = festId ? `fest.html?id=${encodeURIComponent(festId)}` : 'index.html';
  if (!festId) {
  root.innerHTML = `<div class="empty"><i data-lucide="map"></i><h3>Zuerst ein Fest auswählen</h3><p>Öffne dein Fest und wähle dort die Helfer-Karte.</p><a class="btn btn-dark" style="margin-top:16px" href="index.html">Feste ansehen</a></div>`;
    return UI.icons();
  }
  if (!fest?.w1_aktiv || !(await API.istHelferFuer(festId))) {
    root.innerHTML = `<div class="empty"><i data-lucide="shield-alert"></i><h3>Kein Helferzugang für dieses Fest</h3><p>Nur eingetragene Helfer können hier Festguthaben abbuchen.</p><a class="btn btn-dark" style="margin-top:16px" href="${festivalUrl}">Zum Fest</a></div>`;
    return UI.icons();
  }
    const items = await API.getSpeisekarte(festId);
  const preferenceKey = `festpay_hidden_${(await API.getUser()).id}_${festId}`;
  let hidden; try { hidden = JSON.parse(localStorage.getItem(preferenceKey) || '[]'); } catch { hidden = []; }
  if (!Array.isArray(hidden)) hidden = [];
  let scanned = null, amount = '', scanner = null, cameraActive = false, cameraStarting = false, processing = false;
  root.innerHTML = `
    <div class="page-head helper-head"><h1>Helfer · Scanner</h1><p>${UI.escape(fest.name)} – QR-Code vom Festguthaben des Gastes scannen.</p></div>
    <div class="page stack helper-workspace">

      <div class="card stack helper-order"><h3>1. Bestellung zusammenstellen</h3>
        <div class="grid-2 helper-products" id="products"></div>
        <details><summary>Artikel ein- und ausblenden</summary><div id="visibility" class="stack"></div></details>
        <label class="field"><span>Betrag in € (auch manuell möglich)</span><input class="input" id="orderAmount" type="number" min="0.01" max="9999.99" step="0.01" placeholder="0,00"></label>
        <p id="orderSummary" role="status"></p><button class="btn btn-ghost" id="clearOrder">Bestellung zurücksetzen</button>
      </div><h3>2. QR-Code scannen</h3>
      <div class="scanner"><div id="reader"></div><div class="frame"></div></div>
      <div class="grid-2">
        <button class="btn btn-dark btn-sm" id="cam" style="width:100%"><i data-lucide="camera"></i>Kamera starten</button>
        ${API.istDemo() ? '<button class="btn btn-ghost btn-sm" id="sim" style="width:100%"><i data-lucide="wand-sparkles"></i>Scan simulieren</button>' : ''}
      </div>
      <p class="small muted" id="cameraStatus" role="status">Zuerst Artikel wählen oder Betrag eingeben.</p>
      <div id="result"></div>
    </div>`;
  UI.icons();
  window.TestLog?.event('activity', { activity: 'helper_scanner_opened' });
  const cameraButton = document.getElementById('cam');
  const status = document.getElementById('cameraStatus');
  async function stopCamera() {
    if (!cameraActive) return;
    cameraActive = false;
    try { await scanner.stop(); } catch {}
    cameraButton.disabled = false;
  }
  async function startCamera() {
    if (!(Number(amount) > 0)) return UI.toast('Zuerst Bestellung zusammenstellen', 'info');
    if (cameraActive || cameraStarting) return;
    if (!window.Html5Qrcode) { status.textContent = 'Kamera konnte nicht geladen werden. Bitte erneut versuchen.'; return; }
    cameraStarting = true; cameraButton.disabled = true;
    status.textContent = 'Kamerazugriff erlauben, um einen Gast-Code zu scannen.';
    try {
      scanner ??= new Html5Qrcode('reader');
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 130 }, text => onScan(text));
      cameraActive = true;
      status.textContent = 'Scanner bereit – zeige den QR-Code für dieses Fest.';
    } catch {
      status.textContent = 'Kein Kamerazugriff. Erlaube die Kamera und tippe auf „Kamera starten“ oder simuliere einen Scan im Klickdummy.';
      cameraButton.disabled = false;
    } finally { cameraStarting = false; }
  }
  cameraButton.onclick = startCamera;
  const simulate = document.getElementById('sim');
  if (simulate) simulate.onclick = async () => {
    const user = await API.getUser();
    if ((await API.getGuthaben(festId)) > 0) return onScan(`FESTPAY|${festId}|${user.id}`);
    UI.toast('Erst als Gast bei diesem Fest Guthaben aufladen', 'info');
  };
  window.addEventListener('pagehide', stopCamera);

  async function onScan(text) {
    if (processing || scanned) return;
    if (!(Number(amount) > 0)) return UI.toast('Zuerst Bestellung zusammenstellen', 'info');
    processing = true;
    try {
      const [tag, qrFestId, userId, extra] = text.split('|');
      if (tag !== 'FESTPAY' || !qrFestId || !userId || extra !== undefined) return UI.toast('Kein gültiger FestPay-Code', 'x-circle');
      if (qrFestId !== festId) return UI.toast('QR-Code gehört zu einem anderen Fest', 'x-circle');
      if (!(await API.istHelferFuer(festId))) return UI.toast('Kein Helferzugang für dieses Fest', 'shield-alert');
      scanned = { userId, balance: await API.getGuthaben(festId, userId) };
      await stopCamera();
      status.textContent = 'Gast-Code erkannt. Bestellung prüfen und abbuchen.';
      document.getElementById('orderAmount').disabled = true; renderResult();
    } finally { processing = false; }
  }
  function renderResult() {
    const result = document.getElementById('result');
    result.innerHTML = `<div class="card result stack">
      <div class="row"><span class="badge-icon accent"><i data-lucide="wallet"></i></span><div style="flex:1"><div class="small muted">${UI.escape(fest.name)}</div><h3>Guthaben ${UI.euro(scanned.balance)}</h3></div></div>
      <div class="center"><div class="small muted">Abbuchen</div><h1 id="amt">${UI.euro(Number(amount || 0) / 100)}</h1></div>
      <button class="btn" id="book"><i data-lucide="check"></i>Abbuchen</button></div>`;
    UI.icons();
    document.getElementById('book').onclick = async event => {
      const euro = Number(amount || 0) / 100;
      if (!euro) return UI.toast('Betrag eingeben', 'info');
      const button = event.currentTarget; button.disabled = true;
      try {
        const response = await API.abbuchen(festId, scanned.userId, euro);
        if (response.error) return UI.toast(response.error.message, 'alert-triangle');
        scanned.balance = await API.getGuthaben(festId, scanned.userId);
        amount = ''; scanned = null; document.getElementById('result').innerHTML = ''; document.getElementById('orderAmount').disabled = false; updateOrder(); UI.toast(`${UI.euro(euro)} abgebucht`); status.textContent = 'Nächste Bestellung zusammenstellen.';
      } finally { button.disabled = false; }
    };
  }
  function updateOrder() {
    document.getElementById('orderAmount').value = amount ? (Number(amount) / 100).toFixed(2) : '';
    document.getElementById('orderSummary').textContent = `Gesamt: ${UI.euro(Number(amount || 0) / 100)}`;
  }
  function drawProducts() {
    document.getElementById('products').innerHTML = items.filter(i => !hidden.includes(i.id)).map(i => `<button class="btn btn-dark" data-product="${UI.escape(i.id)}">${UI.escape(i.name)} · ${UI.euro(i.preis)}</button>`).join('');
    document.getElementById('visibility').innerHTML = items.map(i => `<label><input type="checkbox" data-visible="${UI.escape(i.id)}" ${hidden.includes(i.id) ? '' : 'checked'}> ${UI.escape(i.name)}</label>`).join('');
    root.querySelectorAll('[data-product]').forEach(b => b.onclick = () => {
      if (scanned) return;
      const item = items.find(i => i.id === b.dataset.product);
      amount = String(Number(amount || 0) + Math.round(Number(item.preis) * 100)); updateOrder();
    });
    root.querySelectorAll('[data-visible]').forEach(b => b.onchange = () => {
      hidden = hidden.filter(id => id !== b.dataset.visible); if (!b.checked) hidden.push(b.dataset.visible);
      localStorage.setItem(preferenceKey, JSON.stringify(hidden)); drawProducts();
    });
  }
  document.getElementById('orderAmount').oninput = e => {
    const value = Number(e.target.value); amount = Number.isFinite(value) && value > 0 ? String(Math.round(value * 100)) : '';
    document.getElementById('orderSummary').textContent = `Gesamt: ${UI.euro(Number(amount || 0) / 100)}`;
  };
  document.getElementById('clearOrder').onclick = async () => {
    await stopCamera(); scanned = null; amount = ''; document.getElementById('result').innerHTML = '';
    document.getElementById('orderAmount').disabled = false; updateOrder();
  };
  drawProducts(); updateOrder();
})();
