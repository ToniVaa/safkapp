// src/components/RecipeEditForm.js
// Tämä komponentti tarjoaa lomakkeen reseptien muokkaamiseen.

import React, { useState, useEffect, useRef } from 'react';
// Tuo tarvittavat Firebase-funktiot suoraan firebase.js-tiedostosta
import { db, doc, getDoc, updateDoc } from '../firebase';

const RecipeEditForm = ({ recipeId, onCloseEdit, showToast }) => {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({}); // Tila virheilmoituksille
  const nameInputRef = useRef(null); // Ref nimen input-kentälle

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
          setIngredients(data.ainesosat && data.ainesosat.length > 0 ? data.ainesosat : [{ name: '', amount: '', unit: '' }]);
          setInstructions(data.ohjeet ? data.ohjeet.join('\n') : '');
          if (nameInputRef.current) {
            nameInputRef.current.focus();
          }
        } else {
          showToast('Reseptiä ei löytynyt.', 'error');
          onCloseEdit();
        }
      } catch (err) {
        console.error('Virhe reseptin hakemisessa muokkausta varten:', err);
        showToast('Virhe reseptin lataamisessa.', 'error');
        onCloseEdit();
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId, onCloseEdit, showToast]);

  // Käsittelee ainesosakentän muutokset
  const handleIngredientChange = (index, event) => {
    const newIngredients = [...ingredients];
    newIngredients[index][event.target.name] = event.target.value;
    setIngredients(newIngredients);
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

  // Käsittelee lomakkeen lähetyksen (reseptin päivittämisen)
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
      const recipeRef = doc(db, 'recipes', recipeId);
      await updateDoc(recipeRef, {
        nimi: name,
        ainesosat: parsedIngredients,
        ohjeet: instructions.split('\n').filter(line => line.trim() !== ''),
        muokattu: new Date().toISOString()
      });
      onCloseEdit();
    } catch (err) {
      console.error('Virhe reseptin päivittämisessä:', err);
      showToast("Reseptin päivittäminen epäonnistui. Yritä uudelleen.", "error");
    }
  };

  const isFormValid = name.trim() !== '' && instructions.trim() !== '' && ingredients.some(ing => ing.name.trim() !== '' && ing.amount.toString().trim() !== '' && ing.unit.trim() !== '' && !isNaN(Number(ing.amount)) && Number(ing.amount) > 0);

  if (loading) return <p className="recipe-form-container skeleton-text">Ladataan reseptiä...</p>;

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
                Poista ainesosa
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
          <label htmlFor="edit-instructions">Ohjeet:</label>
          <textarea
            id="edit-instructions"
            value={instructions}
            onChange={(e) => { setInstructions(e.target.value); if (errors.instructions) setErrors(prev => { const newErrors = { ...prev }; delete newErrors.instructions; return newErrors; }); }}
            rows="5"
            required
            aria-label="Reseptin ohjeet"
            className={errors.instructions ? 'input-error' : ''}
          ></textarea>
          {errors.instructions && <p className="validation-error-message">{errors.instructions}</p>}
        </div>

        <button type="submit" className="submit-button" disabled={!isFormValid}>Tallenna muutokset</button>
        <button type="button" onClick={onCloseEdit} className="cancel-button">Peruuta</button>
      </form>
    </div>
  );
};

export default RecipeEditForm;