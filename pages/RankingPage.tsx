import React, { useState, useCallback, useMemo } from 'react';
import { Hero, HeroDatabaseEntry } from '../types';
import { translateSingleComment } from '../services/geminiService';
import RankingTable from '../components/RankingTable';
import InfographicsView from '../components/InfographicsView';
import { LoadingSpinner } from '../components/icons';
import CustomInfographicsModal from '../components/CustomInfographicsModal';

type ViewMode = 'card' | 'compact' | 'table';

interface RankingPageProps {
    database: HeroDatabaseEntry[];
    setDatabase: React.Dispatch<React.SetStateAction<HeroDatabaseEntry[]>>;
    onSync: (force?: boolean) => Promise<void>;
    isSyncing: boolean;
    lastSync: string | null;
}

const TIER_ORDER: { [key: string]: number } = { "SSS": 1, "SS": 2, "S": 3, "A": 4, "B": 5, "C": 6, "D": 7, "N/A": 99 };
const TIERS = Object.keys(TIER_ORDER).filter(t => t !== "N/A");

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

const RankingPage: React.FC<RankingPageProps> = ({ database, setDatabase, onSync, isSyncing, lastSync }) => {
    const [error, setError] = useState<string | null>(null);
    const [selectedFactions, setSelectedFactions] = useState(new Set<string>());
    const [selectedTiers, setSelectedTiers] = useState(new Set<string>());
    const [showAwakenedOnly, setShowAwakenedOnly] = useState(false);
    const [translatingHeroName, setTranslatingHeroName] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [isGrouped, setIsGrouped] = useState(true);
    const [infographicsMode, setInfographicsMode] = useState(false);
    
    const [isCustomInfographicsModalOpen, setIsCustomInfographicsModalOpen] = useState(false);
    const [customInfographicsHeroes, setCustomInfographicsHeroes] = useState<Hero[] | null>(null);

    const heroes: Hero[] = useMemo(() => {
        return database
            .filter(hero => !hero.isHidden)
            .map(dbEntry => ({
                name: dbEntry.spanishName || dbEntry.key,
                faction: dbEntry.faction,
                comments: dbEntry.rankingComments,
                tier: dbEntry.tier,
                score: dbEntry.score,
                originalName: dbEntry.key,
                isNameTranslated: !!dbEntry.spanishName && !dbEntry.key.startsWith('nuevo-heroe-'),
                isFactionTranslated: true, 
                commentIsTranslated: !!dbEntry.rankingCommentIsTranslated,
                isAwakened: dbEntry.isAwakened,
        }));
    }, [database]);

    const allFactions = useMemo(() => {
        if (heroes.length === 0) return [];
        const factionOrder = ['Celestial', 'Hipogeo', 'Dimensional', 'Draconis', 'Lightbearer', 'Mauler', 'Wilder', 'Graveborn', 'Desconocida'];
        const factions = new Set(heroes.map(hero => hero.faction));
        return Array.from(factions).sort((a, b) => {
            const indexA = factionOrder.indexOf(a), indexB = factionOrder.indexOf(b);
            if (indexA === -1) return 1; if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [heroes]);

    const handleTranslateComment = useCallback(async (heroOriginalName: string) => {
        const heroIndex = database.findIndex(h => h.key === heroOriginalName);
        if (heroIndex === -1 || database[heroIndex].rankingCommentIsTranslated) return;

        setTranslatingHeroName(heroOriginalName);
        
        try {
            const originalComment = database[heroIndex].rankingComments;
            const translatedComment = await translateSingleComment(originalComment);

            setDatabase(currentDb => {
                const newDb = [...currentDb];
                const targetHeroIndex = newDb.findIndex(h => h.key === heroOriginalName);
                if(targetHeroIndex > -1) {
                    newDb[targetHeroIndex] = { ...newDb[targetHeroIndex], rankingComments: translatedComment, rankingCommentIsTranslated: true };
                }
                return newDb;
            });

        } catch (err: any) {
            setError(`No se pudo traducir el comentario para ${database[heroIndex].spanishName}.`);
            console.error(err);
        } finally {
            setTranslatingHeroName(null);
        }
    }, [database, setDatabase]);
    
    const handleFactionToggle = useCallback((faction: string) => {
        setSelectedFactions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(faction)) newSet.delete(faction); else newSet.add(faction);
            return newSet;
        });
    }, []);
    
    const handleTierToggle = useCallback((tier: string) => {
        setSelectedTiers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tier)) newSet.delete(tier); else newSet.add(tier);
            return newSet;
        });
    }, []);

    const filteredHeroes = useMemo(() => {
        return heroes.filter(hero => 
            (showAwakenedOnly ? hero.isAwakened : true) && 
            (selectedFactions.size === 0 || selectedFactions.has(hero.faction)) &&
            (selectedTiers.size === 0 || selectedTiers.has(hero.tier))
        );
    }, [heroes, showAwakenedOnly, selectedFactions, selectedTiers]);

    const sortedHeroes = useMemo(() => {
        return [...filteredHeroes].sort((a, b) => b.score - a.score);
    }, [filteredHeroes]);

    const isAllSelected = selectedFactions.size === 0 && !showAwakenedOnly;

    const handleCustomInfographicsConfirm = (selectedHeroes: Hero[]) => {
        setIsCustomInfographicsModalOpen(false);
        const sorted = [...selectedHeroes].sort((a, b) => b.score - a.score);
        setCustomInfographicsHeroes(sorted);
        setInfographicsMode(true);
    };

    const handleCloseInfographics = () => {
        setInfographicsMode(false);
        setCustomInfographicsHeroes(null);
    };

    return (
        <div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700/80 mb-6 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                    <div>
                        <h1 className="text-2xl font-bold">Ranking de Héroes</h1>
                        {lastSync && <p className="text-sm text-gray-400">Datos actualizados: {new Date(lastSync).toLocaleString('es-ES')}</p>}
                    </div>
                    <div className="flex items-center flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="flex items-center justify-center flex-wrap gap-2" role="group" aria-label="Filtro de facción">
                            <button onClick={() => { setSelectedFactions(new Set()); setShowAwakenedOnly(false); }} aria-pressed={isAllSelected} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 ${ isAllSelected ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600' }`}>Todas</button>
                            <button key="awakened-filter" onClick={() => setShowAwakenedOnly(prev => !prev)} title="Filtrar Héroes Despertados" aria-pressed={showAwakenedOnly} className={`awakened-button rounded-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-400 w-12 h-12 flex items-center justify-center overflow-hidden hover:scale-110 mx-2 ${ showAwakenedOnly ? 'bg-purple-900 active scale-110' : 'bg-gray-700' }`}><img src="https://ik.imagekit.io/optimizerhispania/timegazer_card.webp" alt="Filtro Héroes Despertados" className="w-full h-full object-cover" /></button>
                            {allFactions.map(faction => {
                                const isSelected = selectedFactions.has(faction);
                                const isVisible = selectedFactions.size === 0 || isSelected;
                                return (<button key={faction} onClick={() => handleFactionToggle(faction)} title={faction} aria-pressed={isSelected} className={`faction-button-hover p-1.5 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 hover:scale-125 hover:grayscale-0 hover:opacity-100 ${ isSelected ? 'bg-white/20 ring-2 ring-white' : '' } ${ isVisible ? '' : 'grayscale opacity-60' }`}>{faction === 'Desconocida' ? <div className="h-8 w-8 flex items-center justify-center bg-gray-700 rounded-full text-lg font-bold text-gray-400" title="Facción Desconocida">?</div> : (() => { const baseUrl = "https://ik.imagekit.io/optimizerhispania/"; const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ''); if (!iconFileName) return null; const iconUrl = `${baseUrl}${iconFileName}.png`; return <img src={iconUrl} alt={faction} className="h-8 w-8" />; })()}</button>);
                            })}
                        </div>
                        <button onClick={() => onSync(true)} disabled={isSyncing} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isSyncing && <LoadingSpinner className="h-5 w-5 mr-2" />}
                            {isSyncing ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full pt-4 border-t border-gray-700/50">
                    <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg" role="radiogroup" aria-label="Modo de vista">
                        <button onClick={() => { setViewMode('card'); setInfographicsMode(false); }} aria-checked={viewMode === 'card' && !infographicsMode} role="radio" className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'card' && !infographicsMode ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><i className="fas fa-id-card-alt"></i><span>Detallada</span></button>
                        <button onClick={() => { setViewMode('compact'); setInfographicsMode(false); }} aria-checked={viewMode === 'compact' && !infographicsMode} role="radio" className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'compact' && !infographicsMode ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><i className="fas fa-th-large"></i><span>Compacta</span></button>
                        <button onClick={() => { setViewMode('table'); setInfographicsMode(false); }} aria-checked={viewMode === 'table' && !infographicsMode} role="radio" className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'table' && !infographicsMode ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><i className="fas fa-table"></i><span>Tabla</span></button>
                         <button onClick={() => { setCustomInfographicsHeroes(null); setInfographicsMode(true); }} aria-checked={infographicsMode && !customInfographicsHeroes} role="radio" className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${infographicsMode && !customInfographicsHeroes ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><i className="fas fa-image"></i><span>Infografía</span></button>
                         <button onClick={() => setIsCustomInfographicsModalOpen(true)} aria-checked={infographicsMode && !!customInfographicsHeroes} role="radio" className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${infographicsMode && !!customInfographicsHeroes ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><i className="fas fa-pen-ruler"></i><span>Custom</span></button>
                    </div>
                    <div className="flex items-center gap-x-6 flex-wrap justify-center">
                        <label className="flex items-center cursor-pointer"><span className="mr-3 text-sm text-gray-300">Agrupar por Tier</span><div className="relative"><input type="checkbox" className="sr-only" checked={isGrouped} onChange={() => setIsGrouped(!isGrouped)} /><div className={`block w-10 h-6 rounded-full transition-colors ${isGrouped ? 'bg-red-600' : 'bg-gray-600'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isGrouped ? 'transform translate-x-4' : ''}`}></div></div></label>
                        <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg" role="group" aria-label="Filtro de Tier">
                             <button onClick={() => setSelectedTiers(new Set())} className={`px-3 py-1 text-xs font-bold rounded-md transition-all duration-200 ${ selectedTiers.size === 0 ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300' }`}>Todos</button>
                            {TIERS.map(tier => {
                                const { bgClass, textClass } = getTierStyling(tier);
                                const isSelected = selectedTiers.has(tier);
                                return (<button key={tier} onClick={() => handleTierToggle(tier)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all duration-200 ${bgClass} ${textClass} ${ selectedTiers.size > 0 && !isSelected ? 'opacity-50 grayscale' : 'opacity-100' } hover:opacity-100 hover:grayscale-0`}>{tier}</button>);
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6">{error}</div>}

            {infographicsMode ? (
                <InfographicsView 
                    heroes={customInfographicsHeroes || sortedHeroes} 
                    onClose={handleCloseInfographics}
                    filters={{ selectedFactions, showAwakenedOnly, selectedTiers }}
                    customTitle={customInfographicsHeroes ? 'Infografía Personalizada' : undefined}
                />
            ) : (
                <RankingTable 
                    heroes={heroes} 
                    factionFilter={selectedFactions}
                    awakenedFilter={showAwakenedOnly}
                    tierFilter={selectedTiers}
                    onTranslateComment={handleTranslateComment}
                    translatingHeroName={translatingHeroName}
                    viewMode={viewMode}
                    isGrouped={isGrouped} 
                />
            )}
            <CustomInfographicsModal 
                isOpen={isCustomInfographicsModalOpen}
                onClose={() => setIsCustomInfographicsModalOpen(false)}
                database={database}
                onConfirm={handleCustomInfographicsConfirm}
            />
        </div>
    );
};

export default RankingPage;