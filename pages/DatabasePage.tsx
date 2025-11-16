import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Page, HeroDatabaseEntry, Settings, EngravingNode } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { LoadingSpinner } from '../components/icons';
import { NODE_TRANSLATION_MAP } from '../constants';
import HeroPortrait from '../components/HeroPortrait';
import ConfirmationModal from '../components/ConfirmationModal';
import MismatchDetailsModal from '../components/MismatchDetailsModal';

interface DatabasePageProps {
    navigate: (page: Page) => void;
    database: HeroDatabaseEntry[];
    setDatabase: React.Dispatch<React.SetStateAction<HeroDatabaseEntry[]>>;
    onSync: (force?: boolean) => Promise<void>;
    isSyncing: boolean;
    lastSync: string | null;
    settings: Settings;
    syncError: string | null;
}

type SortKey = 'spanishName' | 'russianName' | 'score' | 'tier';
type SortDirection = 'asc' | 'desc';

const FACTION_OPTIONS = ['Lightbearer', 'Mauler', 'Wilder', 'Graveborn', 'Celestial', 'Hipogeo', 'Dimensional', 'Draconis', 'Desconocida'] as const;
const TIER_OPTIONS = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'N/A'] as const;
const DEFAULT_SCORES_BY_TIER: { [key: string]: number } = { SSS: 6.5, SS: 5, S: 4, A: 3, B: 2, C: 1.01, D: 0.5 };

const getTierStyling = (tier: string): string => {
    switch (tier) {
        case 'SSS': return 'bg-blue-600 text-white';
        case 'SS': return 'bg-green-700 text-white';
        case 'S': return 'bg-lime-600 text-black';
        case 'A': return 'bg-yellow-500 text-black';
        case 'B': return 'bg-orange-600 text-white';
        case 'C': return 'bg-red-700 text-white';
        case 'D': return 'bg-amber-800 text-white';
        default: return 'bg-gray-600 text-white';
    }
};

const FactionIcon: React.FC<{ faction: string, className?: string }> = ({ faction, className }) => {
    if (faction === 'Desconocida') {
        return <div className={`flex items-center justify-center bg-gray-700 rounded-full text-xs font-bold text-gray-400 flex-shrink-0 ${className}`} title="Facción Desconocida">?</div>;
    }
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    const iconUrl = `${baseUrl}${iconFileName}.png`;
    return <img src={iconUrl} alt={faction} title={faction} className={`flex-shrink-0 ${className}`} />;
};

const getTierScoreRange = (tier: string): { min: number, max: number } => {
    switch (tier) {
        case 'SSS': return { min: 6.5, max: 7 };
        case 'SS': return { min: 5, max: 6.5 };
        case 'S': return { min: 4, max: 5 };
        case 'A': return { min: 3, max: 4 };
        case 'B': return { min: 2, max: 3 };
        case 'C': return { min: 1.01, max: 2 };
        case 'D': return { min: 0.5, max: 1.01 };
        default: return { min: 0, max: 7 }; // For N/A, no validation needed
    }
};

// Mini-modal component for selection
interface MiniModalSelectorProps<T> {
  onClose: () => void;
  options: ReadonlyArray<T>;
  onSelect: (value: T) => void;
  triggerEl: HTMLElement;
  renderOption: (option: T, isSelected: boolean) => React.ReactNode;
  selectedValue: T;
  modalClassName?: string;
}

const MiniModalSelector = <T extends string>({
  onClose,
  options,
  onSelect,
  triggerEl,
  renderOption,
  selectedValue,
  modalClassName = ''
}: MiniModalSelectorProps<T>) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [triggerEl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !triggerEl.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerEl]);

  return ReactDOM.createPortal(
    <div
      ref={modalRef}
      style={{ top: position.top, left: position.left }}
      className={`absolute z-50 bg-gray-900 border border-gray-600 rounded-lg shadow-2xl p-1 animate-[fade-in-up_0.2s_ease-out] ${modalClassName}`}
    >
      <div className="flex flex-col gap-1">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => {
              onSelect(option);
              onClose();
            }}
            className="w-full text-left rounded-md transition-colors"
          >
            {renderOption(option, option === selectedValue)}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

