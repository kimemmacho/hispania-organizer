import React, { useMemo, useState } from 'react';
import { Hero } from '../types';
import { LoadingSpinner } from './icons';
import HeroPortrait from './HeroPortrait';

// --- CONSTANTS AND HELPERS ---

const TIER_ORDER: { [key: string]: number } = { "SSS": 1, "SS": 2, "S": 3, "A": 4, "B": 5, "C": 6, "D": 7 };

const getTierClass = (tier: string): string => {
    switch (tier) {
        case 'SSS': return 'bg-blue-600 text-white shadow-lg';
        case 'SS': return 'bg-green-700 text-white shadow-lg';
        case 'S': return 'bg-lime-600 text-black shadow-lg';
        case 'A': return 'bg-yellow-500 text-black shadow-lg';
        case 'B': return 'bg-orange-600 text-white shadow-lg';
        case 'C': return 'bg-red-700 text-white shadow-lg';
        case 'D': return 'bg-amber-800 text-white shadow-lg';
        default: return 'bg-gray-600 text-white';
    }
};

interface RankingTableProps {
    heroes: Hero[];
    factionFilter: Set<string>;
    awakenedFilter: boolean;
    tierFilter: Set<string>;
    onTranslateComment: (heroOriginalName: string) => void;
    translatingHeroName: string | null;
    viewMode: 'card' | 'compact' | 'table';
    isGrouped: boolean;
}

// --- SUB-COMPONENTS for various layouts ---

const FactionIcon: React.FC<{ faction: string }> = ({ faction }) => {
    if (faction === 'Desconocida') {
        return <div className="h-6 w-6 flex items-center justify-center bg-gray-700 rounded-full text-xs font-bold text-gray-400 flex-shrink-0" title="Facción Desconocida">?</div>;
    }
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    const iconUrl = `${baseUrl}${iconFileName}.png`;
    return <img src={iconUrl} alt={faction} title={faction} className="h-6 w-6 flex-shrink-0" />;
};

