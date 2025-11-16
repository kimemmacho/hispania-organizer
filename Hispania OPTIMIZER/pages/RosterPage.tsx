





import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { PriorityHero, PlayerData, PlayerHeroData, Settings, Page, FurniturePriority, HeroDatabaseEntry } from '../types';
import { DEFAULT_SHEET_URL, GROUP_ORDER } from '../constants';
import { LoadingSpinner, CloseIcon } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';
import HeroPortrait from '../components/HeroPortrait';
import { HeroCard } from '../components/HeroCard';
import HeroBuildModal from '../components/HeroBuildModal';


type HeroWithPower = PriorityHero & { power: number; pData: PlayerHeroData; progressPercentage: number; };

// --- CONSTANTS ---
const ARMOR_TIER_STYLES = [
    { tier: 1, label: 'T1', style: 'bg-cyan-500 text-white' },
    { tier: 2, label: 'T2', style: 'bg-violet-500 text-white' },
    { tier: 3, label: 'T3', style: 'bg-yellow-500 text-black' },
    { tier: 4, label: 'T4', style: 'bg-red-600 text-white' },
];

type SortKey = 'power' | 'score' | 'progressPercentage';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const SORT_OPTIONS: { [key in SortKey]: { label: string; icon: string } } = {
    power: { label: 'Poder', icon: 'fas fa-bolt' },
    score: { label: 'Puntuación', icon: 'fas fa-trophy' },
    progressPercentage: { label: 'Progreso', icon: 'fas fa-percent' },
};


// --- HELPER & SUB-COMPONENTS ---

// Faction Icon helper
const FactionIcon: React.FC<{ faction: string }> = ({ faction }) => {
    if (faction === 'Desconocida') {
        return <div className="h-6 w-6 flex items-center justify-center bg-gray-700 rounded-full text-sm font-bold text-gray-400 flex-shrink-0" title="Facción Desconocida">?</div>;
    }
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    const iconUrl = `${baseUrl}${iconFileName}.png`;
    return <img src={iconUrl} alt={faction} title={faction} className="h-6 w-6 flex-shrink-0" />;
};

// Tier Border helper
const getTierBorderClass = (tier: string): string => {
    switch (tier) {
        case 'SSS': return 'border-blue-400';
        case 'SS': return 'border-green-500';
        case 'S': return 'border-lime-300';
        case 'A': return 'border-yellow-300';
        case 'B': return 'border-orange-400';
        case 'C': return 'border-red-500';
        case 'D': return 'border-amber-700';
        default: return 'border-gray-600';
    }
};

const getProgressBarClass = (percentage: number): string => {
    if (percentage >= 100) return 'bg-gradient-to-r from-teal-400 to-cyan-500';
    if (percentage > 75) return 'bg-gradient-to-r from-lime-400 to-green-500';
    if (percentage > 40) return 'bg-gradient-to-r from-yellow-400 to-amber-500';
    return 'bg-gradient-to-r from-orange-500 to-red-600';
};

const getPowerClass = (power: number): string => {
    if (power >= 200) return 'text-sky-200 silver-power-glow';
    if (power >= 150) return 'text-red-400 red-power-glow';
    if (power >= 100) return 'text-yellow-400';
    return 'text-white';
};

