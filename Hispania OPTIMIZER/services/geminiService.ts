
import { GoogleGenAI, Content } from "@google/genai";
import { GroundingChunk } from "../types";

const getAIClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const translationSystemInstruction = `Eres un traductor experto especializado en el videojuego AFK Arena.
Tu tarea es traducir una frase del ruso al español.
Debes mantener el significado original pero adaptando la traducción a la jerga y terminología comúnmente usada en la comunidad de habla hispana de AFK Arena.
Por ejemplo, "гравировка" es "grabado", "мебель" es "muebles", "приоритет" es "prioridad", etc.
Responde únicamente con la frase traducida.`;


export const translateSingleComment = async (comment: string): Promise<string> => {
    if (!comment || comment.trim() === '') {
        return "";
    }

    try {
        const ai = getAIClient();
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Traduce la siguiente frase del ruso al español, usando la jerga de AFK Arena: "${comment}"`,
            config: {
                systemInstruction: translationSystemInstruction,
            },
        });

        const translatedText = response.text.trim().replace(/^"|"$/g, '');
        return translatedText;

    } catch (error) {
        console.error("Error translating single comment:", error);
        return comment; // Return original comment on error
    }
};

export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string, useProModel: boolean): Promise<string> => {
    try {
        const ai = getAIClient();
        const model = useProModel ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

        const config = useProModel ? { thinkingConfig: { thinkingBudget: 32768 } } : {};

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        };
        const textPart = { text: prompt };

        const result = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: config,
        });
        
        return result.text;
    } catch (error) {
        console.error("Error analyzing image:", error);
        return "Lo siento, ha ocurrido un error al analizar la imagen. Por favor, asegúrate de que el formato es correcto e inténtalo de nuevo.";
    }
};

// Fix: Added getGroundedChatResponse function to support the ChatWidget feature.
const chatSystemInstruction = `Eres un asistente experto en el videojuego AFK Arena.
Tu nombre es HispanIA-Chat.
Proporciona respuestas concisas, claras y útiles para los jugadores.
Utiliza la información de búsqueda proporcionada para responder a las preguntas sobre noticias recientes, eventos o información actualizada.
Cita siempre tus fuentes si utilizas la información de búsqueda.
Habla en español.`;

export const getGroundedChatResponse = async (
    history: Content[],
    newPrompt: string,
    useProModel: boolean
): Promise<{ text: string; references: GroundingChunk[] }> => {
    try {
        const ai = getAIClient();
        const model = useProModel ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
        
        const contents: Content[] = [...history, { role: 'user', parts: [{ text: newPrompt }] }];

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                systemInstruction: chatSystemInstruction,
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text;
        const references = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];

        return { text, references };
    } catch (error) {
        console.error("Error getting grounded chat response:", error);
        throw error;
    }
};