// src/components/RecipeForm.js
// Tämä komponentti hoitaa uusien reseptien lisäämisen tietokantaan.

import React, { useState } from 'react';
// Tuo tarvittavat Firebase-funktiot suoraan firebase.js-tiedostosta
import { db, collection, addDoc } from '../firebase';

const RecipeForm = ({ onRecipeAdded }) => { // onRecipeAdded prop ohjaa takaisin listaukseen
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'success', 'error', null

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

  // Käsittelee lomakkeen lähetyksen
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Suodata tyhjät ainesosat ja muunna määrä numeroksi tallennusta varten
    const filteredIngredients = ingredients.filter(
      (ing) => ing.name.trim() !== '' && ing.amount.toString().trim() !== '' && ing.unit.trim() !== ''
    ).map(ing => {
      const parsedAmount = Number(ing.amount); // KÄYTÄ NUMBER() JA TARKISTA NAN
      return {
        ...ing,
        amount: isNaN(parsedAmount) ? 0 : parsedAmount // Aseta 0, jos NaN
      };
    });

    // Tarkista pakolliset kentät
    if (name.trim() === '' || filteredIngredients.length === 0 || instructions.trim() === '') {
      setSubmissionStatus('error');
      alert('Täytäthän kaikki pakolliset kentät (nimi, ainesosat, ohjeet).'); 
      return;
    }

    try {
      // Lisää resepti Firestoreen
      await addDoc(collection(db, 'recipes'), {
        nimi: name,
        ainesosat: filteredIngredients,
        ohjeet: instructions.split('\n').filter(line => line.trim() !== ''), // Jaa ohjeet rivinvaihdoista
        luotu: new Date().toISOString() // Tallenna luontiaika
      });
      setSubmissionStatus('success'); // Aseta onnistumisviesti
      
      // Tyhjennä lomake onnistuneen lähetyksen jälkeen
      setName('');
      setIngredients([{ name: '', amount: '', unit: '' }]);
      setInstructions('');
      
      // Ohjaa takaisin reseptit-sivulle lyhyen viiveen jälkeen
      setTimeout(() => {
        setSubmissionStatus(null); // Piilota viesti
        if (onRecipeAdded) {
          onRecipeAdded(); // Kutsu App-komponentin funktiota ohjaamaan välilehteä
        }
      }, 1500); // 1.5 sekunnin viive
    } catch (error) {
      console.error('Virhe reseptin lisäämisessä: ', error);
      setSubmissionStatus('error'); // Aseta virheviesti
    }
  };

  return (
    <div className="recipe-form-container">
      <h2>Lisää uusi resepti</h2>
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label htmlFor="name">Reseptin nimi:</label>
          <input
            type="text"
            id="name"
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
              step="any" // Sallii desimaalit
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
            {ingredients.length > 1 && (
              <button type="button" onClick={() => removeIngredientField(index)} className="remove-ingredient-button">
                Poista
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addIngredientField} className="add-ingredient-button">
          Lisää ainesosa
        </button>

        <div className="form-group">
          <label htmlFor="instructions">Ohjeet:</label>
          <textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows="5"
            required
            aria-label="Reseptin ohjeet"
          ></textarea>
        </div>

        <button type="submit" className="submit-button">Lisää resepti</button>

        {submissionStatus === 'success' && (
          <p className="success-message">Resepti lisätty onnistuneesti!</p>
        )}
        {submissionStatus === 'error' && (
          <p className="error-message">Reseptin lisääminen epäonnistui. Tarkista tiedot.</p>
        )}
      </form>
    </div>
  );
};

export default RecipeForm;
