



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { PriorityHero, PlayerData, PlayerHeroData, FurniturePriority, FurniturePriorityTier, Page, Hero, HeroDatabaseEntry } from '../types';
import { HeroCard } from '../components/HeroCard';
import HeroPortrait from '../components/HeroPortrait';
import { LoadingSpinner, CloseIcon } from '../components/icons';
import { SUGGESTION_ORDER, DEFAULT_FURNITURE_PRIORITIES } from '../constants';
import FurnitureEditModal from '../components/FurnitureEditModal';

const FURNITURE_PRIORITY_TIERS: FurniturePriorityTier[] = ['NO DEFINIDO', 'TOP TIER', 'VERY GOOD', 'GOOD', 'AVERAGE', 'BAD', 'VERY BAD'];

const TIER_ORDER_MAP: Record<FurniturePriorityTier, number> = {
    'TOP TIER': 1,
    'VERY GOOD': 2,
    'GOOD': 3,
    'AVERAGE': 4,
    'BAD': 5,
    'VERY BAD': 6,
    'NO DEFINIDO': 7,
};

const getFurnitureTierColorClass = (tier: FurniturePriorityTier): string => {
    switch (tier) {
        case 'TOP TIER': return 'text-cyan-400';
        case 'VERY GOOD': return 'text-green-400';
        case 'GOOD': return 'text-lime-400';
        case 'AVERAGE': return 'text-yellow-400';
        case 'BAD': return 'text-red-400';
        case 'VERY BAD': return 'text-red-600';
        case 'NO DEFINIDO':
        default:
            return 'text-white';
    }
};

const FactionIcon: React.FC<{ faction: string }> = ({ faction }) => {
    if (faction === 'Desconocida') return <div className="h-6 w-6 flex items-center justify-center bg-gray-700 rounded-full text-xs font-bold text-gray-400 flex-shrink-0" title="Facción Desconocida">?</div>;
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    return <img src={`${baseUrl}${iconFileName}.png`} alt={faction} title={faction} className="h-6 w-6 flex-shrink-0" />;
};

const getTierClass = (tier: string): string => {
    switch (tier) {
        case 'SSS': return 'bg-blue-600 text-white';
        case 'SS': return 'bg-green-700 text-white';
        case 'S': return 'bg-lime-600 text-black';
        case 'A': return 'bg-yellow-500 text-black';
        case 'B': return 'bg-orange-600 text-white';
        case 'C': return 'bg-red-700 text-white';
        case 'D': return 'bg-amber-800 text-white';
        default: return 'bg-gray-600';
    }
};

// FIX: Replaced the incorrect getTierStyling function. This version correctly handles hero tiers (e.g., "SSS", "S") instead of furniture tiers, and it provides the borderClass property, resolving both reported errors.
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

// --- Sub-components ---

// --- Page ---

interface FurnitureDuplicatesPageProps {
    navigate: (page: Page) => void;
    database: HeroDatabaseEntry[];
}

