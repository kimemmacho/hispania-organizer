import React, { useState, useEffect } from 'react';
import { Page, PlayerHeroData, FurniturePriority, PriorityHero } from '../types';
import { CloseIcon } from './icons';
import HeroPortrait from './HeroPortrait';
import { SUGGESTION_ORDER } from '../constants';

interface FurnitureEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    hero: PriorityHero | null;
    heroData: PlayerHeroData | null;
    onSave: (data: { furniture: number; furnitureDupes: PlayerHeroData['furnitureDupes'] }) => void;
    priorities: Record<string, FurniturePriority>;
    navigate: (page: Page) => void;
}

const FurnitureEditModal: React.FC<FurnitureEditModalProps> = ({ isOpen, onClose, hero, heroData, onSave, priorities, navigate }) => {
    const [localDupes, setLocalDupes] = useState<PlayerHeroData['furnitureDupes']>({ top: [0, 0, 0], middle: [0, 0, 0], bottom: [0, 0, 0] });
    const [goal, setGoal] = useState<string | null>(null);
    const [isGoalActionable, setIsGoalActionable] = useState(false);

    useEffect(() => {
        if (hero && isOpen) {
            const currentDupes = heroData?.furnitureDupes || { top: [0, 0, 0], middle: [0, 0, 0], bottom: [0, 0, 0] };
            setLocalDupes(JSON.parse(JSON.stringify(currentDupes)));

            const heroPriorities = priorities[hero.originalName] || { top: 'NO DEFINIDO', middle: 'NO DEFINIDO', bottom: 'NO DEFINIDO' };
            
            const isUndefined = heroPriorities.top === 'NO DEFINIDO' && heroPriorities.middle === 'NO DEFINIDO' && heroPriorities.bottom === 'NO DEFINIDO';

            if (isUndefined) {
                setGoal("Próxima meta no definida, presiona aqui para configurar las prioridades de los muebles de este héroe.");
                setIsGoalActionable(true);
                return;
            }

            setIsGoalActionable(false);
            let foundGoal = false;

            for (const step of SUGGESTION_ORDER) {
                if (heroPriorities.top === step.tier && currentDupes.top.some(d => d < step.level)) {
                    setGoal(`Subir un Mueble grande a +${step.level}.`);
                    foundGoal = true;
                    break;
                }
                if (heroPriorities.middle === step.tier && currentDupes.middle.some(d => d < step.level)) {
                    setGoal(`Subir un Mueble pequeño a +${step.level}.`);
                    foundGoal = true;
                    break;
                }
                if (heroPriorities.bottom === step.tier && currentDupes.bottom.some(d => d < step.level)) {
                    setGoal(`Subir un Mueble colgante a +${step.level}.`);
                    foundGoal = true;
                    break;
                }
            }

            if (!foundGoal) {
                setGoal("¡Felicidades! Has completado todos los duplicados recomendados para este héroe.");
            }
        }
    }, [hero, isOpen, heroData, priorities]);

    const handleDupeChange = (type: 'top' | 'middle' | 'bottom', index: number, direction: 'increment' | 'decrement') => {
        setLocalDupes(prevDupes => {
            if (!prevDupes) return { top: [0, 0, 0], middle: [0, 0, 0], bottom: [0, 0, 0] };
            const newDupes = JSON.parse(JSON.stringify(prevDupes));
            const currentValue = newDupes[type][index];
            if (direction === 'increment') {
                newDupes[type][index] = (currentValue + 1) % 4;
            } else {
                newDupes[type][index] = (currentValue - 1 + 4) % 4;
            }
            return newDupes;
        });
    };
    
    const handleSave = () => {
        if (!hero || !localDupes) return;
        const totalDupes = [...localDupes.top, ...localDupes.middle, ...localDupes.bottom].reduce((a, b) => a + b, 0);
        
        onSave({
            furniture: 9 + totalDupes,
            furnitureDupes: localDupes,
        });
        onClose();
    };

    const handleGoalClick = () => {
        if (!isGoalActionable || !hero) return;
        
        sessionStorage.setItem('furniture-config-hero', hero.name);
        sessionStorage.setItem('furniture-config-mode', 'config');
        sessionStorage.setItem('furniture-config-filter', 'undefined');
        
        onClose();
        navigate('furniture-duplicates');
    };

    if (!isOpen || !hero) return null;

    const furnitureTypes: { key: 'top' | 'middle' | 'bottom', title: string, icon: string }[] = [
        { key: 'top', title: 'Mueble grande', icon: 'fa-door-closed' },
        { key: 'middle', title: 'Mueble pequeño', icon: 'fa-chair' },
        { key: 'bottom', title: 'Mueble colgante', icon: 'fa-border-all' },
    ];
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-[60] animate-[fade-in_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex flex-col items-center gap-2 relative">
                    <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                     <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center border-2 border-gray-600 overflow-hidden">
                        <HeroPortrait heroName={hero.name} className="h-full w-full" />
                    </div>
                    <h2 className="text-xl font-bold">{hero.name} - Duplicados</h2>
                </header>
                <div className="p-6 space-y-4">
                    {goal && (
                        <div 
                            className={`bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md text-center ${isGoalActionable ? 'cursor-pointer hover:bg-red-900 transition-colors' : ''}`}
                            onClick={isGoalActionable ? handleGoalClick : undefined}
                        >
                            <p>
                                {isGoalActionable ? (
                                    goal
                                ) : (
                                    <><i className="fas fa-bullseye mr-2"></i><strong>Próxima Meta:</strong> {goal}</>
                                )}
                            </p>
                        </div>
                    )}
                    {furnitureTypes.map(({ key, title, icon }) => (
                        <div key={key}>
                            <h3 className="font-semibold text-gray-300 mb-2 flex items-center justify-center gap-2"><i className={`fas ${icon} text-red-400`}></i> {title}</h3>
                            <div className="flex flex-wrap justify-center gap-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleDupeChange(key, i, 'increment')}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleDupeChange(key, i, 'decrement');
                                        }}
                                        className="relative w-16 h-16 bg-gray-700 rounded-md flex items-center justify-center text-3xl text-gray-400 hover:bg-gray-600"
                                    >
                                        <i className={`fas ${icon}`}></i>
                                        {localDupes && localDupes[key][i] > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-sm font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-gray-800">
                                                +{localDupes[key][i]}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="bg-gray-900/50 px-6 py-4 sm:flex sm:flex-row-reverse">
                    <button
                        type="button"
                        onClick={handleSave}
                        className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-red-600 text-base font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                        Guardar
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-600 shadow-sm px-5 py-2.5 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default FurnitureEditModal;