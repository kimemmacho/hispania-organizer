





import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
// FIX: Add `FurniturePriority`, `HeroDatabaseEntry` to the import to correctly type the `priorities` state and props.
import { Hero, PriorityHero, PlayerData, Settings, PlayerHeroData, Page, FurniturePriority, HeroDatabaseEntry } from '../types';
import { GROUP_ORDER } from '../constants';
import { LoadingSpinner, CloseIcon } from '../components/icons';
import HeroPortrait from '../components/HeroPortrait';
import ConfirmationModal from '../components/ConfirmationModal';
import HeroRow from '../components/HeroRow';
import { HeroCard } from '../components/HeroCard';
import HeroBuildModal from '../components/HeroBuildModal';

// FIX: Update component props to accept state from App.tsx, resolving the main app error and improving data flow.
interface RoadmapPageProps {
    navigate: (page: Page) => void;
    database: HeroDatabaseEntry[];
    settings: Settings;
}

const getProgressBarClass = (percentage: number): string => {
    if (percentage >= 100) return 'bg-gradient-to-r from-teal-400 to-cyan-500';
    if (percentage > 75) return 'bg-gradient-to-r from-lime-400 to-green-500';
    if (percentage > 40) return 'bg-gradient-to-r from-yellow-400 to-amber-500';
    return 'bg-gradient-to-r from-orange-500 to-red-600';
};

// --- Watchlist Modal Helpers ---
const getTierStyling = (t: string): { textClass: string; bgClass: string; } => {
    switch (t) {
        case 'SSS': return { textClass: 'text-white', bgClass: 'bg-blue-500' };
        case 'SS':  return { textClass: 'text-white', bgClass: 'bg-green-600' };
        case 'S':   return { textClass: 'text-black', bgClass: 'bg-lime-400' };
        case 'A':   return { textClass: 'text-black', bgClass: 'bg-yellow-400' };
        case 'B':   return { textClass: 'text-white', bgClass: 'bg-orange-500' };
        case 'C':   return { textClass: 'text-white', bgClass: 'bg-red-600' };
        case 'D':   return { textClass: 'text-white', bgClass: 'bg-amber-800' };
        default:    return { textClass: 'text-gray-100', bgClass: 'bg-gray-700' };
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
    if (faction === 'Desconocida') return <div className="h-6 w-6 flex items-center justify-center bg-gray-700 rounded-full text-xs font-bold text-gray-400 flex-shrink-0" title="Facción Desconocida">?</div>;
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    return <img src={`${baseUrl}${iconFileName}.png`} alt={faction} title={faction} className="h-6 w-6 flex-shrink-0" />;
};

const PlayerInvestmentDisplay: React.FC<{ data: PlayerHeroData | undefined }> = ({ data }) => {
    const { si = 0, furniture = 0, engravings = 0 } = data || {};
    const investmentParts = [
        si > 0 && { key: 'si', className: 'text-cyan-400', text: `SI${si}` },
        furniture > 0 && { key: 'f', className: 'text-lime-400', text: `${furniture}F` },
        engravings > 0 && { key: 'e', className: 'text-yellow-400', text: `E${engravings}` }
    ].filter(Boolean) as { key: string, className: string, text: string }[];
    
    if (investmentParts.length === 0) {
        return <span className="font-mono text-gray-500">-</span>;
    }

    return (
        <div className="flex items-baseline justify-start gap-2 font-mono">
            {investmentParts.map(part => <span key={part.key} className={part.className}>{part.text}</span>) }
        </div>
    );
};

interface WatchlistReplaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReplace: (indexToReplace: number) => void;
    currentHeroes: (PriorityHero | undefined)[];
    tierMap: Map<string, string>;
}

