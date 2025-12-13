// La Netlify Function s'exécute côté serveur, assurant la sécurité de la clé API.
// Remplacez 'node-fetch' par l'implémentation standard si vous utilisez Node.js 18+
// Netlify utilise généralement un environnement qui supporte 'node-fetch'.
const fetch = require('node-fetch'); 

// Le nom du modèle Gemini à utiliser
const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';

exports.handler = async (event) => {
  // 1. Récupération de la clé API à partir des variables d'environnement de Netlify
  // Vous DEVEZ créer une variable d'environnement nommée GEMINI_API_KEY dans votre tableau de bord Netlify.
  const API_KEY = process.env.GEMINI_API_KEY; 

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GEMINI_API_KEY non configurée dans les variables d’environnement Netlify.' })
    };
  }

  // L'URL complète de l'API Google avec la clé secrète
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  try {
    // Le corps de la requête contient le payload JSON envoyé par le client (le HTML)
    const payload = JSON.parse(event.body);

    // 2. Appel sécurisé à l'API Gemini
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Gestion des erreurs de l'API Gemini
    if (!response.ok) {
        // En cas d'erreur de l'API Google, on retourne le message d'erreur au client
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: data.error?.message || `Erreur lors de l'appel à Gemini (Code: ${response.status})` })
        };
    }

    // 3. Retour de la réponse de l'IA au client (le fichier HTML)
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Erreur d'exécution de la fonction:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Erreur du serveur proxy Netlify: ${error.message}` })
    };
  }
};
