// src/components/RecipeForm.js
// Tämä komponentti hoitaa uusien reseptien lisäämisen tietokantaan.

import React, { useState, useRef, useEffect } from 'react';
// Tuo tarvittavat Firebase-funktiot suoraan firebase.js-tiedostosta
import { db, collection, addDoc } from '../firebase';

const RecipeForm = ({ onRecipeAdded, showToast }) => { // showToast prop lisätty
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState({}); // Tila virheilmoituksille
  const nameInputRef = useRef(null); // Ref nimen input-kentälle

  // Fokusoi nimen input-kenttä, kun komponentti latautuu
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Käsittelee ainesosakentän muutokset
  const handleIngredientChange = (index, event) => {
    const newIngredients = [...ingredients];
    newIngredients[index][event.target.name] = event.target.value;
    setIngredients(newIngredients);
    // Poista virhe, kun käyttäjä alkaa kirjoittaa
    if (errors[`ingredient-${index}-${event.target.name}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`ingredient-${index}-${event.target.name}`];
        return newErrors;
      });
    }
  };

  // Lisää uuden tyhjän ainesosakentän
  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  // Poistaa ainesosakentän
  const removeIngredientField = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
    // Poista mahdolliset virheet poistetulta ainesosalta
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`ingredient-${index}-name`];
      delete newErrors[`ingredient-${index}-amount`];
      delete newErrors[`ingredient-${index}-unit`];
      return newErrors;
    });
  };

  // Validointifunktio
  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (name.trim() === '') {
      newErrors.name = 'Reseptin nimi on pakollinen.';
      isValid = false;
    }

    if (instructions.trim() === '') {
      newErrors.instructions = 'Ohjeet ovat pakolliset.';
      isValid = false;
    }

    const filteredIngredients = ingredients.filter(
      (ing) => ing.name.trim() !== '' || ing.amount.toString().trim() !== '' || ing.unit.trim() !== ''
    );

    if (filteredIngredients.length === 0) {
      newErrors.ingredients = 'Lisää vähintään yksi ainesosa.';
      isValid = false;
    } else {
      filteredIngredients.forEach((ing, index) => {
        if (ing.name.trim() === '') {
          newErrors[`ingredient-${index}-name`] = 'Nimi on pakollinen.';
          isValid = false;
        }
        if (ing.amount.toString().trim() === '') {
          newErrors[`ingredient-${index}-amount`] = 'Määrä on pakollinen.';
          isValid = false;
        } else {
          const parsedAmount = Number(ing.amount);
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            newErrors[`ingredient-${index}-amount`] = 'Määrän on oltava positiivinen luku.';
            isValid = false;
          }
        }
        if (ing.unit.trim() === '') {
          newErrors[`ingredient-${index}-unit`] = 'Yksikkö on pakollinen.';
          isValid = false;
        }
      });
    }

    setErrors(newErrors);
    return isValid;
  };

  // Käsittelee lomakkeen lähetyksen
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Täytäthän kaikki pakolliset kentät ja korjaa virheet.", "error");
      return;
    }

    const parsedIngredients = ingredients.filter(
      (ing) => ing.name.trim() !== '' && ing.amount.toString().trim() !== '' && ing.unit.trim() !== ''
    ).map(ing => {
      const parsedAmount = Number(ing.amount);
      return {
        ...ing,
        amount: parsedAmount
      };
    });

    try {
      await addDoc(collection(db, 'recipes'), {
        nimi: name,
        ainesosat: parsedIngredients,
        ohjeet: instructions.split('\n').filter(line => line.trim() !== ''),
        luotu: new Date().toISOString()
      });
      
      setName('');
      setIngredients([{ name: '', amount: '', unit: '' }]);
      setInstructions('');
      setErrors({}); 
      
      if (onRecipeAdded) {
        onRecipeAdded();
      }
    } catch (error) {
      console.error('Virhe reseptin lisäämisessä: ', error);
      showToast("Reseptin lisääminen epäonnistui. Yritä uudelleen.", "error");
    }
  };

  // Tarkista, onko lomake lähetettävissä (disable-tilaa varten)
  const isFormValid = name.trim() !== '' && instructions.trim() !== '' && ingredients.some(ing => ing.name.trim() !== '' && ing.amount.toString().trim() !== '' && ing.unit.trim() !== '' && !isNaN(Number(ing.amount)) && Number(ing.amount) > 0);

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
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => { const newErrors = { ...prev }; delete newErrors.name; return newErrors; }); }}
            required
            aria-label="Reseptin nimi"
            className={errors.name ? 'input-error' : ''}
            ref={nameInputRef} 
          />
          {errors.name && <p className="validation-error-message">{errors.name}</p>}
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
              className={errors[`ingredient-${index}-name`] ? 'input-error' : ''}
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
              className={errors[`ingredient-${index}-amount`] ? 'input-error' : ''}
            />
            <input
              type="text"
              name="unit"
              placeholder="Yksikkö (esim. 'dl')"
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(index, e)}
              required
              aria-label={`Ainesosan ${index + 1} yksikkö`}
              className={errors[`ingredient-${index}-unit`] ? 'input-error' : ''}
            />
            {ingredients.length > 1 && (
              <button type="button" onClick={() => removeIngredientField(index)} className="remove-ingredient-button">
                Poista
              </button>
            )}
            {errors[`ingredient-${index}-name`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-name`]}</p>}
            {errors[`ingredient-${index}-amount`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-amount`]}</p>}
            {errors[`ingredient-${index}-unit`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-unit`]}</p>}
          </div>
        ))}
        {errors.ingredients && <p className="validation-error-message">{errors.ingredients}</p>}
        <button type="button" onClick={addIngredientField} className="add-ingredient-button">
          Lisää ainesosa
        </button>

        <div className="form-group">
          <label htmlFor="instructions">Ohjeet:</label>
          <textarea
            id="instructions"
            value={instructions}
            onChange={(e) => { setInstructions(e.target.value); if (errors.instructions) setErrors(prev => { const newErrors = { ...prev }; delete newErrors.instructions; return newErrors; }); }}
            rows="5"
            required
            aria-label="Reseptin ohjeet"
            className={errors.instructions ? 'input-error' : ''}
          ></textarea>
          {errors.instructions && <p className="validation-error-message">{errors.instructions}</p>}
        </div>

        <button type="submit" className="submit-button" disabled={!isFormValid}>Lisää resepti</button>
      </form>
    </div>
  );
};

export default RecipeForm;