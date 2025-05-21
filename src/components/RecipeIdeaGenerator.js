// src/components/RecipeIdeaGenerator.js
// Tämä komponentti luo resepti-ideoita Gemini API:n avulla.

import React, { useState } from 'react';

const RecipeIdeaGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedIdeas, setGeneratedIdeas] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Käsittelee resepti-ideoiden generoinnin Gemini API:lla
  const generateIdeas = async () => {
    setIsLoading(true);
    setGeneratedIdeas('');
    setError(null);

    if (prompt.trim() === '') {
      setError('Kirjoita pyyntö resepti-ideoiden luomiseksi.');
      setIsLoading(false);
      return;
    }

    try {
      const chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: `Ehdota yksityiskohtaisia resepti-ideoita seuraavan kuvauksen perusteella: "${prompt}". Anna vähintään 3 ideaa. Sisällytä reseptin nimi, pääainesosat ja lyhyt kuvaus tai valmistusohje.` }] });
      const payload = { contents: chatHistory };
      const apiKey = ""; // Canvas antaa API-avaimen ajonaikana
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setGeneratedIdeas(text);
      } else {
        setGeneratedIdeas('Ei resepti-ideoita tällä pyynnöllä. Kokeile toista pyyntöä.');
      }
    } catch (err) {
      console.error('Virhe resepti-ideoiden haussa:', err);
      setError('Virhe resepti-ideoiden haussa. Yritä uudelleen myöhemmin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="llm-feature-container">
      <h2>✨ Resepti-ideat</h2>
      <p>Kerro, millaisia resepti-ideota haluat (esim. "kanaa ja kasviksia", "nopea arkiruoka", "gluteeniton jälkiruoka"):</p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows="4"
        placeholder="Esim. 'helppoja kasvisruokia', 'juhlaruoka kalasta'"
        aria-label="Resepti-ideoiden pyyntö"
      ></textarea>
      <button onClick={generateIdeas} disabled={isLoading}>
        {isLoading ? 'Luodaan ideoita...' : 'Luo resepti-ideoita'}
      </button>

      {isLoading && <div className="llm-loading-spinner"></div>}
      {error && <p className="error-message">{error}</p>}
      {generatedIdeas && (
        <div className="llm-result">
          <h3>Tässä ideoita sinulle:</h3>
          <p>{generatedIdeas}</p>
        </div>
      )}
    </div>
  );
};

export default RecipeIdeaGenerator;
