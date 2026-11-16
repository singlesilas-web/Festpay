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
  let scanned = null, amount = '', scanner = null, cameraActive = false, cameraStarting = false, processing = false, booking = false;
  const quantities = new Map();
  root.innerHTML = `
    <div class="page-head helper-head"><h1>Kasse & Scanner</h1><p>${UI.escape(fest.name)}</p></div>
    <div class="page stack helper-workspace">

      <section class="helper-order" aria-label="Bestellung">
        <div class="order-heading"><h3>Was wird bezahlt?</h3><details class="product-settings"><summary aria-label="Artikel ein- und ausblenden"><i data-lucide="sliders-horizontal"></i></summary><div id="visibility" class="stack"></div></details></div>
        <div class="helper-products" id="products"></div>
        <div class="order-total"><label for="orderAmount">Gesamt <span>auch manuell</span></label><div class="amount-entry"><input id="orderAmount" type="number" min="0.01" max="9999.99" step="0.01" placeholder="0,00" aria-label="Betrag in Euro"><span>€</span></div><button class="icon-btn light" id="clearOrder" aria-label="Bestellung zurücksetzen"><i data-lucide="rotate-ccw"></i></button></div>
        <p id="orderSummary" role="status" class="small muted"></p>
      </section>
      <div class="scanner"><div id="reader"></div><div class="frame"></div><div id="result" hidden></div></div>
      <div class="grid-2">
        <button class="btn btn-dark btn-sm" id="cam" style="width:100%"><i data-lucide="camera"></i>Kamera starten</button>
        ${API.istDemo() ? '<button class="btn btn-ghost btn-sm" id="sim" style="width:100%"><i data-lucide="wand-sparkles"></i>Scan simulieren</button>' : ''}
      </div>
      <p class="small muted" id="cameraStatus" role="status">Zuerst Artikel wählen oder Betrag eingeben.</p>
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
    if (cameraActive || cameraStarting || scanned) return;
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
    updateProductControls();
    try {
      const [tag, qrFestId, userId, extra] = text.split('|');
      if (tag !== 'FESTPAY' || !qrFestId || !userId || extra !== undefined) return UI.toast('Kein gültiger NearBuy-Code', 'x-circle');
      if (qrFestId !== festId) return UI.toast('QR-Code gehört zu einem anderen Fest', 'x-circle');
      if (!(await API.istHelferFuer(festId))) return UI.toast('Kein Helferzugang für dieses Fest', 'shield-alert');
      scanned = { userId, balance: await API.getGuthaben(festId, userId) };
      window.TestLog?.event('activity', {activity: 'helper_qr_recognized'});
      document.getElementById('orderAmount').disabled = true;
      await stopCamera();
      status.textContent = 'Gast-Code erkannt. Bestellung prüfen und abbuchen.';
      document.getElementById('orderAmount').disabled = true; renderResult();
    } finally { processing = false; updateProductControls(); }
  }
  function renderResult() {
    const result = document.getElementById('result');
    const bookingAmount = Number(amount || 0) / 100;
    const balanceAfter = scanned.balance - bookingAmount;
    result.hidden = false;
    result.innerHTML = `<div class="scan-confirm" role="dialog" aria-labelledby="confirmTitle">
      <div class="confirm-label" id="confirmTitle"><i data-lucide="circle-check"></i>Code erkannt</div>
      <strong class="confirm-amount">${UI.euro(bookingAmount)}</strong>
      <div class="confirm-balance"><span>Aktuelles Guthaben <b>${UI.euro(scanned.balance)}</b></span><span class="balance-after ${balanceAfter < 0 ? 'insufficient' : ''}">Guthaben danach <b>${balanceAfter < 0 ? 'Nicht ausreichend' : UI.euro(balanceAfter)}</b></span></div>
      <div class="confirm-actions"><button class="btn btn-ghost" id="cancelScan">Abbrechen</button><button class="btn" id="book">Abbuchen</button></div></div>`;
    UI.icons();
    document.getElementById('book').focus({preventScroll:true});
    document.getElementById('cancelScan').onclick = () => { if (booking) return; clearScan(); status.textContent = 'Bestellung bleibt erhalten. Nächsten Code scannen.'; };
    document.getElementById('book').onclick = async event => {
      const euro = Number(amount || 0) / 100;
      if (!euro) return UI.toast('Betrag eingeben', 'info');
      if (booking) return;
      booking = true;
      const button = event.currentTarget; button.disabled = true;
      document.getElementById('cancelScan').disabled = true;
      try {
        const response = await API.abbuchen(festId, scanned.userId, euro);
        if (response.error) return UI.toast(response.error.message, 'alert-triangle');
        scanned.balance = await API.getGuthaben(festId, scanned.userId);
        amount = ''; quantities.clear(); clearScan(); updateOrder(); UI.toast(`${UI.euro(euro)} abgebucht`); status.textContent = 'Nächste Bestellung zusammenstellen.';
      } finally { booking = false; button.disabled = false; const cancel = document.getElementById('cancelScan'); if (cancel) cancel.disabled = false; }
    };
  }
  function clearScan() {
    scanned = null; const result = document.getElementById('result'); result.hidden = true; result.innerHTML = '';
    document.getElementById('orderAmount').disabled = false;
    updateProductControls();
    document.getElementById('cam').focus({preventScroll:true});
  }
  const products = document.getElementById('products');
  let lastAdjusted, flashTimer;

  function updateOrder() {
    document.getElementById('orderAmount').value = amount ? (Number(amount) / 100).toFixed(2) : '';
    const count = [...quantities.values()].reduce((sum, value) => sum + value, 0);
    document.getElementById('orderSummary').textContent = count ? `${count} Artikel ausgewählt` : 'Mit + hinzufügen, mit − entfernen.';
    updateProductControls();
  }

  function updateProductControls() {
    products.querySelectorAll('[data-product]').forEach(tile => {
      const quantity = quantities.get(tile.dataset.product) || 0;
      tile.querySelector('.product-count').textContent = quantity;
      tile.classList.toggle('selected', quantity > 0);
      tile.querySelector('[data-delta="-1"]').disabled = !!scanned || processing || quantity === 0;
      tile.querySelector('[data-delta="1"]').disabled = !!scanned || processing;
    });
  }

  function drawProducts() {
    products.innerHTML = items.filter(i => !hidden.includes(i.id)).map(i => `
      <div class="product-tile" data-product="${UI.escape(i.id)}">
        <div class="product-info"><span class="product-icon"><i data-lucide="${UI.escape(i.icon || 'utensils')}"></i></span>
          <span class="product-copy"><b>${UI.escape(i.name)}</b><span>${UI.euro(i.preis)}</span></span></div>
        <div class="product-stepper" role="group" aria-label="Menge für ${UI.escape(i.name)}">
          <button type="button" data-delta="-1" data-track="helper-product-remove" aria-label="${UI.escape(i.name)} entfernen">−</button>
          <span class="product-count">0</span>
          <button type="button" data-delta="1" data-track="helper-product-add" aria-label="${UI.escape(i.name)} hinzufügen">+</button>
        </div>
      </div>`).join('') || '<p class="small muted">Keine Artikel sichtbar. Passe die Auswahl oben rechts an oder gib den Betrag ein.</p>';
    updateProductControls();
    UI.icons();
  }

  products.onclick = event => {
    const button = event.target.closest('[data-delta]');
    if (!button || button.disabled || scanned || processing) return;
    const id = button.closest('[data-product]').dataset.product;
    const item = items.find(i => i.id === id);
    const delta = Number(button.dataset.delta);
    const quantity = (quantities.get(id) || 0) + delta;
    if (quantity > 0) quantities.set(id, quantity);
    else quantities.delete(id);
    amount = String(Math.max(0, Number(amount) + delta * Math.round(Number(item.preis) * 100)) || '');
    updateOrder();
    clearTimeout(flashTimer);
    lastAdjusted?.classList.remove('stepper-feedback');
    lastAdjusted = button;
    button.classList.add('stepper-feedback');
    flashTimer = setTimeout(() => button.classList.remove('stepper-feedback'), 800);
  };

  const visibility = document.getElementById('visibility');
  visibility.innerHTML = items.map(i => `<label><input type="checkbox" data-visible="${UI.escape(i.id)}" ${hidden.includes(i.id) ? '' : 'checked'}> ${UI.escape(i.name)}</label>`).join('');
  visibility.onchange = ({target}) => {
    if (!target.matches('[data-visible]')) return;
    hidden = hidden.filter(id => id !== target.dataset.visible);
    if (!target.checked) hidden.push(target.dataset.visible);
    localStorage.setItem(preferenceKey, JSON.stringify(hidden));
    drawProducts();
  };
  document.getElementById('orderAmount').oninput = e => {
    quantities.clear(); updateProductControls();
    const value = Number(e.target.value); amount = Number.isFinite(value) && value > 0 ? String(Math.round(value * 100)) : '';
    document.getElementById('orderSummary').textContent = `Gesamt: ${UI.euro(Number(amount || 0) / 100)}`;
  };
  document.getElementById('clearOrder').onclick = async () => {
    if (booking) return;
    await stopCamera(); amount = ''; quantities.clear(); clearScan(); updateOrder();
  };
  drawProducts(); updateOrder();
})();
