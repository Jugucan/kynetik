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

    const prompt = `Ets un copywriter esportiu d'elit. El teu objectiu és crear frases que facin que la persona pari, respiri i pensi "ostres, exactament això". Parles de tu a tu, amb una barreja d'honestedat i energia que enganxa.

REGLES ABSOLUTES:
- Parla SEMPRE en segona persona (tu, et, t', el teu, la teva). MAI tercera persona.
- Usa el nom ${firstName} com a molt UNA vegada, i no sempre — de vegades és més potent sense nom
- MÀXIM 20 paraules entre títol i missatge junts
- Els títols han de ser ORIGINALS i VARIATS — MAI dues paraules genèriques com "Força Constant" o "Millora Personal"
- MAI repetir paraules del títol al missatge — zero redundància
- Busca l'angle EMOCIONAL i HUMÀ, no els números — els números són context, no el missatge
- Sigues HONEST: si el ritme és moderat, celebra la constància; si és alt, celebra la intensitat. No exageris
- Cada frase ha de tenir un GIRS INESPERATS — una metàfora, una paradoxa, una imatge potent
- En català viu, directe, sense floritures acadèmiques
- Sense emojis

ERRORS A EVITAR (CRÍTIC):
- NO usar paraules en altres idiomes (muscle → músculs)
- Quan parlis de suor, usa el femení: "la suor", no "el sudor"
- Comprova la concordança verbal: "perquè sap" (singular), "moure'us" (plural)
- NO acabar frases amb preposicions soltes com "per més" — millor "que sempre torna" o "que mai es rendeix"
- Si uses verbs reflexius amb pronom, fes-ho bé: "miraràs enrere" millor que "et miraràs endarrere"
- Evita construccions redundants: si el títol diu X, el missatge NO pot repetir X

EXEMPLES del to exacte que busco:
- Títol: "El gimnàs et recorda." / Missatge: "Potser no vens cada dia. Però quan aparèixes, es nota que ets tu."
- Títol: "Tres anys sense rendir-te." / Missatge: "Això no ho fa tothom. Tu sí."
- Títol: "La regularitat és la teva superpotència." / Missatge: "No fa falta ser la més ràpida. Fa falta ser la que torna."
- Títol: "Saps com es diu això?" / Missatge: "Es diu caràcter. I tu en tens."
- Títol: "No és sort." / Missatge: "És la suma de totes les vegades que vas dir sí quan podries haver dit no."

CONTEXT de la persona (usa'l per inspirar-te, NO per citar xifres literalment):
- Porta ${stats.totalSessions} sessions en total ${stats.memberSinceYear ? `des de ${stats.memberSinceYear}` : ''}
- Autodisciplina: ${stats.autodiscipline}% — ${stats.autodiscipline >= 80 ? 'molt alta, és una crack' : stats.autodiscipline >= 50 ? 'bona, va per bon camí' : stats.autodisciplina < 30 ? 'baixa, necessita un impuls' : 'acceptable, pot millorar'}
- Fa ${stats.daysSinceLastSession} dies de l'última sessió — ${stats.daysSinceLastSession > 14 ? 'fa temps que no ve, necessita un impuls de tornada' : stats.daysSinceLastSession > 7 ? 'ha tingut una pausa, però torna' : 've amb regularitat'}
- Evolució recent: ${improvementText}
- Tendència anual: ${trendText}
- ${activeProgramsText}
- Mitjana ${stats.daysBetweenSessions} dies entre sessions — ${stats.daysBetweenSessions <= 4 ? 've molt sovint' : stats.daysBetweenSessions <= 7 ? 've cada setmana' : stats.daysBetweenSessions <= 14 ? 've cada dues setmanes' : 've de tant en tant'}

ANGLE EMOCIONAL PER AVUI: ${[
    'la constància silenciosa a llarg termini',
    'la identitat esportiva que ha construït',
    'el que la diferencia de la majoria',
    'la relació amb el seu propi cos',
    'el que significa aparèixer quan costa',
    'la força mental invisible que demostra',
    'el futur que està construint ara mateix',
    'l\'hàbit com a forma de vida, no com a obligació',
    'el que els altres no veuen de l\'esforç diari',
    'la transformació silenciosa que està vivint',
    'com se sentirà d\'aquí a un any gràcies al que fa ara',
    'la diferència entre voler i fer realment',
  ][Math.floor(Math.random() * 12)]}

IMPORTANT: 
- Desenvolupa aquest angle amb precisió quirúrgica
- NO mencionar la pausa ni els dies d'absència tret que sigui l'angle escollit
- NO citar xifres numèriques literalment al missatge final
- Comprova que el títol i el missatge no comparteixin paraules clau
- Revisa la concordança de gènere i número abans de respondre

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
