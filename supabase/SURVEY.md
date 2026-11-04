# Eigenständige Festpay-Testumfrage

URL: https://singlesilas-web.github.io/Festpay/umfrage/

Die Dateien unter `dist/umfrage/` sind vollständig unabhängig von den App-Skripten. Es gibt weder Navigation zwischen App und Umfrage noch Login, Telemetrie, App-Storage-Zugriff oder Zuordnung zu Analytics-Sitzungen. Keine Namen, E-Mails oder Testpersonen-IDs werden abgefragt. Hosting-Anbieter können technische Logs führen.

12 kurze Fragen (3 Hintergrundfragen, 6 Bewertungen, 2 rollenbezogene Nutzenfragen, 1 optionales Freitextfeld), ca. 2 Minuten; bei „Keine dieser Rollen“ entfallen die beiden Nutzenfragen. Skala: 1–5 Zustimmung; 0 = nicht beurteilbar und bei Mittelwerten auszuschließen. Null bei Nutzenfragen bedeutet durch Filter übersprungen. Kein standardisierter SUS-Score. Die monatliche Zahlungsbereitschaft aus der Vorlage wurde ausgelassen, da kein monatliches Festpay-Preismodell definiert ist.

Antworten: Supabase-Projekt `festpay-klickdummy`, Tabelle `public.festpay_survey_responses`. Projektmitglieder können über den Supabase Table Editor auswerten und CSV exportieren. Öffentlich ist ausschließlich das Einfügen der definierten Antwortspalten erlaubt, kein Lesen/Ändern/Löschen. RLS und Datenbank-Constraints sind aktiviert. Die technische Antwort-ID ist zufällig, unabhängig von App-IDs und dient der Vermeidung doppelter Inserts beim erneuten Senden nach einem Netzwerkfehler. Keine dauerhafte Browser-Sperre: neue Seitenaufrufe können neue Antworten abgeben. Öffentliche Erfassung ist kein Schutz vor automatisiertem Spam.

Schema: `survey.sql`, als Migration `standalone_festpay_survey` angewandt. Keine Änderungen an bestehenden Tabellen. Antworten werden nicht automatisch gelöscht; das Projektteam verwaltet Aufbewahrung/Löschung manuell. Vor breiterem Einsatz einen konkreten Aufbewahrungszeitraum und Projektkontakt festlegen.
