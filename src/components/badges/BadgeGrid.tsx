// ============================================================
// GRAELLA DE TOTES LES INSÍGNIES ORGANITZADES PER CATEGORIA
// ============================================================

import { BadgeWithStatus, CATEGORY_NAMES, BadgeCategory } from '@/types/badges';
import BadgeCard from './BadgeCard';
import { getBadgeSummary } from '@/utils/badgeCalculations';

interface BadgeGridProps {
  badges: BadgeWithStatus[];
  gender?: string | null;
}

const CATEGORY_ORDER: BadgeCategory[] = [
  'assistencia',
  'ratxa',
  'antiguitat',
  'programes',
  'exploradora',
  'especial',
];

const BadgeGrid = ({ badges, gender }: BadgeGridProps) => {
  const summary = getBadgeSummary(badges);

  return (
    <div className="space-y-8">

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
            const catBadges = badges.filter(b => b.category === cat);
            const catEarned = catBadges.filter(b => b.earned).length;
            return (
              <div key={cat} className="text-center p-2 bg-white/40 rounded-xl">
                <div className="text-xs font-bold text-primary">
                  {catEarned}/{catBadges.length}
                </div>
                <div className="text-xs text-muted-foreground leading-tight">
                  {CATEGORY_NAMES[cat].split(' ').slice(1).join(' ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insígnies per categoria */}
      {CATEGORY_ORDER.map(category => {
        const catBadges = badges.filter(b => b.category === category);
        const catEarned = catBadges.filter(b => b.earned).length;

        return (
          <div key={category}>
            {/* Capçalera de categoria */}
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-base font-bold">{CATEGORY_NAMES[category]}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {catEarned} / {catBadges.length}
              </span>
            </div>

            {/* Graella d'insígnies */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {catBadges.map(badge => (
                <BadgeCard key={badge.id} badge={badge} gender={gender} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BadgeGrid;
