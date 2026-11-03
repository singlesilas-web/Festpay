# FestPay – Klickdummy & Nutzertest

FestPay simuliert zwei Bezahlwege auf Vereinsfesten: **W1 Festguthaben** (aufladen und QR-Code vorzeigen) und **W2 Festmarken** (Speisekarte, Kauf und Entwertung). Alle Zahlungen sind simuliert.

**Öffentlicher Testlink:** https://singlesilas-web.github.io/Festpay/

**Repository:** https://github.com/singlesilas-web/Festpay

Die frühere Vorschau bleibt unter https://festpay-klicktest-silas.chicchair12.chatgpt.site erreichbar; sie wird unabhängig veröffentlicht.

## Gemeinsam entwickeln

```bash
git clone https://github.com/singlesilas-web/Festpay.git
cd Festpay
git switch -c feature/meine-aenderung
python -m http.server 8000 --directory dist
```

Danach http://localhost:8000 öffnen und **Admin / Vorschau ohne Aufzeichnung** wählen. Die Analytik akzeptiert nur freigegebene öffentliche Ursprünge, keine lokalen Testserver. Es gibt keinen Build und keine notwendige Paketinstallation. Auf Windows kann statt `python` der Befehl `py` erforderlich sein.

Änderungen auf dem eigenen Branch committen, pushen und einen Pull Request nach `main` erstellen. Kolleginnen und Kollegen lädt der Repository-Owner über **Settings → Collaborators** ein.

```bash
git add .
git commit -m "Beschreibe die Änderung"
git push -u origin feature/meine-aenderung
```

## Verzeichnisstruktur

| Pfad | Inhalt |
| --- | --- |
| `dist/` | Vollständige statische Website mit HTML, CSS und JavaScript |
| `dist/js/pages/karte.js` | Karte, Zoom, Verschieben und Fest-Auswahl |
| `dist/js/telemetry.js` | Einwilligung, Gast-Sitzung und Ereignisversand |
| `dist/js/admin.js` | Anmeldung, Auswertung, Klickdichte und Exporte |
| `dist/js/config.js` | Öffentliche Konfiguration; enthält ausschließlich Publishable Key |
| `supabase/` | Analytics-Schema, RLS, Admin-Freigabe und Edge Function |
| `tests/` | Automatisierte Tests für die Erfassung |
| `legacy-supabase/` | Archiviertes ursprüngliches Zahlungs-Schema; wird nicht verwendet |

## Veröffentlichung

GitHub Pages ist aktiviert. Pushes und gemergte Pull Requests nach `main` veröffentlichen den Ordner `dist/` über `.github/workflows/pages.yml` automatisch. Die Website ist unter dem Testlink oben erreichbar. Unter **Actions → Deploy static clickdummy** lassen sich Status und Fehler ablesen; bei Bedarf kann der Workflow dort manuell gestartet werden.

Der Ursprung `https://singlesilas-web.github.io` ist im Analytics-Endpunkt bereits freigegeben. Der frühere ChatGPT-Sites-Link aktualisiert sich unabhängig und wird durch GitHub-Commits nicht verändert.

Nur `dist/` als Webverzeichnis veröffentlichen. Niemals Service-Role-Schlüssel, Kennwörter oder `.env`-Dateien committen.

## Helfer pro Fest (Klickdummy)

Im **Profil** schaltet die Rolle **Helfer** den Helferzugang für **Demo-Fest A** frei – ohne zusätzliche E-Mail-Eingabe. Die Rollenwahl startet keine Kamera und öffnet keinen Scanner. Betreiber eigener Feste erhalten ebenfalls Helferzugang. Erst auf der Fest-Seite erscheint neben den beiden Bezahlwegen die dritte Karte **Helfer / Scanner öffnen**. Demo-Fest B erhält dadurch keinen Helferzugang.

Betreiber können beim Anlegen eigener Feste im Tab **Helfer** Namen und E-Mail-Adressen eintragen. Für diese eigenen Feste wird die Demo-E-Mail im Profil mit der jeweiligen Helferliste abgeglichen. Dies ist eine lokale Simulation, keine Registrierung echter Helfer-Accounts.

