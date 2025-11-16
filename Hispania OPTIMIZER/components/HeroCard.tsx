import React from 'react';
import { PriorityHero } from '../types';
import HeroPortrait from './HeroPortrait';
import { CloseIcon } from './icons';

// --- Tier Styling Helpers (inspired by RankingTable) ---
const getTierStyling = (t: string): { textClass: string; bgClass: string; borderClass: string } => {
    switch (t) {
        case 'SSS': return { textClass: 'text-white', bgClass: 'bg-blue-500', borderClass: 'border-blue-400' };
        case 'SS':  return { textClass: 'text-white', bgClass: 'bg-green-600', borderClass: 'border-green-400' };
        case 'S':   return { textClass: 'text-black', bgClass: 'bg-lime-400', borderClass: 'border-lime-300' };
        case 'A':   return { textClass: 'text-black', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-300' };
        case 'B':   return { textClass: 'text-white', bgClass: 'bg-orange-500', borderClass: 'border-orange-400' };
        case 'C':   return { textClass: 'text-white', bgClass: 'bg-red-600', borderClass: 'border-red-500' };
        case 'D':   return { textClass: 'text-white', bgClass: 'bg-amber-800', borderClass: 'border-amber-700' };
        default:    return { textClass: 'text-gray-100', bgClass: 'bg-gray-700', borderClass: 'border-gray-600' };
    }
};

const getProgressBarClass = (percentage: number): string => {
    if (percentage >= 100) return 'bg-gradient-to-r from-teal-400 to-cyan-500';
    if (percentage > 75) return 'bg-gradient-to-r from-lime-400 to-green-500';
    if (percentage > 40) return 'bg-gradient-to-r from-yellow-400 to-amber-500';
    return 'bg-gradient-to-r from-orange-500 to-red-600';
};

const getPortraitGlowClass = (tier: string): string => {
    switch (tier) {
        case 'SSS': return 'portrait-glow-sss';
        case 'SS': return 'portrait-glow-ss';
        case 'S': return 'portrait-glow-s';
        case 'A': return 'portrait-glow-a';
        case 'B': return 'portrait-glow-b';
        case 'C': return 'portrait-glow-c';
        case 'D': return 'portrait-glow-d';
        default: return '';
    }
};

const TierBadge: React.FC<{ tier: string }> = ({ tier }) => {
    const { textClass, bgClass } = getTierStyling(tier);
    return (
        <div className={`relative inline-block transform -skew-x-12 ${bgClass} px-2 py-0.5 shadow-md`}>
             <span className={`block transform skew-x-12 text-center text-xs font-bold tracking-wider ${textClass}`}>
                {tier}
            </span>
        </div>
    );
};

const FactionIcon: React.FC<{ faction: string }> = ({ faction }) => {
    if (faction === 'Desconocida') {
        return (
            <div className="h-6 w-6 flex items-center justify-center bg-gray-700 rounded-full text-xs font-bold text-gray-400" title="Facción Desconocida">
                ?
            </div>
        );
    }
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    const iconUrl = `${baseUrl}${iconFileName}.png`;
    return <img src={iconUrl} alt={faction} title={faction} className="h-6 w-6" />;
};

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);


interface HeroCardProps {
    hero: PriorityHero;
    tier: string;
    subText?: { from: string, to: string };
    onClick?: (hero: PriorityHero) => void;
    onRemove?: (e: React.MouseEvent) => void;
    subTextFromColor?: string;
    isDisappearing: boolean;
    isAwakened?: boolean;
    progress?: number;
    rank?: number;
}

export const HeroCard: React.FC<HeroCardProps> = ({ hero, tier, subText, onClick, onRemove, subTextFromColor, isDisappearing, isAwakened = false, progress, rank }) => {
    const { borderClass } = getTierStyling(tier);
    const portraitGlowClass = isAwakened ? getPortraitGlowClass(tier) : '';

    const renderBuildString = (build: string) => {
        if (build === '-') return <span className="font-bold text-gray-200">-</span>;
        
        const parts = build.split(' ');
        return (
            <span className="font-bold">
                {parts.map((part, index) => {
                    let colorClass = 'text-gray-200';
                    if (part.startsWith('SI')) colorClass = 'text-cyan-400';
                    else if (part.endsWith('F')) colorClass = 'text-lime-400';
                    else if (part.startsWith('E')) colorClass = 'text-yellow-400';
                    else if (part.startsWith('T')) colorClass = 'text-red-400';
                    
                    return <span key={index} className={`${colorClass} ${index > 0 ? 'ml-1' : ''}`}>{part}</span>;
                })}
            </span>
        );
    };

    const cardContent = (
        <>
            {rank && (
                <div 
                    className="absolute -top-2 -left-2 z-10 text-white font-black text-4xl text-shadow-heavy"
                >
                    {rank}
                </div>
            )}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="absolute top-1 right-1 bg-gray-900/50 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-white transition-colors z-10"
                    aria-label={`Dejar de observar a ${hero.name}`}
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            )}
            <div className={`w-20 h-20 bg-gray-900 rounded-full mb-2 flex items-center justify-center border-4 ${borderClass} ${portraitGlowClass} overflow-hidden shadow-inner`}>
                <HeroPortrait heroName={hero.name} className="h-full w-full" />
            </div>
            <h4 className={`font-bold text-base truncate w-full ${hero.isNameTranslated ? 'text-white' : 'text-red-400'}`}>{hero.name}</h4>
            <div className="flex items-center justify-center gap-2 mt-1">
                <FactionIcon faction={hero.faction} />
                <TierBadge tier={tier || '?'} />
            </div>
            <div className="mt-2 w-full flex flex-col gap-1 pt-1">
                {subText && (
                    <div className="flex items-center justify-center gap-1 text-xs">
                        <span className={`font-mono font-bold ${subTextFromColor || 'text-gray-400'}`}>{subText.from}</span>
                        <ArrowRightIcon className="h-3 w-3 text-red-500 flex-shrink-0" />
                        <div className="font-mono">{renderBuildString(subText.to)}</div>
                    </div>
                )}
                {progress !== undefined && (
                    <div className="w-full bg-gray-900/70 shadow-inner rounded-full h-4 relative overflow-hidden mt-1">
                        <div 
                            className={`h-4 rounded-full transition-all duration-500 ${getProgressBarClass(progress)}`} 
                            style={{ width: `${Math.min(progress, 100).toFixed(1)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-dark">
                            {progress.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
        </>
    );

    const commonClasses = `relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 w-44 h-[188px] flex-shrink-0 shadow-lg border border-gray-700 text-center flex flex-col items-center transition-all duration-300 ${isDisappearing ? 'epic-disappear' : ''} ${isAwakened ? 'awakened-hero-card' : ''}`;

    if (onClick) {
        return (
            <button
                onClick={() => onClick(hero)}
                className={`${commonClasses} hover:scale-105 hover:shadow-red-500/20 cursor-pointer`}
                aria-label={`Editar o adquirir a ${hero.name}`}
            >
                {cardContent}
            </button>
        );
    }
    
    return (
        <div className={`${commonClasses} cursor-default`}>
            {cardContent}
        </div>
    );
};
