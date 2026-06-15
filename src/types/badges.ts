export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'unique';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  category: 'attendance' | 'consistency' | 'time' | 'special' | 'record';
  requirement: number;
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  maxProgress?: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'attendance' | 'consistency' | 'time' | 'special' | 'record';
  tiers: BadgeTierDefinition[];
  isUnique?: boolean;
}

export interface BadgeTierDefinition {
  tier: BadgeTier;
  requirement: number;
  description: string;
}
