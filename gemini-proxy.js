/**
 * Fichier : netlify/functions/gemini-proxy.js
 * Rôle : Gérer l'appel sécurisé à l'API Gemini en masquant la clé API.
 * * Instructions de configuration : 
 * 1. Créer une variable d'environnement Netlify nommée GEMINI_API_KEY
 * 2. Coller la clé API Gemini dans cette variable.
 */
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Fonction utilitaire pour gérer la logique de nouvelle tentative (backoff)
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            // Tenter le retry pour les erreurs 5xx et 429
            if (response.status >= 500 || response.status === 429) {
                if (i < maxRetries - 1) {
                    const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue; // Recommencer la boucle
                }
            }
            // Pour toutes les autres erreurs HTTP, jeter l'erreur
            throw new Error(`Erreur HTTP: ${response.status} - ${await response.text()}`);

        } catch (error) {
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000;
                // Attendre avant de retenter (backoff exponentiel)
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Échouer après la dernière tentative
                throw error;
            }
        }
    }
};

/**
 * Point d'entrée de la fonction Netlify.
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'La clé API Gemini est manquante sur le serveur (variable GEMINI_API_KEY).' }) };
    }

    try {
        const { mode, input, systemPrompt } = JSON.parse(event.body);
        
        // 1. Reconstruire le prompt basé sur le mode (logique identique au frontend d'origine)
        let prompt = "";
        
        if (mode === 'ideas') {
            const interest = input.interest || "général";
            prompt = `Suggère une idée de petit projet Python pour un débutant intéressé par : ${interest}. Décris le but et donne les grandes étapes du code. Donne un code final avec des commentaires a chaque ligne à la fin.`;
        } 
        else if (mode === 'explainer') {
            prompt = `Explique ce code Python étape par étape pour un débutant complet. Utilise des analogies simples : \n\n${input.code}`;
        }
        else if (mode === 'corrector') {
            prompt = `Voici un code Python qui semble contenir des erreurs. 
            1. Identifie les erreurs (syntaxe ou logique).
            2. Explique pourquoi ça ne marche pas simplement.
            3. Donne la version corrigée du code.
            
            Code à corriger :
            \n\n${input.code}`;
        }
        else if (mode === 'quiz') {
            prompt = `Génère une question à choix multiple (QCM) sur les bases de Python (variables, boucles, conditions). 
            Format attendu:
            **Question** : [La question]
            
            A) [Option 1]
            B) [Option 2]
            C) [Option 3]
            
            <details>
            <summary>Voir la réponse</summary>
            **Réponse** : [La bonne lettre]
            *Explication* : [Courte explication]
            </details>`;
        } else {
             return { statusCode: 400, body: JSON.stringify({ error: 'Mode invalide fourni.' }) };
        }

        // 2. Appel sécurisé à l'API Gemini avec la clé du serveur
        const response = await fetchWithRetry(`${MODEL_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            }),
        });

        const data = await response.json();
        
        // Gérer les erreurs de l'API Gemini (si la réponse est ok, mais le contenu indique une erreur)
        if (data.error) {
            return {
                statusCode: data.error.code || 500,
                body: JSON.stringify({ error: `Erreur Gemini API: ${data.error.message}` }),
            };
        }

        // 3. Extraire le texte généré et le retourner au client
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
             return { statusCode: 500, body: JSON.stringify({ error: "Réponse de l'IA vide ou mal structurée." }) };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        };

    } catch (error) {
        console.error('Erreur de la fonction Netlify:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erreur interne du serveur: ${error.message}` }),
        };
    }
};
