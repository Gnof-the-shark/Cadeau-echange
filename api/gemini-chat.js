import { GoogleGenAI } from '@google/genai';

// La clé API est lue à partir des variables d'environnement Vercel (GEMINI_API_KEY)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Le modèle par défaut est utilisé (vous pouvez le changer si vous voulez)
const MODEL_NAME = 'gemini-2.5-flash';

export default async (req, res) => {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send({ error: 'Méthode non autorisée. Utilisez POST.' });
        return;
    }

    try {
        // 1. Récupération des données envoyées par votre front-end (le prompt et l'instruction système)
        const { prompt, systemInstruction } = req.body;
        
        if (!prompt) {
            res.status(400).send({ error: 'Le champ "prompt" est requis.' });
            return;
        }

        // 2. Préparation des instructions pour Gemini
        const instructionPart = systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined;
        
        // 3. Appel sécurisé à l'API Gemini
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            // L'instruction système est envoyée dans la requête
            config: { systemInstruction: instructionPart } 
        });

        // 4. Renvoie la réponse de l'IA à votre site web.
        res.status(200).send({
            success: true,
            // Récupère uniquement le texte pour simplifier le front-end
            result: response.text, 
        });
        
    } catch (error) {
        console.error('Erreur Gemini:', error);
        res.status(500).send({ 
            success: false, 
            error: 'Erreur interne du proxy. Vérifiez les logs Vercel.' 
        });
    }
};
