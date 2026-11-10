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

- Tests beginnen nach Zustimmung und Auswahl einer der fünf Aufgaben aus „Happy Paths Aufgaben final“. `dist/js/test-tasks.js` liefert die gemeinsame Liste für Testauswahl, Beobachtungsbogen und Aufgabenfilter.
- **Admin / Vorschau** zeichnet nichts auf. Der Ausschluss gilt browserbezogen für diesen Ursprung und wird über Tabs synchronisiert. Angemeldete Analysten werden ebenfalls ausgeschlossen.
- Erfasst werden Klickziele und normierte Positionen, Seitenwechsel, Scrolltiefe, Kartenbewegung und Zoom, Browserzoom soweit gemeldet, Sichtbarkeit und erfolgreiche fachliche Schritte.
- Keine Eingabetexte, Passwörter, Namen, rohen URL-Parameter oder IP-Adressen im eigenen Ereignisschema. Infrastruktur-Anbieter können technische Zugriffslogs führen. Zufällige Sitzungs-IDs sind Pseudonymisierung, keine garantierte Anonymisierung.
- Versand in Batches, Queue über Seitenwechsel, Keepalive und idempotente Event-IDs reduzieren Datenverlust. Browserabsturz, fehlende Verbindung und sofortiges Schließen können dennoch Ereignisse verlieren. Laufzeit maximal vier Stunden, maximal 5.000 Ereignisse pro Sitzung.
- **Zur Testauswahl** beendet den aktuellen Versuch mit `session_end` und `return_to_task_selection`, überträgt ausstehende Ereignisse und öffnet die Aufgabenwahl. Bei Übertragungsfehlern bleiben die Daten für einen erneuten Versuch erhalten. Jede gestartete Aufgabe erhält eine eigene Sitzungs-ID und einen frischen Demo-Zustand. Im Helfertest sind Helferrolle und 20 € Gastguthaben als Startbedingung vorbereitet.
- Eigene technische Prüfsitzungen können serverseitig als `excluded=true` markiert werden und fehlen dann in der Auswertung.

## Supabase und Adminzugriff

Das Projekt `festpay-klickdummy` in Frankfurt ist verbunden. Demo-Zahlungen bleiben lokal; Supabase dient ausschließlich der Testanalyse. `DEMO_MODUS:true` beibehalten.

Alle Analytics-Tabellen haben RLS. Gäste haben keine direkten Tabellenrechte. Ein kontrollierter Endpunkt schreibt nur mit zufälligem Sitzungstoken und validiert die Ereignisse. Der Service-Role-Schlüssel bleibt in der Supabase-Laufzeit. Origin-Prüfung und Sitzungsbudget ersetzen keine umfassende Missbrauchsbegrenzung für große öffentliche Tests.

Unter `admin.html` können sich Analysten registrieren und ihre E-Mail bestätigen. **Registrierung oder Demo-Rollenwechsel allein erteilen keine Adminrechte.** Eine konkrete Adresse muss nach ausdrücklicher Freigabe serverseitig in `analytics_admin_invites` eingetragen werden. Der private Auth-Trigger übernimmt berechtigte, bestätigte Accounts in `analytics_admins`. Bei bereits bestätigten Accounts muss die Freigabe zusätzlich serverseitig anhand ihrer Auth-UUID vorgenommen werden. Adminzugänge werden separat serverseitig freigegeben. Die Demo-Rolle Helfer oder Betreiber gewährt keinen Zugriff auf Testdaten.

Es ist **keine automatische Datenlöschung aktiv**. `supabase/retention.sql` enthält einen Vorschlag für 90 Tage und darf erst nach ausdrücklicher Zustimmung ausgeführt werden. Der Einwilligungstext nennt aktuell manuelle Aufbewahrung und Löschung.

Für ein neues eigenes Supabase-Projekt zuerst `supabase/analytics.sql`, dann `supabase/admin-enrollment.sql` ausführen, die Edge Function `test-events` bereitstellen und URL/Publishable Key in `dist/js/config.js` anpassen. `verify_jwt=false` gilt nur für den Erfassungs-Endpunkt, der seine eigenen Sitzungstoken überprüft. Neue erlaubte Ursprünge in der Edge Function ergänzen. `legacy-supabase/` nicht ausführen.

## Auswertung

