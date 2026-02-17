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

    const prompt = `Ets un entrenador personal motivador que parla en català, de forma càlida, propera i positiva.

Genera DOS elements per a aquesta persona:
1. Un TÍTOL curt i impactant (2-5 paraules màxim, sense punt final, que ressalti i sigui personal)
2. Un MISSATGE motivacional (1-3 frases curtes)

El títol ha de ser variat i creatiu (ex: "Quin nivell!", "Imparable!", "Vas a tope!", "Orgullosa de tu"...)
El missatge ha de ser en català natural, específic a les seves dades, sense emojis.
Usa el nom ${firstName} de forma natural (no sempre).

Dades:
- Nom: ${stats.name}
- Total sessions: ${stats.totalSessions}
- Autodisciplina: ${stats.autodiscipline}% (${stats.autodisciplineLabel})
- Dies des de l'última sessió: ${stats.daysSinceLastSession}
- Mitjana dies entre sessions: ${stats.daysBetweenSessions}
- Evolució recent: ${improvementText}
- Tendència anual: ${trendText}
- ${activeProgramsText}
${stats.memberSinceYear ? `- Membre des de: ${stats.memberSinceYear}` : ''}

Respon ÚNICAMENT en aquest format (dues línies, sense cometes):
TÍTOL: [el títol aquí]
MISSATGE: [el missatge aquí]`;

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
