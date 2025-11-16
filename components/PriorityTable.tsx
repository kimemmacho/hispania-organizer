import React, { useMemo, useCallback } from 'react';
import { PriorityHero, PlayerData, PlayerHeroData, EngravingNode } from '../types';
import { LoadingSpinner, CheckBadgeIcon } from './icons';
import HeroPortrait from './HeroPortrait';
import { GROUP_ORDER } from '../constants';

interface PriorityTableProps {
    heroes: PriorityHero[];
    playerData: PlayerData;
    onPlayerDataChange: (heroName: string, field: keyof PlayerHeroData, value: any) => void;
    onOwnershipToggleRequest: (hero: PriorityHero) => void;
    onTranslateComment: (heroOriginalName: string) => void;
    translatingHeroName: string | null;
    onHeroCompletionRequest: (hero: PriorityHero) => void;
    disappearingKeys: Set<string>;
}

const getGroupClass = (group: string): string => {
    switch (group) {
        case 'SSS': return 'bg-blue-600 text-white shadow-lg';
        case 'SS': return 'bg-green-700 text-white shadow-lg';
        case 'S': return 'bg-lime-600 text-black shadow-lg';
        case 'A': return 'bg-yellow-500 text-black shadow-lg';
        case 'B': return 'bg-orange-600 text-white shadow-lg';
        case 'C': return 'bg-red-700 text-white shadow-lg';
        case 'D': return 'bg-amber-800 text-white shadow-lg';
        default: return 'bg-gray-700 text-white';
    }
};

const getGroupHeaderClass = (group: string): string => {
    switch (group) {
        case 'SSS': return 'bg-blue-900/70';
        case 'SS': return 'bg-green-900/70';
        case 'S': return 'bg-lime-800/60 text-lime-100';
        case 'A': return 'bg-yellow-800/60 text-yellow-100';
        case 'B': return 'bg-orange-900/70';
        case 'C': return 'bg-red-900/70';
        case 'D': return 'bg-amber-900/70';
        default: return 'bg-gray-700';
    }
};

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

const FactionIcon: React.FC<{ faction: string }> = ({ faction }) => {
    if (faction === 'Desconocida') {
        return <div className="h-6 w-6 flex items-center justify-center bg-gray-700 rounded-full text-xs font-bold text-gray-400" title="Facción Desconocida">?</div>;
    }
    const baseUrl = "https://ik.imagekit.io/optimizerhispania/";
    const iconFileName = faction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (!iconFileName) return null;
    const iconUrl = `${baseUrl}${iconFileName}.png`;
    return <img src={iconUrl} alt={faction} title={faction} className="h-6 w-6" />;
};


// New component for quick value selection
interface ValueSelectorProps {
    value: number;
    onChange: (value: number) => void;
    options: number[];
    allowManualInput?: boolean;
}

const ValueSelector: React.FC<ValueSelectorProps> = ({ value, onChange, options, allowManualInput = false }) => {
    return (
        <div className="flex flex-col items-center space-y-2">
            <div className="flex flex-wrap justify-center gap-1">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors w-9 ${
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
                    className="w-20 bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 text-center"
                    min="0"
                    step="1"
                    placeholder="U"
                />
            )}
        </div>
    );
};