Ein Fall ist eine ausdrücklich gestartete Aufgabe. Das Dashboard wählt `festpay-2026-11-09-v6-tasks` standardmäßig voraus. Ältere Daten bleiben über den Versionsfilter erreichbar und behalten ihre ursprüngliche Aufgabenbezeichnung. Die Erweiterung bestehender Datenbanken steht in `supabase/analytics-tasks-v6.sql`. `seq` bestimmt die Reihenfolge bei verspätetem Versand; `at` ist Clientzeit und `received_at` Serverzeit.

- **Gast-Guthabenaufgabe:** `wallet_qr_shown` als beobachtetes Teilziel. Dies belegt keine erfolgte Zahlung am Stand. Alte W1-Tests behalten `wallet_topped_up` als Ziel.
- **Gast-Markenaufgabe / W2:** `token_redeemed`; der Kauf allein genügt nicht.
- **Helferaufgabe:** `wallet_charged`. Betreiber-Festmarken: `festival_created`. Betreiber-Guthaben: `festival_helper_saved`. Das jeweilige Ereignis belegt den Schritt, nicht automatisch die korrekte Erfüllung sämtlicher Aufgabenanforderungen.
- **Vermuteter Abbruch:** Ziel nicht erreicht und seit mindestens 30 Minuten kein Ereignis.
- Explizites Testende ohne Ziel wird separat markiert; freie Erkundung hat keine Erfolgsquote.
- Dauer reicht bis zum letzten Ereignis und kann Hintergrundzeit enthalten. Offene Sitzungen sind vorläufig.

Das Dashboard zeigt Prozessübergänge, Varianten, Sitzungen, Klickzahlen und eine normierte Klickdichte nach Seite, Ansicht, Seitengröße und Kartenzoom. Die Klickdichte ist kein Screenshot-Overlay und erlaubt keine geographische Interpretation.

Der **Prozess-CSV-Export** enthält `case_id, activity, timestamp, sequence, task, version` für PM4Py, Disco oder Celonis. Beide Exporte umfassen den ganzen ausgewählten Versuch bis zum Testende, auch wenn das gewählte Ziel vorher erreicht wurde. `end_reason` zeigt den Grund des Testendes. Der JSON-Export enthält zusätzlich die übrigen Bedienereignisse. Die eingebauten Übergänge und Varianten sind erste Process-Mining-Auswertungen, kein vollständiges Conformance-Checking.

## Prüfen

```bash
node --test tests/*.test.cjs
```

Vor Freigabe neuer Versionen zusätzlich beide Bezahlwege im Browser prüfen. Bei Änderungen an der Datenbank RLS und Advisors kontrollieren. Die bereits geprüfte Anbindung speichert Ereignisse, verhindert Duplikate, weist falsche Sitzungstoken ab und sperrt den direkten Gast-Lesezugriff.

## Festverwaltung und Helferbestellungen

Eigene Feste haben Anfang und Ende (lokale Uhrzeit des Browsers). Die Karte und Suche zeigen sie ab Anfang bis vor Ende. Im Menü bleiben eigene Feste auch vorher und nachher erreichbar. Auf der Festseite öffnet **Bearbeiten** die vorausgefüllte Verwaltung; Bezahlwege W1/W2 bleiben unveränderlich. Bestehende eigene Feste ohne Eigentümerkennung werden dem bisherigen lokalen Browserkonto zugeordnet. Demo-Feste ohne Laufzeit bleiben sichtbar.

Die Speise- und Getränkekarte gilt auch für W1. Helfer tippen Artikel mehrfach an; die App summiert die Preise. Alternativ ist eine manuelle Betragseingabe möglich. Erst danach wird gescannt und die Abbuchung bestätigt. Nach erfolgreicher Abbuchung beginnt eine neue Bestellung. Artikel lassen sich über **Artikel ein- und ausblenden** pro lokalem Nutzer und Fest dauerhaft konfigurieren.

Nach dem Aufladen wird der QR-Bereich hervorgehoben, während der restliche Bildschirm abgedunkelt bleibt. Ein Hinweis mit Pfeil erklärt, dass der Code jederzeit über das Fest erneut erreichbar ist; ein beliebiger Klick schließt die Führung, ohne die Seite zu verschieben. Datum und Uhrzeit werden in eigenen FestPay-Auswahlfeldern gewählt. Bei vorhandenem Guthaben führt die Karte innerhalb der Festzone direkt zum eigenen QR-Code. Alle diese Funktionen bleiben lokale Simulationen; es gibt keine Synchronisierung zwischen Geräten oder echte Zahlungen.

### Rollenführung und QR-Schnellzugriff

