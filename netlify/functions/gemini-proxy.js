// netlify/functions/gemini-proxy.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  // La clé est stockée dans les variables d'environnement de Netlify !
  const API_KEY = process.env.GEMINI_API_KEY; 

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=' + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body // Contient le payload JSON envoyé par le navigateur
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
