import React from 'react';

interface GuildLogoProps {
    className?: string;
    textClass?: string;
    logoHeightClass?: string;
    flagHeightClass?: string;
}

const GuildLogo: React.FC<GuildLogoProps> = ({
    className = '',
    textClass = 'text-xl',
    logoHeightClass = 'h-10',
    flagHeightClass = 'h-6',
}) => {
    return (
        <span className={`font-bold text-white inline-flex items-center gap-2 ${className}`}>
            <img src="https://ik.imagekit.io/optimizerhispania/LogoGUILD.png" alt="Logo del Gremio HISPANIA" className={logoHeightClass} />
            <span className="inline-flex items-center gap-1.5">
                <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className={flagHeightClass} />
                <span className={textClass}>HISPANIA</span>
                <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className={flagHeightClass} />
            </span>
        </span>
    );
};

export default GuildLogo;