// FIX: Unified tier styling to include borderClass, fixing the error and removing redundant code.
const getTierStyling = (t: string): { textClass: string; bgClass: string; borderClass: string } => {
    switch (t) {
        case 'SSS': return { textClass: 'text-white', bgClass: 'bg-blue-500', borderClass: 'border-blue-400' };
        case 'SS':  return { textClass: 'text-white', bgClass: 'bg-green-600', borderClass: 'border-green-500' };
        case 'S':   return { textClass: 'text-black', bgClass: 'bg-lime-400', borderClass: 'border-lime-300' };
        case 'A':   return { textClass: 'text-black', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-300' };
        case 'B':   return { textClass: 'text-white', bgClass: 'bg-orange-500', borderClass: 'border-orange-400' };
        case 'C':   return { textClass: 'text-white', bgClass: 'bg-red-600', borderClass: 'border-red-500' };
        case 'D':   return { textClass: 'text-white', bgClass: 'bg-amber-800', borderClass: 'border-amber-700' };
        default:    return { textClass: 'text-gray-100', bgClass: 'bg-gray-700', borderClass: 'border-gray-600' };
    }
};

const TierBadge: React.FC<{ tier: string }> = ({ tier }) => {
    const { textClass, bgClass } = getTierStyling(tier);
    return (
        <div className={`relative inline-block transform -skew-x-12 ${bgClass} px-2 py-0.5 shadow-sm`}>
            <span className={`block transform skew-x-12 text-center text-xs font-bold tracking-wider ${textClass}`}>
                {tier}
            </span>
        </div>
    );
};

// Card for the default 'card' view
const HeroRankingCard: React.FC<{ hero: Hero; onTranslateComment: (name: string) => void; translatingHeroName: string | null; }> = ({ hero, onTranslateComment, translatingHeroName }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isPerfect = hero.score === 7;
    const { borderClass } = getTierStyling(hero.tier);

    return (
        <div className={`group bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700/80 flex items-center gap-4 transition-all duration-300 hover:border-red-600/60 hover:shadow-[0_0_25px_5px_rgba(239,68,68,0.4)] ${isPerfect ? 'perfect-card-glow' : ''}`}>
            <div className={`w-24 h-24 bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center border-4 ${borderClass} overflow-hidden shadow-inner`}>
                <HeroPortrait heroName={hero.name} className="h-full w-full" />
            </div>

            <div className="flex-grow flex flex-col items-start text-left self-stretch">
                <h3 className={`text-lg font-bold ${isPerfect ? 'text-yellow-400' : (hero.isNameTranslated ? 'text-white' : 'text-red-400')}`}>{hero.name}</h3>

                <div className="flex items-center gap-2 mt-1">
                    <FactionIcon faction={hero.faction} />
                    <TierBadge tier={hero.tier} />
                </div>
                
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-sm text-gray-400">Puntuación:</span>
                    <span className={`text-xl font-bold ${isPerfect ? 'text-cyan-300' : 'text-cyan-400'}`}>{hero.score.toFixed(2)}</span>
                    <span className="text-xs text-gray-400">({((hero.score / 7) * 100).toFixed(1)}%)</span>
                </div>

                <div className="border-t border-gray-700/50 pt-2 mt-auto w-full">
                    {hero.comments && hero.comments.trim() ? (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-white transition-colors py-1"
                            aria-expanded={isExpanded}
                        >
                            <div className="flex items-center gap-2">
                                <i className="fas fa-comment-dots"></i>
                                <span>{isExpanded ? 'Ocultar Comentarios' : 'Comentarios'}</span>
                            </div>
                            <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                        </button>
                    ) : (
                        <div className="py-1 text-xs text-gray-500 italic flex items-center gap-2"><i className="fas fa-comment-slash"></i><span>Sin comentarios</span></div>
                    )}
                    
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden text-left ${isExpanded ? 'max-h-96 mt-2' : 'max-h-0'}`}>
                        <div className="text-sm text-gray-400 border-l-2 border-gray-600 pl-2">
                             <p className="whitespace-normal">{hero.comments}</p>
                            {translatingHeroName === hero.originalName ? (
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2 self-start">
                                    <LoadingSpinner className="h-3 w-3" />
                                    <span>Traduciendo...</span>
                                </div>
                            ) : (
                                !hero.commentIsTranslated && hero.comments && hero.comments.trim() && (
                                    <button
                                        onClick={() => onTranslateComment(hero.originalName)}
                                        className="mt-2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold py-1 px-2 rounded-md transition-colors self-start"
                                        title="Traducir comentario"
                                    >Traducir</button>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Card for the new 'compact' view
const CompactHeroCard: React.FC<{ hero: Hero }> = ({ hero }) => {
    const tier = hero.tier;
    const { borderClass } = getTierStyling(tier);
    const isPerfect = hero.score === 7;
    
    return (
        <div className={`group bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-3 w-full flex-shrink-0 shadow-lg border border-gray-700 text-center flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-red-500/20`}>
            <div className={`w-20 h-20 bg-gray-900 rounded-full mb-2 flex items-center justify-center border-4 ${borderClass} overflow-hidden shadow-inner`}>
                <HeroPortrait heroName={hero.name} className="h-full w-full" />
            </div>
            <h4 className={`font-bold text-base truncate w-full ${hero.isNameTranslated ? 'text-white' : 'text-red-400'}`}>{hero.name}</h4>
            <div className="flex items-center justify-center gap-2 mt-1">
                <FactionIcon faction={hero.faction} />
                <TierBadge tier={tier} />
            </div>
             <div className="flex items-baseline justify-center gap-2 mt-2 text-sm border-t border-gray-700/50 pt-2 w-full">
                <span className="text-gray-400">Puntuación:</span>
                <span className={`font-bold text-lg ${isPerfect ? 'text-cyan-300 perfect-hero-glow' : 'text-cyan-400'}`}>{hero.score.toFixed(2)}</span>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const RankingTable: React.FC<RankingTableProps> = ({ heroes, factionFilter, awakenedFilter, tierFilter, onTranslateComment, translatingHeroName, viewMode, isGrouped }) => {

    const processedHeroes = useMemo(() => {
        const filtered = heroes
            .filter(hero => 
                (awakenedFilter ? hero.isAwakened : true) && 
                (factionFilter.size === 0 || factionFilter.has(hero.faction)) &&
                (tierFilter.size === 0 || tierFilter.has(hero.tier))
            );

        if (!isGrouped) {
            const sorted = filtered.sort((a, b) => b.score - a.score);
            const map = new Map<string, Hero[]>();
            map.set('Todos', sorted);
            return map;
        }
        
        const groups = new Map<string, Hero[]>();
        filtered.forEach(hero => {
            const group = groups.get(hero.tier);
            if (group) group.push(hero);
            else groups.set(hero.tier, [hero]);
        });
        
        const sortedGroups = new Map([...groups.entries()].sort((a, b) => (TIER_ORDER[a[0]] || 99) - (TIER_ORDER[b[0]] || 99)));
        
        for (const group of sortedGroups.values()) {
            group.sort((a, b) => b.score - a.score);
        }

        return sortedGroups;
        
    }, [heroes, factionFilter, awakenedFilter, tierFilter, isGrouped]);

    if (heroes.length === 0) {
        return <div className="text-center py-10">No se encontraron datos de héroes.</div>;
    }
    
    // FIX: Explicitly type `group` to resolve a TypeScript type inference issue.
    if (Array.from(processedHeroes.values()).every((group: Hero[]) => group.length === 0)) {
        return <div className="text-center py-10 text-gray-400">Ningún héroe coincide con los filtros seleccionados.</div>
    }

    if (viewMode === 'table') {
        return (
            <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-700 text-sm">
                    <thead className="bg-gray-900/70 text-xs uppercase text-gray-300">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">Héroe</th>
                            {!isGrouped && <th className="px-4 py-3 text-center font-medium">Tier</th>}
                            <th className="px-4 py-3 text-center font-medium">Puntuación</th>
                            <th className="px-4 py-3 text-left font-medium w-1/2">Comentarios</th>
                        </tr>
                    </thead>
                    {Array.from(processedHeroes.entries()).map(([tier, heroGroup]) => (
                        <tbody key={tier} className="bg-gray-800 divide-y divide-gray-700">
                            {isGrouped && heroGroup.length > 0 && (
                                <tr className={getTierClass(tier)}>
                                    <th colSpan={3} className="px-4 py-2 text-left text-lg font-bold">Tier {tier}</th>
                                </tr>
                            )}
                            {heroGroup.map((hero, index) => (
                                <tr key={`${hero.originalName}-${index}`} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-14 h-14 bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${getTierStyling(hero.tier).borderClass} overflow-hidden`}>
                                                <HeroPortrait heroName={hero.name} className="h-full w-full" />
                                            </div>
                                            <div>
                                                <div className={`font-bold ${hero.isNameTranslated ? 'text-white' : 'text-red-400'}`}>{hero.name}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                                                    <FactionIcon faction={hero.faction} />
                                                    <span>{hero.faction}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {!isGrouped && (
                                        <td className="px-4 py-3 align-middle text-center">
                                            <TierBadge tier={hero.tier} />
                                        </td>
                                    )}
                                    <td className="px-4 py-3 align-middle text-center">
                                        <div className={`text-lg font-bold ${hero.score === 7 ? 'text-cyan-300 perfect-hero-glow' : 'text-cyan-400'}`}>
                                            {hero.score.toFixed(2)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300 align-top">
                                        <div className="flex flex-col items-start max-w-prose">
                                            <p className="whitespace-normal">{hero.comments}</p>
                                            {translatingHeroName === hero.originalName ? (
                                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                                                    <LoadingSpinner className="h-3 w-3" /><span>Traduciendo...</span>
                                                </div>
                                            ) : (
                                                !hero.commentIsTranslated && hero.comments && hero.comments.trim() && (
                                                    <button
                                                        onClick={() => onTranslateComment(hero.originalName)}
                                                        className="mt-2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold py-1 px-2 rounded-md transition-colors"
                                                        title="Traducir comentario"
                                                    >Traducir</button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </table>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {Array.from(processedHeroes.entries()).map(([tier, heroGroup]) => (
                heroGroup.length > 0 && (
                    <div key={tier}>
                        {isGrouped && (
                            <h2 className={`text-3xl font-extrabold p-4 rounded-lg ${getTierClass(tier)} mb-6 shadow-xl`}>
                                Tier {tier}
                            </h2>
                        )}
                        <div className={
                            viewMode === 'card' 
                            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" 
                            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3"
                        }>
                            {heroGroup.map((hero, index) => (
                                viewMode === 'card' ? (
                                    <HeroRankingCard
                                        key={`${hero.originalName}-${index}`}
                                        hero={hero}
                                        onTranslateComment={onTranslateComment}
                                        translatingHeroName={translatingHeroName}
                                    />
                                ) : (
                                    <CompactHeroCard
                                        key={`${hero.originalName}-${index}`}
                                        hero={hero}
                                    />
                                )
                            ))}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};

export default RankingTable;