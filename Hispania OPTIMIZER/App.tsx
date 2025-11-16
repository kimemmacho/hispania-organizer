
import React, { useState, useCallback, useEffect } from 'react';
import { Page, Settings, HeroDatabaseEntry } from './types';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import RankingPage from './pages/RankingPage';
import OptionsPage from './pages/OptionsPage';
import RosterPage from './pages/RosterPage';
import ResourcePriorityPage from './pages/ResourcePriorityPage';
import RoadmapPage from './pages/BuildQueuePage';
import FurnitureDuplicatesPage from './pages/FurnitureDuplicatesPage';
import DatabasePage from './pages/DatabasePage';
import useLocalStorage from './hooks/useLocalStorage';
import { DEFAULT_SHEET_URL } from './constants';
import BackupReminderModal from './components/BackupReminderModal';
import { performBackupAndRecordTimestamp } from './services/backupService';
import { syncDatabaseWithSource } from './services/sheetService';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [settings, setSettings] = useLocalStorage<Settings>('afk-settings', {
        sheetUrl: DEFAULT_SHEET_URL,
        autoUpdate: true,
        cloudConfigured: false,
        showTips: true,
    });
    
    // Centralized Data Management
    const [database, setDatabase] = useLocalStorage<HeroDatabaseEntry[]>('hero-database', []);
    const [lastSync, setLastSync] = useLocalStorage<string | null>('hero-db-last-sync', null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);


    const [showCloudBanner, setShowCloudBanner] = useState(() => {
        const dismissed = sessionStorage.getItem('cloudBannerDismissed');
        return !settings.cloudConfigured && !dismissed;
    });
    const [lastBackupDate] = useLocalStorage<string | null>('last-manual-backup-date', null);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [databaseIncomplete, setDatabaseIncomplete] = useState(false);

    const handleSync = useCallback(async (force = false) => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const newDb = await syncDatabaseWithSource(settings.sheetUrl, database);
            setDatabase(newDb);
            setLastSync(new Date().toISOString());
        } catch (err: any) {
            console.error("Sync failed:", err);
            setSyncError(err.message || "No se pudieron sincronizar los datos.");
        } finally {
            setIsSyncing(false);
        }
    }, [settings.sheetUrl, database, setDatabase, setLastSync]);

    useEffect(() => {
        const checkDbIntegrity = () => {
            if (database.length > 0) {
                 const isIncomplete = database.some(hero => !hero.spanishName || !hero.faction || hero.faction === 'Desconocida' || !hero.tier || hero.tier === 'N/A');
                if (isIncomplete) {
                    setDatabaseIncomplete(true);
                }
            }
        };
        checkDbIntegrity();
    }, [database]);
    
    useEffect(() => {
        const autoSync = () => {
            const oneDay = 24 * 60 * 60 * 1000;
            const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
            const now = new Date().getTime();

            const needsSync = !lastSync || (now - lastSyncTime > oneDay);
            
            if (database.length === 0 || (settings.autoUpdate && needsSync)) {
                handleSync();
            }
        };
        autoSync();
    }, []); // Run only once on mount

    useEffect(() => {
        const dismissed = sessionStorage.getItem('backupReminderDismissed');
        if (dismissed) return;
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (lastBackupDate) {
            if (new Date().getTime() - new Date(lastBackupDate).getTime() > thirtyDaysInMs) {
                setShowBackupModal(true);
            }
        } else {
            setShowBackupModal(true);
        }
    }, [lastBackupDate]);

    const handleBackupFromModal = () => {
        performBackupAndRecordTimestamp();
        setShowBackupModal(false); 
        sessionStorage.setItem('backupReminderDismissed', 'true');
    };

    const handleDismissBackupModal = () => {
        sessionStorage.setItem('backupReminderDismissed', 'true');
        setShowBackupModal(false);
    };

    const handleDismissBanner = () => {
        sessionStorage.setItem('cloudBannerDismissed', 'true');
        setShowCloudBanner(false);
    };

    const navigate = useCallback((page: Page) => {
        setCurrentPage(page);
    }, []);

    const handleToggleTips = () => {
        setSettings(prev => {
            const newShowTips = !prev.showTips;
            if (newShowTips) {
                sessionStorage.removeItem('tipWidgetClosed');
            }
            return { ...prev, showTips: newShowTips };
        });
    };

    const renderPage = () => {
        const commonProps = {
            navigate,
            database,
            setDatabase,
            onSync: handleSync,
            isSyncing,
            syncError,
            lastSync,
            settings
        };

        switch (currentPage) {
            case 'ranking':
                return <RankingPage {...commonProps} />;
            case 'priority':
                return <ResourcePriorityPage {...commonProps} />;
            case 'furniture-duplicates':
                return <FurnitureDuplicatesPage {...commonProps} />;
            case 'roadmap':
                // FIX: Pass only the necessary props to RoadmapPage to satisfy its explicit props interface, resolving the type error.
                return <RoadmapPage navigate={navigate} database={database} settings={settings} />;
            case 'options':
                return <OptionsPage {...commonProps} setSettings={setSettings} />;
            case 'roster':
                return <RosterPage {...commonProps} />;
            case 'database':
                return <DatabasePage {...commonProps} />;
            case 'landing':
            default:
                return <LandingPage navigate={navigate} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
            <Header
              navigate={navigate}
              currentPage={currentPage}
              onToggleTips={handleToggleTips}
              showTips={settings.showTips}
            />
            
            {databaseIncomplete && currentPage === 'landing' && (
                 <div className="bg-yellow-900 text-yellow-100 text-sm text-center p-2 flex items-center justify-center gap-4 relative">
                    <span>⚠️ Se han detectado datos de héroes incompletos. Por favor, revísalos en el modo avanzado para asegurar el correcto funcionamiento de la app.</span>
                    <button onClick={() => { sessionStorage.setItem('db-page-initial-filter', 'incomplete'); navigate('database'); }} className="font-bold underline hover:text-yellow-300">Ir a la Base de Datos</button>
                    <button onClick={() => setDatabaseIncomplete(false)} className="font-bold text-lg leading-none hover:text-yellow-300 absolute right-2 top-1/2 -translate-y-1/2">&times;</button>
                </div>
            )}

            {showCloudBanner && (
                <div className="bg-sky-900 text-sky-100 text-sm text-center p-2 flex items-center justify-center gap-4 relative">
                    <span>💡 Para proteger tus datos, considera configurar una copia de seguridad en la nube en Opciones.</span>
                    <button onClick={handleDismissBanner} className="font-bold text-lg leading-none hover:text-sky-300 absolute right-2 top-1/2 -translate-y-1/2">&times;</button>
                </div>
            )}

            <main className="flex-grow container mx-auto p-4 md:p-6">
                {isSyncing && database.length === 0 && (
                     <div className="text-center py-20">
                        <i className="fas fa-sync-alt fa-spin fa-3x text-red-500"></i>
                        <p className="mt-4 text-lg text-gray-300">Sincronizando datos por primera vez...</p>
                    </div>
                )}
                {!isSyncing && database.length === 0 && (
                    <div className="text-center py-20 bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-2xl font-bold text-yellow-400">¡Bienvenido!</h2>
                        <p className="mt-2 text-gray-400">No se encontraron datos locales. Por favor, realiza una sincronización para cargar la información de los héroes.</p>
                        <p className="text-sm text-gray-500 mt-1">Si el problema persiste, revisa la URL de la hoja de cálculo en Opciones.</p>
                        <button onClick={() => handleSync(true)} className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md">
                            Sincronizar Ahora
                        </button>
                        {syncError && <p className="text-red-400 mt-4">{syncError}</p>}
                    </div>
                )}
                {database.length > 0 && renderPage()}
            </main>
            <footer className="text-center p-4 text-gray-500 text-sm">
                <p>
                    Gremio
                    <span className="inline-flex items-center gap-1.5 mx-1">
                        <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className="h-3" />
                        <span className="font-semibold text-gray-400">HISPANIA</span>
                        <img src="https://flagcdn.com/es.svg" alt="Bandera de España" className="h-3" />
                    </span>
                    ID: 7642
                </p>
            </footer>
            <BackupReminderModal
              isOpen={showBackupModal && currentPage === 'landing'}
              onClose={handleDismissBackupModal}
              onConfirm={handleBackupFromModal}
              lastBackupDate={lastBackupDate}
            />
        </div>
    );
};

export default App;
