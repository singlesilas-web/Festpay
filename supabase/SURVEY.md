# Eigenständige Festpay-Testumfrage

URL: https://singlesilas-web.github.io/Festpay/umfrage/

Die Dateien unter `dist/umfrage/` sind vollständig unabhängig von den App-Skripten. Es gibt weder Navigation zwischen App und Umfrage noch Login, Telemetrie, App-Storage-Zugriff oder Zuordnung zu Analytics-Sitzungen. Keine Namen, E-Mails oder Testpersonen-IDs werden abgefragt. Hosting-Anbieter können technische Logs führen.

Version 2 hat vier Schritte (etwa 3 Minuten): Hintergrund mit Rolle, Praktikabilität von Bargeld/Wertmarken und bevorzugter Bezahlweise; vier konkrete Testaufgaben; sechs Bewertungen; Fazit mit zwei rollenbezogenen Nutzenfragen und optionalem Freitext. Bei „Keine dieser Rollen“ entfallen die beiden Nutzenfragen. Keine automatische Verbindung zum App-Test.

- `payment_practicality`: 1 = sehr unpraktisch, 2 = eher unpraktisch, 3 = weder praktisch noch unpraktisch, 4 = eher praktisch, 5 = sehr praktisch, 0 = keine Erfahrung (nicht in Mittelwerte aufnehmen).
- `payment_preference`: `cash` / `tokens` / `digital` / `no_preference` / `cannot_judge`.
- `task_topup`, `task_qr`, `task_buy_tokens`, `task_redeem_token`: `done` = geschafft, `with_help` = mit Hilfe geschafft, `failed` = nicht geschafft, `not_tried` = nicht ausprobiert. „Nicht ausprobiert“ nicht als Misserfolg zählen.
- Je Aufgabe gibt es eine eigene Spalte mit Endung `_note` (maximal 300 Zeichen). Nur bei `with_help` oder `failed` wird die freiwillige Begründung übertragen; sonst ist sie leer. „Alle ohne Hilfe geschafft“ setzt alle vier Aufgaben auf `done`.
- Bewertungen: Skala 1–5 Zustimmung; 0 = nicht beurteilbar und bei Mittelwerten auszuschließen. Null bei Nutzenfragen bedeutet durch Rollenfilter übersprungen. Kein standardisierter SUS-Score.

Die bisherigen Antworten bleiben unverändert als `survey_version = 1` erhalten (`prior_problem`, `task_success`). Neue Antworten verwenden `survey_version = 2` mit den neuen Spalten; die beiden alten Felder bleiben dann null. Bereits geöffnete V1-Seiten dürfen weiterhin Antworten abgeben. Bei Auswertungen die Versionen unterscheiden und die alten Fragen nicht mit den neuen gleichsetzen.

Antworten: Supabase-Projekt `festpay-klickdummy`, Tabelle `public.festpay_survey_responses`. Projektmitglieder können über den Supabase Table Editor auswerten und CSV exportieren. Öffentlich ist ausschließlich das Einfügen der definierten Antwortspalten erlaubt, kein Lesen/Ändern/Löschen. RLS und Datenbank-Constraints sind aktiviert. Die technische Antwort-ID ist zufällig, unabhängig von App-IDs und dient der Vermeidung doppelter Inserts beim erneuten Senden nach einem Netzwerkfehler. Keine dauerhafte Browser-Sperre: neue Seitenaufrufe können neue Antworten abgeben. Öffentliche Erfassung ist kein Schutz vor automatisiertem Spam.

Schema: `survey.sql` enthält das ursprüngliche Schema und das Upgrade. Die Migrationen `standalone_festpay_survey` und `standalone_festpay_survey_v2` wurden angewandt. V2 ergänzt die bestehende Umfragetabelle; App- und Analytics-Tabellen bleiben unverändert. Antworten werden nicht automatisch gelöscht; das Projektteam verwaltet Aufbewahrung/Löschung manuell. Vor breiterem Einsatz einen konkreten Aufbewahrungszeitraum und Projektkontakt festlegen.

