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
  let scanned = null, amount = '', scanner = null, cameraActive = false, cameraStarting = false, processing = false;
  root.innerHTML = `
    <div class="page-head"><h1>Helfer · Scanner</h1><p>${UI.escape(fest.name)} – QR-Code vom Festguthaben des Gastes scannen.</p></div>
    <div class="page stack">
      <a class="btn btn-ghost btn-sm" href="${festivalUrl}" data-track="helper-return-to-festival"><i data-lucide="user-round"></i>Als Gast zum Fest</a>
      <div class="scanner"><div id="reader"></div><div class="frame"></div></div>
      <div class="grid-2">
        <button class="btn btn-dark btn-sm" id="cam" style="width:100%"><i data-lucide="camera"></i>Kamera starten</button>
        ${API.istDemo() ? '<button class="btn btn-ghost btn-sm" id="sim" style="width:100%"><i data-lucide="wand-sparkles"></i>Scan simulieren</button>' : ''}
      </div>
      <p class="small muted" id="cameraStatus" role="status">Kamera wird gestartet …</p>
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
    if (cameraActive || cameraStarting) return;
    if (!window.Html5Qrcode) { status.textContent = 'Kamera konnte nicht geladen werden. Bitte erneut versuchen.'; return; }
    cameraStarting = true; cameraButton.disabled = true;
    status.textContent = 'Kamerazugriff erlauben, um einen Gast-Code zu scannen.';
    try {
      scanner ??= new Html5Qrcode('reader');
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, text => onScan(text));
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
    if (processing) return;
    processing = true;
    try {
      const [tag, qrFestId, userId, extra] = text.split('|');
      if (tag !== 'FESTPAY' || !qrFestId || !userId || extra !== undefined) return UI.toast('Kein gültiger FestPay-Code', 'x-circle');
      if (qrFestId !== festId) return UI.toast('QR-Code gehört zu einem anderen Fest', 'x-circle');
      if (!(await API.istHelferFuer(festId))) return UI.toast('Kein Helferzugang für dieses Fest', 'shield-alert');
      scanned = { userId, balance: await API.getGuthaben(festId, userId) };
      await stopCamera();
      status.textContent = 'Gast-Code erkannt. Betrag eingeben und abbuchen.';
      amount = ''; renderResult();
    } finally { processing = false; }
  }
  function renderResult() {
    const result = document.getElementById('result');
    result.innerHTML = `<div class="card result stack">
      <div class="row"><span class="badge-icon accent"><i data-lucide="wallet"></i></span><div style="flex:1"><div class="small muted">${UI.escape(fest.name)}</div><h3>Guthaben ${UI.euro(scanned.balance)}</h3></div></div>
      <div class="center"><div class="small muted">Abbuchen</div><h1 id="amt">${UI.euro(Number(amount || 0) / 100)}</h1></div>
      <div class="keypad">${[1,2,3,4,5,6,7,8,9,'C',0,'<'].map(k=>`<button data-k="${k}" aria-label="${k === '<' ? 'Letzte Ziffer löschen' : k === 'C' ? 'Betrag löschen' : k}">${k === '<' ? '<i data-lucide="delete"></i>' : k}</button>`).join('')}</div>
      <button class="btn" id="book"><i data-lucide="check"></i>Abbuchen</button></div>`;
    UI.icons();
    result.querySelectorAll('[data-k]').forEach(button => button.onclick = () => {
      const key = button.dataset.k;
      amount = key === 'C' ? '' : key === '<' ? amount.slice(0,-1) : (amount + key).slice(0,6);
      document.getElementById('amt').textContent = UI.euro(Number(amount || 0) / 100);
    });
    document.getElementById('book').onclick = async event => {
      const euro = Number(amount || 0) / 100;
      if (!euro) return UI.toast('Betrag eingeben', 'info');
      const button = event.currentTarget; button.disabled = true;
      try {
        const response = await API.abbuchen(festId, scanned.userId, euro);
        if (response.error) return UI.toast(response.error.message, 'alert-triangle');
        scanned.balance = await API.getGuthaben(festId, scanned.userId);
        amount = ''; UI.toast(`${UI.euro(euro)} abgebucht`); renderResult();
      } finally { button.disabled = false; }
    };
  }
  startCamera();
})();