// Tier Badge helper
const TierBadge: React.FC<{ tier: string }> = ({ tier }) => {
    const getTierStyling = (t: string): { textClass: string; bgClass: string } => {
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
    const { textClass, bgClass } = getTierStyling(tier);
    return (
        <div className={`relative inline-block transform -skew-x-12 ${bgClass} px-2 py-0.5 shadow-sm`}>
            <span className={`block transform skew-x-12 text-center text-xs font-bold tracking-wider ${textClass}`}>
                {tier}
            </span>
        </div>
    );
};


// Component to display current player investment and armor tier
const PlayerInvestmentDisplay: React.FC<{ data: PlayerHeroData | undefined }> = ({ data }) => {
    const { si = 0, furniture = 0, engravings = 0 } = data || {};

    const investmentParts = [
        si > 0 && { key: 'si', className: 'text-cyan-400', text: `SI${si}` },
        furniture > 0 && { key: 'f', className: 'text-lime-400', text: `${furniture}F` },
        engravings > 0 && { key: 'e', className: 'text-yellow-400', text: `E${engravings}` }
    ].filter(Boolean) as { key: string, className: string, text: string }[];
    
    if (investmentParts.length === 0) {
        return <div className="text-2xl font-bold font-mono text-gray-600">-</div>;
    }

    return (
        <div className="flex items-baseline justify-center gap-2 text-2xl font-bold font-mono">
            {investmentParts.map(part => <span key={part.key} className={part.className}>{part.text}</span>) }
        </div>
    );
};

const ArmorTierBadge: React.FC<{ tier: number }> = ({ tier }) => {
    if (!tier || tier === 0) return null;
    const tierInfo = ARMOR_TIER_STYLES.find(t => t.tier === tier);
    if (!tierInfo) return null;

    return (
        <div className={`px-2.5 py-1 text-xs font-bold rounded-md ${tierInfo.style}`}>
            {tierInfo.label}
        </div>
    );
};

// ValueSelector copied from PriorityTable for reuse in the modal
interface ValueSelectorProps {
    value: number;
    onChange: (value: number) => void;
    options: number[];
    allowManualInput?: boolean;
    disabled?: boolean;
}
const ValueSelector: React.FC<ValueSelectorProps> = ({ value, onChange, options, allowManualInput = false, disabled = false }) => {
    return (
        <div className={`flex flex-col items-center space-y-2 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap justify-center gap-1">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        disabled={disabled}
                        className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors w-9 ${
                            value === opt
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        } ${disabled ? 'cursor-not-allowed' : ''}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
            {allowManualInput && (
                 <input
                    type="number"
                    value={value}
                    disabled={disabled}
                    onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
                    className={`w-20 bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 text-center ${disabled ? 'cursor-not-allowed' : ''}`}
                    min="0"
                    step="1"
                />
            )}
        </div>
    );
};


// The new Roster Hero Card component
const RosterHeroCard: React.FC<{
    hero: HeroWithPower,
    onSelect: (hero: HeroWithPower) => void,
    isBulkEditMode: boolean,
    isSelectedForBulk: boolean,
    onToggleSelection: (originalName: string) => void
}> = ({ hero, onSelect, isBulkEditMode, isSelectedForBulk, onToggleSelection }) => {
    
    const handleClick = () => {
        if (isBulkEditMode) {
            onToggleSelection(hero.originalName);
        } else {
            onSelect(hero);
        }
    };

    return (
        <div 
            onClick={handleClick}
            className={`group bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-xl border flex items-center gap-3 transition-all duration-300 relative ${!hero.pData.owned ? 'filter grayscale opacity-60' : ''} ${
                isSelectedForBulk 
                ? 'border-blue-500 shadow-[0_0_25px_5px_rgba(59,130,246,0.4)]' 
                : 'border-gray-700/80 hover:border-red-600/60 hover:shadow-[0_0_25px_5px_rgba(239,68,68,0.4)] cursor-pointer'
            }`}
        >
            {isBulkEditMode && (
                <div className="absolute top-3 left-3 z-20">
                    <input
                        type="checkbox"
                        className="h-5 w-5 bg-gray-700 border-gray-500 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        checked={isSelectedForBulk}
                        onChange={() => onToggleSelection(hero.originalName)}
                    />
                </div>
            )}
            <div className={`w-20 h-20 bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center border-4 ${getTierBorderClass(hero.group)} overflow-hidden shadow-inner`}>
                <HeroPortrait heroName={hero.name} className="h-full w-full" />
            </div>

            <div className="flex-grow flex flex-col justify-between self-stretch gap-1 w-full overflow-hidden">
                <div className="flex items-center gap-2">
                    <FactionIcon faction={hero.faction} />
                    <h3 className={`text-lg font-bold truncate ${hero.isNameTranslated ? 'text-white' : 'text-red-400'}`}>{hero.name}</h3>
                </div>
                
                <div className="flex items-center gap-2 w-full">
                    <TierBadge tier={hero.group} />
                    <div className="w-full bg-gray-900/70 shadow-inner ring-1 ring-black/20 rounded-full h-4 relative overflow-hidden flex-grow">
                        <div 
                            className={`h-4 rounded-full transition-all duration-500 ${getProgressBarClass(hero.progressPercentage)}`} 
                            style={{ width: `${Math.min(hero.progressPercentage, 100).toFixed(1)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-dark">
                            {hero.progressPercentage.toFixed(1)}%
                        </span>
                    </div>
                </div>

                <div className="relative flex justify-center items-center w-full my-1">
                    <PlayerInvestmentDisplay data={hero.pData} />
                    <div className="absolute right-0">
                        <ArmorTierBadge tier={hero.pData.armorTier ?? 0} />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 items-center w-full text-xs text-gray-400 border-t border-gray-700/50 pt-1">
                    <div className="text-left">
                        <span className="text-gray-400">Puntuación: </span>
                        <span className="text-xl font-bold text-cyan-400">
                            {hero.score.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">({((hero.score / 7) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="text-right">
                        <span className="text-gray-400">Poder: </span>
                        <span className={`text-xl font-bold ${getPowerClass(hero.power)}`}>
                            {hero.power.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 ease-out animate-[fade-in_0.3s_ease-out]"
            aria-modal="true"
            role="dialog"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700/80 text-left overflow-hidden transform transition-all duration-300 ease-out w-full max-w-lg mx-4 animate-[slide-up_0.4s_ease-out]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-800">
                            <i className="fas fa-lightbulb text-xl text-red-300"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Glosario de Métricas</h2>
                        </div>
                    </div>
                    <div className="mt-6 space-y-4 text-gray-300">
                        <div>
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <i className="fas fa-bolt text-yellow-400 w-4 text-center"></i> Poder
                            </h3>
                            <p className="mt-1 pl-7 border-l-2 border-gray-700 ml-2">
                                El Poder es un índice que representa la inversión total en un héroe. Se calcula promediando el progreso en SI, Muebles y Grabados. Un <strong>100%</strong> corresponde a una inversión de <strong>309e60</strong>. Valores superiores indican inversiones adicionales (ej. SI+40, E80).
                            </p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <i className="fas fa-trophy text-cyan-400 w-4 text-center"></i> Puntuación
                            </h3>
                            <p className="mt-1 pl-7 border-l-2 border-gray-700 ml-2">
                                La Puntuación se basa en la hoja de cálculo de la comunidad rusa. Refleja la utilidad general del héroe en diversos modos de juego (Campaña, Torre, PvP, etc.). Una puntuación más alta indica un héroe más versátil y poderoso.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <i className="fas fa-percent text-lime-400 w-4 text-center"></i> Progreso
                            </h3>
                            <p className="mt-1 pl-7 border-l-2 border-gray-700 ml-2">
                                El Progreso mide qué tan cerca estás de completar la inversión máxima recomendada para un héroe según la hoja de cálculo. Un <strong>100%</strong> significa que has alcanzado o superado todas las metas sugeridas para ese personaje.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 px-6 py-4 text-right">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-600 shadow-sm px-5 py-2.5 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600">
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
interface BulkFormStateValue {
    apply: boolean;
    value: number;
}
interface BulkFormState {
    si: BulkFormStateValue;
    furniture: BulkFormStateValue;
    engravings: BulkFormStateValue;
    armorTier: BulkFormStateValue;
}

interface RosterPageProps {
    navigate: (page: Page) => void;
    database: HeroDatabaseEntry[];
    setDatabase: React.Dispatch<React.SetStateAction<HeroDatabaseEntry[]>>;
    onSync: (force?: boolean) => Promise<void>;
    isSyncing: boolean;
    lastSync: string | null;
    settings: Settings;
}

const RosterPage: React.FC<RosterPageProps> = ({ navigate, database, onSync, isSyncing, lastSync }) => {
    const [playerData, setPlayerData] = useLocalStorage<PlayerData>('player-hero-data', {});
    const [priorities] = useLocalStorage<Record<string, FurniturePriority>>('furniture-priority-data', {});
    const [watchlistSlots, setWatchlistSlots] = useLocalStorage<(string | null)[]>('watchlist-slots', Array(5).fill(null));
    
    const [error, setError] = useState<string | null>(null);
    const [selectedHero, setSelectedHero] = useState<PriorityHero | null>(null);
    const [selectedHeroBuilds, setSelectedHeroBuilds] = useState<PriorityHero[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);


    // State for filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFactions, setSelectedFactions] = useState(new Set<string>());
    const [showAwakenedOnly, setShowAwakenedOnly] = useState(false);
    const [hideNotOwned, setHideNotOwned] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [armorFilterTier, setArmorFilterTier] = useState<number | null>(null);

    // State for sorting
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'power', direction: 'desc' });
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const sortMenuRef = useRef<HTMLDivElement>(null);


    // State for bulk editing
    const [isBulkEditMode, setIsBulkEditMode] = useState(false);
    const [bulkEditSelection, setBulkEditSelection] = useState<Set<string>>(new Set());
    const [isConfirmingBulkEdit, setIsConfirmingBulkEdit] = useState(false);
    const [bulkFormState, setBulkFormState] = useState<BulkFormState>({
        si: { apply: false, value: 0 },
        furniture: { apply: false, value: 0 },
        engravings: { apply: false, value: 0 },
        armorTier: { apply: false, value: 0 },
    });

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
        const handleClickOutside = (event: MouseEvent) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
                setIsSortMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const uniqueHeroes = useMemo(() => {
        const uniqueMap = new Map<string, PriorityHero>();
        priorityHeroes.forEach(hero => {
            if (!uniqueMap.has(hero.originalName)) {
                uniqueMap.set(hero.originalName, hero);
            }
        });
        return Array.from(uniqueMap.values());
    }, [priorityHeroes]);
    
    const tierMap = useMemo(() => {
        const map = new Map<string, string>();
        uniqueHeroes.forEach(hero => map.set(hero.originalName, hero.group));
        return map;
    }, [uniqueHeroes]);

    const handleHeroSelect = useCallback((hero: HeroWithPower) => {
        const allBuilds = priorityHeroes
            .filter(h => h.originalName === hero.originalName)
            .sort(prioritySort);

        setSelectedHero(hero);
        setSelectedHeroBuilds(allBuilds);
        setIsEditModalOpen(true);
    }, [priorityHeroes, prioritySort]);

    useEffect(() => {
        const heroNameToSelect = sessionStorage.getItem('selected-roster-hero');
        if (heroNameToSelect && uniqueHeroes.length > 0) {
            const hero = uniqueHeroes.find(h => h.originalName === heroNameToSelect);
            if (hero) {
                // FIX: Ensure pData is not undefined, which fixes a type error when calling handleHeroSelect.
                const pData = playerData[hero.originalName] || { owned: true, si: 0, furniture: 0, engravings: 0, armorTier: 0 };
                // We need to simulate the full click to get all builds
                handleHeroSelect({ ...hero, power: 0, pData, progressPercentage: 0 });
            }
            sessionStorage.removeItem('selected-roster-hero');
        }
    }, [uniqueHeroes, playerData, handleHeroSelect]); // Added handleHeroSelect and playerData dependencies

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

    const allFactions = useMemo(() => {
        if (!uniqueHeroes || uniqueHeroes.length === 0) return [];
        const factionOrder = ['Celestial', 'Hipogeo', 'Dimensional', 'Draconis', 'Lightbearer', 'Mauler', 'Wilder', 'Graveborn', 'Desconocida'];
        const factions = new Set(uniqueHeroes.map(hero => hero.faction));
        return Array.from(factions).sort((a, b) => {
            const indexA = factionOrder.indexOf(a), indexB = factionOrder.indexOf(b);
            if (indexA === -1) return 1; if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [uniqueHeroes]);

    const handleFactionToggle = (faction: string) => {
        setSelectedFactions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(faction)) newSet.delete(faction);
            else newSet.add(faction);
            return newSet;
        });
    };
    
    const handleArmorFilterToggle = (tier: number) => setArmorFilterTier(prev => (prev === tier ? null : tier));
    const isAllSelected = selectedFactions.size === 0 && !showAwakenedOnly;

    const heroesWithPower = useMemo(() => {
        let heroesToFilter = uniqueHeroes;

        if (showAwakenedOnly) heroesToFilter = heroesToFilter.filter(hero => hero.isAwakened);
        if (selectedFactions.size > 0) heroesToFilter = heroesToFilter.filter(hero => hero.faction && selectedFactions.has(hero.faction));
        if (hideNotOwned) heroesToFilter = heroesToFilter.filter(hero => playerData[hero.originalName]?.owned !== false);
        if (armorFilterTier !== null) heroesToFilter = heroesToFilter.filter(hero => (playerData[hero.originalName]?.armorTier ?? 0) < armorFilterTier);
        if (searchQuery.trim() !== '') heroesToFilter = heroesToFilter.filter(hero => hero.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
        
        const heroesWithCalculatedPower = heroesToFilter.map(hero => {
            const pData = playerData[hero.originalName] || { si: 0, furniture: 0, engravings: 0, owned: true, armorTier: 0 };
            let siPower = pData.si <= 30 ? (pData.si / 30) * 100 : 100 + ((pData.si - 30) / 10) * 100;
            let furniturePower = pData.furniture <= 9 ? (pData.furniture / 9) * 100 : 100 + ((pData.furniture - 9) / 27) * 200;
            let engravingsPower = pData.engravings <= 60 ? (pData.engravings / 60) * 100 : 100 + ((pData.engravings - 60) / 20) * 100;
            const power = pData.owned ? (Math.min(siPower, 200) + Math.min(furniturePower, 300) + Math.min(engravingsPower, 200)) / 3 : 0;

            const targetInvestment = maxInvestmentMap.get(hero.originalName) || { si: 0, furniture: 0, engravings: 0 };
            const siProgress = targetInvestment.si > 0 ? Math.min(pData.si / targetInvestment.si, 1) : 1;
            const furnProgress = targetInvestment.furniture > 0 ? Math.min(pData.furniture / targetInvestment.furniture, 1) : 1;
            const engProgress = targetInvestment.engravings > 0 ? Math.min(pData.engravings / targetInvestment.engravings, 1) : 1;
            const progressPercentage = ((siProgress + furnProgress + engProgress) / 3) * 100;

            return { ...hero, power, pData, progressPercentage };
        }).filter(h => !hideCompleted || h.progressPercentage < 100);

        // Sorting logic
        // FIX: Explicitly type sort callback arguments to resolve type inference issue.
        heroesWithCalculatedPower.sort((a: HeroWithPower, b: HeroWithPower) => {
            let compare = 0;
            if (a[sortConfig.key] < b[sortConfig.key]) {
                compare = -1;
            } else if (a[sortConfig.key] > b[sortConfig.key]) {
                compare = 1;
            }

            if (compare !== 0) {
                return sortConfig.direction === 'asc' ? compare : -compare;
            }

            // Secondary sorting criteria for stability
            if (sortConfig.key !== 'power' && b.power !== a.power) return b.power - a.power;
            if (sortConfig.key !== 'score' && b.score !== a.score) return b.score - a.score;
            
            return a.name.localeCompare(b.name);
        });


        return heroesWithCalculatedPower;
    }, [uniqueHeroes, playerData, searchQuery, selectedFactions, showAwakenedOnly, hideNotOwned, hideCompleted, maxInvestmentMap, armorFilterTier, sortConfig]);
    
    const handleSaveFromModal = useCallback((heroName: string, data: PlayerHeroData) => {
        setPlayerData(prevData => ({
            ...prevData,
            [heroName]: data
        }));
        setIsEditModalOpen(false);
    }, [setPlayerData]);
    

    // --- Bulk Edit Handlers ---
    const handleToggleBulkEditMode = () => {
        setIsBulkEditMode(prev => !prev);
        setBulkEditSelection(new Set());
    };

    const handleHeroSelectionToggle = (originalName: string) => {
        setBulkEditSelection(prev => {
            const newSet = new Set(prev);
            if (newSet.has(originalName)) newSet.delete(originalName); else newSet.add(originalName);
            return newSet;
        });
    };
    
    const handleApplyBulkEdit = () => {
        setPlayerData(currentData => {
            const newData = { ...currentData };
            bulkEditSelection.forEach(heroName => {
                const heroData = newData[heroName] || { owned: true, si: 0, furniture: 0, engravings: 0, armorTier: 0 };
                const updatedHeroData = { ...heroData };
                if (bulkFormState.si.apply) updatedHeroData.si = bulkFormState.si.value;
                if (bulkFormState.furniture.apply) updatedHeroData.furniture = bulkFormState.furniture.value;
                if (bulkFormState.engravings.apply) updatedHeroData.engravings = bulkFormState.engravings.value;
                if (bulkFormState.armorTier.apply) updatedHeroData.armorTier = bulkFormState.armorTier.value;
                newData[heroName] = updatedHeroData;
            });
            return newData;
        });
        setIsConfirmingBulkEdit(false);
        setBulkEditSelection(new Set());
        setIsBulkEditMode(false);
    };

    const handleBulkFormChange = (field: keyof BulkFormState, key: keyof BulkFormStateValue, value: boolean | number) => {
        setBulkFormState(prev => ({ ...prev, [field]: { ...prev[field], [key]: value } }));
    };
    
    if (isSyncing && database.length === 0) return <div className="text-center py-20"><LoadingSpinner className="h-12 w-12 mx-auto text-red-500"/><p className="mt-4 text-lg">Cargando lista de héroes...</p></div>;
    if (error) return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6">{error}</div>;

    return (
        <div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700/80 mb-6 flex flex-col gap-4">
                {/* --- Top Row: Title, Factions, Update Button --- */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                    <div>
                        <h1 className="text-2xl font-bold">Edición de Roster</h1>
                        {lastSync && <p className="text-sm text-gray-400">Fuente actualizada: {new Date(lastSync).toLocaleString('es-ES')}</p>}
                    </div>
                    <div className="flex items-center flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="flex items-center justify-center flex-wrap gap-2" role="group" aria-label="Filtro de facción y armadura">
                            <div className="flex items-center gap-2" role="group" aria-label="Filtro de armadura">
                                <span className="text-sm text-gray-400 mr-1 shrink-0">Armadura &lt;</span>
                                {ARMOR_TIER_STYLES.map(tierInfo => <button key={tierInfo.tier} onClick={() => handleArmorFilterToggle(tierInfo.tier)} title={`Mostrar héroes con armadura menor a T${tierInfo.tier}`} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${tierInfo.style} ${armorFilterTier === tierInfo.tier ? '' : 'filter grayscale opacity-60'}`}>{tierInfo.label}</button>)}
                            </div>
                            <div className="border-l border-gray-600 h-8 mx-2"></div>
                            <button onClick={() => { setSelectedFactions(new Set()); setShowAwakenedOnly(false); }} aria-pressed={isAllSelected} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 ${isAllSelected ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Todas</button>
                            <button key="awakened-filter" onClick={() => setShowAwakenedOnly(prev => !prev)} title="Filtrar Héroes Despertados" aria-pressed={showAwakenedOnly} className={`awakened-button rounded-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-400 w-12 h-12 flex items-center justify-center overflow-hidden hover:scale-110 mx-2 ${showAwakenedOnly ? 'bg-purple-900 active scale-110' : 'bg-gray-700'}`}><img src="https://ik.imagekit.io/optimizerhispania/timegazer_card.webp" alt="Filtro Héroes Despertados" className="w-full h-full object-cover"/></button>
                            {allFactions.map(faction => {
                                const isSelected = selectedFactions.has(faction);
                                const isVisible = isAllSelected || isSelected;
                                return (
                                    <button 
                                        key={faction} 
                                        onClick={() => handleFactionToggle(faction)} 
                                        title={faction} 
                                        aria-pressed={isSelected} 
                                        className={`faction-button-hover p-1.5 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 hover:scale-125 hover:grayscale-0 hover:opacity-100 ${isSelected ? 'bg-white/20 ring-2 ring-white' : ''} ${isVisible ? '' : 'grayscale opacity-60'}`}
                                    >
                                    {faction === 'Desconocida' ? (
                                        <div className="h-8 w-8 flex items-center justify-center bg-gray-700 rounded-full text-lg font-bold text-gray-400" title="Facción Desconocida">
                                            ?
                                        </div>
                                    ) : (
                                        (() => {
                                            const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
                                            const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
                                            if (!iconFileName) return null;
                                            const iconUrl = `${baseUrl}${iconFileName}.png`;
                                            return <img src={iconUrl} alt={faction} className="h-8 w-8" />;
                                        })()
                                    )}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => onSync(true)} disabled={isSyncing} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed flex-shrink-0">{isSyncing && <LoadingSpinner className="h-5 w-5 mr-2" />}Actualizar</button>
                    </div>
                </div>
                 {/* --- Bottom Row: Search & Toggles --- */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full pt-4 border-t border-gray-700/50">
                    <input type="text" placeholder="Buscar héroe..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white w-full sm:w-auto" />
                    <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-center">
                        <div className="flex items-center gap-1 bg-gray-700 rounded-md p-1">
                            <div className="relative" ref={sortMenuRef}>
                                <button
                                    onClick={() => setIsSortMenuOpen(prev => !prev)}
                                    className="flex items-center gap-2 px-3 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors h-9"
                                >
                                    <i className={SORT_OPTIONS[sortConfig.key].icon}></i>
                                    <span>{SORT_OPTIONS[sortConfig.key].label}</span>
                                    <i className="fas fa-chevron-down text-xs ml-1"></i>
                                </button>
                                {isSortMenuOpen && (
                                    <div className="absolute bottom-full mb-2 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 animate-[fade-in-up_0.2s_ease-out]">
                                        {(Object.keys(SORT_OPTIONS) as SortKey[]).map(key => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    setSortConfig(prev => ({ ...prev, key }));
                                                    setIsSortMenuOpen(false);
                                                }}
                                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-red-600 hover:text-white"
                                            >
                                                <i className={`${SORT_OPTIONS[key].icon} w-4 text-center`}></i>
                                                <span>{SORT_OPTIONS[key].label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                className="px-3 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors h-9 flex items-center justify-center"
                                aria-label="Cambiar dirección de ordenación"
                            >
                                <i className={`fas fa-arrow-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                            </button>
                            <button
                                onClick={() => setIsInfoModalOpen(true)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 rounded-md text-sm h-9 flex items-center justify-center"
                                title="Información sobre las métricas"
                            >
                                <i className="fas fa-lightbulb"></i>
                            </button>
                        </div>
                        <button onClick={handleToggleBulkEditMode} className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 rounded-md text-sm h-9 flex items-center justify-center">{isBulkEditMode ? 'Cancelar Edición Masiva' : 'Activar Edición Masiva'}</button>
                        <label className="flex items-center cursor-pointer"><span className="mr-3 text-sm text-gray-300">Ocultar completados</span><div className="relative"><input type="checkbox" className="sr-only" checked={hideCompleted} onChange={() => setHideCompleted(!hideCompleted)} /><div className={`block w-10 h-6 rounded-full ${hideCompleted ? 'bg-red-600' : 'bg-gray-600'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideCompleted ? 'transform translate-x-4' : ''}`}></div></div></label>
                        <label className="flex items-center cursor-pointer"><span className="mr-3 text-sm text-gray-300">Ocultar los que NO poseo</span><div className="relative"><input type="checkbox" className="sr-only" checked={hideNotOwned} onChange={() => setHideNotOwned(!hideNotOwned)} /><div className={`block w-10 h-6 rounded-full ${hideNotOwned ? 'bg-red-600' : 'bg-gray-600'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideNotOwned ? 'transform translate-x-4' : ''}`}></div></div></label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {heroesWithPower.map(hero => (
                    <RosterHeroCard
                        key={hero.originalName}
                        hero={hero}
                        onSelect={handleHeroSelect}
                        isBulkEditMode={isBulkEditMode}
                        isSelectedForBulk={bulkEditSelection.has(hero.originalName)}
                        onToggleSelection={handleHeroSelectionToggle}
                    />
                ))}
            </div>

            <InfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
            />

            <HeroBuildModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveFromModal}
                hero={selectedHero}
                playerData={selectedHero ? playerData[selectedHero.originalName] : null}
                recommendedBuilds={selectedHeroBuilds}
                maxInvestment={selectedHero ? maxInvestmentMap.get(selectedHero.originalName) ?? null : null}
                watchlistSlots={watchlistSlots}
                setWatchlistSlots={setWatchlistSlots}
                allHeroes={uniqueHeroes}
                tierMap={tierMap}
                navigate={navigate}
                priorities={priorities}
            />

            {isBulkEditMode && (
                 <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700 shadow-2xl p-4 z-40 animate-[slide-in-up_0.3s_ease-out]">
                    <div className="container mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
                        <div className="text-center xl:text-left">
                            <h3 className="text-lg font-bold text-white">{bulkEditSelection.size} héroe(s) seleccionado(s)</h3>
                            <button onClick={() => setBulkEditSelection(new Set())} className="text-sm text-red-400 hover:underline">Limpiar selección</button>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                            <div className="flex items-center gap-2"><input type="checkbox" id="apply-si" checked={bulkFormState.si.apply} onChange={e => handleBulkFormChange('si', 'apply', e.target.checked)} className="h-4 w-4 rounded text-red-600"/><label htmlFor="apply-si" className="text-sm font-medium text-gray-300">SI</label><ValueSelector value={bulkFormState.si.value} onChange={v => handleBulkFormChange('si', 'value', v)} options={[0, 20, 30, 40]} disabled={!bulkFormState.si.apply}/></div>
                            <div className="flex items-center gap-2"><input type="checkbox" id="apply-furn" checked={bulkFormState.furniture.apply} onChange={e => handleBulkFormChange('furniture', 'apply', e.target.checked)} className="h-4 w-4 rounded text-red-600"/><label htmlFor="apply-furn" className="text-sm font-medium text-gray-300">Muebles</label><ValueSelector value={bulkFormState.furniture.value} onChange={v => handleBulkFormChange('furniture', 'value', v)} options={[0, 3, 9]} disabled={!bulkFormState.furniture.apply}/></div>
                            <div className="flex items-center gap-2"><input type="checkbox" id="apply-eng" checked={bulkFormState.engravings.apply} onChange={e => handleBulkFormChange('engravings', 'apply', e.target.checked)} className="h-4 w-4 rounded text-red-600"/><label htmlFor="apply-eng" className="text-sm font-medium text-gray-300">Grabado</label><ValueSelector value={bulkFormState.engravings.value} onChange={v => handleBulkFormChange('engravings', 'value', v)} options={[0, 30, 60]} disabled={!bulkFormState.engravings.apply}/></div>
                            <div className="flex items-center gap-2"><input type="checkbox" id="apply-armor" checked={bulkFormState.armorTier.apply} onChange={e => handleBulkFormChange('armorTier', 'apply', e.target.checked)} className="h-4 w-4 rounded text-red-600"/><label htmlFor="apply-armor" className="text-sm font-medium text-gray-300">Armadura</label><ValueSelector value={bulkFormState.armorTier.value} onChange={v => handleBulkFormChange('armorTier', 'value', v)} options={[0, 1, 2, 3, 4]} disabled={!bulkFormState.armorTier.apply}/></div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setIsConfirmingBulkEdit(true)} disabled={!(Object.values(bulkFormState) as BulkFormStateValue[]).some(s => s.apply) || bulkEditSelection.size === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm disabled:bg-gray-500">Aplicar Cambios</button>
                            <button onClick={handleToggleBulkEditMode} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm">Salir</button>
                        </div>
                    </div>
                </div>
            )}
            
            <ConfirmationModal isOpen={isConfirmingBulkEdit} onClose={() => setIsConfirmingBulkEdit(false)} onConfirm={handleApplyBulkEdit} title="Confirmar Edición Masiva">
                <p>Estás a punto de aplicar los siguientes cambios a <span className="font-bold text-white">{bulkEditSelection.size} héroe(s)</span>:</p>
                <ul className="list-disc list-inside mt-2 text-gray-400">
                    {bulkFormState.si.apply && <li>Establecer SI a <span className="font-bold text-white">{bulkFormState.si.value}</span></li>}
                    {bulkFormState.furniture.apply && <li>Establecer Muebles a <span className="font-bold text-white">{bulkFormState.furniture.value}</span></li>}
                    {bulkFormState.engravings.apply && <li>Establecer Grabado a <span className="font-bold text-white">{bulkFormState.engravings.value}</span></li>}
                    {bulkFormState.armorTier.apply && <li>Establecer Armadura a <span className="font-bold text-white">T{bulkFormState.armorTier.value}</span></li>}
                </ul>
                <p className="mt-4">¿Estás seguro de que quieres continuar? Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
            <style>{`
                @keyframes slide-in-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fade-in-up {
                    from { transform: translateY(1rem); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default RosterPage;