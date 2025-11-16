import React, { useRef, useState, useMemo, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Hero } from '../types';
import { LoadingSpinner } from './icons';
import InfographicsHeroCard from './InfographicsHeroCard';
import ConfirmationModal from './ConfirmationModal';

const TIER_ORDER: { [key: string]: number } = { "SSS": 1, "SS": 2, "S": 3, "A": 4, "B": 5, "C": 6, "D": 7 };

interface InfographicsViewProps {
    heroes: Hero[];
    onClose: () => void;
    filters: {
        selectedFactions: Set<string>;
        showAwakenedOnly: boolean;
        selectedTiers: Set<string>;
    };
    customTitle?: string;
}

const INFOGRAPHICS_PAGE_LIMIT = 120;

const InfographicsView: React.FC<InfographicsViewProps> = ({ heroes, onClose, filters, customTitle }) => {
    const infographicRef = useRef<HTMLDivElement>(null);
    const captureRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [scale, setScale] = useState(0.1);
    const [showMultiPageConfirm, setShowMultiPageConfirm] = useState(false);
    const [numPages, setNumPages] = useState(0);
    const [displayedHeroes, setDisplayedHeroes] = useState(heroes);
    const [generationProgress, setGenerationProgress] = useState('');
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    useEffect(() => {
        setDisplayedHeroes(heroes);
    }, [heroes]);

    useEffect(() => {
        const calculateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                setScale(containerWidth > 0 ? containerWidth / 1440 : 0.1);
            }
        };
        
        const timeoutId = setTimeout(calculateScale, 50);
        window.addEventListener('resize', calculateScale);
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', calculateScale);
        };
    }, [displayedHeroes]);

    const title = useMemo(() => {
        if (customTitle) {
            return customTitle;
        }
        
        const parts: string[] = [];
        if (filters.showAwakenedOnly) {
            parts.push("Héroes Despertados");
        }
        if (filters.selectedTiers.size > 0) {
            const tiers = Array.from(filters.selectedTiers).sort((a: string, b: string) => (TIER_ORDER[a] || 99) - (TIER_ORDER[b] || 99)).join(', ');
            parts.push(`Tiers ${tiers}`);
        }
        if (filters.selectedFactions.size > 0) {
            const factions = Array.from(filters.selectedFactions).join(' & ');
            parts.push(`${factions}`);
        }

        if (parts.length === 0) {
            return "Prioridad General: Todos los Héroes";
        }
        
        return `Prioridad: ${parts.join(' | ')}`;
    }, [filters, customTitle]);
    
    const subtitle = "Esta guía visual, basada en los análisis de expertos, representa el orden de prioridad que el gremio HISPANIA recomienda para optimizar tus recursos.";

    const generationDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const heroCount = heroes.length;
    let layoutConfig: { gridColsClass: string; cardSize: 'large' | 'medium' | 'small' | 'xsmall' | 'xxsmall' | 'xxxsmall' | 'xxxxsmall' | 'xxxxxsmall'; gapClass: string };

    if (heroCount <= 16) {
        layoutConfig = { gridColsClass: 'grid-cols-4', cardSize: 'medium', gapClass: 'gap-x-12 gap-y-12' };
    } else if (heroCount <= 25) {
        layoutConfig = { gridColsClass: 'grid-cols-5', cardSize: 'small', gapClass: 'gap-x-8 gap-y-8' };
    } else if (heroCount <= 36) {
        layoutConfig = { gridColsClass: 'grid-cols-6', cardSize: 'xsmall', gapClass: 'gap-x-6 gap-y-6' };
    } else if (heroCount <= 49) {
        layoutConfig = { gridColsClass: 'grid-cols-7', cardSize: 'xxsmall', gapClass: 'gap-x-4 gap-y-4' };
    } else if (heroCount <= 64) {
        layoutConfig = { gridColsClass: 'grid-cols-8', cardSize: 'xxxsmall', gapClass: 'gap-x-3 gap-y-3' };
    } else if (heroCount <= 99) {
        layoutConfig = { gridColsClass: 'grid-cols-9', cardSize: 'xxxxsmall', gapClass: 'gap-x-2 gap-y-2' };
    } else {
        layoutConfig = { gridColsClass: 'grid-cols-10', cardSize: 'xxxxxsmall', gapClass: 'gap-x-1 gap-y-1' };
    }

    const renderInfographicContent = () => {
        const rankOffset = currentPageIndex * INFOGRAPHICS_PAGE_LIMIT;
        return (
            <>
                <header className="flex flex-col items-center text-center pb-16 border-b-4 border-red-800/50">
                    <div className="font-bold text-white inline-flex items-center gap-6">
                        <img src="https://ik.imagekit.io/optimizerhispania/LogoGUILD.png" alt="Logo del Gremio HISPANIA" className="h-24" crossOrigin="anonymous" />
                        <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className="h-16" crossOrigin="anonymous" />
                        <span className="text-9xl">HISPANIA</span>
                        <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className="h-16" crossOrigin="anonymous" />
                        <span className="text-6xl text-gray-300">ID: 7642</span>
                    </div>
                    <div className="mt-12 w-full flex flex-col items-center gap-6">
                        <h1 
                            className="text-8xl font-extrabold text-white px-12"
                            style={{ textShadow: '2px 2px 5px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)' }}
                        >
                            {title}
                        </h1>
                        <p 
                            className="text-4xl text-gray-300 max-w-5xl px-8"
                            style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}
                        >
                            {subtitle}
                        </p>
                        <p className="text-4xl text-gray-400 font-mono font-semibold">
                            <i className="fas fa-calendar-alt mr-4"></i>
                            {generationDate}
                        </p>
                    </div>
                </header>
                
                <main className={`flex-grow pt-16 grid ${layoutConfig.gridColsClass} grid-flow-row ${layoutConfig.gapClass} content-start`}>
                    {displayedHeroes.map((hero, index) => (
                        <InfographicsHeroCard key={`${hero.originalName}-${index}`} hero={hero} rank={rankOffset + index + 1} size={layoutConfig.cardSize} />
                    ))}
                </main>

                <footer className="pt-12 mt-auto text-center border-t-4 border-red-800/50 flex justify-center items-center">
                    <p className="text-6xl text-red-500 font-mono font-bold">AFK Arena - Gremio HISPANIA ID: 7642</p>
                </footer>
            </>
        );
    };

    const generateAndDownloadPage = async (pageNumber: number, totalPages: number) => {
        if (!captureRef.current) return;
        
        const captureElement = captureRef.current;

        try {
            // Hacer visible el elemento temporalmente
            captureElement.style.position = 'fixed';
            captureElement.style.top = '0';
            captureElement.style.left = '0';
            captureElement.style.transform = 'none';
            captureElement.style.zIndex = '10000';
            captureElement.style.visibility = 'visible';

            // Esperar a que se renderice
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Capturar con html-to-image (más confiable que html2canvas)
            const dataUrl = await toPng(captureElement, {
                quality: 1.0,
                pixelRatio: 2,
                width: 1440,
                height: 2560,
                cacheBust: true,
            });

            // Descargar
            const link = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            const fileNameSafeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const pageSuffix = totalPages > 1 ? `-pagina-${pageNumber}-de-${totalPages}` : '';
            link.download = `hispania-prioridad-${fileNameSafeTitle}${pageSuffix}-${date}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Ocultar de nuevo
            captureElement.style.position = 'fixed';
            captureElement.style.top = '-99999px';
            captureElement.style.left = '0';
            captureElement.style.transform = 'none';
            captureElement.style.visibility = 'hidden';
        } catch (error) {
            console.error("Error capturing:", error);
            throw error;
        }
    };

    const handleDownload = async () => {
        const totalPages = Math.ceil(heroes.length / INFOGRAPHICS_PAGE_LIMIT);
        if (totalPages > 1) {
            setNumPages(totalPages);
            setShowMultiPageConfirm(true);
            return;
        }

        setIsGenerating(true);
        setGenerationProgress('');
        setCurrentPageIndex(0);
        try {
            await generateAndDownloadPage(1, 1);
        } catch (error) {
            console.error("Error generating infographic:", error);
            alert(`Error al generar la infografía: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirmMultiPageDownload = async () => {
        setShowMultiPageConfirm(false);
        setIsGenerating(true);

        try {
            for (let i = 0; i < numPages; i++) {
                setGenerationProgress(`Generando página ${i + 1} de ${numPages}...`);
                const heroSlice = heroes.slice(i * INFOGRAPHICS_PAGE_LIMIT, (i + 1) * INFOGRAPHICS_PAGE_LIMIT);
                
                setCurrentPageIndex(i);
                setDisplayedHeroes(heroSlice);
                
                await new Promise(resolve => setTimeout(resolve, 500));
                await generateAndDownloadPage(i + 1, numPages);
            }
        } catch (error) {
            console.error("Error generating multi-page infographic:", error);
            alert(`Error al generar la infografía: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setIsGenerating(false);
            setGenerationProgress('');
            setDisplayedHeroes(heroes);
            setCurrentPageIndex(0);
        }
    };

    return (
        <div className="flex flex-col items-center relative">
            <div className="w-full flex justify-between items-center mb-4 px-2">
                <button
                    onClick={onClose}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2"
                >
                    <i className="fas fa-arrow-left"></i> Volver
                </button>
                <button
                    onClick={handleDownload}
                    disabled={isGenerating || heroes.length === 0}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isGenerating && <LoadingSpinner className="h-5 w-5" />}
                    {isGenerating ? (generationProgress || 'Generando...') : 'Descargar Infografía'}
                </button>
            </div>

            {heroes.length === 0 ? (
                <div className="w-full aspect-[9/16] bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                    <p>No hay héroes que coincidan con los filtros para generar una infografía.</p>
                </div>
            ) : (
                <>
                    {/* Vista previa visible con escala */}
                    <div 
                        ref={containerRef}
                        className="w-full aspect-[9/16] shadow-2xl rounded-lg overflow-hidden"
                    >
                        <div
                            ref={infographicRef}
                            className="w-[1440px] h-[2560px] bg-gradient-to-br from-gray-900 to-gray-800 p-20 flex flex-col transform origin-top-left"
                            style={{ transform: `scale(${scale})` }}
                        >
                            {renderInfographicContent()}
                        </div>
                    </div>

                    {/* Elemento de captura - oculto hasta el momento de capturar */}
                    <div 
                        ref={captureRef}
                        className="w-[1440px] h-[2560px] bg-gradient-to-br from-gray-900 to-gray-800 p-20 flex flex-col"
                        style={{
                            position: 'fixed',
                            top: '-99999px',
                            left: '0',
                            visibility: 'hidden',
                            pointerEvents: 'none',
                        }}
                    >
                        {renderInfographicContent()}
                    </div>
                </>
            )}
            
            <ConfirmationModal
                isOpen={showMultiPageConfirm}
                onClose={() => setShowMultiPageConfirm(false)}
                onConfirm={handleConfirmMultiPageDownload}
                title="Generación de Múltiples Infografías"
            >
                <p>Tu selección de {heroes.length} héroes es demasiado grande para una sola imagen.</p>
                <p className="mt-2">Se generarán y descargarán <span className="font-bold text-red-400">{numPages} infografías</span> para mostrarlos a todos de forma legible.</p>
                <p className="mt-4 font-bold">¿Deseas continuar?</p>
            </ConfirmationModal>
        </div>
    );
};

export default InfographicsView;