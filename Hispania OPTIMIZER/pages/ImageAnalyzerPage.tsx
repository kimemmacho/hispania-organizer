
import React, { useState, useCallback } from 'react';
import { analyzeImage } from '../services/geminiService';
import { LoadingSpinner } from '../components/icons';

const ImageAnalyzerPage: React.FC = () => {
    const [image, setImage] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string | null>(null);
    const [prompt] = useState<string>(
        "Analiza esta imagen del juego AFK Arena. Identifica los héroes presentes, su nivel de ascensión y equipamiento si es visible. Basándote en la composición, proporciona consejos estratégicos sobre en qué héroe debería enfocarme a continuación, qué formaciones podrían ser fuertes y cualquier recomendación general para mejorar mi cuenta. Habla en español."
    );
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useProModel, setUseProModel] = useState(false);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError('La imagen es demasiado grande. El límite es 4MB.');
                return;
            }
            setError(null);
            setImageMimeType(file.type);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setAnalysis('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!image) {
            setError('Por favor, sube una imagen primero.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis('');

        try {
            // remove data:image/jpeg;base64,
            const base64Image = image.split(',')[1];
            if (!imageMimeType) {
                throw new Error("MIME type de la imagen no detectado.");
            }
            const result = await analyzeImage(base64Image, imageMimeType, prompt, useProModel);
            setAnalysis(result);
        } catch (err) {
            setError('Ocurrió un error durante el análisis. Inténtalo de nuevo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [image, imageMimeType, prompt, useProModel]);

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Analizador de Héroes con IA</h1>
            <p className="text-gray-400 mb-6">Sube una captura de pantalla de tu lista de héroes y deja que la IA te dé consejos personalizados.</p>

            <div className="bg-gray-800 p-6 rounded-lg mb-6">
                 <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">
                    Sube tu imagen (máx 4MB)
                </label>
                <input
                    id="image-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            {image && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Vista Previa</h2>
                    <img src={image} alt="Vista previa de héroes" className="max-w-full md:max-w-md mx-auto rounded-lg shadow-lg" />
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !image}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center text-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isLoading && <LoadingSpinner className="h-6 w-6 mr-3" />}
                    {isLoading ? 'Analizando...' : 'Analizar con IA'}
                </button>
                <label htmlFor="pro-mode-toggle-analyzer" className="flex items-center cursor-pointer bg-gray-700 px-4 py-3 rounded-lg">
                    <span className="mr-3 text-sm text-gray-300">Modo Avanzado (Más lento, más detallado)</span>
                    <div className="relative">
                        <input type="checkbox" id="pro-mode-toggle-analyzer" className="sr-only" checked={useProModel} onChange={() => setUseProModel(!useProModel)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${useProModel ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useProModel ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                </label>
            </div>
            
            {analysis && (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">Análisis de la IA</h2>
                    <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                        {analysis}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageAnalyzerPage;