Die Rolle Helfer sieht nur zugeordnete Feste und öffnet von dort direkt den Scanner. Gastseiten (Guthaben/QR, Festmarken, Speisekarte und Checkout) leiten Helfer zurück in ihren Helferbereich; Gast-Verknüpfungen sind ausgeblendet. Ein passender E-Mail-Eintrag allein erteilt in der Rolle Gast keinen Helferzugang. Betreiber behalten den Helferzugang zu eigenen Festen.

Der QR-Button auf der Startkarte öffnet bei genau einem Fest mit Guthaben direkt dessen Code. Bei mehreren Guthaben erscheint eine Festauswahl. Betrag und Scanner stehen in einer kompakten Helferansicht untereinander. Die Icon-Auswahl beim Anlegen zeigt die Symbole in einem aufklappbaren Raster.

### Betreiberformular und kompakte Helferkasse

Das manuelle Ortsfeld entfällt. Die aktuelle SVG-Karte besitzt keine geografischen Koordinaten; eine automatische Ortsermittlung ist deshalb erst mit einer echten Kartenanbindung möglich. Bestehende Ortsangaben bleiben in gespeicherten Festen erhalten. Der Zonen-Reset steht unter der Karte. Kategorien werden aus einer festen Liste gewählt; vorhandene individuelle Kategorien bleiben beim Bearbeiten erhalten. Die Icon-Palette ist standardmäßig geöffnet.

Die Helferkasse zeigt Artikelkacheln mit Symbol, Preis und Anzahl sowie ein bearbeitbares Gesamtfeld. Bei umfangreichen Karten scrollt die Artikelliste innerhalb ihres Bereichs. Nach dem Scan erscheint die Bestätigung direkt über der Kamerafläche; Abbrechen behält die Bestellung, Abbuchen setzt sie nach erfolgreicher Buchung zurück.


### Ergänzungen zur Testdurchführung (09.11.2026, v7)

Im Menü führt „Zur Testauswahl“ über dieselbe übertragungssichere Abschlussfunktion wie der feste Rücksprungbutton zum ersten Bildschirm. Ein Rücksprung ist ein Versuchsende und kein Erfolgsnachweis. Vor dem nächsten Versuch werden auch ausgeblendete Helferartikel zurückgesetzt. Demo-Fest B bietet 10/20/50 € an, damit die 20-€-Aufladung aus dem finalen Aufgabenblatt durchführbar ist.

Vorhandene Rohdaten bleiben unverändert. Über den Versionsfilter sind ältere Versuche weiterhin verfügbar; standardmäßig zeigt die Auswertung die aktuelle Version. Die Endziele im Dashboard sind beobachtete Zwischen- bzw. Endaktivitäten (z. B. QR sichtbar, Marke entwertet), kein automatischer Nachweis sämtlicher Details einer mehrteiligen Aufgabe. Den vollständigen Aufgabenerfolg mit dem Beobachtungsbogen abgleichen. Eine geräteübergreifende Standzahlung ist im lokalen Klickdummy weiterhin nur als getrennte Helferhandlung testbar.

## Verknüpfte Nutzertest-Studie (v8, 10.11.2026)

Eine zufällige **Testpersonen-ID** (`study_participants.id`) bleibt über mehrere Aufgaben derselben Person gleich. Jeder gestartete Versuch erhält weiterhin eine eigene **Versuchs-ID** (`analytics_sessions.id`). Auch Wiederholungen derselben Aufgabe erzeugen neue Versuchs-IDs. Es werden keine historischen Datensätze anhand von Namen, Alter oder Zeitnähe zugeordnet.

Durchführung:
1. Auf der Aufgabenauswahl **Neue Testperson** wählen, wenn die Person wechselt. Für weitere Aufgaben derselben Person die bestehende ID behalten. Der Rollenwechsel erfolgt automatisch.
2. Aufgabe starten und nach dem Versuch **Zur Testauswahl** wählen. IDs und Fragebogenlinks stehen unter **IDs / Fragebögen** bzw. **IDs und Links zu den Fragebögen**. Vor der ersten gestarteten Aufgabe existiert noch keine gespeicherte Verknüpfung.
3. Fragebogen und Beobachtungsbogen über diese Links öffnen. Auf demselben Gerät werden die IDs automatisch übernommen. Für ein anderes Gerät den jeweiligen vollständigen Link übertragen. Der Link enthält ausschließlich pseudonyme IDs und Aufgabenkennungen im Fragment, keine Antworten oder Telemetrie-Zugriffstoken. Die IDs sind Zuordnungscodes, kein Identitätsnachweis der natürlichen Person; Links nur innerhalb der Testdurchführung teilen.
4. Im Beobachtungsbogen pro aufgezeichneter Aufgabe die konkrete Versuchs-ID prüfen. Bei Wiederholung derselben Aufgabe einen neuen Bogen verwenden; die vorgeschlagene ID ist der zuletzt gestartete Versuch dieser Aufgabe. Ohne Aufzeichnung kann kein verknüpfter Bogen gespeichert werden. Die Fragebogen-Antwort zu einer Aufgabe ist bei mehreren enthaltenen Wiederholungen eine übergreifende Selbstauskunft und wird im Export nicht als Ergebnis jedes einzelnen Versuchs ausgegeben.

