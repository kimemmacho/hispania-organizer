import React, { useState, useEffect } from 'react';
import { HeroDatabaseEntry } from '../types';
import { CloseIcon, CheckBadgeIcon } from './icons';
import HeroPortrait from './HeroPortrait';

// --- Helper Components ---

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

const getTierStyling = (tier: string): { textClass: string; bgClass: string; } => {
    switch (tier) {
        case 'SSS': return { textClass: 'text-white', bgClass: 'bg-blue-600' };
        case 'SS': return { textClass: 'text-white', bgClass: 'bg-green-700' };
        case 'S': return { textClass: 'text-black', bgClass: 'bg-lime-600' };
        case 'A': return { textClass: 'text-black', bgClass: 'bg-yellow-500' };
        case 'B': return { textClass: 'text-white', bgClass: 'bg-orange-600' };
        case 'C': return { textClass: 'text-white', bgClass: 'bg-red-700' };
        case 'D': return { textClass: 'text-white', bgClass: 'bg-amber-800' };
        default: return { textClass: 'text-white', bgClass: 'bg-gray-600' };
    }
};

const TierBadge: React.FC<{ tier: string }> = ({ tier }) => {
    const { textClass, bgClass } = getTierStyling(tier);
    return (
        <div className={`relative inline-block transform -skew-x-12 ${bgClass} px-3 py-1 shadow-md`}>
             <span className={`block transform skew-x-12 text-center text-base font-bold tracking-wider ${textClass}`}>
                {tier}
            </span>
        </div>
    );
};

const AcceptButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={onClick}
        className="text-green-400 hover:text-green-300 transform transition-all duration-300 ease-in-out hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]"
        title="Aceptar dato de la actualización"
    >
        <CheckBadgeIcon className="h-8 w-8" />
    </button>
);


interface MismatchDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    hero: HeroDatabaseEntry | null;
    onAcceptField: (key: string, field: keyof Omit<HeroDatabaseEntry, 'key'>) => void;
    onAcceptAll: (key: string) => void;
}

const renderValueSimple = (value: any): string => {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value === null || value === undefined || value === '') return 'Vacío';
    return String(value);
};

