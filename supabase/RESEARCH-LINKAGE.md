# Verknüpfte Nutzertests (v7)

## Inbetriebnahme

Zielprojekt: `festpay-klickdummy`, Ref `orrprvpypsvuzspwzevf`. Nicht auf ein anderes Projekt anwenden.

1. Bestehendes Schema, Migrationen und Advisors im Zielprojekt prüfen. Dieses Upgrade setzt `analytics.sql`, `analytics-tasks-v6.sql`, das bestehende Survey-Schema bis v5 und `observation.sql` voraus. Die historischen Skripte nicht erneut auf der vorhandenen Datenbank ausführen.
2. `research-linkage-v7.sql` einmal als Migration im Zielprojekt anwenden. Die Änderung ist additiv und transaktional. Sie löscht keine Antworten und ordnet Altdaten nicht nachträglich zu.
3. `functions/test-events/index.ts` als Edge Function `test-events` bereitstellen (`verify_jwt=false` wie in `config.toml`; eigene Sitzungstoken bleiben erforderlich). Alte Clients werden weiter unterstützt und bleiben unverknüpft.
4. Auf dem Zielprojekt prüfen: anonymer Lesezugriff bleibt gesperrt; freigegebene Analysten können `festpay_research_attempts` lesen; neue Starts speichern `trial_id`; falsche Aufgaben-/Versuchs-IDs im Bogen werden abgewiesen. Security-/Performance-Advisors erneut prüfen.
5. Erst danach v7-Frontend nach `main` übernehmen. GitHub Pages veröffentlicht automatisch. Einwilligung, eine Aufgabe, Fragebogen, Beobachtungsbogen und CSV mit freigegebenen technischen Testdaten Ende zu Ende prüfen; technische Sitzungen anschließend von der Analyse ausschließen.

Der Supabase-Zugriff dieser Umsetzung war für dieses Zielprojekt nicht freigeschaltet. Die Migration und Edge Function wurden deshalb **nicht live angewandt**. Die SQL-Prüfung läuft lokal mit PostgreSQL in PGlite; die Formularprüfung mit jsdom. Ein visueller Browsercheck und ein Test gegen den echten API-Endpunkt stehen noch aus.

## Durchführung

1. Im Beobachtungsbogen **Neue Versuchs-ID** wählen. Für jede neue Testperson eine neue ID verwenden. Keine Namen eintragen.
2. **App mit dieser Versuchs-ID öffnen** wählen oder diesen Link auf das Testgerät übertragen. Die Kennung steht im URL-Fragment; Sitzungstoken werden nicht in Links übertragen. Die ID allein erlaubt keinen Lesezugriff.
3. Die Testperson stimmt der verknüpften Auswertung zu und startet eine Aufgabe. Jede Aufgabe und jede Wiederholung erzeugt eine neue `analytics_sessions.id` (Aufgabenversuchs-ID). `trial_id` bleibt gleich.
4. In der laufenden App unter **Testkennungen & Fragebogen** den Link **Beobachtungsbogen für diese Aufgabe** öffnen. Er überträgt auch Aufgabe und Aufgabenversuchs-ID. Alternativ die vollständige Aufgabenversuchs-ID im passenden Aufgabenabschnitt eintragen. Ein ausgefüllter Entwurf mit einer anderen Kennung wird nicht überschrieben.
5. Nach einer Aufgabe **Zur Testauswahl** wählen und mit derselben Versuchs-ID fortfahren. Für eine wiederholte Aufgabe den bisherigen Bogen speichern und einen neuen Bogen mit derselben Versuchs-ID anlegen. Eine konkrete Aufgabenversuchs-ID kann nur einmal beobachtet werden.
6. Den Fragebogen über den verknüpften Link öffnen. Pro Versuchs-ID wird ein Fragebogen gespeichert; das Alter kann im Fragebogen oder Beobachtungsbogen angegeben werden. Für andere Geräte die Links übertragen oder die vollständige gemeinsame ID eingeben. Die ID wird nur im jeweiligen Tab gespeichert; kein geräteübergreifender Automatismus.

