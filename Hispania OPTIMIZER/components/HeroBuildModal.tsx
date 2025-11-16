import React, { useState, useEffect } from 'react';
import { Page, PlayerHeroData, PriorityHero, FurniturePriority } from '../types';
import { CloseIcon } from './icons';
import HeroPortrait from './HeroPortrait';
import { HeroCard } from './HeroCard';
import FurnitureEditModal from './FurnitureEditModal';

// --- Sub-components ---

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

const InvestmentRequiredDisplay: React.FC<{ hero: PriorityHero }> = ({ hero }) => {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="font-mono text-sm">
                {hero.requiredSI > 0 && <span className="font-bold text-cyan-400">SI{hero.requiredSI}</span>}
                {hero.requiredFurniture > 0 && <span className="font-bold text-lime-400 ml-2">{hero.requiredFurniture}F</span>}
                {hero.requiredEngravings > 0 && <span className="font-bold text-yellow-400 ml-2">E{hero.requiredEngravings}</span>}
                 {hero.requiredSI === 0 && hero.requiredFurniture === 0 && hero.requiredEngravings === 0 && <span>-</span>}
            </div>
            {hero.engravingNodes.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                    {hero.engravingNodes.map((node, i) => (
                        <React.Fragment key={i}>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ${node.found ? 'bg-blue-800 text-blue-200' : 'bg-red-800 text-white'}`}>
                                {node.found ? node.translated : node.original}
                            </span>
                            {i < hero.engravingNodes.length - 1 && <span className="text-gray-500 text-xs">→</span>}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

const getProgressBarClass = (percentage: number): string => {
    if (percentage >= 100) return 'bg-gradient-to-r from-teal-400 to-cyan-500';
    if (percentage > 75) return 'bg-gradient-to-r from-lime-400 to-green-500';
    if (percentage > 40) return 'bg-gradient-to-r from-yellow-400 to-amber-500';
    return 'bg-gradient-to-r from-orange-500 to-red-600';
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
                        {currentHeroes.map((hero, index) => (
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


// --- Main Modal Component ---

export interface HeroBuildModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (heroName: string, data: PlayerHeroData) => void;
    hero: PriorityHero | null;
    playerData: PlayerHeroData | null;
    recommendedBuilds: PriorityHero[];
    maxInvestment: { si: number; furniture: number; engravings: number } | null;
    watchlistSlots: (string | null)[];
    setWatchlistSlots: React.Dispatch<React.SetStateAction<(string | null)[]>>;
    allHeroes: PriorityHero[];
    tierMap: Map<string, string>;
    navigate: (page: Page) => void;
    priorities: Record<string, FurniturePriority>;
}

const HeroBuildModal: React.FC<HeroBuildModalProps> = ({
    isOpen,
    onClose,
    onSave,
    hero,
    playerData,
    recommendedBuilds,
    maxInvestment,
    watchlistSlots,
    setWatchlistSlots,
    allHeroes,
    tierMap,
    navigate,
    priorities,
}) => {
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
    const [isFurnitureModalOpen, setIsFurnitureModalOpen] = useState(false);
    const [localData, setLocalData] = useState<PlayerHeroData | null>(null);

    useEffect(() => {
        if (isOpen && playerData) {
            setLocalData(JSON.parse(JSON.stringify(playerData))); // Deep copy
        }
    }, [isOpen, playerData]);

    if (!isOpen || !hero || !localData) {
        return null;
    }

    const handleLocalDataChange = (field: keyof PlayerHeroData, value: any) => {
        setLocalData(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = () => {
        if (hero && localData) {
            onSave(hero.originalName, localData);
        }
    };
    
    const isWatched = watchlistSlots.includes(hero.originalName);

    const handleToggleWatch = () => {
        if (isWatched) {
            setWatchlistSlots(prev => prev.map(slot => slot === hero.originalName ? null : slot));
        } else {
            const emptySlotIndex = watchlistSlots.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                setWatchlistSlots(prev => {
                    const newSlots = [...prev];
                    newSlots[emptySlotIndex] = hero.originalName;
                    return newSlots;
                });
            } else {
                setIsReplaceModalOpen(true);
            }
        }
    };
    
    const handleReplaceHero = (indexToReplace: number) => {
        setWatchlistSlots(prev => {
            const newSlots = [...prev];
            newSlots[indexToReplace] = hero.originalName;
            return newSlots;
        });
        setIsReplaceModalOpen(false);
    };

    const pData = localData;
    let progressPercentage = 0;
    if (maxInvestment) {
        const targetInvestment = maxInvestment;
        const siProgress = targetInvestment.si > 0 ? Math.min(pData.si / targetInvestment.si, 1) : 1;
        const furnProgress = targetInvestment.furniture > 0 ? Math.min(pData.furniture / targetInvestment.furniture, 1) : 1;
        const engProgress = targetInvestment.engravings > 0 ? Math.min(pData.engravings / targetInvestment.engravings, 1) : 1;
        progressPercentage = ((siProgress + furnProgress + engProgress) / 3) * 100;
    }
    
    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 ease-out animate-[fade-in_0.3s_ease-out]"
                onClick={onClose}
            >
                <div 
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700/80 text-left overflow-hidden transform transition-all duration-300 ease-out w-full max-w-md mx-4 animate-[slide-up_0.4s_ease-out] relative"
                    onClick={e => e.stopPropagation()}
                >
                    <button onClick={handleSave} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    <div className="p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-gray-900 rounded-full mb-3 flex items-center justify-center border-2 border-gray-600 overflow-hidden">
                                <HeroPortrait heroName={hero.name} className="h-full w-full" />
                            </div>
                            <h2 className="text-2xl font-bold">{hero.name}</h2>
                            <div className="flex items-center gap-6 mt-4">
                                <label className="flex items-center cursor-pointer">
                                    <span className="mr-3 text-sm text-gray-300">Lo poseo</span>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={localData.owned} onChange={(e) => handleLocalDataChange('owned', e.target.checked)} />
                                        <div className={`block w-10 h-6 rounded-full transition-colors ${localData.owned ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localData.owned ? 'transform translate-x-4' : ''}`}></div>
                                    </div>
                                </label>
                                <button onClick={handleToggleWatch} title="Añadir/Quitar de la Watchlist" className="flex items-center gap-2 cursor-pointer">
                                    <i className={`fas fa-eye text-2xl transition-colors ${isWatched ? 'text-red-500 hover:text-red-400' : 'text-gray-500 hover:text-gray-300'}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-gray-700 pt-4">
                            <h3 className="text-center font-semibold text-gray-300 mb-2">Inversión Recomendada</h3>
                            <div className="space-y-2">
                                {recommendedBuilds.map((build, index) => (
                                    <div key={index} className="bg-gray-900/50 p-2 rounded-md">
                                        <InvestmentRequiredDisplay hero={build} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-center font-semibold text-gray-300 mb-2">Artículo de Firma (SI)</h3>
                                <ValueSelector value={localData.si} onChange={v => handleLocalDataChange('si', v)} options={[0, 10, 20, 30, 40]} allowManualInput />
                            </div>
                            <div>
                                <h3 className="text-center font-semibold text-gray-300 mb-2">Grabado (Engraving)</h3>
                                <ValueSelector value={localData.engravings} onChange={v => handleLocalDataChange('engravings', v)} options={[0, 30, 60, 80]} allowManualInput />
                            </div>
                            <div className="col-span-2">
                                <h3 className="text-center font-semibold text-gray-300 mb-2">Muebles (Furniture)</h3>
                                <div className="flex justify-center items-center gap-4">
                                    <ValueSelector value={localData.furniture} onChange={v => handleLocalDataChange('furniture', v)} options={[0, 3, 9]} allowManualInput />
                                    {localData.furniture >= 9 && (
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-lg font-bold text-lime-400">{localData.furniture} / 36</p>
                                            <button onClick={() => setIsFurnitureModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm">
                                                Editar Duplicados
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <h3 className="text-center font-semibold text-gray-300 mb-2">Armadura (Tier)</h3>
                                <div className="flex flex-wrap justify-center gap-1">
                                    {[0, 1, 2, 3, 4].map(tier => (
                                        <button
                                            key={tier}
                                            onClick={() => handleLocalDataChange('armorTier', tier)}
                                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors w-12 ${
                                                (localData.armorTier ?? 0) === tier
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                                            }`}
                                        >
                                            T{tier}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-center font-semibold text-gray-300 mb-2">Progreso Total</h3>
                            <div className="w-full bg-gray-900/70 shadow-inner ring-1 ring-black/20 rounded-full h-5 relative overflow-hidden">
                                <div 
                                    className={`h-5 rounded-full transition-all duration-500 progress-bar-animated progress-bar-stripes ${getProgressBarClass(progressPercentage)}`}
                                    style={{ width: `${Math.min(progressPercentage, 100).toFixed(1)}%` }}
                                ></div>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white text-shadow-dark">
                                    {progressPercentage.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                    </div>
                    <div className="bg-gray-900/50 px-6 py-4 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-red-600 text-base font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                            onClick={handleSave}
                        >
                            Guardar
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-600 shadow-sm px-5 py-2.5 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
                <style>{`
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slide-up { from { transform: translateY(2rem) scale(0.95); opacity: 0; } to { opacity: 1; } }
                `}</style>
            </div>
            <FurnitureEditModal
                isOpen={isFurnitureModalOpen}
                onClose={() => setIsFurnitureModalOpen(false)}
                hero={hero}
                heroData={localData}
                onSave={({ furniture, furnitureDupes }) => {
                    setLocalData(prev => prev ? { ...prev, furniture, furnitureDupes } : null);
                }}
                priorities={priorities}
                navigate={navigate}
            />
            <WatchlistReplaceModal
                isOpen={isReplaceModalOpen}
                onClose={() => setIsReplaceModalOpen(false)}
                onReplace={handleReplaceHero}
                currentHeroes={watchlistSlots.map(name => name ? allHeroes.find(h => h.originalName === name) : undefined)}
                tierMap={tierMap}
            />
        </>
    );
};

export default HeroBuildModal;