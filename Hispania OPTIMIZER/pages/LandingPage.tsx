import React from 'react';
import { Page } from '../types';
import { GUILD_URL } from '../constants';
import TipWidget from '../components/TipWidget';

interface LandingPageProps {
    navigate: (page: Page) => void;
}

const FeatureCard: React.FC<{ 
    title: string; 
    description: React.ReactNode; 
    onClick?: () => void; 
    href?: string; 
    icon: React.ReactNode; 
}> = ({ title, description, onClick, href, icon }) => {
    
    const content = (
        <div className="group relative bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl border border-gray-700/80 overflow-hidden h-full flex flex-col text-left transition-all duration-300 hover:border-red-600/60 hover:shadow-[0_0_40px_8px_rgba(239,68,68,0.5)]">
            
            {/* Background decorative element */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-red-900/50 to-transparent rounded-bl-full opacity-30 group-hover:opacity-60 group-hover:scale-150 transition-all duration-500 ease-in-out"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="text-red-500 mb-4 transition-transform duration-300 group-hover:scale-110 w-fit">{icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 flex-grow text-base">{description}</p>

                <div className="mt-auto pt-4 self-start">
                    <div className="flex items-center text-red-400 font-semibold">
                        <span>Acceder</span>
                        <i className="fas fa-arrow-right ml-2 transition-transform duration-300 group-hover:translate-x-1.5"></i>
                    </div>
                </div>
            </div>
        </div>
    );

    const commonProps = {
        className: "no-underline cursor-pointer"
    };

    if (href) {
        return <a href={href} target="_blank" rel="noopener noreferrer" {...commonProps}>{content}</a>;
    }
    
    return <div onClick={onClick} {...commonProps}>{content}</div>;
};

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
    return (
        <div className="flex flex-col gap-8 h-full">
             <div className="text-center py-8 px-6 bg-gray-800/40 rounded-xl border border-gray-700/50 shrink-0">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 text-shadow-dark animate-fade-in-down">
                    Optimizer for{' '}
                    <span className="text-red-500 inline-flex items-center justify-center gap-3">
                        <img src="https://ik.imagekit.io/optimizerhispania/LogoGUILD.png" alt="Logo del Gremio HISPANIA" className="h-10 md:h-12" />
                        <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className="h-8 md:h-10" />
                        HISPANIA
                        <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className="h-8 md:h-10" />
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed animate-fade-in-up-delayed">
                    Tu centro de mando para optimizar recursos y gestionar tu roster. Todas las herramientas que necesitas, en un solo lugar.
                </p>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard 
                    icon={<i className="fas fa-trophy fa-3x"></i>}
                    title="Ranking de Héroes"
                    description="Consulta el ranking general de héroes, sus puntuaciones y comentarios de la comunidad experta."
                    onClick={() => navigate('ranking')}
                />
                 <FeatureCard 
                    icon={<i className="fas fa-list-ol fa-3x"></i>}
                    title="Prioridad de Recursos"
                    description="Optimiza tu inversión. Revisa las prioridades para SI, Muebles y Grabados de cada héroe."
                    onClick={() => navigate('priority')}
                />
                <FeatureCard 
                    icon={<i className="fas fa-clone fa-3x"></i>}
                    title="Duplicación de Muebles"
                    description="Gestiona y prioriza los duplicados de muebles para tus héroes 9/9 y maximiza su potencial."
                    onClick={() => navigate('furniture-duplicates')}
                />
                <FeatureCard 
                    icon={<i className="fas fa-users-cog fa-3x"></i>}
                    title="Mi Roster"
                    description="Gestiona tu colección personal de héroes, registra tu progreso y visualiza tu poder."
                    onClick={() => navigate('roster')}
                />
                 <FeatureCard 
                    icon={<i className="fas fa-route fa-3x"></i>}
                    title="Hoja de Ruta"
                    description="Tu guía personalizada. Descubre qué héroe adquirir o en quién invertir a continuación."
                    onClick={() => navigate('roadmap')}
                />
                <FeatureCard 
                    icon={<i className="fas fa-cog fa-3x"></i>}
                    title="Opciones y Datos"
                    description="Configura la aplicación, gestiona copias de seguridad locales y restaura tus datos."
                    onClick={() => navigate('options')}
                />
            </div>
            
            <TipWidget navigate={navigate} />
        </div>
    );
};

export default LandingPage;
