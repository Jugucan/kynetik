import { useState, useEffect } from "react";

interface MotivationalPhraseData {
  title: string;
  phrase: string;
  date: string;
  sessionsSnapshot: number;
  autodisciplineSnapshot: number;
}

interface UserStatsForPhrase {
  name: string;
  totalSessions: number;
  autodiscipline: number;
  autodisciplineLabel: string;
  daysSinceLastSession: number;
  improvementTrend: 'up' | 'down' | 'stable';
  activePrograms: string[];
  yearlyTrend: 'up' | 'down' | 'stable';
  daysBetweenSessions: number;
  memberSinceYear: number | null;
}

const today = new Date().toISOString().split('T')[0];

export const useMotivationalPhrase = (userStats: UserStatsForPhrase | null) => {
  const [title, setTitle] = useState<string>('');
  const [phrase, setPhrase] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!userStats || userStats.totalSessions === 0) return;

    const storageKey = `kynetik_motivation_${userStats.name.replace(/\s/g, '_')}`;

    // Comprovar si ja tenim frase d'avui amb les mateixes dades
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: MotivationalPhraseData = JSON.parse(stored);
        const sameDay = data.date === today;
        const sameStats =
          data.sessionsSnapshot === userStats.totalSessions &&
          data.autodisciplineSnapshot === userStats.autodiscipline;

        if (sameDay && sameStats) {
          setTitle(data.title || '');
          setPhrase(data.phrase);
          return;
        }
      }
    } catch (e) {}

    generatePhrase(userStats, storageKey);
  }, [userStats?.totalSessions, userStats?.autodiscipline, userStats?.name]);

  const generatePhrase = async (stats: UserStatsForPhrase, storageKey: string) => {
    setIsLoading(true);

    const firstName = stats.name.split(' ')[0];

    const activeProgramsText = stats.activePrograms.length > 0
      ? `Programes actius aquest mes: ${stats.activePrograms.join(', ')}.`
      : 'No ha assistit a cap classe aquest mes.';

    const trendText = {
      up: "millor que l'any anterior",
      down: "una mica per sota de l'any anterior",
      stable: "similar a l'any anterior"
    }[stats.yearlyTrend];

    const improvementText = {
      up: 'ha millorat respecte els mesos anteriors',
      down: 'ha baixat una mica respecte els mesos anteriors',
      stable: 'manté un ritme estable'
    }[stats.improvementTrend];

    const prompt = `Ets un coach esportiu amb molt de caràcter. Parles directament a la persona, de tu a tu, amb energia, autenticitat i passió. Les teves frases fan que la gent vulgui sortir a córrer ara mateix.

REGLES ABSOLUTES:
- Parla SEMPRE en segona persona (tu, et, t', el teu, la teva). MAI en tercera persona.
- Usa el nom ${firstName} com a molt UNA sola vegada, i no sempre
- MÀXIM 20 paraules en total entre títol i missatge
- El títol ha de ser una exclamació potent i original (NO "Millora Constant", NO "Superació Personal", res de genèric)
- El missatge ha de tenir IMPACTE EMOCIONAL, que faci sentir a la persona única i poderosa
- Varia molt el to: de vegades intens, de vegades irònic, de vegades poètic, de vegades directe com un cop de puny
- En català viu i col·loquial, res d'acadèmic
- Sense emojis

EXEMPLES del to que busco (usa'ls com a inspiració, NO els copiïs):
- Títol: "Avui el gimnàs et tem." / Missatge: "Portes ${stats.totalSessions} sessions a les cames. Saps el que això significa."
- Títol: "Ningú t'ha regalat res." / Missatge: "Cada sessió l'has guanyat tu sola. I es nota."
- Títol: "El teu cos recorda tot." / Missatge: "Cada esforç queda gravat. ${stats.totalSessions} proves que no et rendeixes."
- Títol: "Això no és casualitat." / Missatge: "La gent que arriba lluny fa exactament el que tu fas cada dia."

Dades reals per personalitzar:
- Sessions totals: ${stats.totalSessions}
- Autodisciplina: ${stats.autodiscipline}% (${stats.autodisciplineLabel})
- Dies des de l'última sessió: ${stats.daysSinceLastSession}
- Evolució recent: ${improvementText}
- Tendència anual: ${trendText}
- ${activeProgramsText}
${stats.memberSinceYear ? `- Entrenant des de ${stats.memberSinceYear} (${new Date().getFullYear() - stats.memberSinceYear} anys)` : ''}

Respon ÚNICAMENT en aquest format exacte (sense cometes, sense res més):
TÍTOL: [títol aquí]
MISSATGE: [missatge aquí]`;

    try {
      const response = await fetch("/.netlify/functions/motivational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const rawText = data.content?.[0]?.text?.trim() || '';

      const titleMatch = rawText.match(/TÍTOL:\s*(.+)/);
      const messageMatch = rawText.match(/MISSATGE:\s*([\s\S]+)/);

      const generatedTitle = titleMatch?.[1]?.trim() || '';
      const generatedPhrase = messageMatch?.[1]?.trim() || rawText;

      if (generatedPhrase) {
        setTitle(generatedTitle);
        setPhrase(generatedPhrase);

        try {
          localStorage.setItem(storageKey, JSON.stringify({
            title: generatedTitle,
            phrase: generatedPhrase,
            date: today,
            sessionsSnapshot: stats.totalSessions,
            autodisciplineSnapshot: stats.autodiscipline
          }));
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error generant frase motivacional:', error);
      setTitle('Segueix endavant!');
      setPhrase(`${stats.totalSessions} sessions i comptant. La constància és la teva força.`);
    } finally {
      setIsLoading(false);
    }
  };

  return { title, phrase, isLoading };
};