const EngravingNodeSelector: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (nodes: EngravingNode[]) => void;
    initialNodes: EngravingNode[];
    customNodes: Record<string, string>;
    setCustomNodes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}> = ({ isOpen, onClose, onSave, initialNodes, customNodes, setCustomNodes }) => {
    const [selectedNodes, setSelectedNodes] = useState<EngravingNode[]>(initialNodes);
    const [newNodeName, setNewNodeName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedNodes(initialNodes);
        }
    }, [isOpen, initialNodes]);
    
    const availableNodes = useMemo(() => {
        const standardNodes = new Map<string, string>();
        for (const [original, translated] of Object.entries(NODE_TRANSLATION_MAP)) {
            if (!standardNodes.has(translated)) {
                standardNodes.set(translated, original);
            }
        }
        for (const [name, value] of Object.entries(customNodes)) {
             if (!standardNodes.has(name)) {
                standardNodes.set(name, name);
            }
        }
        return Array.from(standardNodes.entries())
            .map(([translated, original]) => ({ original, translated }))
            .sort((a, b) => a.translated.localeCompare(b.translated));
    }, [customNodes]);

    if (!isOpen) return null;

    const handleToggleNode = (node: { original: string, translated: string }) => {
        setSelectedNodes(currentNodes => {
            if (currentNodes.some(n => n.original === node.original)) {
                return currentNodes.filter(n => n.original !== node.original);
            } else {
                const newNode: EngravingNode = { original: node.original, translated: node.translated, found: true };
                return [...currentNodes, newNode];
            }
        });
    };

    const handleAddNewNode = () => {
        const trimmedName = newNodeName.trim();
        if (!trimmedName) return;

        const existingNode = availableNodes.find(n => n.translated.toLowerCase() === trimmedName.toLowerCase());
        if (existingNode) {
            alert("Este nodo ya existe.");
            return;
        }

        setCustomNodes(prev => ({...prev, [trimmedName]: trimmedName}));
        setNewNodeName('');
    };
    
    const selectedOriginals = new Set(selectedNodes.map(n => n.original));

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 ease-out animate-[fade-in_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Editar Nodos de Grabado</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <div className="p-6 overflow-y-auto space-y-4">
                     <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Seleccionados</h4>
                        <div className="flex flex-wrap gap-2 p-2 bg-gray-900 rounded-md min-h-[40px] border border-gray-700">
                            {selectedNodes.map((node, i) => (
                                <div key={`${node.original}-${i}`} className="flex items-center">
                                    <button onClick={() => handleToggleNode(node)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-md flex items-center gap-2">
                                        <span>{node.translated || node.original}</span>
                                        <span className="text-xs">&times;</span>
                                    </button>
                                    {i < selectedNodes.length - 1 && <span className="text-gray-500 mx-2">&gt;</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Disponibles</h4>
                        <div className="flex flex-wrap gap-2 p-2 border border-gray-700 rounded-md">
                            {availableNodes.map((node) => {
                                const isSelected = selectedOriginals.has(node.original);
                                return (
                                    <button key={node.original} onClick={() => handleToggleNode(node)} className={`font-bold py-1 px-3 rounded-md transition-colors ${isSelected ? 'bg-gray-600 text-gray-400 line-through' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                                        {node.translated}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-700">
                        <h4 className="font-semibold text-gray-300 mb-2">Añadir Nuevo Nodo</h4>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newNodeName}
                                onChange={e => setNewNodeName(e.target.value)}
                                placeholder="Nombre del nuevo nodo (ej. Celeridad)"
                                className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                            />
                            <button onClick={handleAddNewNode} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">
                                Añadir
                            </button>
                        </div>
                    </div>
                </div>
                <footer className="bg-gray-900/50 px-6 py-4 flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                    <button onClick={() => onSave(selectedNodes)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">Guardar</button>
                </footer>
            </div>
        </div>,
        document.body
    );
};

interface ValueSelectorProps {
    value: number;
    onChange: (value: number) => void;
    options: number[];
    allowManualInput?: boolean;
}

const ValueSelector: React.FC<ValueSelectorProps> = ({ value, onChange, options, allowManualInput = false }) => {
    return (
        <div className="flex flex-col items-center space-y-1">
            <div className="flex flex-wrap justify-center gap-1">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors w-8 ${
                            value === opt
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
            {allowManualInput && (
                 <input
                    type="number"
                    value={value}
                    onChange={e => onChange(parseInt(e.target.value) || 0)}
                    className="w-16 bg-gray-900 border border-gray-600 rounded-md px-1 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500 text-center"
                    min="0"
                    step="1"
                />
            )}
        </div>
    );
};

const DatabasePage: React.FC<DatabasePageProps> = ({
    navigate,
    database,
    setDatabase,
    onSync,
    isSyncing,
    lastSync,
    syncError,
}) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'score', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
    const [showMismatchesOnly, setShowMismatchesOnly] = useState(false);
    const [showHidden, setShowHidden] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState(new Set<string>());
    const [heroToDelete, setHeroToDelete] = useState<HeroDatabaseEntry | null>(null);
    const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);
    const [activeModal, setActiveModal] = useState<{ type: 'tier' | 'faction'; key: string; triggerEl: HTMLElement } | null>(null);
    const [expandedRows, setExpandedRows] = useState(new Set<string>());
    const [editingNodesFor, setEditingNodesFor] = useState<{ heroKey: string; buildIndex: number } | null>(null);
    const [customNodes, setCustomNodes] = useLocalStorage<Record<string, string>>('custom-engraving-nodes', {});
    const [mismatchModalHeroKey, setMismatchModalHeroKey] = useState<string | null>(null);

    useEffect(() => {
        const initialFilter = sessionStorage.getItem('db-page-initial-filter');
        if (initialFilter === 'incomplete') {
            setShowIncompleteOnly(true);
            sessionStorage.removeItem('db-page-initial-filter');
        }
    }, []);

    const mismatchModalHero = useMemo(
        () => database.find(h => h.key === mismatchModalHeroKey) || null,
        [database, mismatchModalHeroKey]
    );

    const selectionVisibilityState = useMemo(() => {
        if (selectedKeys.size === 0) return 'none';
        const selectedHeroes = database.filter(h => selectedKeys.has(h.key));
        if (selectedHeroes.length === 0) return 'none';
        
        const allHidden = selectedHeroes.every(h => h.isHidden);
        if (allHidden) return 'hidden';

        const anyHidden = selectedHeroes.some(h => h.isHidden);
        if (anyHidden) return 'mixed';
        
        return 'visible';
    }, [selectedKeys, database]);

    const sortedAndFilteredDatabase = useMemo(() => {
        let filteredHeroes;

        if (showHidden) {
            // Exclusively show hidden heroes
            filteredHeroes = database.filter(h => h.isHidden);
        } else {
            // Default view: show non-hidden heroes
            filteredHeroes = database.filter(h => !h.isHidden);
        }

        if (showIncompleteOnly) {
            filteredHeroes = filteredHeroes.filter(hero => {
                const isNameMissing = !hero.spanishName.trim() || hero.spanishName === 'Nuevo Héroe';
                const isRussianNameMissing = !hero.key.startsWith('nuevo-heroe-') && !hero.russianName.trim();
                const isFactionMissing = hero.faction === 'Desconocida';
                const isTierMissing = hero.tier === 'N/A';
                const hasNoBuilds = !hero.builds || hero.builds.length === 0;
                return isNameMissing || isRussianNameMissing || isFactionMissing || isTierMissing || hasNoBuilds;
            });
        }
    
        if (showMismatchesOnly) {
            filteredHeroes = filteredHeroes.filter(hero => hero.sourceData && Object.keys(hero.sourceData).length > 0);
        }

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredHeroes = filteredHeroes.filter(hero =>
                hero.spanishName.toLowerCase().includes(lowercasedFilter) ||
                hero.russianName.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        const newHeroes = filteredHeroes.filter(hero => hero.key.startsWith('nuevo-heroe-'));
        let existingHeroes = filteredHeroes.filter(hero => !hero.key.startsWith('nuevo-heroe-'));

        existingHeroes.sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'removed_from_source' ? 1 : -1;
            }
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            if (sortConfig.key === 'tier') {
                const tierOrder: { [key: string]: number } = { "SSS": 1, "SS": 2, "S": 3, "A": 4, "B": 5, "C": 6, "D": 7, "N/A": 99 };
                aValue = tierOrder[a.tier] || 99;
                bValue = tierOrder[b.tier] || 99;
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
            }
             if (typeof bValue === 'string') {
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return [...newHeroes.reverse(), ...existingHeroes];
    }, [database, sortConfig, searchTerm, showIncompleteOnly, showMismatchesOnly, showHidden]);
    
    const requestSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleUpdateField = useCallback((key: string, field: keyof Omit<HeroDatabaseEntry, 'key' | 'builds'>, value: any) => {
        setDatabase(db => db.map(h => {
            if (h.key !== key) return h;
            
            const changes: Partial<HeroDatabaseEntry> = { [field]: value, isUserModified: true };
            
            // Auto-set score for new heroes when tier is changed and score is 0
            if (field === 'tier' && h.key.startsWith('nuevo-heroe-') && (h.score === 0 || h.score === DEFAULT_SCORES_BY_TIER[h.tier])) {
                const newScore = DEFAULT_SCORES_BY_TIER[value as string] || 0;
                if (newScore > 0) {
                    changes.score = newScore;
                }
            }

            let newHero = { ...h, ...changes };
            
            if (newHero.sourceData && newHero.sourceData[field] !== undefined) {
                const newSourceData = { ...newHero.sourceData };
                delete (newSourceData as any)[field];
                newHero.sourceData = Object.keys(newSourceData).length > 0 ? (newSourceData as any) : undefined;
            }
            return newHero;
        }));
    }, [setDatabase]);
    
    const handleUpdateBuildField = useCallback((key: string, buildIndex: number, field: keyof HeroDatabaseEntry['builds'][0], value: any) => {
        setDatabase(db => db.map(h => {
            if (h.key !== key) return h;
            
            const newBuilds = JSON.parse(JSON.stringify(h.builds));
            if (!newBuilds[buildIndex]) return h;

            newBuilds[buildIndex][field] = value;
            
            const newHero = { ...h, builds: newBuilds, isUserModified: true };

            if (newHero.sourceData?.builds) {
                 const newSourceData = { ...newHero.sourceData };
                 delete newSourceData.builds;
                 newHero.sourceData = Object.keys(newSourceData).length > 0 ? (newSourceData as any) : undefined;
            }
            
            return newHero;
        }));
    }, [setDatabase]);

    const handleUpdateAllBuildsEngravingNodes = useCallback((key: string, newNodes: EngravingNode[]) => {
        setDatabase(db => db.map(h => {
            if (h.key !== key) return h;

            const newBuilds = h.builds.map(build => ({
                ...build,
                engravingNodes: newNodes
            }));
            
            const newHero = { ...h, builds: newBuilds, isUserModified: true };
            
            if (newHero.sourceData?.builds) {
                const newSourceData = { ...newHero.sourceData };
                delete newSourceData.builds;
                newHero.sourceData = Object.keys(newSourceData).length > 0 ? (newSourceData as any) : undefined;
            }

            return newHero;
        }));
    }, [setDatabase]);

    const handleAddBuild = (key: string) => {
        setDatabase(db => db.map(h => {
            if (h.key !== key) return h;
            const existingNodes = h.builds[0]?.engravingNodes || [];
            const newBuild = {
                group: 'N/A',
                priorityComment: '',
                requiredSI: 0,
                requiredFurniture: 0,
                requiredEngravings: 0,
                engravingNodes: existingNodes, // Use nodes from first build
                isAlternative: h.builds.length > 0,
            };
            return { ...h, builds: [...(h.builds || []), newBuild], isUserModified: true };
        }));
    };

    const handleDeleteBuild = (key: string, buildIndex: number) => {
        setDatabase(db => db.map(h => {
            if (h.key !== key) return h;
            const newBuilds = h.builds.filter((_, index) => index !== buildIndex);
            return { ...h, builds: newBuilds, isUserModified: true };
        }));
    };

    const handleAcceptSourceChange = useCallback((key: string, field: keyof Omit<HeroDatabaseEntry, 'key'>) => {
        const hero = database.find(h => h.key === key);
        if (hero && hero.sourceData && (hero.sourceData as any)[field] !== undefined) {
            if (field === 'builds') {
                const sourceValue = hero.sourceData.builds;
                setDatabase(db => db.map(h => {
                    if (h.key !== key) return h;
                    
                    const newHero: HeroDatabaseEntry = { ...h, builds: sourceValue!, isUserModified: true };

                    if (newHero.sourceData) {
                        const { builds, ...rest } = newHero.sourceData;
                        newHero.sourceData = Object.keys(rest).length > 0 ? rest : undefined;
                    }
                    
                    return newHero;
                }));
            } else {
                handleUpdateField(key, field as any, (hero.sourceData as any)[field]);
            }
        }
    }, [database, handleUpdateField, setDatabase]);

    const handleAcceptAllForHero = useCallback((key: string) => {
        setDatabase(db => db.map(hero => {
            if (hero.key === key && hero.sourceData) {
                return { ...hero, ...hero.sourceData, isUserModified: true, sourceData: undefined };
            }
            return hero;
        }));
        setMismatchModalHeroKey(null);
    }, [setDatabase]);

    const handleAddNewHero = () => {
        const newKey = `nuevo-heroe-${Date.now()}`;
        setDatabase(db => [{
            key: newKey,
            russianName: '',
            spanishName: 'Nuevo Héroe',
            faction: 'Desconocida',
            isAwakened: false,
            isHidden: false,
            tier: 'N/A',
            score: 0,
            rankingComments: '',
            builds: [],
            portraitStatus: 'missing',
            isUserModified: true,
            status: 'active',
        }, ...db]);
        setExpandedRows(prev => new Set(prev).add(newKey));
    };
    
    const confirmDeleteHero = () => {
        if (heroToDelete) {
            setDatabase(db => db.filter(h => h.key !== heroToDelete.key));
            setHeroToDelete(null);
        }
    };

    const handleToggleSelection = (key: string) => {
        setSelectedKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedKeys.size === sortedAndFilteredDatabase.length) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(sortedAndFilteredDatabase.map(h => h.key)));
        }
    };

    const toggleExpandRow = (key: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    const handleAcceptSelected = () => {
        setDatabase(db => db.map(hero => {
            if (selectedKeys.has(hero.key) && hero.sourceData) {
                return { ...hero, ...hero.sourceData, isUserModified: true, sourceData: undefined };
            }
            return hero;
        }));
        setSelectedKeys(new Set());
    };
    
    const handleBulkVisibility = (hide: boolean) => {
        setDatabase(db => db.map(hero => {
            if (selectedKeys.has(hero.key)) {
                return { ...hero, isUserModified: true, isHidden: hide };
            }
            return hero;
        }));
        setSelectedKeys(new Set());
    };

    const handleBulkDelete = () => {
        setDatabase(db => db.filter(h => !selectedKeys.has(h.key)));
        setSelectedKeys(new Set());
        setIsConfirmingBulkDelete(false);
    };
    
    const baseElementClasses = "border border-gray-700/50 rounded-md px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all";
    const textInputClasses = `${baseElementClasses} bg-gray-900/50 focus:bg-gray-800/80`;
    const isAllVisibleSelected = selectedKeys.size > 0 && selectedKeys.size === sortedAndFilteredDatabase.length;
    const currentHeroForModal = useMemo(() => {
        if (!activeModal) return null;
        return database.find(h => h.key === activeModal.key);
    }, [activeModal, database]);

    const columns = ['Retrato', 'Spanish Name', 'Russian Name', 'Score', 'Tier', 'Facción', 'Despertado', 'Acciones'];
    
    const currentEditingNodes = useMemo(() => {
        if (!editingNodesFor) return [];
        const hero = database.find(h => h.key === editingNodesFor.heroKey);
        // Always get nodes from the first build as they are now common
        return hero?.builds[0]?.engravingNodes || [];
    }, [editingNodesFor, database]);

    const isHideShowDisabled = selectionVisibilityState === 'none';
    const showActionIsShow = selectionVisibilityState === 'hidden';

    return (
        <div className="flex flex-col h-full">
            <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl mb-6 border border-gray-700/80">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white text-shadow-heavy">Base de Datos de Héroes</h1>
                        <p className="text-base text-gray-300">
                            Última sincronización: {lastSync ? new Date(lastSync).toLocaleString('es-ES') : 'Nunca'}
                        </p>
                    </div>
                     <div className="flex items-center gap-4 justify-end flex-wrap">
                        <div className="flex items-center bg-gray-900/60 p-1 rounded-lg border border-gray-700/50 shadow-md space-x-1">
                            <button
                                onClick={handleAcceptSelected}
                                disabled={selectedKeys.size === 0}
                                title="Aceptar cambios de la guía para la selección"
                                className="px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all duration-300 disabled:cursor-not-allowed bg-blue-600 text-white enabled:hover:bg-blue-700 enabled:hover:shadow-[0_0_10px_rgba(59,130,246,0.6)] disabled:bg-gray-700 disabled:text-gray-400"
                            >
                                <i className="fas fa-check-double"></i>
                                <span>Aceptar ({selectedKeys.size})</span>
                            </button>
                            <button
                                onClick={() => handleBulkVisibility(!showActionIsShow)}
                                disabled={isHideShowDisabled}
                                title={showActionIsShow ? "Mostrar héroes seleccionados" : "Ocultar héroes seleccionados"}
                                className="px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all duration-300 disabled:cursor-not-allowed bg-gray-700 text-gray-200 enabled:hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                            >
                                {showActionIsShow ? (
                                    <><i className="fas fa-eye"></i><span>Mostrar</span></>
                                ) : (
                                    <><i className="fas fa-eye-slash"></i><span>Ocultar</span></>
                                )}
                            </button>
                            <button
                                onClick={() => setIsConfirmingBulkDelete(true)}
                                disabled={selectedKeys.size === 0}
                                title="Borrar héroes seleccionados"
                                className="px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all duration-300 disabled:cursor-not-allowed bg-red-900 text-red-300 enabled:hover:bg-red-800 enabled:hover:text-white enabled:hover:shadow-[0_0_10px_rgba(153,27,27,0.6)] disabled:bg-gray-700 disabled:text-gray-400"
                            >
                                <i className="fas fa-trash"></i>
                                <span>Borrar ({selectedKeys.size})</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleAddNewHero} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-all duration-300 hover:shadow-[0_0_15px_rgba(74,222,128,0.6)]">
                                <i className="fas fa-plus"></i>
                                <span>Añadir Héroe</span>
                            </button>
                            <button onClick={() => onSync(true)} disabled={isSyncing} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-all duration-300 disabled:bg-gray-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.6)]">
                                {isSyncing ? <LoadingSpinner className="h-5 w-5" /> : <i className="fas fa-sync-alt"></i>}
                                <span>Forzar Sincronización</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full pt-4 border-t border-gray-700/50 mt-4">
                    <div className="relative w-full sm:w-auto">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-gray-900/50 border border-gray-700/50 rounded-md pl-10 pr-4 py-2 text-white w-full sm:w-72 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-x-6 gap-y-2 flex-wrap justify-center sm:justify-end">
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-3 text-sm text-gray-300">Mostrar Incompletos</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showIncompleteOnly} onChange={() => setShowIncompleteOnly(!showIncompleteOnly)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${showIncompleteOnly ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showIncompleteOnly ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-3 text-sm text-gray-300">Mostrar con Cambios</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showMismatchesOnly} onChange={() => setShowMismatchesOnly(!showMismatchesOnly)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${showMismatchesOnly ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showMismatchesOnly ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                         <label className="flex items-center cursor-pointer">
                            <span className="mr-3 text-sm text-gray-300">Mostrar Ocultos</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={showHidden} onChange={() => setShowHidden(!showHidden)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${showHidden ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showHidden ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>
                 {syncError && <div className="mt-4 bg-red-900 text-red-200 p-3 rounded-md">{syncError}</div>}
            </div>
            
            <div className="flex-grow overflow-auto">
                <table className="min-w-full text-sm text-left">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-b from-gray-900 to-gray-800 border-b-2 border-red-700">
                            <th className="p-3 w-px text-center">
                                <input
                                    type="checkbox"
                                    checked={isAllVisibleSelected}
                                    onChange={handleToggleSelectAll}
                                    className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500"
                                />
                            </th>
                             {columns.map(col => {
                                const key = col.toLowerCase().replace(/ /g, '') as SortKey;
                                const isSortable = ['spanishname', 'russianname', 'score', 'tier'].includes(key);
                                return (
                                    <th key={col} className={`p-3 text-center font-bold text-gray-300 uppercase tracking-wider ${isSortable ? 'cursor-pointer hover:bg-gray-700/50' : ''}`} onClick={() => isSortable && requestSort(key)}>
                                        {col}
                                        {isSortable && sortConfig.key === key && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredDatabase.map(hero => {
                            const hasMismatches = hero.sourceData && Object.keys(hero.sourceData).length > 0;
                            const scoreRange = getTierScoreRange(hero.tier);
                            const isScoreOutOfRange = hero.tier !== 'N/A' && (hero.score < scoreRange.min || (hero.tier === 'SSS' ? hero.score > scoreRange.max : hero.score >= scoreRange.max));

                            return (
                                <React.Fragment key={hero.key}>
                                    <tr className={`
                                        transition-colors border-b border-gray-700/50 
                                        ${hero.status === 'removed_from_source' 
                                            ? 'bg-red-900/40 opacity-60 line-through text-gray-500 pointer-events-none' 
                                            : `bg-gray-800/80 hover:bg-gray-700/80 ${hasMismatches ? 'mismatch-row-animated' : ''}`
                                        }
                                        ${hero.isHidden && hero.status !== 'removed_from_source' ? 'opacity-50' : ''}
                                    `}>
                                        <td className="p-2 align-middle text-center">
                                            <input type="checkbox" checked={selectedKeys.has(hero.key)} onChange={() => handleToggleSelection(hero.key)} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500"/>
                                        </td>
                                        <td className="p-2 align-top"><HeroPortrait heroName={hero.spanishName} className="h-12 w-12 rounded-full" /></td>
                                        {(['spanishName', 'russianName'] as const).map(field => (
                                            <td key={field} className="p-2 align-top">
                                                <div className="flex flex-col gap-1"><input type="text" value={hero[field]} onChange={e => handleUpdateField(hero.key, field, e.target.value)} className={textInputClasses} /></div>
                                            </td>
                                        ))}
                                        <td className="p-2 align-top text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <input type="number" step="0.01" value={hero.score} onChange={e => handleUpdateField(hero.key, 'score', parseFloat(e.target.value) || 0)} className={`${textInputClasses} w-20`} />
                                                {isScoreOutOfRange && (
                                                    <div className="bg-red-900/50 border border-red-700 p-1.5 rounded-md text-xs flex items-center justify-between gap-2 animate-[fade-in_0.3s_ease-out]">
                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                            <i className="fas fa-exclamation-triangle text-red-300 fa-fw"></i>
                                                            <span className="font-semibold text-red-300 truncate" title={`Debe estar entre ${scoreRange.min.toFixed(2)} y ${hero.tier === 'SSS' ? scoreRange.max.toFixed(2) : (scoreRange.max - 0.01).toFixed(2)}`}>
                                                                Fuera de rango
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleUpdateField(hero.key, 'score', scoreRange.min)}
                                                            className="bg-red-600 hover:bg-red-700 text-white rounded px-2 py-0.5 text-xs font-bold shrink-0"
                                                            title={`Fijar a ${scoreRange.min}`}
                                                        >
                                                            Corregir
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-2 align-top text-center"><div className="flex flex-col items-center gap-1"><button onClick={(e) => setActiveModal({ type: 'tier', key: hero.key, triggerEl: e.currentTarget })} className={`${baseElementClasses} font-bold ${getTierStyling(hero.tier)} w-24 text-center flex justify-center items-center`}><span>{hero.tier}</span></button></div></td>
                                        <td className="p-2 align-top text-center"><div className="flex flex-col items-center gap-1"><button onClick={(e) => setActiveModal({ type: 'faction', key: hero.key, triggerEl: e.currentTarget })} className={`${baseElementClasses} bg-gray-900/50 hover:bg-gray-800/80 flex items-center gap-2 w-full`}><FactionIcon faction={hero.faction} className="w-6 h-6"/><span className="flex-grow text-left">{hero.faction}</span></button></div></td>
                                        <td className="p-2 align-middle">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => handleUpdateField(hero.key, 'isAwakened', !hero.isAwakened)}
                                                    className={`
                                                        w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300
                                                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
                                                        ${
                                                            hero.isAwakened
                                                            ? 'awakened-db-glow bg-purple-600 focus:ring-purple-400'
                                                            : 'bg-gray-600 hover:bg-gray-500 focus:ring-gray-500'
                                                        }
                                                    `}
                                                    aria-pressed={hero.isAwakened}
                                                    title={hero.isAwakened ? 'Marcar como no despertado' : 'Marcar como despertado'}
                                                >
                                                    <div className="flex items-center justify-center">
                                                    {hero.isAwakened ? <i className="fas fa-check text-white text-lg"></i> : <i className="fas fa-times text-white text-lg"></i>}
                                                    </div>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-2 align-middle text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                 <button
                                                    onClick={() => handleUpdateField(hero.key, 'isHidden', !hero.isHidden)}
                                                    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-xs"
                                                    title={hero.isHidden ? 'Mostrar héroe' : 'Ocultar héroe'}
                                                >
                                                    <i className={`fas ${hero.isHidden ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                                </button>
                                                {hasMismatches && (
                                                    <button onClick={() => setMismatchModalHeroKey(hero.key)} className="bg-gray-600 hover:bg-gray-500 font-bold py-1 px-3 rounded-md text-xs mismatch-button-animated" title="Ver diferencias con la guía">
                                                        <i className="fas fa-lightbulb text-yellow-300"></i>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleExpandRow(hero.key)}
                                                    className={`${
                                                        expandedRows.has(hero.key)
                                                            ? 'bg-gray-700 hover:bg-gray-600' // Ocultar
                                                            : 'bg-red-600 hover:bg-red-500' // Detalles
                                                    } text-white font-bold py-1 px-3 rounded-md text-xs transition-colors`}
                                                >
                                                    {expandedRows.has(hero.key) ? 'Ocultar' : 'Detalles'}
                                                </button>
                                                {hero.status === 'removed_from_source' && <button onClick={() => setHeroToDelete(hero)} className="bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-xs" title="Borrar héroe de la base de datos local">Borrar</button>}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.has(hero.key) && (
                                        <tr className="bg-gray-800/50">
                                            <td colSpan={columns.length + 1}>
                                                <div className="bg-gray-900 rounded-lg border-2 border-red-700 shadow-2xl p-6 m-2 animate-[fade-in_0.3s_ease-out]">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="md:col-span-1">
                                                            <h4 className="font-bold text-lg text-white mb-3 border-l-4 border-red-600 pl-3">Comentarios de Ranking</h4>
                                                            <div className="flex flex-col gap-1"><textarea value={hero.rankingComments} onChange={e => handleUpdateField(hero.key, 'rankingComments', e.target.value)} className={`${textInputClasses} h-full min-h-[150px] resize-y`} /></div>
                                                        </div>
                                                        <div className="md:col-span-1 bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 h-full flex flex-col">
                                                            <div className="flex-shrink-0">
                                                                <h4 className="font-bold text-lg text-white mb-3 border-l-4 border-red-600 pl-3">Nodos de Grabado (Común)</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className="flex-grow bg-gray-800 p-1.5 rounded-md min-h-[28px] flex flex-wrap gap-1 border border-gray-600">
                                                                        {(hero.builds[0]?.engravingNodes || []).map((node, i) => (
                                                                            <span key={i} className="bg-blue-800 text-blue-200 text-xs px-2 py-0.5 rounded">{node.translated || node.original}</span>
                                                                        ))}
                                                                    </div>
                                                                    <button onClick={() => setEditingNodesFor({ heroKey: hero.key, buildIndex: 0 })} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded text-xs">Editar</button>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 pt-4 border-t border-gray-700/80 flex-grow">
                                                                <h4 className="font-bold text-lg text-white mb-3 border-l-4 border-red-600 pl-3">Builds Recomendadas</h4>
                                                                <div className="flex flex-col gap-3">
                                                                    {(hero.builds || []).map((build, buildIndex) => (
                                                                        <div key={buildIndex} className="bg-gray-800/50 p-3 rounded-md border border-gray-600/50 relative">
                                                                            <button onClick={() => handleDeleteBuild(hero.key, buildIndex)} className="absolute -top-2 -right-2 bg-red-700 hover:bg-red-600 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs z-10">&times;</button>
                                                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                                                <div>
                                                                                    <label className="text-xs text-gray-400 block mb-1">SI</label>
                                                                                    <ValueSelector value={build.requiredSI} onChange={v => handleUpdateBuildField(hero.key, buildIndex, 'requiredSI', v)} options={[0, 20, 30, 40]} allowManualInput />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs text-gray-400 block mb-1">Muebles</label>
                                                                                    <ValueSelector value={build.requiredFurniture} onChange={v => handleUpdateBuildField(hero.key, buildIndex, 'requiredFurniture', v)} options={[0, 3, 9]} allowManualInput />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs text-gray-400 block mb-1">Grabado</label>
                                                                                    <ValueSelector value={build.requiredEngravings} onChange={v => handleUpdateBuildField(hero.key, buildIndex, 'requiredEngravings', v)} options={[0, 30, 60]} allowManualInput />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="mt-auto pt-4 space-y-2 flex-shrink-0">
                                                                <button onClick={() => handleAddBuild(hero.key)} className="text-sm bg-red-800/70 hover:bg-red-800 border border-red-700/50 text-white font-bold py-2 px-3 rounded w-full">+ Añadir Build</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {activeModal && currentHeroForModal && (
                <MiniModalSelector
                    onClose={() => setActiveModal(null)}
                    options={activeModal.type === 'tier' ? TIER_OPTIONS : FACTION_OPTIONS}
                    onSelect={(value) => handleUpdateField(activeModal.key, activeModal.type, value)}
                    selectedValue={currentHeroForModal[activeModal.type] as string}
                    triggerEl={activeModal.triggerEl}
                    renderOption={(option, isSelected) => {
                        if (activeModal.type === 'tier') {
                            return ( <div className={`p-1 rounded w-full text-center ${getTierStyling(option)} ${isSelected ? 'ring-2 ring-white' : ''}`}>{option}</div> );
                        } else { // faction
                            return ( <div className={`flex items-center gap-2 p-1 rounded w-full hover:bg-gray-700 ${isSelected ? 'bg-red-800' : ''}`}><FactionIcon faction={option} className="w-6 h-6" /><span>{option}</span></div> );
                        }
                    }}
                    modalClassName={activeModal.type === 'tier' ? 'w-24' : 'w-40'}
                />
            )}
             <ConfirmationModal isOpen={!!heroToDelete} onClose={() => setHeroToDelete(null)} onConfirm={confirmDeleteHero} title="Confirmar Borrado de Héroe">
                <p>¿Estás seguro de que quieres eliminar permanentemente a <span className="font-bold text-white">{heroToDelete?.spanishName}</span> de tu base de datos local?</p>
                <p className="mt-2 text-sm text-gray-400">Este héroe ha sido eliminado de la hoja de cálculo de origen. Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
            <ConfirmationModal
                isOpen={isConfirmingBulkDelete}
                onClose={() => setIsConfirmingBulkDelete(false)}
                onConfirm={handleBulkDelete}
                title={`Confirmar Borrado de ${selectedKeys.size} Héroe(s)`}
            >
                <p>¿Estás seguro de que quieres eliminar permanentemente los <span className="font-bold text-white">{selectedKeys.size} héroe(s)</span> seleccionados de tu base de datos local?</p>
                <p className="mt-4 font-bold">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
            <EngravingNodeSelector 
                isOpen={!!editingNodesFor}
                onClose={() => setEditingNodesFor(null)}
                initialNodes={currentEditingNodes}
                onSave={(newNodes) => {
                    if (editingNodesFor) {
                        handleUpdateAllBuildsEngravingNodes(editingNodesFor.heroKey, newNodes);
                    }
                    setEditingNodesFor(null);
                }}
                customNodes={customNodes}
                setCustomNodes={setCustomNodes}
            />
            <MismatchDetailsModal
                isOpen={!!mismatchModalHero}
                onClose={() => setMismatchModalHeroKey(null)}
                hero={mismatchModalHero}
                onAcceptField={handleAcceptSourceChange}
                onAcceptAll={handleAcceptAllForHero}
            />
            <style>
                {`
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes slide-up { from { transform: translateY(2rem) scale(0.95); opacity: 0; } to { opacity: 1; } }
                `}
            </style>
        </div>
    );
};

export default DatabasePage;