// ============================================================
// GRAELLA DE TOTES LES INSÍGNIES ORGANITZADES PER CATEGORIA
// ============================================================

import { useState, useMemo } from 'react';
import { BadgeWithStatus, CATEGORY_NAMES, BadgeCategory } from '@/types/badges';
import BadgeCard from './BadgeCard';
import { getBadgeSummary } from '@/utils/badgeCalculations';

interface BadgeGridProps {
  badges: BadgeWithStatus[];
  gender?: string | null;
}

type FilterType = 'totes' | 'aconseguides' | 'pendents';

const CATEGORY_ORDER: BadgeCategory[] = [
  'assistencia',
  'ratxa',
  'antiguitat',
  'programes',
  'exploradora',
  'especial',
];

const BadgeGrid = ({ badges, gender }: BadgeGridProps) => {
  const [filter, setFilter] = useState<FilterType>('totes');
  const [openCategory, setOpenCategory] = useState<BadgeCategory | null>(null);

  const summary = getBadgeSummary(badges);

  // Filtrem les insígnies segons el filtre actiu
  const filteredBadges = useMemo(() => {
    return badges.filter(b => {
      if (b.unavailable) return false;
      if (filter === 'aconseguides') return b.earned;
      if (filter === 'pendents') return !b.earned;
      return true;
    });
  }, [badges, filter]);

  // Comptem per categoria (sense les unavailable)
  const countByCategory = useMemo(() => {
    const result: Record<BadgeCategory, { earned: number; total: number }> = {} as any;
    for (const cat of CATEGORY_ORDER) {
      const catBadges = badges.filter(b => b.category === cat && !b.unavailable);
      result[cat] = {
        earned: catBadges.filter(b => b.earned).length,
        total: catBadges.length,
      };
    }
    return result;
  }, [badges]);

  const filterButtons: { id: FilterType; label: string; emoji: string }[] = [
    { id: 'totes', label: 'Totes', emoji: '🏅' },
    { id: 'aconseguides', label: 'Aconseguides', emoji: '✅' },
    { id: 'pendents', label: 'Per aconseguir', emoji: '🔒' },
  ];

  return (
    <div className="space-y-6">

      {/* Resum global */}
      <div className="p-5 rounded-2xl shadow-neo bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">Les teves Insígnies</h2>
            <p className="text-sm text-muted-foreground">
              Has guanyat{' '}
              <span className="font-bold text-primary">{summary.earnedCount}</span>{' '}
              de{' '}
              <span className="font-bold">{summary.totalCount}</span> insígnies
            </p>
          </div>
          <div className="text-4xl font-black text-primary">
            {summary.percentage}%
          </div>
        </div>

        {/* Barra de progrés global */}
        <div className="w-full bg-white/50 rounded-full h-3 shadow-neo-inset">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-700"
            style={{ width: `${summary.percentage}%` }}
          />
        </div>

        {/* Resum per categoria */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {CATEGORY_ORDER.map(cat => {
            const { earned, total } = countByCategory[cat];
            return (
              <div key={cat} className="text-center p-2 bg-white/40 rounded-xl">
                <div className="text-xs font-bold text-primary">
                  {earned}/{total}
                </div>
                <div className="text-xs text-muted-foreground leading-tight">
                  {CATEGORY_NAMES[cat].split(' ').slice(1).join(' ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botons de filtre */}
      <div className="flex gap-2">
        {filterButtons.map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`
              flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all
              ${filter === btn.id
                ? 'shadow-neo-inset text-primary bg-primary/10'
                : 'shadow-neo hover:shadow-neo-sm text-muted-foreground bg-background'
              }
            `}
          >
            <span className="mr-1">{btn.emoji}</span>
            <span className="hidden sm:inline">{btn.label}</span>
            <span className="sm:hidden">
              {btn.id === 'totes' ? 'Totes' : btn.id === 'aconseguides' ? '✅' : '🔒'}
            </span>
          </button>
        ))}
      </div>

      {/* Missatge si no hi ha resultats */}
      {filteredBadges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {filter === 'aconseguides'
            ? '😊 Encara no has aconseguit cap insígnia. Vine a classe i comença!'
            : '🎉 Felicitats! Has aconseguit totes les insígnies disponibles!'
          }
        </div>
      )}

      {/* Insígnies per categoria */}
      {CATEGORY_ORDER.map(category => {
        const catBadges = filteredBadges.filter(b => b.category === category);
        if (catBadges.length === 0) return null;

        const { earned, total } = countByCategory[category];
        const isOpen = openCategory === category;

        return (
          <div key={category}>
            {/* Capçalera de categoria — clicable per plegar/desplegar */}
            <button
              onClick={() => setOpenCategory(isOpen ? null : category)}
              className="w-full flex items-center justify-between gap-3 mb-3 group"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold">{CATEGORY_NAMES[category]}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filter === 'totes'
                    ? `${earned} / ${total}`
                    : `${catBadges.length}`
                  }
                </span>
              </div>
              <span className="text-muted-foreground text-xs group-hover:text-primary transition-colors">
                {isOpen ? '▲ Plegar' : '▼ Veure'}
              </span>
            </button>

            {/* Graella — sempre visible per defecte, es plega si es clica */}
            {!isOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {catBadges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} gender={gender} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BadgeGrid;