Der Scanner öffnet sich erst über die Helfer-Karte ; die Kamera startet erst nach Auswahl von Artikeln oder Eingabe eines Betrags und einem Klick auf „Kamera starten“. Er akzeptiert ausschließlich Guthabencodes dieses Fests. Ohne Fest-Auswahl oder ohne Zuordnung kann nicht gescannt oder abgebucht werden. **Als Gast zum Fest** führt zur normalen Fest-Auswahl zurück, ohne die Helferzuordnung zu entfernen. Ein Wechsel zur Demo-Rolle Gast entfernt den automatischen Helferzugang für Fest A. Eigene Feste unterstützen Helferlisten nur bei aktivem W1.

Für echte gemeinsame Helfer-Accounts und geräteübergreifende Zuordnungen wäre ein eigener, serverseitig geschützter Geschäftsbereich erforderlich. Die bestehende Supabase-Anbindung dient weiterhin ausschließlich der Testanalyse.

## Testaufzeichnung

- Tests beginnen ausschließlich nach Zustimmung und Auswahl von W1, W2 oder freier Erkundung.
- **Admin / Vorschau** zeichnet nichts auf. Der Ausschluss gilt browserbezogen für diesen Ursprung und wird über Tabs synchronisiert. Angemeldete Analysten werden ebenfalls ausgeschlossen.
- Erfasst werden Klickziele und normierte Positionen, Seitenwechsel, Scrolltiefe, Kartenbewegung und Zoom, Browserzoom soweit gemeldet, Sichtbarkeit und erfolgreiche fachliche Schritte.
- Keine Eingabetexte, Passwörter, Namen, rohen URL-Parameter oder IP-Adressen im eigenen Ereignisschema. Infrastruktur-Anbieter können technische Zugriffslogs führen. Zufällige Sitzungs-IDs sind Pseudonymisierung, keine garantierte Anonymisierung.
- Versand in Batches, Queue über Seitenwechsel, Keepalive und idempotente Event-IDs reduzieren Datenverlust. Browserabsturz, fehlende Verbindung und sofortiges Schließen können dennoch Ereignisse verlieren. Laufzeit maximal vier Stunden, maximal 5.000 Ereignisse pro Sitzung.
- Eigene technische Prüfsitzungen können serverseitig als `excluded=true` markiert werden und fehlen dann in der Auswertung.

## Supabase und Adminzugriff

Das Projekt `festpay-klickdummy` in Frankfurt ist verbunden. Demo-Zahlungen bleiben lokal; Supabase dient ausschließlich der Testanalyse. `DEMO_MODUS:true` beibehalten.

Alle Analytics-Tabellen haben RLS. Gäste haben keine direkten Tabellenrechte. Ein kontrollierter Endpunkt schreibt nur mit zufälligem Sitzungstoken und validiert die Ereignisse. Der Service-Role-Schlüssel bleibt in der Supabase-Laufzeit. Origin-Prüfung und Sitzungsbudget ersetzen keine umfassende Missbrauchsbegrenzung für große öffentliche Tests.

Unter `admin.html` können sich Analysten registrieren und ihre E-Mail bestätigen. **Registrierung oder Demo-Rollenwechsel allein erteilen keine Adminrechte.** Eine konkrete Adresse muss nach ausdrücklicher Freigabe serverseitig in `analytics_admin_invites` eingetragen werden. Der private Auth-Trigger übernimmt berechtigte, bestätigte Accounts in `analytics_admins`. Bei bereits bestätigten Accounts muss die Freigabe zusätzlich serverseitig anhand ihrer Auth-UUID vorgenommen werden. Adminzugänge werden separat serverseitig freigegeben. Die Demo-Rolle Helfer oder Betreiber gewährt keinen Zugriff auf Testdaten.

Es ist **keine automatische Datenlöschung aktiv**. `supabase/retention.sql` enthält einen Vorschlag für 90 Tage und darf erst nach ausdrücklicher Zustimmung ausgeführt werden. Der Einwilligungstext nennt aktuell manuelle Aufbewahrung und Löschung.

Für ein neues eigenes Supabase-Projekt zuerst `supabase/analytics.sql`, dann `supabase/admin-enrollment.sql` ausführen, die Edge Function `test-events` bereitstellen und URL/Publishable Key in `dist/js/config.js` anpassen. `verify_jwt=false` gilt nur für den Erfassungs-Endpunkt, der seine eigenen Sitzungstoken überprüft. Neue erlaubte Ursprünge in der Edge Function ergänzen. `legacy-supabase/` nicht ausführen.