Der Fragebogen fragt das Alter nun ebenfalls **freiwillig** ab; es kann weiterhin allein im Beobachtungsbogen stehen. Die Einwilligungstexte beschreiben die Zusammenführung. Die Daten sind pseudonymisiert, nicht anonym. Im Beobachtungsbogen keine Namen erfassen.

### Speicherung und Zugriffsprüfung

Die additive Migration `supabase/study-linkage.sql` ergänzt Fremdschlüssel und `attempt_ids` an beiden Formularen. `validate_study_form` prüft Person, genaue Sitzung und Beobachtungsaufgabe in derselben Datenbanktransaktion. Der Edge-Endpunkt nimmt nur bekannte Felder an und bestätigt wiederholte Übertragungen derselben Formular-ID ohne zweite Zeile. Verknüpfte Daten können nicht direkt mit dem öffentlichen Schlüssel eingetragen werden. Bestehende unverknüpfte Formularversionen bleiben kompatibel. Rohdaten wurden nicht rückwirkend verändert.

`study_attempt_analysis` ist eine View mit `security_invoker=true`; Lesen erfordert den bestehenden Analyse-Adminzugang. Die View erzeugt genau eine Zeile je nicht ausgeschlossenem Versuch. Die neue Admin-Tabelle und **Verknüpfte Daten als CSV** berücksichtigen Aufgaben- und Versionsfilter, unabhängig vom Endzielfilter. Der Export enthält Personen-/Versuchs- und Formular-IDs, Alter und Altersgruppe, Quellenanzahl, Beobachtungsergebnis, Selbstauskunft, protokollierte Zielzeit, Zeit bis zum Versuchsende, Beobachtungszeit, Klicks, protokollierte Fehler und wiederholte Klicks.

- Fehlende Verbindung: `historical_unlinked` oder `partially_linked`; keine Zuordnung wird geraten.
- Unterschiedliche Altersangaben derselben Person: `age_conflict=true`, ausgewertetes Alter bleibt leer.
- Mehrere Formulare für denselben Versuch: alle IDs und Anzahlen bleiben sichtbar; die jüngste Antwort ist explizit als ausgewählter Datensatz gekennzeichnet.
- Mehrere Versuche derselben Aufgabe in einem Fragebogen: `survey_task_result` bleibt leer; `survey_reported_task_result` enthält die übergreifende Antwort und `survey_task_attempt_count` die Zahl der erfassten Versuche.
- `goal_elapsed_ms` ist die Zeit bis zur vorhandenen Mining-Zielaktivität, kein Nachweis, dass die gesamte mehrteilige Aufgabe erfolgreich war. `end_elapsed_ms` zählt bis zum Rücksprung inklusive Pausen. Den vollständigen Aufgabenerfolg am Beobachtungsergebnis prüfen.
- Protokollierte Fehler sind beobachtete fehlgeschlagene API-Aktivitäten; nicht jeder Bedienfehler ist automatisch erkennbar. Wiederholte Klicks werden separat ausgewiesen.
- Für Altersvergleiche dieselbe Aufgabe und einen vorab festgelegten Zeitbegriff verwenden. Wiederholungen derselben Person sind keine unabhängigen Personen. Der Export führt keine Signifikanz- oder Gleichwertigkeitstests durch.

Validierung: `node --test tests/*.test.cjs`; zusätzlich die transaktionale SQL-Prüfung `tests/study-linkage.sql` (mit Rollback). Synthetische Live-Prüfungen der Edge-Annahme und ID-Ablehnung wurden von der Auswertung ausgeschlossen. Frühere Ergebnisse ohne IDs können nur auf Basis anderweitig gesicherter Zuordnungsnachweise nachträglich verbunden werden; diese Umsetzung nimmt keine solche Rekonstruktion vor.
