// ============================================================
// GRAELLA DE INSÍGNIES — Distincions / Fites / Marques Personals
// ============================================================

import { useState, useMemo } from 'react';
import { BadgeWithStatus, CATEGORY_NAMES, SUBCATEGORY_NAMES, BadgeCategory, ExploracioSubcategory } from '@/types/badges';
import BadgeCard from './BadgeCard';
import { getBadgeSummary } from '@/utils/badgeCalculations';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface BadgeGridProps {
  badges: BadgeWithStatus[];
  gender?: string | null;
}

type FilterTab = 'tot' | 'aconseguides' | 'per_aconseguir';

// ── Categories de Fites i el seu ordre ───────────────────────
const FITES_CATEGORIES: BadgeCategory[] = [
  'assistencia',
  'constancia',
  'antiguitat',
  'exploracio',
  'especial',
];

const EXPLORACIO_SUBCATEGORIES: ExploracioSubcategory[] = [
  'horaris',
  'varietat',
  'intensitat',
];

// ── Filtre de targetes ────────────────────────────────────────
function applyFilter(badges: BadgeWithStatus[], filter: FilterTab): BadgeWithStatus[] {
  if (filter === 'aconseguides') return badges.filter(b => b.earned);
  if (filter === 'per_aconseguir') return badges.filter(b => !b.earned && !b.unavailable);
  return badges;
}

