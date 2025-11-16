



// FIX: Imported `useEffect` to resolve hook-related errors.
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { PriorityHero, PlayerData, PlayerHeroData, Settings, HeroDatabaseEntry } from '../types';
import { translateSingleComment } from '../services/geminiService';
import PriorityTable from '../components/PriorityTable';
import { LoadingSpinner } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';

interface ResourcePriorityPageProps {
    database: HeroDatabaseEntry[];
    setDatabase: React.Dispatch<React.SetStateAction<HeroDatabaseEntry[]>>;
    onSync: (force?: boolean) => Promise<void>;
    isSyncing: boolean;
    lastSync: string | null;
    settings: Settings;
}

const ResourcePriorityPage: React.FC<ResourcePriorityPageProps> = ({ database, setDatabase, onSync, isSyncing, lastSync }) => {
    const [playerData, setPlayerData] = useLocalStorage<PlayerData>('player-hero-data', {});
    const [error, setError] = useState<string | null>(null);
    const [translatingHeroName, setTranslatingHeroName] = useState<string | null>(null);
    const [hideCompleted, setHideCompleted] = useState(true);
    const [hideNotOwned, setHideNotOwned] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFactions, setSelectedFactions] = useState(new Set<string>());
    const [showAwakenedOnly, setShowAwakenedOnly] = useState(false);
    const [heroToComplete, setHeroToComplete] = useState<PriorityHero | null>(null);
    const [heroToToggle, setHeroToToggle] = useState<PriorityHero | null>(null);

    const [renderedHeroes, setRenderedHeroes] = useState<PriorityHero[]>([]);
    const [disappearingKeys, setDisappearingKeys] = useState<Set<string>>(new Set());

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
        if (priorityHeroes.length > 0) {
            setPlayerData(currentPlayerData => {
                const newPlayerData = { ...currentPlayerData };
                let needsUpdate = false;
                priorityHeroes.forEach(hero => {
                    if (!newPlayerData[hero.originalName]) {
                        newPlayerData[hero.originalName] = {
                            owned: true,
                            si: 0,
                            furniture: 0,
                            engravings: 0,
                            armorTier: 0
                        };
                        needsUpdate = true;
                    }
                });
                return needsUpdate ? newPlayerData : currentPlayerData;
            });
        }
    }, [priorityHeroes, setPlayerData]);

    const allFactions = useMemo(() => {
        if (priorityHeroes.length === 0) return [];
        const factionOrder = ['Celestial', 'Hipogeo', 'Dimensional', 'Draconis', 'Lightbearer', 'Mauler', 'Wilder', 'Graveborn', 'Desconocida'];
        const factions = new Set(priorityHeroes.map(hero => hero.faction));
        return Array.from(factions).sort((a, b) => {
            const indexA = factionOrder.indexOf(a);
            const indexB = factionOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [priorityHeroes]);

    const handleFactionToggle = (faction: string) => {
        setSelectedFactions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(faction)) {
                newSet.delete(faction);
            } else {
                newSet.add(faction);
            }
            return newSet;
        });
    };

    const isAllSelected = selectedFactions.size === 0 && !showAwakenedOnly;

    const handlePlayerDataChange = useCallback((heroName: string, field: keyof PlayerHeroData, value: any) => {
        setPlayerData(prevData => ({
            ...prevData,
            [heroName]: {
                ...(prevData[heroName] || { owned: true, si: 0, furniture: 0, engravings: 0, armorTier: 0 }),
                [field]: value
            }
        }));
    }, [setPlayerData]);

    const handleOwnershipToggleRequest = useCallback((hero: PriorityHero) => {
        const pData = playerData[hero.originalName] || { owned: true };
        if (pData.owned) {
            setHeroToToggle(hero);
        } else {
            handlePlayerDataChange(hero.originalName, 'owned', true);
        }
    }, [playerData, handlePlayerDataChange]);

    const confirmOwnershipToggle = useCallback(() => {
        if (!heroToToggle) return;
        handlePlayerDataChange(heroToToggle.originalName, 'owned', false);
        setHeroToToggle(null);
    }, [heroToToggle, handlePlayerDataChange]);
    
    // FIX: Modified `handleTranslateComment` to accept `heroOriginalName` and find the hero's untranslated comment, resolving the type error.
    const handleTranslateComment = useCallback(async (heroOriginalName: string) => {
        const heroToTranslate = priorityHeroes.find(h => h.originalName === heroOriginalName && !h.commentIsTranslated);
        if (!heroToTranslate) return;

        if (heroToTranslate.commentIsTranslated) return;
        
        setTranslatingHeroName(heroToTranslate.originalName);
        try {
            const originalComment = heroToTranslate.priorityComment;
            if (!originalComment) return;

            const translatedComment = await translateSingleComment(originalComment);
            
            setDatabase(db => db.map(heroEntry => {
                if (heroEntry.key !== heroToTranslate.originalName) {
                    return heroEntry;
                }
                const newBuilds = heroEntry.builds.map(build => {
                    if (build.priorityComment === originalComment) {
                        return { ...build, priorityComment: translatedComment, priorityCommentIsTranslated: true };
                    }
                    return build;
                });
                return { ...heroEntry, builds: newBuilds, isUserModified: true };
            }));

        } catch (err) {
            setError(`No se pudo traducir el comentario para ${heroToTranslate.name}.`);
        } finally {
            setTranslatingHeroName(null);
        }
    }, [priorityHeroes, setDatabase]);

    const confirmHeroCompletion = useCallback(() => {
        if (!heroToComplete) return;

        const currentData = playerData[heroToComplete.originalName] || { owned: true, si: 0, furniture: 0, engravings: 0, armorTier: 0 };

        if (heroToComplete.requiredSI > currentData.si) {
            handlePlayerDataChange(heroToComplete.originalName, 'si', heroToComplete.requiredSI);
        }
        if (heroToComplete.requiredFurniture > currentData.furniture) {
            handlePlayerDataChange(heroToComplete.originalName, 'furniture', heroToComplete.requiredFurniture);
        }
        if (heroToComplete.requiredEngravings > currentData.engravings) {
            handlePlayerDataChange(heroToComplete.originalName, 'engravings', heroToComplete.requiredEngravings);
        }
        setHeroToComplete(null); // Close modal
    }, [heroToComplete, playerData, handlePlayerDataChange]);

    const filteredHeroes = useMemo(() => {
        let heroesToFilter = priorityHeroes;

        if (showAwakenedOnly) {
            heroesToFilter = heroesToFilter.filter(hero => hero.isAwakened);
        }

        if (selectedFactions.size > 0) {
            heroesToFilter = heroesToFilter.filter(hero => 
                hero.faction && selectedFactions.has(hero.faction)
            );
        }
        
        if (hideNotOwned) {
            heroesToFilter = heroesToFilter.filter(hero => {
                const pData = playerData[hero.originalName];
                return pData?.owned !== false;
            });
        }
        
        if (hideCompleted) {
            heroesToFilter = heroesToFilter.filter(hero => {
                const pData = playerData[hero.originalName];
                if (!pData) return true;
                const isOwned = pData.owned !== false;
                if (!isOwned) return true; 
                const isCompleted = pData.si >= hero.requiredSI &&
                                    pData.furniture >= hero.requiredFurniture &&
                                    pData.engravings >= hero.requiredEngravings;
                return !isCompleted;
            });
        }
        
        if (searchQuery.trim() !== '') {
            heroesToFilter = heroesToFilter.filter(hero =>
                hero.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
            );
        }

        return heroesToFilter;
    }, [priorityHeroes, playerData, hideCompleted, hideNotOwned, searchQuery, selectedFactions, showAwakenedOnly]);

    const getHeroKey = (hero: PriorityHero) => `${hero.originalName}-${hero.requiredSI}-${hero.requiredFurniture}-${hero.requiredEngravings}-${hero.isAlternative}`;

    useEffect(() => {
        const renderedKeys = new Set(renderedHeroes.map(getHeroKey));
        const filteredKeys = new Set(filteredHeroes.map(getHeroKey));

        const keysToRemove = new Set([...renderedKeys].filter(key => !filteredKeys.has(key)));

        if (keysToRemove.size > 0) {
            setDisappearingKeys(prev => new Set([...prev, ...keysToRemove]));
            
            const animationDuration = 1200;
            const timer = setTimeout(() => {
                setRenderedHeroes(filteredHeroes);
                setDisappearingKeys(new Set());
            }, animationDuration);

            return () => clearTimeout(timer);
        } else {
            setRenderedHeroes(filteredHeroes);
        }
    }, [filteredHeroes]);

    return (
        <div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700/80 mb-6 flex flex-col gap-4">
                {/* --- Top Row: Title, Factions, Update Button --- */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                    <div>
                        <h1 className="text-2xl font-bold">Prioridad de Recursos</h1>
                        {lastSync && <p className="text-sm text-gray-400">Datos actualizados: {new Date(lastSync).toLocaleString('es-ES')}</p>}
                    </div>

                    <div className="flex items-center flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="flex items-center justify-center flex-wrap gap-2" role="group" aria-label="Filtro de facción">
                           <button
                                onClick={() => { setSelectedFactions(new Set()); setShowAwakenedOnly(false); }}
                                aria-pressed={isAllSelected}
                                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 ${
                                    isAllSelected ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                Todas
                            </button>
                            <button
                                key="awakened-filter"
                                onClick={() => setShowAwakenedOnly(prev => !prev)}
                                title="Filtrar Héroes Despertados"
                                aria-pressed={showAwakenedOnly}
                                className={`awakened-button rounded-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-400 w-12 h-12 flex items-center justify-center overflow-hidden hover:scale-110 mx-2 ${
                                    showAwakenedOnly ? 'bg-purple-900 active scale-110' : 'bg-gray-700'
                                }`}
                            >
                               <img 
                                    src="https://ik.imagekit.io/optimizerhispania/timegazer_card.webp" 
                                    alt="Filtro Héroes Despertados" 
                                    className="w-full h-full object-cover"
                                />
                            </button>
                            {allFactions.map(faction => {
                                const isSelected = selectedFactions.has(faction);
                                const isVisible = selectedFactions.size === 0 || isSelected;

                                return (
                                    <button
                                        key={faction}
                                        onClick={() => handleFactionToggle(faction)}
                                        title={faction}
                                        aria-pressed={isSelected}
                                        className={`faction-button-hover p-1.5 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 hover:scale-125 hover:grayscale-0 hover:opacity-100 ${
                                            isSelected ? 'bg-white/20 ring-2 ring-white' : ''
                                        } ${
                                            isVisible ? '' : 'grayscale opacity-60'
                                        }`}
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
                        <button
                            onClick={() => onSync(true)}
                            disabled={isSyncing}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed flex-shrink-0"
                        >
                            {isSyncing && <LoadingSpinner className="h-5 w-5 mr-2" />}
                            {isSyncing ? 'Actualizando...' : 'Actualizar'}
                        </button>
                    </div>
                </div>

                {/* --- Bottom Row: Search & Toggles --- */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full pt-4 border-t border-gray-700/50">
                    <input
                        type="text"
                        placeholder="Buscar héroe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto max-w-xs"
                    />
                    <div className="flex items-center gap-x-6 gap-y-2 flex-wrap justify-center sm:justify-end">
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-3 text-sm text-gray-300">Ocultar completados</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={hideCompleted} onChange={() => setHideCompleted(!hideCompleted)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${hideCompleted ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideCompleted ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-3 text-sm text-gray-300">Ocultar los que NO poseo</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={hideNotOwned} onChange={() => setHideNotOwned(!hideNotOwned)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${hideNotOwned ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideNotOwned ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <p className="text-center text-sm text-gray-400">
                    💡 Haz clic en el retrato de un héroe para marcar si lo posees (los no poseídos aparecen en gris).
                </p>
            </div>


            {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-6">{error}</div>}

            {isSyncing && database.length === 0 ? (
                 <div className="text-center py-20">
                    <LoadingSpinner className="h-12 w-12 mx-auto text-red-500"/>
                    <p className="mt-4 text-lg">Cargando datos de prioridades...</p>
                 </div>
            ) : (
                <PriorityTable 
                    heroes={renderedHeroes}
                    playerData={playerData}
                    onPlayerDataChange={handlePlayerDataChange}
                    onOwnershipToggleRequest={handleOwnershipToggleRequest}
                    onTranslateComment={handleTranslateComment}
                    translatingHeroName={translatingHeroName}
                    onHeroCompletionRequest={setHeroToComplete}
                    disappearingKeys={disappearingKeys}
                />
            )}
            
            {heroToComplete && (
                <ConfirmationModal
                    isOpen={!!heroToComplete}
                    onClose={() => setHeroToComplete(null)}
                    onConfirm={confirmHeroCompletion}
                    title="Confirmar Actualización de Progreso"
                >
                    <p>¿Estás seguro de que quieres actualizar el progreso para <span className="font-bold text-white">{heroToComplete.name}</span> a los valores requeridos?</p>
                    <p className="text-sm text-gray-400 mt-2">Esta acción solo modificará los valores si los actuales son inferiores a los recomendados.</p>
                </ConfirmationModal>
            )}

            {heroToToggle && (
                <ConfirmationModal
                    isOpen={!!heroToToggle}
                    onClose={() => setHeroToToggle(null)}
                    onConfirm={confirmOwnershipToggle}
                    title="Confirmar cambio de posesión"
                >
                    <p>¿Estás seguro de que quieres marcar a <span className="font-bold text-white">{heroToToggle.name}</span> como que <span className="font-bold text-red-400">NO lo posees</span>?</p>
                    <p className="text-sm text-gray-400 mt-2">Esta acción podría ocultarlo de la lista si tienes activado el filtro correspondiente.</p>
                </ConfirmationModal>
            )}
        </div>
    );
};

export default ResourcePriorityPage;