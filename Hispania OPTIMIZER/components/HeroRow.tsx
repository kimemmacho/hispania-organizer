import React from 'react';
import { PriorityHero } from '../types';
import { HeroCard } from './HeroCard';

interface HeroRowProps {
    title: string;
    heroes: PriorityHero[];
    tierMap: Map<string, string>;
    emptyText: string;
    subTextGenerator?: (hero: PriorityHero) => { from: string, to: string };
    onHeroClick?: (hero: PriorityHero) => void;
    disappearingKeys?: Set<string>;
    getDisappearingKey?: (hero: PriorityHero) => string;
    isAwakenedRow?: boolean;
    showRank?: boolean;
}

const HeroRow: React.FC<HeroRowProps> = ({ title, heroes, tierMap, emptyText, subTextGenerator, onHeroClick, disappearingKeys, getDisappearingKey, isAwakenedRow = false, showRank = false }) => (
    <div>
        <h3 className="text-xl font-bold mb-4 text-white border-l-4 border-red-500 pl-4">{title}</h3>
        {heroes.length > 0 ? (
            <div className="flex flex-wrap justify-center md:flex-nowrap gap-4 overflow-x-auto pb-3 -mx-4 px-4">
                {heroes.map((hero, index) => {
                    const key = getDisappearingKey ? getDisappearingKey(hero) : hero.originalName;
                    return (
                        <HeroCard
                            key={key}
                            hero={hero}
                            tier={tierMap.get(hero.originalName) || 'N/A'}
                            subText={subTextGenerator ? subTextGenerator(hero) : undefined}
                            onClick={onHeroClick}
                            isDisappearing={disappearingKeys?.has(key) || false}
                            isAwakened={isAwakenedRow}
                            rank={showRank ? index + 1 : undefined}
                        />
                    );
                })}
            </div>
        ) : (
            <div className="pl-4">
                <p className="text-gray-400">{emptyText}</p>
            </div>
        )}
    </div>
);

export default HeroRow;