const InvestmentDisplay: React.FC<{ build: HeroDatabaseEntry['builds'][0] }> = ({ build }) => (
    <div className="flex flex-col items-center gap-1 p-2 bg-gray-800 rounded-md border border-gray-700">
        <div className="font-mono text-base">
            {build.requiredSI > 0 && <span className="font-bold text-cyan-400">SI{build.requiredSI}</span>}
            {build.requiredFurniture > 0 && <span className="font-bold text-lime-400 ml-2">{build.requiredFurniture}F</span>}
            {build.requiredEngravings > 0 && <span className="font-bold text-yellow-400 ml-2">E{build.requiredEngravings}</span>}
            {build.requiredSI === 0 && build.requiredFurniture === 0 && build.requiredEngravings === 0 && <span className="text-gray-500">-</span>}
        </div>
        {build.engravingNodes.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                {build.engravingNodes.map((node, i) => (
                    <React.Fragment key={i}>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${node.found ? 'bg-blue-800 text-blue-200' : 'bg-red-800 text-white'}`}>
                            {node.found ? node.translated : node.original}
                        </span>
                        {i < build.engravingNodes.length - 1 && <span className="text-gray-500 text-xs">→</span>}
                    </React.Fragment>
                ))}
            </div>
        )}
    </div>
);

const FIELD_NAMES: Partial<Record<keyof HeroDatabaseEntry, string>> = {
    spanishName: 'Nombre Español',
    russianName: 'Nombre Ruso',
    faction: 'Facción',
    isAwakened: 'Despertado',
    tier: 'Tier',
    score: 'Puntuación',
    rankingComments: 'Comentarios de Ranking',
    builds: 'Builds Recomendadas',
};

const MismatchDetailsModal: React.FC<MismatchDetailsModalProps> = ({ isOpen, onClose, hero, onAcceptField, onAcceptAll }) => {
    const [disappearingFields, setDisappearingFields] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setDisappearingFields(new Set());
        }
    }, [isOpen, hero?.key]);

    if (!isOpen || !hero || !hero.sourceData) return null;

    // FIX: Correctly type the keys from `sourceData` to exclude `key`, resolving the type mismatch.
    const mismatches = (Object.keys(hero.sourceData) as Array<keyof Omit<HeroDatabaseEntry, 'key'>>)
        .filter(field => field !== 'rankingComments');

    const handleAcceptAndAnimate = (field: keyof Omit<HeroDatabaseEntry, 'key'>) => {
        const visibleMismatchesCount = mismatches.filter(f => !disappearingFields.has(f)).length;

        if (visibleMismatchesCount === 1) {
            onAcceptAll(hero.key);
            return;
        }

        setDisappearingFields(prev => new Set(prev).add(field as string));

        setTimeout(() => {
            onAcceptField(hero.key, field);
        }, 500); // Animation duration
    };

    const renderFieldValue = (value: any, type: keyof typeof hero.sourceData) => {
        const simpleValue = renderValueSimple(value);
        if (type === 'tier') {
            return <div className="flex justify-center items-center min-h-[3rem]"><TierBadge tier={value} /></div>;
        }
        if (type === 'faction') {
            return (
                <div className="text-white text-base flex items-center justify-center gap-2 min-h-[3rem]">
                    <FactionIcon faction={value} className="h-6 w-6" />
                    <span>{simpleValue}</span>
                </div>
            );
        }
        return <p className="text-white text-base truncate p-2 min-h-[3rem] flex items-center justify-center" title={simpleValue}>{simpleValue}</p>;
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 ease-out animate-[fade-in_0.3s_ease-out]"
            onClick={onClose}
        >
            <div 
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-yellow-700/80 text-left overflow-hidden transform transition-all duration-300 ease-out w-full max-w-3xl mx-4 animate-[slide-up_0.4s_ease-out] max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-gray-700 flex items-center gap-4 relative">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center border-2 border-yellow-600 overflow-hidden flex-shrink-0">
                        <HeroPortrait heroName={hero.spanishName} className="h-full w-full" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{hero.spanishName}</h2>
                        <p className="text-yellow-400">Diferencias con la versión actualizada</p>
                    </div>
                    <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto space-y-3">
                    {mismatches.map(field => {
                        const isDisappearing = disappearingFields.has(field as string);
                        const fieldName = FIELD_NAMES[field] || field;
                        const localValue = (hero as any)[field];
                        const sourceValue = (hero.sourceData as any)[field];
                        
                        if (field === 'builds') {
                            const localBuilds = hero.builds || [];
                            const sourceBuilds = hero.sourceData?.builds || [];
                            return (
                                <div key={field} className={`bg-gray-900/50 p-3 rounded-lg border border-gray-700 transition-all duration-500 ${isDisappearing ? 'item-disappearing' : ''}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-bold text-white">{fieldName}</p>
                                        <AcceptButton onClick={() => handleAcceptAndAnimate(field)} />
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 space-y-2 text-center">
                                            <p className="font-semibold text-gray-400 text-sm mb-1">Valor Actual:</p>
                                            {localBuilds.length > 0 
                                                ? localBuilds.map((build, index) => <InvestmentDisplay key={index} build={build} />) 
                                                : <p className="text-gray-500 text-sm italic p-2">Sin builds</p>}
                                        </div>
                                        <div className="flex-1 space-y-2 text-center">
                                            <p className="font-semibold text-yellow-500 text-sm mb-1">Valor actualización:</p>
                                            {sourceBuilds.length > 0 
                                                ? sourceBuilds.map((build, index) => <InvestmentDisplay key={index} build={build} />)
                                                : <p className="text-gray-500 text-sm italic p-2">Sin builds</p>}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                             <div key={field} className={`bg-gray-900/50 p-3 rounded-lg border border-gray-700 transition-all duration-500 ${isDisappearing ? 'item-disappearing' : ''}`}>
                                <p className="font-bold text-white mb-2">{fieldName}</p>
                                <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 text-sm">
                                    <div>
                                        <p className="font-semibold text-gray-400 text-center">Valor Actual:</p>
                                        <div className="bg-gray-800 p-2 rounded-md">
                                            {renderFieldValue(localValue, field as keyof typeof hero.sourceData)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-yellow-500 text-center">Valor actualización:</p>
                                        <div className="bg-gray-800 p-2 rounded-md">
                                            {renderFieldValue(sourceValue, field as keyof typeof hero.sourceData)}
                                        </div>
                                    </div>
                                    <div className="flex justify-center">
                                        <AcceptButton onClick={() => handleAcceptAndAnimate(field)} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <footer className="bg-gray-900/50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3">
                    <button
                        onClick={() => onAcceptAll(hero.key)}
                        className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-green-700 text-base font-bold text-white hover:bg-green-600"
                    >
                        Aceptar Todo
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-red-800 shadow-sm px-5 py-2.5 bg-red-900/80 text-base font-medium text-red-300 hover:bg-red-800 hover:text-white sm:mt-0"
                    >
                        Cancelar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default MismatchDetailsModal;