// ── Component pestanyes de filtre ─────────────────────────────
const FilterTabs = ({ active, onChange }: { active: FilterTab; onChange: (f: FilterTab) => void }) => (
  <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-4">
    {([['tot', 'Tot'], ['aconseguides', 'Aconseguides'], ['per_aconseguir', 'Per aconseguir']] as [FilterTab, string][]).map(([val, label]) => (
      <button
        key={val}
        onClick={() => onChange(val)}
        className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all duration-200
          ${active === val ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

// ── Component secció acordió ──────────────────────────────────
interface AccordionSectionProps {
  title: string;
  emoji: string;
  earnedCount: number;
  totalCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentClass?: string;
}

const AccordionSection = ({ title, emoji, earnedCount, totalCount, defaultOpen = true, children, accentClass = 'bg-primary/10 border-primary/20' }: AccordionSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${accentClass}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div className="text-left">
            <h3 className="font-bold text-base">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {earnedCount} de {totalCount} aconseguides
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-primary">
            {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
          </div>
          {isOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

// ── Component graella simple ──────────────────────────────────
const BadgeCardGrid = ({ badges, gender }: { badges: BadgeWithStatus[]; gender?: string | null }) => {
  if (badges.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Cap insígnia en aquesta categoria.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {badges.map(badge => (
        <BadgeCard key={badge.id} badge={badge} gender={gender} />
      ))}
    </div>
  );
};

// ── COMPONENT PRINCIPAL ───────────────────────────────────────
const BadgeGrid = ({ badges, gender }: BadgeGridProps) => {
  const [filterDistincions, setFilterDistincions] = useState<FilterTab>('tot');
  const [filterFites, setFilterFites] = useState<FilterTab>('tot');
  const [filterMarques, setFilterMarques] = useState<FilterTab>('tot');

  const summary = getBadgeSummary(badges);

  // Separació en tres grups
  const distincions = useMemo(() =>
    badges.filter(b => !!b.group),
    [badges]
  );

  const marques = useMemo(() =>
    badges.filter(b => b.category === 'personal'),
    [badges]
  );

  const fites = useMemo(() =>
    badges.filter(b => !b.group && b.category !== 'personal'),
    [badges]
  );

  // Deduplicar distincions (una targeta per grup)
  const distincionsBadges = useMemo(() => {
    const seen = new Map<string, BadgeWithStatus>();
    for (const badge of distincions) {
      if (!badge.group) continue;
      const existing = seen.get(badge.group);
      if (!existing) {
        seen.set(badge.group, badge);
      } else if (badge.earned) {
        const existingTiers = ['bronze','plata','or','diamant','llegenda'];
        const existingIdx = existingTiers.indexOf(existing.tier);
        const newIdx = existingTiers.indexOf(badge.tier);
        if (!existing.earned || newIdx > existingIdx) {
          seen.set(badge.group, badge);
        }
      }
    }
    // Retornem en ordre d'aparició (primer del grup)
    const result: BadgeWithStatus[] = [];
    const inserted = new Set<string>();
    for (const badge of distincions) {
      if (!badge.group || inserted.has(badge.group)) continue;
      result.push(seen.get(badge.group)!);
      inserted.add(badge.group);
    }
    return result;
  }, [distincions]);

  // Comptes per secció
  const distincionsTotals = distincionsBadges.length;
  const distincionEarned = distincionsBadges.filter(b => b.earned).length;
  const marquesTotals = marques.length;
  const marquesEarned = marques.filter(b => b.earned).length;
  const fitesTotals = fites.filter(b => !b.unavailable).length;
  const fitesEarned = fites.filter(b => b.earned).length;

  // Filtres aplicats
  const distincionsFiltrades = applyFilter(distincionsBadges, filterDistincions);
  const marquesFiltrades = applyFilter(marques, filterMarques);

  return (
    <div className="space-y-4">

      {/* Resum global */}
      <div className="p-5 rounded-2xl shadow-neo bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">Les teves Insígnies</h2>
            <p className="text-sm text-muted-foreground">
              Has guanyat <span className="font-bold text-primary">{summary.earnedCount}</span> de <span className="font-bold">{summary.totalCount}</span> insígnies
            </p>
          </div>
          <div className="text-4xl font-black text-primary">
            {summary.percentage}%
          </div>
        </div>
        <div className="w-full bg-white/50 rounded-full h-3 shadow-neo-inset">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-700"
            style={{ width: `${summary.percentage}%` }}
          />
        </div>
        {/* Resum per tipus */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 bg-white/40 rounded-xl">
            <div className="text-xs font-bold text-primary">{distincionEarned}/{distincionsTotals}</div>
            <div className="text-xs text-muted-foreground">Distincions</div>
          </div>
          <div className="text-center p-2 bg-white/40 rounded-xl">
            <div className="text-xs font-bold text-primary">{fitesEarned}/{fitesTotals}</div>
            <div className="text-xs text-muted-foreground">Fites</div>
          </div>
          <div className="text-center p-2 bg-white/40 rounded-xl">
            <div className="text-xs font-bold text-primary">{marquesEarned}/{marquesTotals}</div>
            <div className="text-xs text-muted-foreground">Marques</div>
          </div>
        </div>
      </div>

      {/* ── DISTINCIONS ── */}
      <AccordionSection
        title="Distincions"
        emoji="🏅"
        earnedCount={distincionEarned}
        totalCount={distincionsTotals}
        accentClass="bg-amber-50/50 border-amber-200"
      >
        <FilterTabs active={filterDistincions} onChange={setFilterDistincions} />
        <BadgeCardGrid badges={distincionsFiltrades} gender={gender} />
      </AccordionSection>

      {/* ── FITES ── */}
      <AccordionSection
        title="Fites"
        emoji="🏆"
        earnedCount={fitesEarned}
        totalCount={fitesTotals}
        accentClass="bg-teal-50/50 border-teal-200"
      >
        <FilterTabs active={filterFites} onChange={setFilterFites} />

        {FITES_CATEGORIES.map(category => {
          const catBadges = fites.filter(b => b.category === category);
          if (catBadges.length === 0) return null;

          if (category === 'exploracio') {
            return (
              <div key={category} className="mb-6">
                <h4 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wide">
                  {CATEGORY_NAMES[category]}
                </h4>
                {EXPLORACIO_SUBCATEGORIES.map(sub => {
                  const subBadges = catBadges.filter(b => b.subcategory === sub);
                  const filtered = applyFilter(subBadges, filterFites);
                  if (subBadges.length === 0) return null;
                  return (
                    <div key={sub} className="mb-4">
                      <h5 className="text-xs font-semibold mb-2 text-muted-foreground">
                        {SUBCATEGORY_NAMES[sub]}
                      </h5>
                      <BadgeCardGrid badges={filtered} gender={gender} />
                    </div>
                  );
                })}
              </div>
            );
          }

          const filtered = applyFilter(catBadges, filterFites);
          return (
            <div key={category} className="mb-6">
              <h4 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wide">
                {CATEGORY_NAMES[category]}
              </h4>
              <BadgeCardGrid badges={filtered} gender={gender} />
            </div>
          );
        })}
      </AccordionSection>

      {/* ── MARQUES PERSONALS ── */}
      <AccordionSection
        title="Marques Personals"
        emoji="⭐"
        earnedCount={marquesEarned}
        totalCount={marquesTotals}
        accentClass="bg-violet-50/50 border-violet-200"
      >
        <FilterTabs active={filterMarques} onChange={setFilterMarques} />
        <BadgeCardGrid badges={marquesFiltrades} gender={gender} />
      </AccordionSection>

    </div>
  );
};

export default BadgeGrid;