## Datenmodell und Auswertung

| Feld | Bedeutung |
| --- | --- |
| `trial_id` | Gemeinsamer Test einer Testperson; verbindet alle drei Quellen |
| `analytics_sessions.id` / CSV `attempt_id` | Genau ein gestarteter Aufgabenversuch; bleibt die Process-Mining-Fall-ID |
| `task` | Gemeinsamer Aufgabenschlüssel, unabhängig von der Person |
| `festpay_observation_attempts` | Durch zusammengesetzte Fremdschlüssel gesicherte Zuordnung einer Beobachtung zu Versuch und Aufgabe |
| `festpay_research_attempts` | Adminsicht mit genau einer Zeile pro nicht ausgeschlossenem Aufgabenversuch |
| `linkage` | `complete`: Fragebogen und genaue Beobachtung vorhanden; `partial`: mindestens eine Quelle fehlt; `unlinked`: keine gemeinsame ID |
| `age_conflict` | Verschiedene Altersangaben zur selben Versuchs-ID; aus Altersgruppen ausgeschlossen |

Die Altersgruppen im Dashboard sind 20–30 und 50–80 Jahre (jeweils einschließlich Grenzen), außerdem andere und unbekannte Altersgruppen. Bei widersprüchlichem Alter bleibt das auswertbare Alter leer. Fehlende Bögen bleiben sichtbar und werden nicht geraten. Historische Daten ohne ID bleiben unverknüpft.

**Verknüpfte Auswertung (CSV)** exportiert eine Zeile pro ausgewähltem Aufgabenversuch mit Alter/Altersgruppe, Ergebnis, Zeit/Klicks bis zum ausgewählten Ziel (ohne Ziel: bis zum letzten Ereignis), beobachteten Fehlaktionen und wiederholten Klicks, Beobachtungsergebnis/-dauer sowie Fragebogenantworten. `assigned_goal` kennzeichnet, ob das Ziel tatsächlich zur zugewiesenen Aufgabe gehört. Fragebogenantworten gelten für den ganzen Test; bei Wiederholungen sind sie keine unabhängigen Antworten pro Versuch. Der bestehende Prozess-CSV enthält dieselben Kennungen und demografischen Zuordnungen pro Ereignis.

Vergleiche nur passende Aufgaben und Versionen. Die fünf App-Aufgaben und die sechs Fragebogenfragen sind nicht deckungsgleich: die Fragebogenfragen zur Betreiber-Guthabenaufgabe und zum Helfer-Hinzufügen beziehen sich auf denselben App-Aufgabenschlüssel `betreiber_guthaben`. Keine stillschweigende Eins-zu-eins-Zuordnung dieser Selbstauskünfte zu einzelnen Wiederholungen.

Automatisch beobachtete Fehlaktionen sind kein vollständiges Fehlermaß. Zeit enthält Pausen/Hintergrundzeit. Nur erfolgreiche Zielerreichungen als erfolgreiche Bearbeitungszeiten vergleichen; offene und abgebrochene Aufgaben separat behandeln. Wiederholungen derselben Testperson sind keine unabhängigen Stichproben. Kein signifikanter Unterschied belegt keine Gleichheit; dafür ein geeignetes Verfahren und ausreichende Stichprobe verwenden.

## Prüfen

Node.js 24 oder neuer; `npm ci` und `npm test`. Die Laufzeit der Website benötigt weiterhin keine npm-Pakete und keinen Build. Die Tests prüfen u. a. SQL-Migration, falsche Fremdschlüssel, Wiederholungen, RLS, Alterskonflikte, Einwilligungsprüfung des Endpunkts, Formularpayloads und Exporte. PGlite startet PostgreSQL lokal im Prozess; es werden keine echten Testpersonen angelegt.