## Auswertung

Ein Fall ist eine ausdrücklich gestartete Testsitzung. `seq` bestimmt die Reihenfolge bei verspätetem Versand; `at` ist Clientzeit und `received_at` Serverzeit.

- **W1-Erfolg:** `wallet_topped_up`.
- **W2-Erfolg:** `token_redeemed`; der Kauf allein genügt nicht.
- **Vermuteter Abbruch:** Ziel nicht erreicht und seit mindestens 30 Minuten kein Ereignis.
- Explizites Testende ohne Ziel wird separat markiert; freie Erkundung hat keine Erfolgsquote.
- Dauer reicht bis zum letzten Ereignis und kann Hintergrundzeit enthalten. Offene Sitzungen sind vorläufig.

Das Dashboard zeigt Prozessübergänge, Varianten, Sitzungen, Klickzahlen und eine normierte Klickdichte nach Seite, Ansicht, Seitengröße und Kartenzoom. Die Klickdichte ist kein Screenshot-Overlay und erlaubt keine geographische Interpretation.

Der **Prozess-CSV-Export** enthält `case_id, activity, timestamp, sequence, task, version` für PM4Py, Disco oder Celonis. Der JSON-Export enthält zusätzlich die übrigen Bedienereignisse. Die eingebauten Übergänge und Varianten sind erste Process-Mining-Auswertungen, kein vollständiges Conformance-Checking.

## Prüfen

```bash
node --test tests/*.test.cjs
```

Vor Freigabe neuer Versionen zusätzlich beide Bezahlwege im Browser prüfen. Bei Änderungen an der Datenbank RLS und Advisors kontrollieren. Die bereits geprüfte Anbindung speichert Ereignisse, verhindert Duplikate, weist falsche Sitzungstoken ab und sperrt den direkten Gast-Lesezugriff.

## Festverwaltung und Helferbestellungen

Eigene Feste haben Anfang und Ende (lokale Uhrzeit des Browsers). Die Karte und Suche zeigen sie ab Anfang bis vor Ende. Im Menü bleiben eigene Feste auch vorher und nachher erreichbar. Auf der Festseite öffnet **Bearbeiten** die vorausgefüllte Verwaltung; Bezahlwege W1/W2 bleiben unveränderlich. Bestehende eigene Feste ohne Eigentümerkennung werden dem bisherigen lokalen Browserkonto zugeordnet. Demo-Feste ohne Laufzeit bleiben sichtbar.

Die Speise- und Getränkekarte gilt auch für W1. Helfer tippen Artikel mehrfach an; die App summiert die Preise. Alternativ ist eine manuelle Betragseingabe möglich. Erst danach wird gescannt und die Abbuchung bestätigt. Nach erfolgreicher Abbuchung beginnt eine neue Bestellung. Artikel lassen sich über **Artikel ein- und ausblenden** pro lokalem Nutzer und Fest dauerhaft konfigurieren.

Nach dem Aufladen erscheint der neue Saldo in einem großen Dialog mit dem Hinweis zum Vorzeigen des QR-Codes. Bei vorhandenem Guthaben führt die Karte innerhalb der Festzone direkt zum eigenen QR-Code. Alle diese Funktionen bleiben lokale Simulationen; es gibt keine Synchronisierung zwischen Geräten oder echte Zahlungen.

### Rollenführung und QR-Schnellzugriff

Die Rolle Helfer sieht nur zugeordnete Feste und öffnet von dort direkt den Scanner. Gastseiten (Guthaben/QR, Festmarken, Speisekarte und Checkout) leiten Helfer zurück in ihren Helferbereich; Gast-Verknüpfungen sind ausgeblendet. Ein passender E-Mail-Eintrag allein erteilt in der Rolle Gast keinen Helferzugang. Betreiber behalten den Helferzugang zu eigenen Festen.

Der QR-Button auf der Startkarte öffnet bei genau einem Fest mit Guthaben direkt dessen Code. Bei mehreren Guthaben erscheint eine Festauswahl. Betrag und Scanner stehen in einer kompakten Helferansicht untereinander. Die Icon-Auswahl beim Anlegen zeigt die Symbole in einem aufklappbaren Raster.
