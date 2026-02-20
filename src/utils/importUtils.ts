// ─────────────────────────────────────────────────────────────────────────────
// UTILITAT: Càlcul de rankings per a tots els usuaris
// Exportable per poder-la cridar des de qualsevol lloc
// ─────────────────────────────────────────────────────────────────────────────

import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


interface UserForRanking {
  id: string;
  email: string;
  sessions: Array<{ date: string; activity: string; time: string; sala: string; center: string }>;
  center?: string;
}

// Calcula i escriu els rankings a tots els usuaris en lots de 500
export const recalculateAndSaveRankings = async (users: UserForRanking[]): Promise<void> => {
  console.log('[Rankings] Inici càlcul amb', users.length, 'usuaris');
  if (users.length === 0) {
    console.warn('[Rankings] Cap usuari, sortint');
    return;
  }

  // ── 1. Ranking general per totalSessions ─────────────────────────────────
  const byTotalSessions = [...users]
    .map(u => ({ id: u.id, value: u.sessions.length }))
    .filter(u => u.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalSessionsRankMap = new Map<string, { rank: number; total: number; percentile: number }>();
  const total = byTotalSessions.length;
  byTotalSessions.forEach((u, idx) => {
    const rank = idx + 1;
    totalSessionsRankMap.set(u.id, {
      rank,
      total,
      percentile: Math.round(((total - rank + 1) / total) * 100)
    });
  });

  // ── 2. Rankings per programa (per centre) ────────────────────────────────
  // Recollim tots els programes únics
  const allPrograms = new Set<string>();
  users.forEach(u => u.sessions.forEach(s => allPrograms.add(s.activity)));

  // Per cada programa, calculem el ranking filtrat per centre
  const programRankMaps = new Map<string, Map<string, { rank: number; total: number; percentile: number }>>();

  allPrograms.forEach(program => {
    const rankMap = new Map<string, { rank: number; total: number; percentile: number }>();

    // Agrupar per centre
    const centerGroups = new Map<string, UserForRanking[]>();
    users.forEach(u => {
      const hasProg = u.sessions.some(s => s.activity === program);
      if (!hasProg) return;
      const center = u.center || 'desconegut';
      if (!centerGroups.has(center)) centerGroups.set(center, []);
      centerGroups.get(center)!.push(u);
    });

    // Ranking dins de cada centre
    centerGroups.forEach((centerUsers) => {
      const ranked = centerUsers
        .map(u => ({
          id: u.id,
          count: u.sessions.filter(s => s.activity === program).length
        }))
        .sort((a, b) => b.count - a.count);

      const tot = ranked.length;
      ranked.forEach((u, idx) => {
        const rank = idx + 1;
        rankMap.set(u.id, {
          rank,
          total: tot,
          percentile: Math.round(((tot - rank + 1) / tot) * 100)
        });
      });
    });

    programRankMaps.set(program, rankMap);
  });

  // ── 3. Escriure a Firestore en lots de 500 ───────────────────────────────
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let operationsInBatch = 0;

  for (const user of users) {
    const totalRanking = totalSessionsRankMap.get(user.id) || { rank: 0, total, percentile: 0 };

    const programsCache: { [program: string]: { rank: number; total: number; percentile: number } } = {};
    allPrograms.forEach(program => {
      const rankMap = programRankMaps.get(program);
      if (rankMap?.has(user.id)) {
        programsCache[program] = rankMap.get(user.id)!;
      }
    });

    const rankingCache = {
      totalSessions: totalRanking,
      programs: programsCache,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    batch.set(doc(db, 'users', user.id), { rankingCache }, { merge: true });
    operationsInBatch++;

    if (operationsInBatch === BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      operationsInBatch = 0;
    }
  }

  if (operationsInBatch > 0) {
    await batch.commit();
  }
  console.log('[Rankings] Batch completat. rankingCache guardat a', users.length, 'usuaris');
};


// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓ D'IMPORTACIÓ DEPORSITE
// Versió optimitzada: 1 lectura massiva + batch writes + càlcul de rankings
// ─────────────────────────────────────────────────────────────────────────────

export const importDeporsiteOptimized = async (
  jsonData: any,
  onProgress?: (msg: string) => void
): Promise<{ newCount: number; updatedCount: number; skippedCount: number }> => {

  if (!jsonData.users || !Array.isArray(jsonData.users)) {
    throw new Error('Format de fitxer incorrecte');
  }

  const importedUsers = jsonData.users;
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // ── FASE 1: Una sola lectura massiva ─────────────────────────────────────
  onProgress?.('Llegint usuaris existents...');
  const snapshot = await getDocs(collection(db, 'users'));

  // Mapa email → document (per buscar coincidències en O(1))
  const emailToDoc = new Map<string, { id: string; data: any }>();
  const nameToDoc = new Map<string, { id: string; data: any }>();

  snapshot.docs.forEach(d => {
    const data = d.data();
    if (data.email) emailToDoc.set(data.email.toLowerCase(), { id: d.id, data });
    if (data.name) nameToDoc.set(data.name.toLowerCase(), { id: d.id, data });
  });

  // ── FASE 2: Preparar totes les operacions en memòria ─────────────────────
  onProgress?.('Processant dades...');

  // Mapa id → dades finals (per poder calcular rankings al final)
  const finalUsersData = new Map<string, any>();

  // Operacions pendents: { type: 'update'|'add', id?: string, data: any }
  const operations: Array<{ type: 'update' | 'add'; id?: string; data: any }> = [];

  for (const importedUser of importedUsers) {
    if (!importedUser.name) {
      skippedCount++;
      continue;
    }

    try {
      // Cercar usuari existent per email o nom
      const existing =
        (importedUser.email && emailToDoc.get(importedUser.email.toLowerCase())) ||
        nameToDoc.get(importedUser.name.toLowerCase());

      const importedSessions = Array.isArray(importedUser.sessions) ? importedUser.sessions : [];
      const normalizedSessions = importedSessions.map((s: any) => ({
        date: s.date || '',
        activity: s.activity || '',
        time: s.time || '',
        sala: s.sala || '',
        center: s.center || importedUser.center || 'Sant Hilari'
      }));

      if (existing) {
        // Fusionar sessions (eliminar duplicats per clau date-activity-time)
        const existingSessions = Array.isArray(existing.data.sessions) ? existing.data.sessions : [];
        const sessionMap = new Map<string, any>();
        [...existingSessions, ...normalizedSessions].forEach(s => {
          sessionMap.set(`${s.date}-${s.activity}-${s.time || 'no-time'}`, s);
        });
        const mergedSessions = Array.from(sessionMap.values());

        const sortedDates = mergedSessions.map((s: any) => s.date).sort();
        const lastSession = sortedDates[sortedDates.length - 1] || '';
        const lastDate = lastSession ? new Date(lastSession) : null;
        const daysSinceLastSession = lastDate
          ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const mergedData = {
          ...existing.data,
          name: existing.data.name || importedUser.name,
          email: existing.data.email || importedUser.email || '',
          phone: existing.data.phone || importedUser.phone || '',
          birthday: existing.data.birthday || importedUser.birthday || '',
          center: existing.data.center || importedUser.center || 'Sant Hilari',
          profileImageUrl: (importedUser.profileImageUrl?.includes('candelfi.deporsite.net'))
            ? importedUser.profileImageUrl
            : (existing.data.profileImageUrl || importedUser.profileImageUrl || ''),
          avatar: (importedUser.profileImageUrl?.includes('candelfi.deporsite.net'))
            ? importedUser.profileImageUrl
            : (existing.data.avatar || existing.data.profileImageUrl || importedUser.avatar || ''),
          preferredPrograms: [...new Set([
            ...(Array.isArray(existing.data.preferredPrograms) ? existing.data.preferredPrograms : []),
            ...(Array.isArray(importedUser.preferredPrograms) ? importedUser.preferredPrograms : [])
          ])],
          sessions: mergedSessions,
          totalSessions: mergedSessions.length,
          firstSession: sortedDates[0] || '',
          lastSession,
          daysSinceLastSession,
        };

        operations.push({ type: 'update', id: existing.id, data: mergedData });
        finalUsersData.set(existing.id, mergedData);
        updatedCount++;
      } else {
        // Usuari nou
        const sortedDates = normalizedSessions.map((s: any) => s.date).sort();
        const lastSession = sortedDates[sortedDates.length - 1] || '';
        const lastDate = lastSession ? new Date(lastSession) : null;

        const newData = {
          name: importedUser.name,
          email: importedUser.email || '',
          phone: importedUser.phone || '',
          birthday: importedUser.birthday || '',
          age: importedUser.age || 0,
          center: importedUser.center || 'Sant Hilari',
          preferredPrograms: Array.isArray(importedUser.preferredPrograms) ? importedUser.preferredPrograms : [],
          profileImageUrl: importedUser.profileImageUrl || '',
          avatar: importedUser.profileImageUrl || importedUser.avatar || '',
          notes: importedUser.notes || '',
          sessions: normalizedSessions,
          totalSessions: normalizedSessions.length,
          firstSession: sortedDates[0] || '',
          lastSession,
          daysSinceLastSession: lastDate
            ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        };

        operations.push({ type: 'add', data: newData });
        newCount++;
      }
    } catch (error) {
      console.error('Error processant usuari:', importedUser.name, error);
      skippedCount++;
    }
  }

  // ── FASE 3: Escriure en lots de 500 ──────────────────────────────────────
  onProgress?.(`Guardant ${operations.length} usuaris...`);

  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let ops = 0;
  const newDocIds: Array<{ tempData: any; ref: any }> = [];

  for (const op of operations) {
    if (op.type === 'update' && op.id) {
      batch.update(doc(db, 'users', op.id), op.data);
      ops++;
    } else if (op.type === 'add') {
      const newRef = doc(collection(db, 'users'));
      batch.set(newRef, op.data);
      newDocIds.push({ tempData: op.data, ref: newRef });
      ops++;
    }

    if (ops === BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  // Afegir els nous documents al mapa de finals (ara ja tenen ID)
  newDocIds.forEach(({ tempData, ref }) => {
    finalUsersData.set(ref.id, tempData);
  });

  // ── FASE 4: Calcular i guardar rankings ───────────────────────────────────
  onProgress?.('Calculant rankings...');

  const usersForRanking: UserForRanking[] = Array.from(finalUsersData.entries()).map(([id, data]) => ({
    id,
    email: data.email || '',
    sessions: data.sessions || [],
    center: data.center || '',
  }));

  // Afegir també els usuaris existents que NO s'han actualitzat en aquesta importació
  snapshot.docs.forEach(d => {
    if (!finalUsersData.has(d.id)) {
      const data = d.data();
      usersForRanking.push({
        id: d.id,
        email: data.email || '',
        sessions: data.sessions || [],
        center: data.center || '',
      });
    }
  });

  console.log('[Importació] Fase 4: usersForRanking té', usersForRanking.length, 'usuaris');
  try {
    await recalculateAndSaveRankings(usersForRanking);
    onProgress?.(`Rankings calculats per ${usersForRanking.length} usuaris`);
  } catch (rankingError) {
    console.error('Error calculant rankings:', rankingError);
    // No llencem l'error: la importació ha estat correcta, els rankings fallaran silenciosament
    onProgress?.('Advertència: els rankings no s\'han pogut calcular');
  }

  return { newCount, updatedCount, skippedCount };
};
