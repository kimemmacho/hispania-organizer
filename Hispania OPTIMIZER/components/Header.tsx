import React, { useState } from 'react';
import { Page } from '../types';
import { GUILD_URL } from '../constants';
import { MenuIcon, CloseIcon } from './icons';
import GuildLogo from './GuildLogo';

interface HeaderProps {
    navigate: (page: Page) => void;
    currentPage: Page;
    onToggleTips: () => void;
    showTips: boolean;
}

const NavLink: React.FC<{ onClick?: () => void; href?: string; isActive: boolean; children: React.ReactNode; className?: string }> = ({ onClick, href, isActive, children, className = '' }) => {
    // Active: solid red background, white text.
    const activeClasses = "bg-red-600 text-white";
    // Inactive: gray text, on hover becomes white with red border/glow.
    const inactiveClasses = "text-gray-300 hover:text-white hover:border-red-600/70 hover:shadow-[0_0_15px_-3px_rgba(220,38,38,0.6)]";
    // Added 'group' to base classes to allow child targeting on hover (for the icon)
    const baseClasses = `group px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${className} flex items-center border border-transparent`;

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={`${baseClasses} ${inactiveClasses}`}>
                {children}
            </a>
        );
    }

    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {children}
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ navigate, currentPage, onToggleTips, showTips }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNavigate = (page: Page) => {
        navigate(page);
        setIsMobileMenuOpen(false); // Close menu on navigation
    };
    
    const handleToggleTipsMobile = () => {
        onToggleTips();
        setIsMobileMenuOpen(false);
    };

    const iconBaseClasses = "mr-2 w-5 text-center transition-colors duration-300";

    const tipsButtonClasses = `group px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center border border-transparent ${
        showTips
            ? 'text-yellow-400 hover:border-yellow-500/70 hover:shadow-[0_0_15px_-3px_rgba(250,204,21,0.6)]'
            : 'text-gray-300 hover:text-white hover:border-red-600/70 hover:shadow-[0_0_15px_-3px_rgba(220,38,38,0.6)]'
    }`;

    const tipsIconClasses = `fas fa-lightbulb ${iconBaseClasses} ${showTips ? 'text-yellow-400' : 'text-gray-400 group-hover:text-red-500'}`;

    return (
        <header className="bg-gray-800 shadow-lg">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <GuildLogo />
                    </div>
                    <nav className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            <NavLink onClick={() => navigate('landing')} isActive={currentPage === 'landing'}>
                                <i className={`fas fa-home ${iconBaseClasses} ${currentPage === 'landing' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Inicio</span>
                            </NavLink>
                            <NavLink onClick={() => navigate('ranking')} isActive={currentPage === 'ranking'}>
                                <i className={`fas fa-trophy ${iconBaseClasses} ${currentPage === 'ranking' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Ranking Héroes</span>
                            </NavLink>
                            <NavLink onClick={() => navigate('priority')} isActive={currentPage === 'priority'}>
                                <i className={`fas fa-list-ol ${iconBaseClasses} ${currentPage === 'priority' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Prioridad Recursos</span>
                            </NavLink>
                            <NavLink onClick={() => navigate('furniture-duplicates')} isActive={currentPage === 'furniture-duplicates'}>
                                <i className={`fas fa-clone ${iconBaseClasses} ${currentPage === 'furniture-duplicates' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Duplicación Muebles</span>
                            </NavLink>
                            <NavLink onClick={() => navigate('roadmap')} isActive={currentPage === 'roadmap'}>
                                <i className={`fas fa-route ${iconBaseClasses} ${currentPage === 'roadmap' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Hoja de Ruta</span>
                            </NavLink>
                            <NavLink onClick={() => navigate('roster')} isActive={currentPage === 'roster'}>
                                <i className={`fas fa-users-cog ${iconBaseClasses} ${currentPage === 'roster' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Mi Roster</span>
                            </NavLink>
                            <NavLink onClick={() => navigate('database')} isActive={currentPage === 'database'}>
                                <i className={`fas fa-database ${iconBaseClasses} ${currentPage === 'database' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Base de Datos</span>
                            </NavLink>
                            <NavLink href={GUILD_URL} isActive={false}>
                                <i className={`fas fa-globe ${iconBaseClasses} text-gray-400 group-hover:text-red-500`}></i>
                                <span>Web del Gremio</span>
                            </NavLink>
                            <button
                                onClick={onToggleTips}
                                title={showTips ? "Desactivar consejos rápidos" : "Activar consejos rápidos"}
                                className={tipsButtonClasses}
                            >
                                <i className={tipsIconClasses}></i>
                                <span>Consejos</span>
                            </button>
                            <NavLink onClick={() => navigate('options')} isActive={currentPage === 'options'}>
                                <i className={`fas fa-cog ${iconBaseClasses} ${currentPage === 'options' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                                <span>Opciones</span>
                            </NavLink>
                        </div>
                    </nav>
                     {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                            className="text-gray-300 hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                            aria-controls="mobile-menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span className="sr-only">Abrir menú principal</span>
                            {isMobileMenuOpen ? (
                                <CloseIcon className="block h-6 w-6" />
                            ) : (
                                <MenuIcon className="block h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state. */}
            {isMobileMenuOpen && (
                <div className="md:hidden" id="mobile-menu">
                    <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <NavLink onClick={() => handleNavigate('landing')} isActive={currentPage === 'landing'} className="block text-base text-left w-full">
                            <i className={`fas fa-home ${iconBaseClasses} ${currentPage === 'landing' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Inicio</span>
                        </NavLink>
                        <NavLink onClick={() => handleNavigate('ranking')} isActive={currentPage === 'ranking'} className="block text-base text-left w-full">
                            <i className={`fas fa-trophy ${iconBaseClasses} ${currentPage === 'ranking' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Ranking Héroes</span>
                        </NavLink>
                        <NavLink onClick={() => handleNavigate('priority')} isActive={currentPage === 'priority'} className="block text-base text-left w-full">
                            <i className={`fas fa-list-ol ${iconBaseClasses} ${currentPage === 'priority' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Prioridad Recursos</span>
                        </NavLink>
                        <NavLink onClick={() => handleNavigate('furniture-duplicates')} isActive={currentPage === 'furniture-duplicates'} className="block text-base text-left w-full">
                            <i className={`fas fa-clone ${iconBaseClasses} ${currentPage === 'furniture-duplicates' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Duplicación Muebles</span>
                        </NavLink>
                        <NavLink onClick={() => handleNavigate('roadmap')} isActive={currentPage === 'roadmap'} className="block text-base text-left w-full">
                            <i className={`fas fa-route ${iconBaseClasses} ${currentPage === 'roadmap' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Hoja de Ruta</span>
                        </NavLink>
                        <NavLink onClick={() => handleNavigate('roster')} isActive={currentPage === 'roster'} className="block text-base text-left w-full">
                            <i className={`fas fa-users-cog ${iconBaseClasses} ${currentPage === 'roster' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Mi Roster</span>
                        </NavLink>
                        <NavLink onClick={() => handleNavigate('database')} isActive={currentPage === 'database'} className="block text-base text-left w-full">
                            <i className={`fas fa-database ${iconBaseClasses} ${currentPage === 'database' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Base de Datos</span>
                        </NavLink>
                        <NavLink href={GUILD_URL} isActive={false} className="block text-base text-left w-full">
                            <i className={`fas fa-globe ${iconBaseClasses} text-gray-400 group-hover:text-red-500`}></i>
                            <span>Web del Gremio</span>
                        </NavLink>
                        <button
                            onClick={handleToggleTipsMobile}
                            title={showTips ? "Desactivar consejos rápidos" : "Activar consejos rápidos"}
                            className={`${tipsButtonClasses} block text-base text-left w-full`}
                        >
                            <i className={tipsIconClasses}></i>
                            <span>Consejos</span>
                        </button>
                        <NavLink onClick={() => handleNavigate('options')} isActive={currentPage === 'options'} className="block text-base text-left w-full">
                            <i className={`fas fa-cog ${iconBaseClasses} ${currentPage === 'options' ? 'text-white' : 'text-gray-400 group-hover:text-red-500'}`}></i>
                            <span>Opciones</span>
                        </NavLink>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;