const FurnitureDuplicatesPage: React.FC<FurnitureDuplicatesPageProps> = ({ navigate, database }) => {
    const [viewMode, setViewMode] = useState<'suggestion' | 'config'>('suggestion');
    const [playerData, setPlayerData] = useLocalStorage<PlayerData>('player-hero-data', {});
    const [priorities, setPriorities] = useLocalStorage<Record<string, FurniturePriority>>('furniture-priority-data', {});
    const [isLoading, setIsLoading] = useState(false);
    const [selectedHero, setSelectedHero] = useState<PriorityHero | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUndefinedOnly, setShowUndefinedOnly] = useState(false);

    const heroes: Hero[] = useMemo(() => {
        return database.map(dbEntry => ({
            name: dbEntry.spanishName || dbEntry.key,
            faction: dbEntry.faction,
            comments: dbEntry.rankingComments,
            tier: dbEntry.tier,
            score: dbEntry.score,
            originalName: dbEntry.key,
            isNameTranslated: !!dbEntry.spanishName,
            isFactionTranslated: true,
            commentIsTranslated: !!dbEntry.rankingCommentIsTranslated,
            isAwakened: dbEntry.isAwakened,
        }));
    }, [database]);

    const priorityHeroes: PriorityHero[] = useMemo(() => {
        return database.flatMap(dbEntry => 
            dbEntry.builds.map(build => ({
                originalName: dbEntry.key,
                name: dbEntry.spanishName,
                faction: dbEntry.faction,
                isNameTranslated: !!dbEntry.spanishName,
                group: dbEntry.tier,
                priorityComment: build.priorityComment,
                commentIsTranslated: !!build.priorityCommentIsTranslated,
                score: dbEntry.score,
                requiredSI: build.requiredSI,
                requiredFurniture: build.requiredFurniture,
                requiredEngravings: build.requiredEngravings,
                engravingNodes: build.engravingNodes,
                isAlternative: build.isAlternative,
                isAwakened: dbEntry.isAwakened,
            }))
        );
    }, [database]);

    useEffect(() => {
        // This effect runs the one-time migration of default furniture priorities.
        if (heroes.length > 0) {
            const migrationKey = 'furniture-defaults-v4-applied'; // Use a new key to ensure it runs again
            if (localStorage.getItem(migrationKey)) {
                return;
            }
    
            // Create a map for quick lookup: displayName -> originalName
            const nameMap = new Map<string, string>();
            heroes.forEach(hero => {
                nameMap.set(hero.name, hero.originalName);
            });

            setPriorities(currentPriorities => {
                const newPriorities = JSON.parse(JSON.stringify(currentPriorities)); // Deep copy
                let hasMadeUpdates = false;
    
                for (const [displayName, defaultP] of Object.entries(DEFAULT_FURNITURE_PRIORITIES)) {
                    const originalName = nameMap.get(displayName);
                    if (!originalName) {
                        continue; // Hero from defaults not found in the main list
                    }

                    if (!newPriorities[originalName]) {
                        newPriorities[originalName] = { top: 'NO DEFINIDO', middle: 'NO DEFINIDO', bottom: 'NO DEFINIDO' };
                    }
    
                    const currentP = newPriorities[originalName];
                    const heroUpdates: Partial<FurniturePriority> = {};
    
                    if (currentP.top === 'NO DEFINIDO') heroUpdates.top = defaultP.top;
                    if (currentP.middle === 'NO DEFINIDO') heroUpdates.middle = defaultP.middle;
                    if (currentP.bottom === 'NO DEFINIDO') heroUpdates.bottom = defaultP.bottom;
    
                    if (Object.keys(heroUpdates).length > 0) {
                        newPriorities[originalName] = { ...currentP, ...heroUpdates };
                        hasMadeUpdates = true;
                    }
                }
    
                if (hasMadeUpdates) {
                    localStorage.setItem(migrationKey, 'true');
                }
                
                return hasMadeUpdates ? newPriorities : currentPriorities;
            });
        }
    }, [heroes, setPriorities]);


    useEffect(() => {
        setIsLoading(true);
        const needsMigration = Object.values(playerData).some(d => 
            !d.furnitureDupes || 
            d.furnitureDupes.top.length !== 3 || 
            d.furnitureDupes.middle.length !== 3 ||
            d.furnitureDupes.bottom.length !== 3
        );
        if (needsMigration) {
            setPlayerData(currentData => {
                const newData = { ...currentData };
                Object.keys(newData).forEach(heroName => {
                    const hero = newData[heroName];
                    const dupes = hero.furnitureDupes;
                    if (!dupes || dupes.top.length !== 3 || dupes.middle.length !== 3 || dupes.bottom.length !== 3) {
                        const newDupes = {
                            top: [...(dupes?.top || []), 0, 0, 0].slice(0, 3) as [number, number, number],
                            middle: [...(dupes?.middle || []), 0, 0, 0].slice(0, 3) as [number, number, number],
                            bottom: [...(dupes?.bottom || []), 0, 0, 0].slice(0, 3) as [number, number, number],
                        };
                        hero.furnitureDupes = newDupes;
                    }
                });
                return newData;
            });
        }
        setIsLoading(false);
    }, [playerData, setPlayerData]);
    
    useEffect(() => {
        const mode = sessionStorage.getItem('furniture-config-mode');
        const filter = sessionStorage.getItem('furniture-config-filter');
        const heroName = sessionStorage.getItem('furniture-config-hero');

        if (mode === 'config') {
            setViewMode('config');
            sessionStorage.removeItem('furniture-config-mode');
        }
        if (filter === 'undefined') {
            setShowUndefinedOnly(true);
            sessionStorage.removeItem('furniture-config-filter');
        }
        if (heroName) {
            setSearchQuery(heroName);
            sessionStorage.removeItem('furniture-config-hero');
        }
    }, []);

    const sortedHeroesForConfig = useMemo(() => {
        let heroesToFilter = [...heroes].sort((a, b) => b.score - a.score);

        if (searchQuery.trim() !== '') {
            heroesToFilter = heroesToFilter.filter(hero =>
                hero.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
            );
        }
        
        if (showUndefinedOnly) {
            heroesToFilter = heroesToFilter.filter(hero => {
                const p = priorities[hero.originalName] || { top: 'NO DEFINIDO', middle: 'NO DEFINIDO', bottom: 'NO DEFINIDO' };
                return p.top === 'NO DEFINIDO' || p.middle === 'NO DEFINIDO' || p.bottom === 'NO DEFINIDO';
            });
        }

        return heroesToFilter;
    }, [heroes, searchQuery, showUndefinedOnly, priorities]);

    const suggestions = useMemo(() => {
        const eligibleHeroes = priorityHeroes.filter(h => playerData[h.originalName]?.owned && (playerData[h.originalName]?.furniture ?? 0) >= 9);
        const suggestionMap = new Map<string, { hero: PriorityHero, type: 'top' | 'middle' | 'bottom', level: number, tier: FurniturePriorityTier }>();

        for (const step of SUGGESTION_ORDER) {
            if (suggestionMap.size >= 10) break;
            
            const candidates: { hero: PriorityHero, type: 'top' | 'middle' | 'bottom' }[] = [];

            for (const hero of eligibleHeroes) {
                if (suggestionMap.has(hero.originalName)) continue;

                const heroPriorities = priorities[hero.originalName] || { top: 'NO DEFINIDO', middle: 'NO DEFINIDO', bottom: 'NO DEFINIDO' };
                const heroDupes = playerData[hero.originalName]?.furnitureDupes || { top: [0,0,0], middle: [0,0,0], bottom: [0,0,0] };

                if (heroPriorities.top === step.tier && heroDupes.top.some(d => d < step.level)) {
                    candidates.push({ hero, type: 'top' });
                }
                if (heroPriorities.middle === step.tier && heroDupes.middle.some(d => d < step.level)) {
                    candidates.push({ hero, type: 'middle' });
                }
                if (heroPriorities.bottom === step.tier && heroDupes.bottom.some(d => d < step.level)) {
                    candidates.push({ hero, type: 'bottom' });
                }
            }
            
            candidates.sort((a, b) => b.hero.score - a.hero.score);

            for (const candidate of candidates) {
                if (suggestionMap.size >= 10) break;
                if (!suggestionMap.has(candidate.hero.originalName)) {
                    suggestionMap.set(candidate.hero.originalName, { ...candidate, level: step.level, tier: step.tier });
                }
            }
        }
        return Array.from(suggestionMap.values());
    }, [priorityHeroes, playerData, priorities]);
    
    const undefinedSSSHeroes = useMemo(() => {
        return heroes.filter(hero => {
            if (hero.tier !== 'SSS') {
                return false;
            }
            const pData = playerData[hero.originalName];
            if (!pData || pData.furniture < 9) {
                return false;
            }
            const heroPriorities = priorities[hero.originalName] || { top: 'NO DEFINIDO', middle: 'NO DEFINIDO', bottom: 'NO DEFINIDO' };
            return heroPriorities.top === 'NO DEFINIDO' || heroPriorities.middle === 'NO DEFINIDO' || heroPriorities.bottom === 'NO DEFINIDO';
        });
    }, [heroes, playerData, priorities]);

    const handlePriorityChange = (heroName: string, type: 'top' | 'middle' | 'bottom', value: FurniturePriorityTier) => {
        setPriorities(prev => ({
            ...prev,
            [heroName]: {
                ...(prev[heroName] || { top: 'NO DEFINIDO', middle: 'NO DEFINIDO', bottom: 'NO DEFINIDO' }),
                [type]: value,
            }
        }));
    };
    
    const handleConfigureHero = useCallback((hero: Hero) => {
        setViewMode('config');
        setSearchQuery(hero.name);
        setShowUndefinedOnly(true);
    }, []);

    if (isLoading) return <div className="text-center py-20"><LoadingSpinner className="h-12 w-12 mx-auto text-red-500"/><p className="mt-4 text-lg">Inicializando datos...</p></div>;

    return (
        <div>
             <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700/80 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Duplicación de Muebles</h1>
                    <p className="text-sm text-gray-400 mt-1">{viewMode === 'suggestion' ? 'Sugerencias para tus próximos duplicados de muebles.' : 'Configura la prioridad de cada tipo de mueble.'}</p>
                </div>
                {viewMode === 'config' && (
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Buscar héroe..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto max-w-xs"
                        />
                        <label className="flex items-center cursor-pointer flex-shrink-0">
                            <span className="mr-3 text-sm text-gray-300 whitespace-nowrap">Mostrar No Definidos</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showUndefinedOnly} onChange={() => setShowUndefinedOnly(!showUndefinedOnly)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${showUndefinedOnly ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showUndefinedOnly ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                )}
                <button 
                    onClick={() => setViewMode(prev => prev === 'suggestion' ? 'config' : 'suggestion')}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 flex-shrink-0"
                >
                    <i className={`fas ${viewMode === 'suggestion' ? 'fa-cog' : 'fa-list-ol'}`}></i>
                    <span>{viewMode === 'suggestion' ? 'Configurar' : 'Ver Sugerencias'}</span>
                </button>
            </div>
            
            {viewMode === 'suggestion' && (
                 <div className="py-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12 justify-items-center">
                        {suggestions.map(({ hero, type, level, tier }, index) => (
                            <div className="relative" key={hero.originalName}>
                                <div
                                    className="absolute -top-4 -left-4 z-10 flex items-center justify-center w-16 h-20 text-white font-black text-4xl text-shadow-heavy"
                                    style={{
                                        clipPath: 'polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)',
                                        backgroundColor: '#581c87',
                                        filter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.9)) drop-shadow(0 0 10px rgba(220, 38, 38, 0.7))',
                                    }}
                                >
                                    <span className="mt-[-0.5rem]">{index + 1}</span>
                                </div>
                                <HeroCard
                                    hero={hero}
                                    tier={hero.group}
                                    subText={{ from: tier, to: `+${level} ${type === 'top' ? 'Grande' : type === 'middle' ? 'Pequeño' : 'Colgante'}` }}
                                    subTextFromColor={getFurnitureTierColorClass(tier)}
                                    onClick={() => setSelectedHero(hero)}
                                    isDisappearing={false}
                                />
                            </div>
                        ))}
                    </div>

                    {suggestions.length === 0 && undefinedSSSHeroes.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                             <p className="text-gray-400">No hay sugerencias disponibles. ¡Asegúrate de tener héroes 9/9 y de configurar las prioridades!</p>
                        </div>
                    )}

                    {undefinedSSSHeroes.length > 0 && (
                        <div className="mt-12 border-t-2 border-yellow-700/50 pt-8">
                            <h3 className="text-xl font-bold text-yellow-400 text-center mb-4">
                                <i className="fas fa-exclamation-triangle mr-2"></i>Prioridades por Definir
                            </h3>
                            <p className="text-center text-gray-400 max-w-2xl mx-auto mb-6">
                                ¡Atención! Has subido a 9 muebles a estos héroes SSS pero no has definido sus prioridades. Configúralas para recibir sugerencias precisas.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                {undefinedSSSHeroes.map(hero => (
                                    <div 
                                        key={hero.originalName} 
                                        className="bg-gray-800 p-3 rounded-lg flex flex-col items-center gap-2 cursor-pointer hover:bg-gray-700 transition-colors w-36"
                                        onClick={() => handleConfigureHero(hero)}
                                    >
                                        <div className={`w-16 h-16 bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${getTierStyling(hero.tier).borderClass} overflow-hidden`}>
                                            <HeroPortrait heroName={hero.name} className="h-full w-full" />
                                        </div>
                                        <span className="font-semibold text-sm text-center">{hero.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}


            {viewMode === 'config' && (
                 <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-700 text-sm">
                        <thead className="bg-gray-900/70 text-xs uppercase text-gray-300">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Héroe</th>
                                <th className="px-2 py-3 text-center font-medium">Grande (Top)</th>
                                <th className="px-2 py-3 text-center font-medium">Pequeño (Middle)</th>
                                <th className="px-2 py-3 text-center font-medium">Colgante (Bottom)</th>
                            </tr>
                        </thead>
                         <tbody className="bg-gray-800 divide-y divide-gray-700">
                             {sortedHeroesForConfig.map(hero => {
                                const heroPriorities = priorities[hero.originalName] || { top: 'NO DEFINIDO', middle: 'NO DEFINIDO', bottom: 'NO DEFINIDO' };
                                return (
                                    <tr key={hero.originalName} className="hover:bg-gray-700/50">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${getTierStyling(hero.tier).borderClass} overflow-hidden`}>
                                                    <HeroPortrait heroName={hero.name} className="h-full w-full" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">{hero.name}</div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                                                        <FactionIcon faction={hero.faction} />
                                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${getTierClass(hero.tier)}`}>{hero.tier}</span>
                                                        <span className="font-mono text-cyan-400">{hero.score.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {(['top', 'middle', 'bottom'] as const).map(type => (
                                            <td key={type} className="px-2 py-2 text-center">
                                                <select 
                                                    value={heroPriorities[type]}
                                                    onChange={(e) => handlePriorityChange(hero.originalName, type, e.target.value as FurniturePriorityTier)}
                                                    className={`bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-bold ${getFurnitureTierColorClass(heroPriorities[type])}`}
                                                >
                                                    {FURNITURE_PRIORITY_TIERS.map(tier => <option key={tier} value={tier} className={`bg-gray-800 font-bold ${getFurnitureTierColorClass(tier)}`}>{tier}</option>)}
                                                </select>
                                            </td>
                                        ))}
                                    </tr>
                                );
                             })}
                         </tbody>
                    </table>
                </div>
            )}

            <FurnitureEditModal
                isOpen={!!selectedHero}
                onClose={() => setSelectedHero(null)}
                hero={selectedHero}
                heroData={selectedHero ? playerData[selectedHero.originalName] : null}
                onSave={({ furniture, furnitureDupes }) => {
                    if (!selectedHero) return;
                    setPlayerData(prev => ({
                        ...prev,
                        [selectedHero.originalName]: {
                            ...prev[selectedHero.originalName],
                            furniture,
                            furnitureDupes,
                        }
                    }));
                }}
                priorities={priorities}
                navigate={navigate}
            />

             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default FurnitureDuplicatesPage;