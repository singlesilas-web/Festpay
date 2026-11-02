/* =========================================================
   login.js – Anmelden & Registrieren (Supabase Auth, E-Mail/Passwort)
   Im Klickdummy ohne Supabase: leitet einfach weiter.
   ========================================================= */
(function () {
  const root = document.getElementById("root");
  let modus = "login";
  function render() {
    root.innerHTML = `
      <div class="page-head"><h1>${modus === "login" ? "Willkommen zurück" : "Konto erstellen"}</h1><p>Damit Guthaben und Marken sicher bei dir bleiben.</p></div>
      <div class="page stack">
        <div class="segment"><button class="${modus === "login" ? "active" : ""}" data-m="login">Anmelden</button><button class="${modus === "reg" ? "active" : ""}" data-m="reg">Registrieren</button></div>
        <label class="field"><span>E-Mail</span><input class="input" id="mail" type="email" autocomplete="email"></label>
        <label class="field"><span>Passwort</span><input class="input" id="pw" type="password" autocomplete="${modus === "login" ? "current-password" : "new-password"}"></label>
        <button class="btn btn-dark" id="go"><i data-lucide="${modus === "login" ? "log-in" : "user-plus"}"></i>${modus === "login" ? "Anmelden" : "Registrieren"}</button>
        <a class="btn btn-ghost" href="index.html"><i data-lucide="user-round"></i>Ohne Konto weiter</a>
      </div>`;
    UI.icons();
    root.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { modus = b.dataset.m; render(); }));
    document.getElementById("go").onclick = async () => {
      const mail = document.getElementById("mail").value.trim(), pw = document.getElementById("pw").value;
      if (!window.sb) { UI.toast("Klickdummy: Login simuliert"); return setTimeout(() => (location.href = "index.html"), 700); }
      const res = modus === "login" ? await API.login(mail, pw) : await API.registrieren(mail, pw);
      if (res.error) return UI.toast(res.error.message, "alert-triangle");
      if (modus === "reg") return UI.toast("Bitte E-Mail bestätigen", "mail");
      location.href = "index.html";
    };
  }
  render();
})();
