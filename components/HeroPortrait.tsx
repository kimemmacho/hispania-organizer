import React, { useState, useEffect } from 'react';

const BASE_URL = "https://ik.imagekit.io/optimizerhispania/";
const EXTENSIONS = ['webp', 'png', 'jpg'];

interface HeroPortraitProps {
    heroName: string;
    className?: string;
}

const normalizeHeroNameForUrl = (name: string): string => {
    if (!name) return '';
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/\s*&\s*/g, ' y ')      // Reemplazar '&' por ' y ' para nombres como "Lucilla & Liberta"
        .replace(/'/g, '')             // Eliminar apóstrofes
        .replace(/[^a-zA-Z0-9\s]/g, '')   // Eliminar caracteres no alfanuméricos (excepto espacios), preservando mayúsculas
        .trim()                        // Quitar espacios al principio y al final
        .replace(/\s+/g, '-');         // Reemplazar espacios por guiones
};

// Global cache to prevent re-checking for images across components/renders
// Key: normalized hero name, Value: full URL or null for not found
const imageCache = new Map<string, string | null>();

const Placeholder: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
    </svg>
);

const HeroPortrait: React.FC<HeroPortraitProps> = ({ heroName, className }) => {
    const [imageUrl, setImageUrl] = useState<string | undefined | null>(undefined);
    const [extensionIndex, setExtensionIndex] = useState(0);
    const normalizedName = normalizeHeroNameForUrl(heroName);
    
    useEffect(() => {
        if (!normalizedName) {
            setImageUrl(null);
            return;
        }

        if (imageCache.has(normalizedName)) {
            setImageUrl(imageCache.get(normalizedName));
        } else {
            setExtensionIndex(0);
            setImageUrl(`${BASE_URL}${normalizedName}.${EXTENSIONS[0]}`);
        }
        
    }, [heroName, normalizedName]);

    const handleError = () => {
        const nextIndex = extensionIndex + 1;
        if (nextIndex < EXTENSIONS.length) {
            setExtensionIndex(nextIndex);
            setImageUrl(`${BASE_URL}${normalizedName}.${EXTENSIONS[nextIndex]}`);
        } else {
            imageCache.set(normalizedName, null);
            setImageUrl(null);
        }
    };

    const handleLoad = () => {
        if (imageUrl) {
            imageCache.set(normalizedName, imageUrl);
        }
    };
    
    if (imageUrl === undefined) {
        return <Placeholder className={`${className} text-gray-500`} />;
    }
    
    if (imageUrl) {
        return (
            <img 
                src={imageUrl} 
                alt={heroName}
                className={`${className} object-cover`}
                onError={handleError}
                onLoad={handleLoad}
                crossOrigin="anonymous"
            />
        );
    }

    return <Placeholder className={`${className} text-gray-500`} />;
};

export default HeroPortrait;