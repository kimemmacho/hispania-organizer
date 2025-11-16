import React from 'react';
import { Hero } from '../types';
import HeroPortrait from './HeroPortrait';

// --- Tier Styling Helpers (from RankingTable) ---
const getTierStyling = (t: string): { textClass: string; bgClass: string; borderClass: string } => {
    switch (t) {
        case 'SSS': return { textClass: 'text-white', bgClass: 'bg-blue-500', borderClass: 'border-blue-300' };
        case 'SS':  return { textClass: 'text-white', bgClass: 'bg-green-600', borderClass: 'border-green-400' };
        case 'S':   return { textClass: 'text-black', bgClass: 'bg-lime-400', borderClass: 'border-lime-300' };
        case 'A':   return { textClass: 'text-black', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-300' };
        case 'B':   return { textClass: 'text-white', bgClass: 'bg-orange-500', borderClass: 'border-orange-400' };
        case 'C':   return { textClass: 'text-white', bgClass: 'bg-red-600', borderClass: 'border-red-500' };
        case 'D':   return { textClass: 'text-white', bgClass: 'bg-amber-800', borderClass: 'border-amber-700' };
        default:    return { textClass: 'text-gray-100', bgClass: 'bg-gray-700', borderClass: 'border-gray-600' };
    }
};

const TierBadge: React.FC<{ tier: string; containerClass: string; textClass: string }> = ({ tier, containerClass, textClass: badgeTextClass }) => {
    const { textClass, bgClass } = getTierStyling(tier);
    return (
        <div className={`relative inline-block transform -skew-x-12 ${bgClass} ${containerClass} shadow-md`}>
             <span className={`block transform skew-x-12 text-center font-bold tracking-wider ${textClass} ${badgeTextClass}`}>
                {tier}
            </span>
        </div>
    );
};

const FactionIcon: React.FC<{ faction: string; sizeClass: string; textSizeClass: string }> = ({ faction, sizeClass, textSizeClass }) => {
    if (faction === 'Desconocida') {
        return <div className={`${sizeClass} flex items-center justify-center bg-gray-700 rounded-full font-bold text-gray-400 ${textSizeClass}`} title="Facción Desconocida">?</div>;
    }
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    const iconUrl = `${baseUrl}${iconFileName}.png`;
    return <img src={iconUrl} alt={faction} title={faction} className={sizeClass} />;
};


interface InfographicsHeroCardProps {
    hero: Hero;
    rank: number;
    size: 'large' | 'medium' | 'small' | 'xsmall' | 'xxsmall' | 'xxxsmall' | 'xxxxsmall' | 'xxxxxsmall';
    isCapture?: boolean; // NUEVA PROP
}

const SIZES = {
    large: {
        portraitContainer: 'w-[320px] h-[320px] border-[16px]',
        rankText: 'text-9xl -top-8 -left-2',
        rankStroke: '4px',
        nameText: 'text-5xl',
        nameMaxWidth: 'max-w-[400px]',
        iconContainer: 'h-16 w-16',
        iconText: 'text-2xl',
        badgeContainer: 'px-4 py-1',
        badgeText: 'text-2xl',
        mainGap: 'gap-4 mt-6',
        iconsGap: 'gap-6',
    },
    medium: {
        portraitContainer: 'w-[240px] h-[240px] border-[12px]',
        rankText: 'text-8xl -top-6 -left-2',
        rankStroke: '3px',
        nameText: 'text-4xl',
        nameMaxWidth: 'max-w-[300px]',
        iconContainer: 'h-12 w-12',
        iconText: 'text-xl',
        badgeContainer: 'px-3 py-0.5',
        badgeText: 'text-xl',
        mainGap: 'gap-3 mt-4',
        iconsGap: 'gap-4',
    },
    small: {
        portraitContainer: 'w-[180px] h-[180px] border-[8px]',
        rankText: 'text-6xl -top-4 -left-1',
        rankStroke: '2px',
        nameText: 'text-2xl',
        nameMaxWidth: 'max-w-[200px]',
        iconContainer: 'h-9 w-9',
        iconText: 'text-base',
        badgeContainer: 'px-2 py-0',
        badgeText: 'text-base',
        mainGap: 'gap-2 mt-2',
        iconsGap: 'gap-2',
    },
    xsmall: {
        portraitContainer: 'w-[160px] h-[160px] border-[6px]',
        rankText: 'text-5xl -top-3 -left-1',
        rankStroke: '2px',
        nameText: 'text-xl',
        nameMaxWidth: 'max-w-[160px]',
        iconContainer: 'h-8 w-8',
        iconText: 'text-sm',
        badgeContainer: 'px-2 py-0',
        badgeText: 'text-sm',
        mainGap: 'gap-1 mt-1',
        iconsGap: 'gap-2',
    },
    xxsmall: {
        portraitContainer: 'w-[140px] h-[140px] border-[5px]',
        rankText: 'text-4xl -top-2 -left-1',
        rankStroke: '2px',
        nameText: 'text-lg',
        nameMaxWidth: 'max-w-[140px]',
        iconContainer: 'h-7 w-7',
        iconText: 'text-xs',
        badgeContainer: 'px-1.5 py-0',
        badgeText: 'text-xs',
        mainGap: 'gap-1 mt-1',
        iconsGap: 'gap-1.5',
    },
    xxxsmall: {
        portraitContainer: 'w-[120px] h-[120px] border-[4px]',
        rankText: 'text-3xl -top-1.5 -left-1',
        rankStroke: '1.5px',
        nameText: 'text-base',
        nameMaxWidth: 'max-w-[120px]',
        iconContainer: 'h-6 w-6',
        iconText: 'text-xs',
        badgeContainer: 'px-1 py-0',
        badgeText: 'text-xs',
        mainGap: 'gap-1 mt-1',
        iconsGap: 'gap-1',
    },
    xxxxsmall: {
        portraitContainer: 'w-[100px] h-[100px] border-[3px]',
        rankText: 'text-2xl -top-1 -left-0.5',
        rankStroke: '1px',
        nameText: 'text-sm',
        nameMaxWidth: 'max-w-[100px]',
        iconContainer: 'h-5 w-5',
        iconText: 'text-[10px]',
        badgeContainer: 'px-1 py-0',
        badgeText: 'text-[10px]',
        mainGap: 'gap-0.5 mt-0.5',
        iconsGap: 'gap-1',
    },
    xxxxxsmall: {
        portraitContainer: 'w-[90px] h-[90px] border-[2px]',
        rankText: 'text-xl -top-1 -left-0.5',
        rankStroke: '1px',
        nameText: 'text-xs',
        nameMaxWidth: 'max-w-[90px]',
        iconContainer: 'h-4 w-4',
        iconText: 'text-[9px]',
        badgeContainer: 'px-1 py-0',
        badgeText: 'text-[9px]',
        mainGap: 'gap-0.5 mt-0.5',
        iconsGap: 'gap-1',
    }
};

const InfographicsHeroCard: React.FC<InfographicsHeroCardProps> = ({ hero, rank, size, isCapture = false }) => {
    const { borderClass } = getTierStyling(hero.tier);
    const s = SIZES[size];

    return (
        <div className="relative flex flex-col items-center justify-start text-center h-full">
<span 
    className={`absolute font-black text-white z-10 ${s.rankText}`}
    style={{ textShadow: '2px 2px 5px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)' }}
>
    {rank}
</span>
            <div className={`relative bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center ${s.portraitContainer} ${borderClass} overflow-hidden shadow-2xl`}>
                <HeroPortrait heroName={hero.name} className="h-full w-full scale-105" />
            </div>
            <div className={`flex flex-col items-center ${s.mainGap}`}>
                <h3 
    className={`font-bold text-white truncate w-full ${s.nameText} ${s.nameMaxWidth}`}
    style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}
>
    {hero.name}
</h3>
                <div className={`flex items-center justify-center ${s.iconsGap}`}>
                    <FactionIcon faction={hero.faction} sizeClass={s.iconContainer} textSizeClass={s.iconText} />
                    <TierBadge tier={hero.tier} containerClass={s.badgeContainer} textClass={s.badgeText} />
                </div>
            </div>
        </div>
    );
};

export default InfographicsHeroCard;