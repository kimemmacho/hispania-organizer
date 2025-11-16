
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
// FIX: Add `FurniturePriority` to the import to correctly type the `priorities` state.
import { PriorityHero, PlayerData, Hero, PlayerHeroData, Settings, Page, FurniturePriority } from '../types';
import HeroPortrait from './HeroPortrait';
import { GROUP_ORDER, DEFAULT_SHEET_URL } from '../constants';
import { CloseIcon } from './icons';
import { HeroCard } from './HeroCard';
import HeroBuildModal from './HeroBuildModal';

const getProgressBarClass = (percentage: number): string => {
    if (percentage >= 100) return 'bg-gradient-to-r from-teal-400 to-cyan-500';
    if (percentage > 75) return 'bg-gradient-to-r from-lime-400 to-green-500';
    if (percentage > 40) return 'bg-gradient-to-r from-yellow-400 to-amber-500';
    return 'bg-gradient-to-r from-orange-500 to-red-600';
};

// --- Sub-components for Edit Modal ---

interface T4OptimizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    heroes: PriorityHero[];
    ignoredHeroes: PriorityHero[];
    tierMap: Map<string, string>;
    onEdit: (hero: PriorityHero) => void;
    onIgnore: (e: React.MouseEvent, hero: PriorityHero) => void;
    onUnignore: (e: React.MouseEvent, hero: PriorityHero) => void;
}

