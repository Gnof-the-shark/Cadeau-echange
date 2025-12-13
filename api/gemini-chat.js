import { GoogleGenAI } from '@google/genai';

// Ceci est la fonction Serverless (Edge Function) de Vercel.
export default async (req, res) => {
    // La clé API est lue à partir des variables d'environnement sécurisées de Vercel.
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Configuration des en-têtes (CORS) pour que votre site web puisse appeler la fonction.
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Content-Type', 'application/json');

    // Gestion de la méthode OPTIONS (requis par les navigateurs pour le CORS)
    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send({ error: 'Méthode non autorisée. Utilisez POST.' });
        return;
    }

    try {
        // Récupérez la question de l'utilisateur envoyée par votre site web.
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).send({ error: 'Le champ "prompt" est requis.' });
            return;
        }

        // Appel sécurisé à l'API Gemini.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        // Renvoie la réponse à votre site web.
        res.status(200).send({
            success: true,
            result: response.text,
        });

    } catch (error) {
        console.error('Erreur Gemini:', error);
        res.status(500).send({ 
            success: false, 
            error: "Erreur lors du traitement de l'IA. Vérifiez la clé API et les logs Vercel." 
        });
    }
};