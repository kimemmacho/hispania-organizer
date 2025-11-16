import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { HeroDatabaseEntry, Hero } from '../types';
import { LoadingSpinner } from './icons';
import HeroPortrait from './HeroPortrait';

// Simplified types from DatabasePage for this component
type SortKey = 'spanishName' | 'russianName' | 'score' | 'tier';
type SortDirection = 'asc' | 'desc';

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

interface CustomInfographicsModalProps {
    isOpen: boolean;
    onClose: () => void;
    database: HeroDatabaseEntry[];
    onConfirm: (selectedHeroes: Hero[]) => void;
}

const CustomInfographicsModal: React.FC<CustomInfographicsModalProps> = ({ isOpen, onClose, database, onConfirm }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'score', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKeys, setSelectedKeys] = useState(new Set<string>());

    const sortedAndFilteredDatabase = useMemo(() => {
        let filteredHeroes = database.filter(h => !h.isHidden);

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredHeroes = filteredHeroes.filter(hero =>
                hero.spanishName.toLowerCase().includes(lowercasedFilter) ||
                hero.russianName.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        filteredHeroes.sort((a, b) => {
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
        
        return filteredHeroes;
    }, [database, sortConfig, searchTerm]);

    const requestSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
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
    
    const handleConfirm = () => {
        const selectedHeroesDb = database.filter(h => selectedKeys.has(h.key));
        const selectedHeroes: Hero[] = selectedHeroesDb.map(dbEntry => ({
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
        onConfirm(selectedHeroes);
        setSelectedKeys(new Set());
    };
    
    if (!isOpen) return null;
    
    const isAllVisibleSelected = selectedKeys.size > 0 && selectedKeys.size === sortedAndFilteredDatabase.length;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 ease-out animate-[fade-in_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700/80 w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Seleccionar Héroes para Infografía</h2>
                        <p className="text-gray-400 text-sm">Elige los héroes que quieres incluir. Se ordenarán por puntuación en la imagen final.</p>
                    </div>
                     <div className="relative flex-shrink-0">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-gray-900/50 border border-gray-700/50 rounded-md pl-10 pr-4 py-2 text-white w-full sm:w-72 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                    </div>
                </header>
                <div className="flex-grow overflow-auto">
                     <table className="min-w-full text-sm text-left">
                        <thead className="sticky top-0 z-10 bg-gray-800">
                            <tr>
                                <th className="p-3 w-px text-center">
                                    <input type="checkbox" checked={isAllVisibleSelected} onChange={handleToggleSelectAll} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500" />
                                </th>
                                <th className="p-3">Héroe</th>
                                <th className="p-3 cursor-pointer hover:bg-gray-700/50" onClick={() => requestSort('russianName')}>
                                    Nombre Ruso {sortConfig.key === 'russianName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="p-3 cursor-pointer hover:bg-gray-700/50" onClick={() => requestSort('tier')}>
                                    Tier {sortConfig.key === 'tier' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="p-3 cursor-pointer hover:bg-gray-700/50" onClick={() => requestSort('score')}>
                                    Puntuación {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                            </tr>
                        </thead>
                         <tbody>
                            {sortedAndFilteredDatabase.map(hero => (
                                <tr key={hero.key} className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer" onClick={() => handleToggleSelection(hero.key)}>
                                    <td className="p-2 align-middle text-center">
                                        <input type="checkbox" readOnly checked={selectedKeys.has(hero.key)} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500 pointer-events-none" />
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center gap-3">
                                            <HeroPortrait heroName={hero.spanishName} className="h-10 w-10 rounded-full" />
                                            <div>
                                                <div className="font-bold">{hero.spanishName}</div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <FactionIcon faction={hero.faction} className="w-4 h-4" />
                                                    <span>{hero.faction}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-2 align-middle text-gray-400">{hero.russianName}</td>
                                    <td className="p-2 align-middle"><span className={`px-2 py-0.5 rounded-md text-xs font-bold ${getTierStyling(hero.tier)}`}>{hero.tier}</span></td>
                                    <td className="p-2 align-middle font-mono font-bold text-cyan-400">{hero.score.toFixed(2)}</td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                </div>
                 <footer className="bg-gray-900/50 px-6 py-4 flex justify-between items-center flex-shrink-0">
                    <div className="text-white font-semibold">
                        {selectedKeys.size} héroe(s) seleccionado(s)
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancelar</button>
                        <button onClick={handleConfirm} disabled={selectedKeys.size === 0} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">Generar Infografía</button>
                    </div>
                </footer>
            </div>
            <style>
                {`
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                `}
            </style>
        </div>,
        document.body
    );
};

export default CustomInfographicsModal;