const InvestmentRequiredDisplay: React.FC<{ hero: PriorityHero }> = ({ hero }) => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div>
                {hero.requiredSI > 0 && <span className="font-bold text-cyan-400">SI{hero.requiredSI}</span>}
                {hero.requiredFurniture > 0 && <span className="font-bold text-lime-400 ml-2">{hero.requiredFurniture}F</span>}
                {hero.requiredEngravings > 0 && <span className="font-bold text-yellow-400 ml-2">E{hero.requiredEngravings}</span>}
                 {hero.requiredSI === 0 && hero.requiredFurniture === 0 && hero.requiredEngravings === 0 && <span>-</span>}
            </div>
            {hero.engravingNodes.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1">
                    {hero.engravingNodes.map((node, i) => (
                        <React.Fragment key={i}>
                            <span className={`text-xs px-2 py-1 rounded-md ${node.found ? 'bg-blue-800 text-blue-200' : 'bg-red-800 text-white'}`}>
                                {node.found ? node.translated : node.original}
                            </span>
                            {i < hero.engravingNodes.length - 1 && <span className="text-gray-500">→</span>}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};


const PriorityTable: React.FC<PriorityTableProps> = ({ heroes, playerData, onPlayerDataChange, onOwnershipToggleRequest, onTranslateComment, translatingHeroName, onHeroCompletionRequest, disappearingKeys }) => {
    
    const groupedHeroes = useMemo(() => {
        const sortedHeroes = [...heroes].sort((a, b) => {
            if (a.isAlternative !== b.isAlternative) {
                return a.isAlternative ? 1 : -1;
            }
            return b.score - a.score;
        });

        const groups = new Map<string, PriorityHero[]>();
        sortedHeroes.forEach(hero => {
            const groupList = groups.get(hero.group);
            if (groupList) {
                groupList.push(hero);
            } else {
                groups.set(hero.group, [hero]);
            }
        });
        
        return new Map([...groups.entries()].sort((a, b) => (GROUP_ORDER[a[0]] || 99) - (GROUP_ORDER[b[0]] || 99)));
    }, [heroes]);

    return (
        <div className="space-y-8">
            {Array.from(groupedHeroes.entries()).map(([group, heroGroup]) => {
                const headerClass = getGroupHeaderClass(group);
                return (
                    <div key={group}>
                        <h2 className={`text-2xl font-bold p-3 rounded-t-lg ${getGroupClass(group)}`}>Tier {group}</h2>
                        <div className="overflow-x-auto bg-gray-800 rounded-b-lg shadow-md">
                            <table className="min-w-full divide-y divide-gray-700 text-sm">
                                <thead className={`text-xs uppercase text-gray-300 ${headerClass}`}>
                                    <tr>
                                        <th rowSpan={2} className="px-4 py-3 text-center font-medium border-r border-gray-900/50">Héroe</th>
                                        <th rowSpan={2} className="px-4 py-3 text-center font-medium border-r border-gray-900/50">Puntuación</th>
                                        <th rowSpan={2} className="px-4 py-3 text-center font-medium border-r border-gray-900/50">Inversión Requerida</th>
                                        <th colSpan={3} className="py-2 text-center font-medium border-b border-gray-900/50">Mi Progreso</th>
                                        <th rowSpan={2} className="px-4 py-3 text-left font-medium w-1/3 border-l border-gray-900/50">Comentarios de Prioridad</th>
                                    </tr>
                                    <tr>
                                        <th className="px-2 py-2 text-center font-medium">SI</th>
                                        <th className="px-2 py-2 text-center font-medium">Muebles</th>
                                        <th className="px-2 py-2 text-center font-medium">Grabado</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                    {heroGroup.map((hero) => {
                                        const pData = playerData[hero.originalName] || { owned: true, si: 0, furniture: 0, engravings: 0 };
                                        const isCompleted = pData.owned &&
                                                            pData.si >= hero.requiredSI &&
                                                            pData.furniture >= hero.requiredFurniture &&
                                                            pData.engravings >= hero.requiredEngravings;
                                        
                                        const heroKey = `${hero.originalName}-${hero.requiredSI}-${hero.requiredFurniture}-${hero.requiredEngravings}-${hero.isAlternative}`;
                                        const isDisappearing = disappearingKeys.has(heroKey);

                                        return (
                                            <tr 
                                                key={heroKey}
                                                className={`transition-all duration-300 ${
                                                    isCompleted && !isDisappearing ? 'filter grayscale opacity-50' : 'hover:bg-gray-700/50'
                                                } ${isDisappearing ? 'hero-disappearing' : ''}`}
                                            >
                                                <td className={`px-4 py-4 align-top border-r border-gray-700`}>
                                                    <div className="flex flex-col items-center w-24 mx-auto">
                                                        <div 
                                                            onClick={() => onOwnershipToggleRequest(hero)}
                                                            title={pData.owned ? 'Marcar como no obtenido' : 'Marcar como obtenido'}
                                                            className={`w-16 h-16 bg-gray-900 rounded-full mb-2 flex items-center justify-center border-2 ${getTierBorderClass(hero.group)} overflow-hidden cursor-pointer transition-all duration-300 ease-in-out hover:scale-110 ${!pData.owned ? 'grayscale opacity-60' : ''}`}
                                                        >
                                                            <HeroPortrait heroName={hero.name} className="h-full w-full" />
                                                        </div>
                                                        <div className={`text-center ${hero.isNameTranslated ? 'text-white' : 'text-red-400'}`}>
                                                            <div className="flex items-center justify-center gap-2">
                                                                <FactionIcon faction={hero.faction} />
                                                                <span className="font-bold text-base">{hero.name}</span>
                                                            </div>
                                                            {hero.isAlternative && <span className="block mt-1 text-xs text-yellow-400 font-normal">(Mejorado)</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap align-middle text-center border-r border-gray-700">
                                                    <div>
                                                        <div className={`text-lg font-bold text-cyan-400 ${hero.score === 7 ? 'perfect-hero-glow' : ''}`}>
                                                            {(hero.score || 0).toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            ({(((hero.score || 0) / 7) * 100).toFixed(1)}%)
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top text-center border-r border-gray-700">
                                                   <div className="flex flex-col items-center gap-2">
                                                        <InvestmentRequiredDisplay hero={hero} />
                                                        {!isCompleted && pData.owned && (
                                                            <button
                                                                onClick={() => onHeroCompletionRequest(hero)}
                                                                className="mt-2 text-green-400 hover:text-green-300 transform transition-all duration-300 ease-in-out hover:scale-150 hover:drop-shadow-[0_0_7px_rgba(74,222,128,0.8)]"
                                                                title="Marcar como completado"
                                                            >
                                                                <CheckBadgeIcon className="h-7 w-7" />
                                                            </button>
                                                        )}
                                                   </div>
                                                </td>
                                                <td className="px-2 py-4 whitespace-nowrap align-top">
                                                    <ValueSelector
                                                        value={pData.si}
                                                        onChange={val => onPlayerDataChange(hero.originalName,'si', val)}
                                                        options={[0, 20, 30, 40]}
                                                        allowManualInput={true}
                                                    />
                                                </td>
                                                <td className="px-2 py-4 whitespace-nowrap align-top">
                                                    <ValueSelector
                                                        value={pData.furniture}
                                                        onChange={val => onPlayerDataChange(hero.originalName, 'furniture', val)}
                                                        options={[0, 3, 9]}
                                                        allowManualInput={(pData.furniture || 0) < 9}
                                                    />
                                                </td>
                                                <td className="px-2 py-4 whitespace-nowrap align-top">
                                                    <ValueSelector
                                                        value={pData.engravings}
                                                        onChange={val => onPlayerDataChange(hero.originalName, 'engravings', val)}
                                                        options={[0, 30, 60]}
                                                        allowManualInput={true}
                                                    />
                                                </td>


                                                <td className="px-4 py-4 text-gray-300 align-top border-l border-gray-700">
                                                    <div className="flex flex-col items-start">
                                                        <p className="whitespace-normal">{hero.priorityComment}</p>
                                                        {translatingHeroName === hero.originalName ? (
                                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                                                                <LoadingSpinner className="h-3 w-3" /><span>Traduciendo...</span>
                                                            </div>
                                                        ) : (
                                                            !hero.commentIsTranslated && hero.priorityComment && hero.priorityComment.trim() && (
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
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PriorityTable;