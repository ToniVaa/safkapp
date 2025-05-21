// src/components/RecipeEditForm.js
// Tämä komponentti tarjoaa lomakkeen reseptien muokkaamiseen ja ainesosaehdotuksiin.

import React, { useState, useEffect } from 'react';
// Tuo tarvittavat Firebase-funktiot suoraan firebase.js-tiedostosta
import { db, doc, getDoc, updateDoc } from '../firebase';

const RecipeEditForm = ({ recipeId, onCloseEdit }) => {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [suggestionStatus, setSuggestionStatus] = useState({}); // Tila ainesosaehdotuksille
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Hakee muokattavan reseptin tiedot Firebasesta komponentin latautuessa
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'recipes', recipeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.nimi || '');
          // Varmista, että ainesosat ovat aina lista, ja jos tyhjä, lisää yksi tyhjä kenttä
          setIngredients(data.ainesosat && data.ainesosat.length > 0 ? data.ainesosat : [{ name: '', amount: '', unit: '' }]);
          setInstructions(data.ohjeet ? data.ohjeet.join('\n') : '');
        } else {
          setError('Reseptiä ei löytynyt.');
        }
      } catch (err) {
        console.error('Virhe reseptin hakemisessa muokkausta varten:', err);
        setError('Virhe reseptin lataamisessa.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId]); // Hakee reseptin uudelleen, jos recipeId muuttuu

  // Käsittelee ainesosakentän muutokset
  const handleIngredientChange = (index, event) => {
    const newIngredients = [...ingredients];
    newIngredients[index][event.target.name] = event.target.value;
    setIngredients(newIngredients);
  };

  // Lisää uuden tyhjän ainesosakentän
  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  // Poistaa ainesosakentän
  const removeIngredientField = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  // Käsittelee lomakkeen lähetyksen (reseptin päivittämisen)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const filteredIngredients = ingredients.filter(
      (ing) => ing.name.trim() !== '' && ing.amount.toString().trim() !== '' && ing.unit.trim() !== ''
    ).map(ing => {
      const parsedAmount = Number(ing.amount); // KÄYTÄ NUMBER() JA TARKISTA NAN
      return {
        ...ing,
        amount: isNaN(parsedAmount) ? 0 : parsedAmount // Aseta 0, jos NaN
      };
    });

    if (name.trim() === '' || filteredIngredients.length === 0 || instructions.trim() === '') {
      setSubmissionStatus('error');
      alert('Täytäthän kaikki pakolliset kentät (nimi, ainesosat, ohjeet).');
      return;
    }

    try {
      const recipeRef = doc(db, 'recipes', recipeId);
      await updateDoc(recipeRef, {
        nimi: name,
        ainesosat: filteredIngredients,
        ohjeet: instructions.split('\n').filter(line => line.trim() !== ''),
        muokattu: new Date().toISOString() // Lisää viimeisin muokkausaika
      });
      setSubmissionStatus('success');
      setTimeout(() => {
        setSubmissionStatus(null);
        onCloseEdit(); // Sulje lomake onnistuneen päivityksen jälkeen
      }, 1500);
    } catch (err) {
      console.error('Virhe reseptin päivittämisessä:', err);
      setSubmissionStatus('error');
    }
  };

  // Funktio ainesosaehdotusten hakuun Gemini API:lla
  const getIngredientSuggestions = async (ingredientName, index) => {
    setIsSuggesting(true);
    setSuggestionStatus(prev => ({ ...prev, [index]: { loading: true, text: '' } }));
    try {
      const prompt = `Ehdota 3 vaihtoehtoista ainesosaa reseptissä käytettävälle "${ingredientName}"-ainesosalle. Anna vain vaihtoehdot pilkulla eroteltuna, ilman selityksiä.`;
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
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
        setSuggestionStatus(prev => ({ ...prev, [index]: { loading: false, text: `Ehd.: ${text}` } }));
      } else {
        setSuggestionStatus(prev => ({ ...prev, [index]: { loading: false, text: 'Ei ehdotuksia.' } }));
      }
    } catch (err) {
      console.error('Virhe ainesosaehdotusten haussa:', err);
      setSuggestionStatus(prev => ({ ...prev, [index]: { loading: false, text: 'Virhe ehdotusten haussa.' } }));
    } finally {
      setIsSuggesting(false);
    }
  };

  // Näytä lataus- tai virheilmoitus
  if (loading) return <p className="recipe-form-container">Ladataan reseptiä...</p>;
  if (error) return <p className="recipe-form-container error-message">{error}</p>;

  return (
    <div className="recipe-form-container">
      <h2>Muokkaa reseptiä: {name}</h2>
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label htmlFor="edit-name">Reseptin nimi:</label>
          <input
            type="text"
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-label="Reseptin nimi"
          />
        </div>

        <h3>Ainesosat:</h3>
        {ingredients.map((ingredient, index) => (
          <div key={index} className="ingredient-input-group">
            <input
              type="text"
              name="name"
              placeholder="Ainesosa (esim. 'kermaa')"
              value={ingredient.name}
              onChange={(e) => handleIngredientChange(index, e)}
              required
              aria-label={`Ainesosan ${index + 1} nimi`}
            />
            <input
              type="number"
              name="amount"
              placeholder="Määrä (esim. '2')"
              value={ingredient.amount}
              onChange={(e) => handleIngredientChange(index, e)}
              step="any"
              required
              aria-label={`Ainesosan ${index + 1} määrä`}
            />
            <input
              type="text"
              name="unit"
              placeholder="Yksikkö (esim. 'dl')"
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(index, e)}
              required
              aria-label={`Ainesosan ${index + 1} yksikkö`}
            />
            <button
              type="button"
              onClick={() => getIngredientSuggestions(ingredient.name, index)}
              className="suggest-ingredient-button"
              disabled={isSuggesting}
            >
              ✨ Ehdota ainesosaa
            </button>
            <button type="button" onClick={() => removeIngredientField(index)} className="remove-ingredient-button">
              Poista ainesosa
            </button>
            {suggestionStatus[index] && suggestionStatus[index].loading && (
              <div className="llm-loading-spinner"></div>
            )}
            {suggestionStatus[index] && suggestionStatus[index].text && (
              <p className="llm-result" style={{ flexBasis: '100%' }}>{suggestionStatus[index].text}</p>
            )}
          </div>
        ))}
        <button type="button" onClick={addIngredientField} className="add-ingredient-button">
          Lisää ainesosa
        </button>

        <div className="form-group">
          <label htmlFor="edit-instructions">Ohjeet:</label>
          <textarea
            id="edit-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows="5"
            required
            aria-label="Reseptin ohjeet"
          ></textarea>
        </div>

        <button type="submit" className="submit-button">Tallenna muutokset</button>
        <button type="button" onClick={onCloseEdit} className="cancel-button">Peruuta</button>

        {submissionStatus === 'success' && (
          <p className="success-message">Resepti päivitetty onnistuneesti!</p>
        )}
        {submissionStatus === 'error' && (
          <p className="error-message">Reseptin päivittäminen epäonnistui. Tarkista tiedot.</p>
        )}
      </form>
    </div>
  );
};

export default RecipeEditForm;
