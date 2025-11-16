import React, { useState, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Settings, Page, HeroDatabaseEntry } from '../types';
import { convertToTSVExportURL } from '../utils';
import { syncDatabaseWithSource } from '../services/sheetService';
import { performBackupAndRecordTimestamp } from '../services/backupService';
import { LoadingSpinner } from '../components/icons';
import ConfirmationModal from '../components/ConfirmationModal';

interface OptionsPageProps {
    navigate: (page: Page) => void;
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
    lastSync: string | null;
    onSync: (force?: boolean) => Promise<void>;
    isSyncing: boolean;
}

const OptionsPage: React.FC<OptionsPageProps> = ({ navigate, settings, setSettings, lastSync, onSync, isSyncing }) => {
    const [lastBackupDate, setLastBackupDate] = useLocalStorage<string | null>('last-manual-backup-date', null);
    const [localSheetUrl, setLocalSheetUrl] = useState(settings.sheetUrl);
    const [showCloudReminder, setShowCloudReminder] = useState(!settings.cloudConfigured);

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
    const [isConfirmingClearData, setIsConfirmingClearData] = useState(false);

    const handleSaveAndTest = useCallback(async () => {
        setIsTesting(true);
        setTestResult(null);
        const convertedUrl = convertToTSVExportURL(localSheetUrl);
        setLocalSheetUrl(convertedUrl);

        try {
            // Temporarily set the new URL to test it, then sync
            const oldUrl = settings.sheetUrl;
            setSettings(prev => ({ ...prev, sheetUrl: convertedUrl }));
            
            // We use a dummy DB here to force a fresh fetch without altering current state
            await syncDatabaseWithSource(convertedUrl, []);
            
            // If successful, the new URL is already saved.
            setTestResult({ status: 'success', message: '¡Conexión exitosa! La URL ha sido guardada.' });
            
            // Trigger a full sync with the new URL
            await onSync(true);

        } catch (error) {
            console.error("Test connection failed:", error);
            setTestResult({ status: 'error', message: 'Falló la conexión. Revisa la URL y los permisos de la hoja.' });
            // Revert to old URL on failure
            setSettings(prev => ({ ...prev, sheetUrl: prev.sheetUrl }));
        } finally {
            setIsTesting(false);
        }
    }, [localSheetUrl, setSettings, settings.sheetUrl, onSync]);

    const handleBackup = () => {
        try {
            performBackupAndRecordTimestamp();
            const updatedTimestamp = localStorage.getItem('last-manual-backup-date');
            if (updatedTimestamp) {
                setLastBackupDate(JSON.parse(updatedTimestamp) as string);
            }
        } catch (error) {
            console.error("Backup failed:", error);
            alert("No se pudo crear la copia de seguridad. Revisa la consola para más detalles.");
        }
    };


    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const restoredData = JSON.parse(content);
                    
                    if (typeof restoredData.settings !== 'object' || !restoredData.heroDatabase) {
                        throw new Error("El archivo no parece ser una copia de seguridad válida y actualizada.");
                    }

                    // Clear existing data before restoring
                    localStorage.clear();

                    localStorage.setItem('hero-database', JSON.stringify(restoredData.heroDatabase));
                    localStorage.setItem('afk-settings', JSON.stringify(restoredData.settings));
                    if (restoredData.playerHeroData) localStorage.setItem('player-hero-data', JSON.stringify(restoredData.playerHeroData));
                    if (restoredData.furniturePriorityData) localStorage.setItem('furniture-priority-data', JSON.stringify(restoredData.furniturePriorityData));
                    // etc. for any other specific keys
                    
                    alert('Copia de seguridad restaurada con éxito. La página se recargará para aplicar los cambios.');
                    window.location.reload();
                } catch (error) {
                    console.error("Restore error:", error);
                    alert(`Error al restaurar: ${error instanceof Error ? error.message : 'Error desconocido.'}`);
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }
    };
    
    const handleConfirmClearData = () => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            setIsConfirmingClearData(false);
            alert('Todos los datos locales han sido borrados. La página se recargará.');
            window.location.reload();
        } catch (error) {
            console.error("Failed to clear data:", error);
            alert("Hubo un error al limpiar los datos.");
            setIsConfirmingClearData(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Opciones</h1>
            
            {showCloudReminder && (
                <div className="bg-sky-900 border border-sky-700 text-sky-100 px-4 py-3 rounded-md mb-6 flex justify-between items-center">
                    <p>💡 Para proteger tus datos, considera configurar una copia de seguridad en la nube.</p>
                    <button onClick={() => setShowCloudReminder(false)} className="text-xl font-bold">&times;</button>
                </div>
            )}
            
            <div className="space-y-8">
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Fuente de Datos</h2>
                    <label htmlFor="sheetUrl" className="block text-sm font-medium text-gray-300 mb-2">URL de la Hoja de Cálculo de Google</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input type="text" id="sheetUrl" value={localSheetUrl} onChange={(e) => setLocalSheetUrl(e.target.value)} className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                        <button onClick={handleSaveAndTest} disabled={isTesting || isSyncing} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center disabled:bg-gray-500">
                           {(isTesting || isSyncing) && <LoadingSpinner className="h-5 w-5 mr-2" />}
                           {isTesting ? 'Probando...' : (isSyncing ? 'Sincronizando...' : 'Guardar y Probar')}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Puedes pegar la URL completa de tu navegador. La convertiremos automáticamente al formato correcto.</p>
                    
                    <div className="border-t border-gray-700 mt-4 pt-4 flex items-center justify-between">
                        <span className="text-gray-300">Última sincronización:</span>
                        <span className="font-medium text-gray-100">{lastSync ? new Date(lastSync).toLocaleString('es-ES') : 'Nunca'}</span>
                    </div>

                     <div className="border-t border-gray-700 mt-4 pt-4 flex items-center justify-between">
                         <span className="text-gray-300">Actualizar datos al iniciar</span>
                         <label htmlFor="auto-update-toggle" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" id="auto-update-toggle" className="sr-only" checked={settings.autoUpdate} onChange={(e) => setSettings(prev => ({...prev, autoUpdate: e.target.checked}))} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${settings.autoUpdate ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoUpdate ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                    </div>

                    {testResult && (
                        <div className={`mt-3 text-sm p-3 rounded-md ${testResult.status === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>{testResult.message}</div>
                    )}
                </div>
                
                 <div className="bg-gray-800 p-6 rounded-lg border border-yellow-600/50 shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-yellow-400">Modo Avanzado</h2>
                    <p className="text-sm text-gray-400 mb-4">Modifica directamente la base de datos local de héroes, gestiona conflictos de datos y añade nuevos héroes manualmente.</p>
                    <button onClick={() => navigate('database')} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 text-base">
                         <i className="fas fa-database"></i>
                        <span>Ir a la Base de Datos de Héroes</span>
                    </button>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Gestión de Datos</h2>
                    <p className="text-sm text-gray-400 mb-4">Crea un archivo de respaldo con todo el progreso de tus héroes, notas y configuraciones. Puedes usar este archivo para restaurar tus datos en este u otro dispositivo.</p>
                    <div className="space-y-4">
                        <div className="border-t border-gray-700 pt-4 flex flex-col sm:flex-row gap-4">
                            <button onClick={handleBackup} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Guardar copia local</button>
                            <label className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md cursor-pointer text-center">Restaurar copia local<input type="file" accept=".json" onChange={handleRestore} className="hidden" /></label>
                        </div>
                        <div className="text-sm text-gray-400 text-center">Última copia guardada: {lastBackupDate ? new Date(lastBackupDate).toLocaleString('es-ES') : 'Nunca'}</div>
                         <div className="border-t border-gray-700 pt-4">
                            <button onClick={() => setIsConfirmingClearData(true)} className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-2 px-4 rounded-md">Limpiar todos los datos locales</button>
                        </div>
                    </div>
                </div>

                 <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Nube Personal (Próximamente)</h2>
                    <p className="text-gray-400">Esta función te permitirá guardar tus datos en una nube personal para acceder a ellos desde cualquier dispositivo. Actualmente en desarrollo.</p>
                    <button className="mt-4 w-full bg-gray-600 text-gray-400 font-bold py-2 px-4 rounded-md cursor-not-allowed">Configurar Nube</button>
                </div>
            </div>
            
            <ConfirmationModal isOpen={isConfirmingClearData} onClose={() => setIsConfirmingClearData(false)} onConfirm={handleConfirmClearData} title="Confirmar Limpieza Total de Datos">
                <p>¿Estás absolutamente seguro de que quieres borrar <span className="font-bold text-red-400">TODOS</span> los datos locales?</p>
                <p className="mt-2">Esta acción eliminará permanentemente:</p>
                <ul className="list-disc list-inside text-gray-400 mt-2">
                    <li>La base de datos de héroes.</li>
                    <li>El progreso de tu Roster de Héroes.</li>
                    <li>Todas las configuraciones de la aplicación.</li>
                </ul>
                <p className="mt-4 font-bold">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
        </div>
    );
};

export default OptionsPage;