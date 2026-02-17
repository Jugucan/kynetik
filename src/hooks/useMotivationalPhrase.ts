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

const STORAGE_KEY_PREFIX = 'kynetik_motivation_';
const today = new Date().toISOString().split('T')[0]; // "2026-02-17"

export const useMotivationalPhrase = (userStats: UserStatsForPhrase | null) => {
  const [title, setTitle] = useState<string>('');
  const [phrase, setPhrase] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!userStats || userStats.totalSessions === 0) return;

    const storageKey = STORAGE_KEY_PREFIX + userStats.name.replace(/\s/g, '_');

    // Comprovar si ja tenim frase d'avui amb les mateixes dades clau
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
    } catch (e) {
      // Si hi ha error llegint, continuem generant
    }

    // Generar frase nova
    generatePhrase(userStats, storageKey);
  }, [userStats?.totalSessions, userStats?.autodiscipline, userStats?.name]);

  const generatePhrase = async (stats: UserStatsForPhrase, storageKey: string) => {
    setIsLoading(true);

    const activeProgramsText = stats.activePrograms.length > 0
      ? `Programes actius aquest mes: ${stats.activePrograms.join(', ')}.`
      : 'No ha assistit a cap classe aquest mes.';

    const trendText = {
      up: 'millor que l\'any anterior',
      down: 'una mica per sota de l\'any anterior',
      stable: 'similar a l\'any anterior'
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

El títol ha de:
- Ser variat i creatiu cada vegada (ex: "Quin nivell!", "Imparable!", "Vas a tope!", "Orgullosa de tu", "Constància de campiona"...)
- Reflectir les dades reals de la persona
- NO ser genèric ni sempre igual

El missatge ha de:
- Ser en català natural i col·loquial
- Ser específic a les seves dades, no genèric
- Variar el to: de vegades enèrgic, de vegades reflexiu, de vegades divertit
- NO contenir emojis (ja hi ha un 💪 fix al disseny)
- Usar el nom ${stats.name.split(' ')[0]} de forma natural (no sempre)

Dades de la persona:
- Nom: ${stats.name}
- Total de sessions: ${stats.totalSessions}
- Autodisciplina: ${stats.autodiscipline}% (${stats.autodisciplineLabel})
- Dies des de l'última sessió: ${stats.daysSinceLastSession}
- Mitjana de dies entre sessions: ${stats.daysBetweenSessions}
- Evolució recent: ${improvementText}
- Tendència anual: ${trendText}
- ${activeProgramsText}
${stats.memberSinceYear ? `- Membre des de: ${stats.memberSinceYear}` : ''}

Respon ÚNICAMENT en aquest format exacte (dues línies, sense cometes, sense res més):
TÍTOL: [el títol aquí]
MISSATGE: [el missatge aquí]`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const rawText = data.content?.[0]?.text?.trim() || '';

      // Parsejar títol i missatge
      const titleMatch = rawText.match(/TÍTOL:\s*(.+)/);
      const messageMatch = rawText.match(/MISSATGE:\s*([\s\S]+)/);

      const generatedTitle = titleMatch?.[1]?.trim() || '';
      const generatedPhrase = messageMatch?.[1]?.trim() || rawText;

      if (generatedPhrase) {
        setTitle(generatedTitle);
        setPhrase(generatedPhrase);

        // Guardar al localStorage
        const toStore: MotivationalPhraseData = {
          title: generatedTitle,
          phrase: generatedPhrase,
          date: today,
          sessionsSnapshot: stats.totalSessions,
          autodisciplineSnapshot: stats.autodiscipline
        };
        localStorage.setItem(storageKey, JSON.stringify(toStore));
      }
    } catch (error) {
      console.error('Error generant frase motivacional:', error);
      // Frase de fallback si l'API falla
      setTitle('Segueix endavant!');
      setPhrase(`${stats.totalSessions} sessions i comptant. La constància és la teva força.`);
    } finally {
      setIsLoading(false);
    }
  };

  return { title, phrase, isLoading };
};
