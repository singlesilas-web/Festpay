# Zählung von Mehrfachversuchen

Das Dashboard zählt pro Testperson, zugewiesener Aufgabe und UI-Version genau einen beobachteten Versuch. Rohdaten, Ausschlussflags und Formularzuordnungen werden dabei nicht verändert. Die beiden Testrunden bleiben getrennt. Versuche ohne Personen-ID oder Personencode werden nicht zusammengeführt.

## Auswahl

`FestPayMining.casesForGoal` liefert weiterhin alle einzelnen Versuche. `representativeCases` wählt daraus vor Wege- und Variantenfiltern die analytischen Fälle:

1. Ein protokollierter Zielschritt hat Vorrang vor einem nicht erreichten Ziel.
2. Danach zählt die höchste aufgabenspezifische Fortschrittsstufe aus Seiten, Aktionen und fachlichen Ereignissen. Die expliziten Stufen stehen in `progressStages` in `dist/js/process-mining.js`.
3. Bei derselben Stufe zählt die Anzahl unterschiedlicher beobachteter Seiten, Klickziele, Feldfokusse und erfolgreicher fachlicher Ereignisse bis zum Zielschritt beziehungsweise Versuchsende. Wiederholungen desselben Schlüssels, passive Ereignisse und Wartezeit erhöhen diesen Wert nicht.
4. Bei weiterem Gleichstand bleibt die frühere Versuchsnummer, danach Startzeit und technische ID, maßgeblich.

Die Auswahl ist deterministisch und verändert keine Ereignisse. Sie gilt für Kennzahlen, Prozessvarianten, Diagramm, Heatmap und Prozess-/Ereignisexport. Die verknüpfte Tabelle und ihr CSV verwenden dieselben ausgewählten Versuche für die Aufgabe und Version; sie bleiben wie bisher unabhängig von den Wege- und Variantenfiltern.

## Nachvollziehbarkeit und Grenzen

Das Dashboard zeigt die Zahl gespeicherter und ausgewählter Versuche sowie bei Mehrfachversuchen alle Kandidaten und den Auswahlgrund. Exporte enthalten die Auswahlregel und die Zahl der ursprünglichen Versuche. JSON enthält zusätzlich Kandidaten und alternative IDs; deren vollständige Rohereignisse bleiben in Supabase gespeichert.

Formulare bleiben an den ursprünglich angegebenen Versuchen verknüpft. Ein an einem anderen Versuch verknüpfter Beobachtungsbogen wird als Hinweis angezeigt, aber nicht als Beleg für den ausgewählten Versuch übernommen.

Diese Zählung beschreibt das beste beobachtete Ergebnis je Person und Aufgabe, nicht den Erfolg beim ersten Anlauf. Zeiten und Klicks stammen ausschließlich aus dem ausgewählten Versuch; sie summieren keine früheren Anläufe. Zielschritte, Erfolgsdefinitionen und bestehende Ausschlüsse bleiben unverändert. Insbesondere belegt ein einzelner Zielschritt nicht automatisch den vollständigen Abschluss einer mehrteiligen Aufgabe.

## Prüfung

`node --test tests/*.test.cjs` prüft insbesondere Versions- und Aufgabentrennung, anonyme Fälle, erfolgreiche und unvollständige Wiederholungen, passive Ereignisse, Gleichstände und konsistente Dashboard-/Exportauswahl.