const WatchlistReplaceModal: React.FC<WatchlistReplaceModalProps> = ({ isOpen, onClose, onReplace, currentHeroes, tierMap }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-[80]" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-4xl flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Watchlist Llena</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </header>
                <div className="p-6">
                    <p className="text-gray-300 mb-4 text-center">Tu watchlist está llena. Selecciona un héroe de la lista para reemplazarlo por el nuevo.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        {/* FIX: Explicitly type `hero` to resolve type inference issues. */}
                        {currentHeroes.map((hero: PriorityHero | undefined, index) => (
                           hero ? (
                                <HeroCard
                                    key={hero.originalName + index}
                                    hero={hero}
                                    tier={tierMap.get(hero.originalName) || 'N/A'}
                                    onClick={() => onReplace(index)}
                                    isDisappearing={false}
                                />
                           ) : null
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


interface WatchlistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (heroOriginalName: string) => void;
    priorityHeroes: PriorityHero[];
    playerData: PlayerData;
    tierMap: Map<string, string>;
    maxInvestmentMap: Map<string, { si: number, furniture: number, engravings: number }>;
    currentWatchlist: (string | null)[];
}
const WatchlistModal: React.FC<WatchlistModalProps> = ({ isOpen, onClose, onSelect, priorityHeroes, playerData, tierMap, maxInvestmentMap, currentWatchlist }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const eligibleHeroes = useMemo(() => {
        const uniqueHeroes = Array.from(new Map(priorityHeroes.map(h => [h.originalName, h])).values());
        
        return uniqueHeroes.map(hero => {
            const pData = playerData[hero.originalName];
            if (!pData || !pData.owned) return null;

            const maxInv = maxInvestmentMap.get(hero.originalName) || { si: 0, furniture: 0, engravings: 0 };
            const siProg = maxInv.si > 0 ? Math.min(pData.si / maxInv.si, 1) : 1;
            const furnProg = maxInv.furniture > 0 ? Math.min(pData.furniture / maxInv.furniture, 1) : 1;
            const engProg = maxInv.engravings > 0 ? Math.min(pData.engravings / maxInv.engravings, 1) : 1;
            const progress = ((siProg + furnProg + engProg) / 3) * 100;

            if (progress >= 100 || currentWatchlist.includes(hero.originalName)) return null;
            
            return { hero, progress, pData };
        })
        .filter(Boolean)
        .filter(item => item!.hero.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b!.progress - a!.progress) as { hero: PriorityHero, progress: number, pData: PlayerHeroData }[];
    }, [priorityHeroes, playerData, maxInvestmentMap, currentWatchlist, searchQuery]);

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 animate-[fade-in_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold">Seleccionar Héroe para Observar</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="h-6 w-6" /></button>
                </header>
                <div className="p-4 flex-shrink-0">
                    <input
                        type="text"
                        placeholder="Buscar héroe por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                <div className="overflow-y-auto px-2">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-gray-800 z-10">
                            <tr>
                                <th className="p-2 text-left text-gray-400 font-semibold">Héroe</th>
                                <th className="p-2 text-left text-gray-400 font-semibold">Inversión Actual</th>
                                <th className="p-2 text-left text-gray-400 font-semibold w-1/3">Progreso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* FIX: Explicitly type the destructured map argument to resolve type inference issues. */}
                            {eligibleHeroes.length > 0 ? eligibleHeroes.map(({ hero, progress, pData }: { hero: PriorityHero, progress: number, pData: PlayerHeroData }) => (
                                <tr key={hero.originalName} onClick={() => onSelect(hero.originalName)} className="hover:bg-gray-700/50 cursor-pointer rounded-lg">
                                    <td className="p-2 align-middle">
                                        <div className="flex items-center gap-3">
                                            <FactionIcon faction={hero.faction} />
                                            <div>
                                                <div className="font-bold">{hero.name}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                                    <TierBadge tier={tierMap.get(hero.originalName) || 'N/A'} />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-2 align-middle"><PlayerInvestmentDisplay data={pData} /></td>
                                    <td className="p-2 align-middle">
                                        <div className="w-full bg-gray-900/70 shadow-inner rounded-full h-5 relative overflow-hidden">
                                            <div className={`h-5 rounded-full ${getProgressBarClass(progress)}`} style={{ width: `${progress.toFixed(1)}%` }} />
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white text-shadow-dark">{progress.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="text-center text-gray-500 py-8">
                                        No hay héroes que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-700/80 transition-all duration-300 hover:border-red-600/60 hover:shadow-[0_0_25px_5px_rgba(239,68,68,0.2)]">
        <h2 className="text-2xl font-bold text-red-500 mb-6 pb-4 border-b border-gray-700/50">{title}</h2>
        <div className="space-y-8">
            {children}
        </div>
    </div>
);

const formatBuild = (data: { si?: number, furniture?: number, engravings?: number } | null | undefined): string => {
    if (!data) return '-';
    const parts: string[] = [];
    if (data.si && data.si > 0) parts.push(`SI${data.si}`);
    if (data.furniture && data.furniture > 0) parts.push(`${data.furniture}F`);
    if (data.engravings && data.engravings > 0) parts.push(`E${data.engravings}`);
    return parts.length > 0 ? parts.join(' ') : '-';
};


const RoadmapPage: React.FC<RoadmapPageProps> = ({ navigate, database, settings }) => {
    const [playerData, setPlayerData] = useLocalStorage<PlayerData>('player-hero-data', {});
    const [priorities] = useLocalStorage<Record<string, FurniturePriority>>('furniture-priority-data', {});
    
    const [isLoading, setIsLoading] = useState(database.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [disappearingKeys, setDisappearingKeys] = useState<Set<string>>(new Set());

    // State for acquisition flow
    const [heroToAcquire, setHeroToAcquire] = useState<PriorityHero | null>(null);
    
    // State for editing flow
    const [watchlistBeforeEdit, setWatchlistBeforeEdit] = useState<(string | null)[] | null>(null);
    const [heroToEdit, setHeroToEdit] = useState<{ hero: PriorityHero, goalType: string } | null>(null);
    const [editedHeroBuilds, setEditedHeroBuilds] = useState<PriorityHero[]>([]);
    
    // State for Watchlist
    const [watchlistSlots, setWatchlistSlots] = useLocalStorage<(string | null)[]>('watchlist-slots', Array(5).fill(null));
    const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
    const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
    
    const getInvestmentKey = useCallback((hero: PriorityHero) => `${hero.originalName}-${hero.requiredSI}-${hero.requiredFurniture}-${hero.requiredEngravings}`, []);

    const prioritySort = useCallback((a: PriorityHero, b: PriorityHero): number => {
        const groupA = GROUP_ORDER[a.group] || 99;
        const groupB = GROUP_ORDER[b.group] || 99;
        if (groupA !== groupB) return groupA - groupB;
        if (a.isAlternative !== b.isAlternative) return a.isAlternative ? 1 : -1;
        if (b.score !== a.score) return b.score - a.score;
        if (a.isAlternative) {
            if (a.requiredSI !== b.requiredSI) return a.requiredSI - b.requiredSI;
            if (a.requiredFurniture !== b.requiredFurniture) return a.requiredFurniture - b.requiredFurniture;
            if (a.requiredEngravings !== b.requiredEngravings) return a.requiredEngravings - b.requiredEngravings;
        }
        return 0;
    }, []);

    const priorityHeroes = useMemo(() => {
        setIsLoading(true);
        const heroes = database.flatMap(dbEntry => 
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
        setIsLoading(false);
        return heroes;
    }, [database]);

    const rankingHeroes = useMemo(() => {
        return database.map(dbEntry => ({
            faction: dbEntry.faction,
            name: dbEntry.spanishName,
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
    
    const uniquePriorityHeroes = useMemo(() => Array.from(new Map(priorityHeroes.map(h => [h.originalName, h])).values()), [priorityHeroes]);

    const maxInvestmentMap = useMemo(() => {
        const map = new Map<string, { si: number, furniture: number, engravings: number }>();
        priorityHeroes.forEach(hero => {
            const currentMax = map.get(hero.originalName) || { si: 0, furniture: 0, engravings: 0 };
            map.set(hero.originalName, {
                si: Math.max(currentMax.si, hero.requiredSI),
                furniture: Math.max(currentMax.furniture, hero.requiredFurniture),
                engravings: Math.max(currentMax.engravings, hero.requiredEngravings),
            });
        });
        return map;
    }, [priorityHeroes]);
    
    const acquisitionAwakened = useMemo(() => uniquePriorityHeroes.filter((h: PriorityHero) => !playerData[h.originalName]?.owned && h.isAwakened).sort((a: PriorityHero, b: PriorityHero) => b.score - a.score).slice(0, 5), [uniquePriorityHeroes, playerData]);
    const acquisitionCelHypo = useMemo(() => uniquePriorityHeroes.filter((h: PriorityHero) => !playerData[h.originalName]?.owned && (h.faction === 'Celestial' || h.faction === 'Hipogeo') && !h.isAwakened).sort((a: PriorityHero, b: PriorityHero) => b.score - a.score).slice(0, 5), [uniquePriorityHeroes, playerData]);
    const acquisitionDraconis = useMemo(() => uniquePriorityHeroes.filter((h: PriorityHero) => !playerData[h.originalName]?.owned && h.faction === 'Draconis').sort((a: PriorityHero, b: PriorityHero) => b.score - a.score).slice(0, 5), [uniquePriorityHeroes, playerData]);
    const nextSI = useMemo(() => priorityHeroes.filter((h: PriorityHero) => playerData[h.originalName]?.owned && (playerData[h.originalName]?.si ?? 0) < h.requiredSI).sort(prioritySort).slice(0, 5), [priorityHeroes, playerData, prioritySort]);
    const nextFurniture = useMemo(() => priorityHeroes.filter((h: PriorityHero) => playerData[h.originalName]?.owned && (playerData[h.originalName]?.furniture ?? 0) < h.requiredFurniture).sort(prioritySort).slice(0, 5), [priorityHeroes, playerData, prioritySort]);
    const nextEngravings = useMemo(() => priorityHeroes.filter((h: PriorityHero) => playerData[h.originalName]?.owned && (playerData[h.originalName]?.engravings ?? 0) < h.requiredEngravings).sort(prioritySort).slice(0, 5), [priorityHeroes, playerData, prioritySort]);
    const nextT4Armor = useMemo(() => uniquePriorityHeroes.filter((h: PriorityHero) => playerData[h.originalName]?.owned && (playerData[h.originalName]?.armorTier ?? 0) < 4).sort((a: PriorityHero, b: PriorityHero) => b.score - a.score).slice(0, 5), [uniquePriorityHeroes, playerData]);

    const handleAcquireClick = (hero: PriorityHero) => { if (!playerData[hero.originalName]?.owned) setHeroToAcquire(hero); };

    const confirmAcquisition = useCallback(() => {
        if (!heroToAcquire) return;
        setDisappearingKeys(prev => new Set(prev).add(heroToAcquire.originalName));
        setTimeout(() => {
            setPlayerData(prevData => ({ ...prevData, [heroToAcquire.originalName]: { ...(prevData[heroToAcquire.originalName] || { si: 0, furniture: 0, engravings: 0, armorTier: 0 }), owned: true } }));
            setDisappearingKeys(prev => { const newSet = new Set(prev); newSet.delete(heroToAcquire.originalName); return newSet; });
        }, 1600);
        setHeroToAcquire(null);
    }, [heroToAcquire, setPlayerData]);

    const handleInvestmentHeroClick = (hero: PriorityHero, goalType: string) => {
        setHeroToEdit({ hero, goalType });
        setEditedHeroBuilds(priorityHeroes.filter(h => h.originalName === hero.originalName).sort(prioritySort));
        setWatchlistBeforeEdit(watchlistSlots);
    };

    const handleCloseEditModal = () => {
        if (watchlistBeforeEdit) {
            setWatchlistSlots(watchlistBeforeEdit);
        }
        setHeroToEdit(null);
        setWatchlistBeforeEdit(null);
    };

    const handleSaveEdit = useCallback((heroName: string, newData: PlayerHeroData) => {
        const originalData = playerData[heroName] || { si: 0, furniture: 0, engravings: 0, armorTier: 0, owned: true };
        const keysToDisappear = new Set<string>();
        const isNewlyCompleted = (req: number, before: number, after: number) => after >= req && before < req;

        nextSI.forEach(h => { if (h.originalName === heroName && isNewlyCompleted(h.requiredSI, originalData.si, newData.si)) keysToDisappear.add(getInvestmentKey(h)); });
        nextFurniture.forEach(h => { if (h.originalName === heroName && isNewlyCompleted(h.requiredFurniture, originalData.furniture, newData.furniture)) keysToDisappear.add(getInvestmentKey(h)); });
        nextEngravings.forEach(h => { if (h.originalName === heroName && isNewlyCompleted(h.requiredEngravings, originalData.engravings, newData.engravings)) keysToDisappear.add(getInvestmentKey(h)); });
        nextT4Armor.forEach(h => { if (h.originalName === heroName && isNewlyCompleted(4, originalData.armorTier ?? 0, newData.armorTier ?? 0)) keysToDisappear.add(h.originalName); });

        if (keysToDisappear.size > 0) {
            setDisappearingKeys(prev => new Set([...prev, ...keysToDisappear]));
            setTimeout(() => {
                setPlayerData(prevData => ({ ...prevData, [heroName]: newData }));
                setDisappearingKeys(prev => { const newSet = new Set(prev); keysToDisappear.forEach(key => newSet.delete(key)); return newSet; });
            }, 1600);
        } else {
            setPlayerData(prevData => ({ ...prevData, [heroName]: newData }));
        }
        setWatchlistBeforeEdit(null); // Commit watchlist changes by clearing the backup
        setHeroToEdit(null); 
    }, [playerData, setPlayerData, getInvestmentKey, nextSI, nextFurniture, nextEngravings, nextT4Armor]);

    const tierMap = useMemo(() => new Map(rankingHeroes.map(hero => [hero.originalName, hero.tier])), [rankingHeroes]);

    // --- Watchlist Logic ---
    useEffect(() => {
        const completedWatchedHeroes = watchlistSlots.filter(name => {
            if (!name) return false;
            const pData = playerData[name];
            if (!pData) return false;
            const maxInv = maxInvestmentMap.get(name);
            if (!maxInv) return false;
            const siProg = maxInv.si > 0 ? Math.min(pData.si / maxInv.si, 1) : 1;
            const furnProg = maxInv.furniture > 0 ? Math.min(pData.furniture / maxInv.furniture, 1) : 1;
            const engProg = maxInv.engravings > 0 ? Math.min(pData.engravings / maxInv.engravings, 1) : 1;
            const progress = ((siProg + furnProg + engProg) / 3) * 100;
            return progress >= 100;
        });
        if (completedWatchedHeroes.length > 0) {
            setWatchlistSlots(prev => prev.map(name => completedWatchedHeroes.includes(name!) ? null : name));
        }
    }, [playerData, watchlistSlots, setWatchlistSlots, maxInvestmentMap]);

    const handlePlaceholderClick = (index: number) => { setActiveSlotIndex(index); setIsWatchlistModalOpen(true); };
    const handleSelectHeroForWatchlist = (heroOriginalName: string) => {
        if (activeSlotIndex !== null) {
            setWatchlistSlots(prev => { 
                const newSlots = [...prev]; 
                newSlots[activeSlotIndex] = heroOriginalName; 
                return newSlots; 
            });
        }
        setIsWatchlistModalOpen(false); 
        setActiveSlotIndex(null);
    };
    const handleRemoveFromWatchlist = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setWatchlistSlots(prev => { const newSlots = [...prev]; newSlots[index] = null; return newSlots; });
    };

    if (isLoading) return <div className="text-center py-20"><LoadingSpinner className="h-12 w-12 mx-auto text-red-500" /><p className="mt-4 text-lg">Calculando tu hoja de ruta...</p></div>;
    if (error) return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6">{error}</div>;

    return (
        <div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700/80 mb-6">
                <h1 className="text-2xl font-bold">Hoja de Ruta Personalizada</h1>
                <p className="text-sm text-gray-400 mt-1">Tu guía de próximos pasos, generada a partir de los datos de expertos y tu progreso actual.</p>
            </div>
            <div className="space-y-8">
                <SectionCard title="Watchlist">
                    <p className="text-gray-400 -mt-4 mb-4 text-sm">Ancla aquí a los héroes en los que te estás centrando para un seguimiento fácil. Se eliminarán automáticamente al alcanzar el 100% de su build recomendada.</p>
                    <div className="flex flex-wrap justify-center md:flex-nowrap gap-4 overflow-x-auto pb-3 -mx-4 px-4">
                        {watchlistSlots.map((heroName, index) => {
                            if (heroName) {
                                const hero = uniquePriorityHeroes.find(h => h.originalName === heroName);
                                if (hero) {
                                    const pData = playerData[heroName];
                                    const maxInv = maxInvestmentMap.get(heroName);
                                    let progressPercentage = 0;
                                    if (pData && maxInv) {
                                        const siProg = maxInv.si > 0 ? Math.min(pData.si / maxInv.si, 1) : 1;
                                        const furnProg = maxInv.furniture > 0 ? Math.min(pData.furniture / maxInv.furniture, 1) : 1;
                                        const engProg = maxInv.engravings > 0 ? Math.min(pData.engravings / maxInv.engravings, 1) : 1;
                                        progressPercentage = ((siProg + furnProg + engProg) / 3) * 100;
                                    }
                                    const subText = {
                                        from: formatBuild(pData),
                                        to: formatBuild(maxInv),
                                    };
                                    return (
                                        <HeroCard
                                            key={`${heroName}-${index}`}
                                            hero={hero}
                                            tier={tierMap.get(heroName) || 'N/A'}
                                            isDisappearing={false}
                                            onRemove={(e) => handleRemoveFromWatchlist(e, index)}
                                            onClick={() => handleInvestmentHeroClick(hero, 'watchlist')}
                                            progress={progressPercentage}
                                            subText={subText}
                                        />
                                    );
                                }
                            }
                            return (
                                <div key={`placeholder-${index}`} onClick={() => handlePlaceholderClick(index)} className="bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg w-44 h-[188px] flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-gray-700/50 hover:border-red-500 transition-all">
                                    <i className="fas fa-plus text-gray-500 text-4xl"></i>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
                <SectionCard title="Prioridad invocaciones">
                     <HeroRow key="acq-awakened" title="Próximos Héroes Despertados" heroes={acquisitionAwakened} tierMap={tierMap} emptyText="¡Felicidades! Tienes todos los Héroes Despertados recomendados." onHeroClick={handleAcquireClick} disappearingKeys={disappearingKeys} isAwakenedRow={true} />
                     <HeroRow key="acq-celhypo" title="Próximos Celestiales / Hipogeos" heroes={acquisitionCelHypo} tierMap={tierMap} emptyText="¡Felicidades! Tienes todos los Celestiales e Hipogeos recomendados." onHeroClick={handleAcquireClick} disappearingKeys={disappearingKeys} />
                     <HeroRow key="acq-draconis" title="Próximos Draconis" heroes={acquisitionDraconis} tierMap={tierMap} emptyText="¡Felicidades! Tienes todos los Draconis recomendados." onHeroClick={handleAcquireClick} disappearingKeys={disappearingKeys} />
                </SectionCard>
                <SectionCard title="Prioridad gasto en recursos">
                     <HeroRow key="inv-si" title="Próximos Artículos de Firma (SI)" heroes={nextSI} tierMap={tierMap} emptyText="No hay recomendaciones de SI por ahora." subTextGenerator={h => ({ from: `SI${playerData[h.originalName]?.si ?? 0}`, to: `SI${h.requiredSI}`})} onHeroClick={(hero) => handleInvestmentHeroClick(hero, 'si')} disappearingKeys={disappearingKeys} getDisappearingKey={getInvestmentKey} showRank={true} />
                     <HeroRow key="inv-f" title="Próximos Muebles (F)" heroes={nextFurniture} tierMap={tierMap} emptyText="No hay recomendaciones de muebles por ahora." subTextGenerator={h => ({ from: `${playerData[h.originalName]?.furniture ?? 0}F`, to: `${h.requiredFurniture}F`})} onHeroClick={(hero) => handleInvestmentHeroClick(hero, 'f')} disappearingKeys={disappearingKeys} getDisappearingKey={getInvestmentKey} showRank={true} />
                     <HeroRow key="inv-e" title="Próximos Grabados (E)" heroes={nextEngravings} tierMap={tierMap} emptyText="No hay recomendaciones de Grabado por ahora." subTextGenerator={h => ({ from: `E${playerData[h.originalName]?.engravings ?? 0}`, to: `E${h.requiredEngravings}`})} onHeroClick={(hero) => handleInvestmentHeroClick(hero, 'e')} disappearingKeys={disappearingKeys} getDisappearingKey={getInvestmentKey} showRank={true} />
                     <HeroRow key="inv-t4" title="Próximas Armaduras (T4)" heroes={nextT4Armor} tierMap={tierMap} emptyText="¡Felicidades! Todos tus héroes prioritarios tienen armadura T4." subTextGenerator={h => ({ from: `T${playerData[h.originalName]?.armorTier ?? 0}`, to: 'T4'})} onHeroClick={(hero) => handleInvestmentHeroClick(hero, 't4')} disappearingKeys={disappearingKeys} getDisappearingKey={h => h.originalName} showRank={true} />
                </SectionCard>
            </div>

            <ConfirmationModal isOpen={!!heroToAcquire} onClose={() => setHeroToAcquire(null)} onConfirm={confirmAcquisition} title="Confirmar Adquisición de Héroe">
                <p>¿Estás seguro de que quieres marcar a <span className="font-bold text-white">{heroToAcquire?.name}</span> como adquirido?</p>
                <p className="mt-2 text-sm text-gray-400">Esta acción lo eliminará de esta lista. Podrás gestionar su progreso en la página de Edición de Roster.</p>
            </ConfirmationModal>
            
            <HeroBuildModal
                isOpen={!!heroToEdit}
                onClose={handleCloseEditModal}
                onSave={handleSaveEdit}
                hero={heroToEdit?.hero ?? null}
                playerData={heroToEdit ? playerData[heroToEdit.hero.originalName] : null}
                recommendedBuilds={editedHeroBuilds}
                maxInvestment={heroToEdit ? maxInvestmentMap.get(heroToEdit.hero.originalName) ?? null : null}
                watchlistSlots={watchlistSlots}
                setWatchlistSlots={setWatchlistSlots}
                allHeroes={priorityHeroes}
                tierMap={tierMap}
                navigate={navigate}
                priorities={priorities}
            />
             <WatchlistModal 
                isOpen={isWatchlistModalOpen} 
                onClose={() => setIsWatchlistModalOpen(false)} 
                onSelect={handleSelectHeroForWatchlist} 
                priorityHeroes={priorityHeroes} 
                playerData={playerData} 
                tierMap={tierMap} 
                maxInvestmentMap={maxInvestmentMap} 
                currentWatchlist={watchlistSlots} 
            />
            <WatchlistReplaceModal
                isOpen={isWatchlistModalOpen && watchlistSlots.every(s => s !== null)}
                onClose={() => setIsWatchlistModalOpen(false)}
                onReplace={(indexToReplace) => {
                    if (activeSlotIndex !== null) {
                         setWatchlistSlots(prev => {
                            const newSlots = [...prev];
                            newSlots[indexToReplace] = uniquePriorityHeroes.find(h => h.originalName === watchlistSlots[activeSlotIndex!])?.originalName ?? null;
                            return newSlots;
                        });
                    }
                }}
                currentHeroes={watchlistSlots.map(name => name ? uniquePriorityHeroes.find(h => h.originalName === name) : undefined)}
                tierMap={tierMap}
            />
        </div>
    );
};

export default RoadmapPage;