const T4OptimizationModal: React.FC<T4OptimizationModalProps> = ({ isOpen, onClose, heroes, ignoredHeroes, tierMap, onEdit, onIgnore, onUnignore }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60] transition-opacity duration-300 ease-out animate-[fade-in_0.3s_ease-out]"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl text-left overflow-hidden transform transition-all duration-300 ease-out w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Héroes pendientes de Armadura T4</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {heroes.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {heroes.map(h => (
                                <div key={h.originalName} className="relative">
                                    <HeroCard
                                        hero={h}
                                        tier={tierMap.get(h.originalName) || 'N/A'}
                                        onClick={() => onEdit(h)}
                                        isDisappearing={false}
                                    />
                                    <button 
                                        onClick={(e) => onIgnore(e, h)} 
                                        className="absolute top-1 right-1 bg-gray-900/50 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-white transition-colors"
                                        aria-label={`Ignorar recomendaciones para ${h.name}`}
                                        title="Ignorar recomendaciones de armadura T4 para este héroe"
                                    >
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400">No hay héroes que cumplan los criterios para esta recomendación en este momento.</p>
                    )}

                    {ignoredHeroes.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-400 mb-4">Héroes Ignorados</h4>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {ignoredHeroes.map(h => (
                                    <div key={h.originalName} className="relative filter grayscale opacity-70">
                                        <HeroCard
                                            hero={h}
                                            tier={tierMap.get(h.originalName) || 'N/A'}
                                            isDisappearing={false}
                                        />
                                        <button 
                                            onClick={(e) => onUnignore(e, h)} 
                                            className="absolute top-1 right-1 bg-gray-900/50 hover:bg-green-600 rounded-full w-6 h-6 flex items-center justify-center text-white transition-colors"
                                            aria-label={`Restaurar recomendaciones para ${h.name}`}
                                            title="Restaurar recomendaciones de armadura T4 para este héroe"
                                        >
                                           <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Main Widget Component ---
interface TipWidgetProps {
    navigate: (page: Page) => void;
}

type RegularTip = { type: 'regular', hero: PriorityHero; text: string; goal: { from: string, to: string } };
type FinishT4Tip = { type: 'finishT4', text: string; heroes: PriorityHero[] };
type Tip = RegularTip | FinishT4Tip;

const TipWidget: React.FC<TipWidgetProps> = ({ navigate }) => {
    const [settings] = useLocalStorage<Settings>('afk-settings', {
        sheetUrl: DEFAULT_SHEET_URL,
        autoUpdate: true,
        cloudConfigured: false,
        showTips: true,
    });
    const [tip, setTip] = useState<Tip | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasBeenClosed, setHasBeenClosed] = useState(() => sessionStorage.getItem('tipWidgetClosed') === 'true');

    const [priorityHeroes] = useLocalStorage<PriorityHero[]>('priority-heroes-data', []);
    const [playerData, setPlayerData] = useLocalStorage<PlayerData>('player-hero-data', {});
    const [watchlistSlots, setWatchlistSlots] = useLocalStorage<(string | null)[]>('watchlist-slots', Array(5).fill(null));
    const [rankingHeroes] = useLocalStorage<Hero[]>('heroes-data', []);
    const [ignoredTips, setIgnoredTips] = useLocalStorage<Record<string, string[]>>('ignored-tips', {});
    const [priorities] = useLocalStorage<Record<string, FurniturePriority>>('furniture-priority-data', {});
    
    // State for modals
    const [isT4ModalOpen, setIsT4ModalOpen] = useState(false);
    const [heroToEdit, setHeroToEdit] = useState<PriorityHero | null>(null);
    const [editedHeroBuilds, setEditedHeroBuilds] = useState<PriorityHero[]>([]);
    const [watchlistBeforeEdit, setWatchlistBeforeEdit] = useState<(string | null)[] | null>(null);

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

    const tierMap = useMemo(() => new Map(rankingHeroes.map(h => [h.originalName, h.tier])), [rankingHeroes]);

    const calculateFinishT4Heroes = useCallback((currentIgnoredTips: Record<string, string[]>) => {
        const uniquePriorityHeroes = Array.from(new Map(priorityHeroes.map(h => [h.originalName, h])).values());

        return uniquePriorityHeroes.filter(h => {
            const pData = playerData[h.originalName];
            if (!pData || !pData.owned || (pData.armorTier ?? 0) >= 4) return false;
            
            const isIgnored = currentIgnoredTips[h.originalName]?.includes('t4');
            if (isIgnored) return false;

            const tier = tierMap.get(h.originalName);
            if (tier !== 'S' && tier !== 'SS' && tier !== 'SSS') return false;

            const maxInv = maxInvestmentMap.get(h.originalName);
            if (!maxInv) return false;

            return pData.si >= maxInv.si && pData.furniture >= maxInv.furniture && pData.engravings >= maxInv.engravings;
        }).sort((a, b) => b.score - a.score);
    }, [priorityHeroes, playerData, tierMap, maxInvestmentMap]);

    const ignoredT4HeroesList = useMemo(() => {
        const uniquePriorityHeroes = Array.from(new Map(priorityHeroes.map(h => [h.originalName, h])).values());
        return uniquePriorityHeroes.filter(hero => {
            return ignoredTips[hero.originalName]?.includes('t4') && playerData[hero.originalName]?.owned;
        }).sort((a,b) => b.score - a.score);
    }, [priorityHeroes, ignoredTips, playerData]);

    useEffect(() => {
        // Sync with sessionStorage when tips are globally toggled
        if (settings.showTips) {
            setHasBeenClosed(sessionStorage.getItem('tipWidgetClosed') === 'true');
        }
    }, [settings.showTips]);
    
    const findNewTip = useCallback(() => {
        if (isT4ModalOpen || heroToEdit || !settings.showTips) return;
        if (priorityHeroes.length === 0 || Object.keys(playerData).length === 0) {
            setIsVisible(false);
            return;
        }

        const finishT4Heroes = calculateFinishT4Heroes(ignoredTips);
        
        const shouldShowFinishT4Tip = finishT4Heroes.length > 0 && Math.random() < 0.33;

        if (shouldShowFinishT4Tip) {
            const heroNames = finishT4Heroes.map(h => h.name).join(', ');
            const text = `¡Casi perfectos! Considera mejorar la armadura a T4 para estos héroes y desatar todo su poder: ${heroNames}.`;
            setTip({ type: 'finishT4', text, heroes: finishT4Heroes });
            setIsVisible(true);
            return;
        }
        
        const goals = ['si', 'furniture', 'engravings'] as const;
        const randomGoalType = goals[Math.floor(Math.random() * goals.length)];
        
        let targetList: PriorityHero[] = [];
        let goalTextTemplate = "";
        let goalDetails: (hero: PriorityHero) => { from: string, to: string } = () => ({ from: '', to: ''});

        switch (randomGoalType) {
            case 'si':
                targetList = priorityHeroes.filter(h => playerData[h.originalName]?.owned && (playerData[h.originalName]?.si ?? 0) < h.requiredSI).sort(prioritySort);
                goalTextTemplate = "Considera subir el SI de {HERO} a {TO} para completar su build.";
                goalDetails = (h) => ({ from: `SI${playerData[h.originalName]?.si ?? 0}`, to: `SI${h.requiredSI}` });
                break;
            case 'furniture':
                targetList = priorityHeroes.filter(h => playerData[h.originalName]?.owned && (playerData[h.originalName]?.furniture ?? 0) < h.requiredFurniture).sort(prioritySort);
                goalTextTemplate = "¡A por los muebles! Quizas te convenga usar las tarjetas rojas en {HERO} para subirle los muebles a {TO}.";
                goalDetails = (h) => ({ from: `${playerData[h.originalName]?.furniture ?? 0}F`, to: `${h.requiredFurniture}F` });
                break;
            case 'engravings':
                targetList = priorityHeroes.filter(h => playerData[h.originalName]?.owned && (playerData[h.originalName]?.engravings ?? 0) < h.requiredEngravings).sort(prioritySort);
                goalTextTemplate = "Mejora los grabados de {HERO} a {TO} para estar más cerca de completarlo.";
                goalDetails = (h) => ({ from: `E${playerData[h.originalName]?.engravings ?? 0}`, to: `E${h.requiredEngravings}` });
                break;
        }

        if (targetList.length > 0) {
            const bestCandidate = targetList[0];
            if (bestCandidate) {
                const goal = goalDetails(bestCandidate);
                const text = goalTextTemplate.replace('{HERO}', bestCandidate.name).replace('{TO}', goal.to);
                setTip({ type: 'regular', hero: bestCandidate, text, goal });
                setIsVisible(true);
                return;
            }
        }

        // If no tip found
        setTip(null);
        setIsVisible(false);

    }, [isT4ModalOpen, heroToEdit, settings.showTips, priorityHeroes, playerData, calculateFinishT4Heroes, ignoredTips, prioritySort]);

    useEffect(() => {
        if (!tip && !hasBeenClosed && settings.showTips) {
            const timer = setTimeout(findNewTip, 500); // Small delay to let data load
            return () => clearTimeout(timer);
        }
    }, [tip, hasBeenClosed, settings.showTips, findNewTip]);

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
        sessionStorage.setItem('tipWidgetClosed', 'true');
        setHasBeenClosed(true);
    };
    
    const handleRefresh = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        findNewTip();
    }, [findNewTip]);

    const handleEditClick = useCallback((hero: PriorityHero) => {
        setWatchlistBeforeEdit(watchlistSlots);
        setHeroToEdit(hero);
        const allBuilds = priorityHeroes.filter(h => h.originalName === hero.originalName).sort(prioritySort);
        setEditedHeroBuilds(allBuilds);
    }, [priorityHeroes, prioritySort, watchlistSlots]);

    const handleCloseEditModal = () => {
        if (watchlistBeforeEdit) {
            setWatchlistSlots(watchlistBeforeEdit);
        }
        setHeroToEdit(null);
        setWatchlistBeforeEdit(null);
    };

    const handleSaveChanges = (heroName: string, newData: PlayerHeroData) => {
        setPlayerData(prev => ({
            ...prev,
            [heroName]: newData
        }));
        
        // Hide and reset tip logic
        setIsVisible(false);
        setTip(null);
        setHasBeenClosed(false);
        sessionStorage.removeItem('tipWidgetClosed');
        
        setWatchlistBeforeEdit(null); // Commit watchlist changes
        
        // Close any open modals
        setIsT4ModalOpen(false);
        setHeroToEdit(null);
    };
    
    // New direct handlers for the T4 modal, skipping confirmation
    const handleDirectIgnore = (e: React.MouseEvent, heroToIgnore: PriorityHero) => {
        e.stopPropagation();
        const heroName = heroToIgnore.originalName;
        const nextIgnoredTips = { ...ignoredTips };
        const currentIgnores = nextIgnoredTips[heroName] || [];
        nextIgnoredTips[heroName] = Array.from(new Set([...currentIgnores, 't4']));
        setIgnoredTips(nextIgnoredTips);

        const updatedFinishT4Heroes = calculateFinishT4Heroes(nextIgnoredTips);
        if (updatedFinishT4Heroes.length === 0) {
            setIsVisible(false);
            setIsT4ModalOpen(false);
            setTip(null);
        }
    };

    const handleDirectUnignore = (e: React.MouseEvent, heroToUnignore: PriorityHero) => {
        e.stopPropagation();
        const heroName = heroToUnignore.originalName;
        const nextIgnoredTips = { ...ignoredTips };
        const currentIgnores = nextIgnoredTips[heroName] || [];
        const newIgnores = currentIgnores.filter(tipType => tipType !== 't4');
        if (newIgnores.length > 0) {
            nextIgnoredTips[heroName] = newIgnores;
        } else {
            delete nextIgnoredTips[heroName];
        }
        setIgnoredTips(nextIgnoredTips);
    };

    const getResourceColor = (resource: string): string => {
        if (resource.startsWith('SI')) return 'text-cyan-400';
        if (resource.endsWith('F')) return 'text-lime-400';
        if (resource.startsWith('E')) return 'text-yellow-400';
        if (resource.startsWith('T')) {
            const tier = parseInt(resource.substring(1), 10);
            switch (tier) {
                case 1: return 'text-cyan-400';
                case 2: return 'text-violet-400';
                case 3: return 'text-yellow-400';
                case 4: return 'text-red-400';
                default: return 'text-gray-400';
            }
        }
        return 'text-gray-400';
    };

    if (!tip || !isVisible || !settings.showTips) {
        return null;
    }
    
    const renderContent = () => {
        if (tip.type === 'finishT4') {
            const activeT4Heroes = calculateFinishT4Heroes(ignoredTips);

            if (activeT4Heroes.length === 0 && !isT4ModalOpen) {
                setTimeout(() => setIsVisible(false), 0);
                return null;
            }

            return (
                <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 bg-gray-800/95 backdrop-blur-sm border border-yellow-600/50 rounded-lg shadow-2xl p-4 max-w-2xl w-[calc(100%-2rem)] sm:w-full z-40 animate-[slide-in-right_0.5s_ease-out]">
                    <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                        <button
                            onClick={handleRefresh}
                            className="text-gray-500 hover:text-white transition-colors"
                            aria-label="Obtener otro consejo"
                        >
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button 
                            onClick={handleClose} 
                            className="text-gray-500 hover:text-white transition-colors"
                            aria-label="Cerrar consejo"
                        >
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="pt-2">
                        <h4 className="font-bold text-yellow-400 text-sm">Consejo de Optimización ⚙️</h4>
                        <div className="text-white mt-1 text-sm">
                            <p>Mejora la armadura de estos héroes a T4, ya que los tienes maxeados:</p>
                            <p className="text-cyan-400 font-semibold mt-1">{activeT4Heroes.map(h => h.name).join(', ')}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                            {activeT4Heroes.slice(0, 2).map(h => (
                                <div key={h.originalName} className="relative flex-shrink-0">
                                    <HeroCard
                                        hero={h}
                                        tier={tierMap.get(h.originalName) || 'N/A'}
                                        onClick={() => handleEditClick(h)}
                                        isDisappearing={false}
                                    />
                                    <button 
                                        onClick={(e) => handleDirectIgnore(e, h)} 
                                        className="absolute top-1 right-1 bg-gray-900/50 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-white transition-colors"
                                        aria-label={`Ignorar recomendaciones para ${h.name}`}
                                        title="Ignorar recomendaciones de armadura T4 para este héroe"
                                    >
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {(activeT4Heroes.length > 0 || ignoredT4HeroesList.length > 0) && (
                                <button
                                    onClick={() => setIsT4ModalOpen(true)}
                                    className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg w-44 h-[164px] flex-shrink-0 flex flex-col items-center justify-center transition-colors"
                                >
                                    <i className="fas fa-ellipsis-h text-2xl"></i>
                                    <span className="mt-2 text-sm font-semibold">Ver más</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    
        // Regular Tip
        const { hero, text, goal } = tip;
        const tipTextParts = text.split(hero.name);
        return (
            <div 
                className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 bg-gray-800/95 backdrop-blur-sm border border-red-700/50 rounded-lg shadow-2xl p-4 max-w-xs sm:max-w-sm w-[calc(100%-2rem)] sm:w-full z-40 animate-[slide-in-right_0.5s_ease-out]"
            >
                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                     <button
                        onClick={handleRefresh}
                        className="text-gray-500 hover:text-white transition-colors"
                        aria-label="Obtener otro consejo"
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                    <button 
                        onClick={handleClose}
                        className="text-gray-500 hover:text-white transition-colors"
                        aria-label="Cerrar consejo"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                <div onClick={() => handleEditClick(hero)} className="flex items-start gap-4 pt-2 cursor-pointer">
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center border-2 border-red-600 overflow-hidden">
                            <HeroPortrait heroName={hero.name} className="h-full w-full" />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-red-400 text-sm">Consejo Rápido 💡</h4>
                        <p className="text-white mt-1 text-sm">
                            {tipTextParts.map((part, index) => (
                                <React.Fragment key={index}>
                                    {part}
                                    {index < tipTextParts.length - 1 && (
                                        <span className="font-bold text-cyan-400">{hero.name}</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="text-gray-400">Progreso:</span>
                            <span className={`font-bold ${getResourceColor(goal.from)}`}>{goal.from}</span>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className={`font-bold ${getResourceColor(goal.to)}`}>{goal.to}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            
            {tip?.type === 'finishT4' && (
                <T4OptimizationModal 
                    isOpen={isT4ModalOpen}
                    onClose={() => setIsT4ModalOpen(false)}
                    heroes={calculateFinishT4Heroes(ignoredTips)}
                    ignoredHeroes={ignoredT4HeroesList}
                    tierMap={tierMap}
                    onEdit={handleEditClick}
                    onIgnore={handleDirectIgnore}
                    onUnignore={handleDirectUnignore}
                />
            )}

            <HeroBuildModal
                isOpen={!!heroToEdit}
                onClose={handleCloseEditModal}
                onSave={handleSaveChanges}
                hero={heroToEdit}
                playerData={heroToEdit ? playerData[heroToEdit.originalName] : null}
                recommendedBuilds={editedHeroBuilds}
                maxInvestment={heroToEdit ? maxInvestmentMap.get(heroToEdit.originalName) ?? null : null}
                watchlistSlots={watchlistSlots}
                setWatchlistSlots={setWatchlistSlots}
                allHeroes={priorityHeroes}
                tierMap={tierMap}
                navigate={navigate}
                priorities={priorities}
            />
             <style>
                {`
                    @keyframes slide-in-right {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes fade-in {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                     @keyframes slide-up {
                        from { transform: translateY(2rem) scale(0.95); opacity: 0; }
                        to { transform: translateY(0) scale(1); opacity: 1; }
                    }
                `}
            </style>
        </>
    );
};

export default TipWidget;
