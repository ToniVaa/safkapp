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
          setIngredients(data.ainesosat && data.ainesosat.length > 0 ? 
            data.ainesosat.map(ing => ({
              name: ing.name || '',
              amount: ing.amount === '' || ing.amount === null || ing.amount === undefined ? '' : String(ing.amount), // Varmista merkkijono tai tyhjä
              unit: ing.unit || '' 
            }))
            : [{ name: '', amount: '', unit: '' }]);
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

    if (recipeId) {
        fetchRecipe();
    } else {
        setLoading(false);
    }
  }, [recipeId, onCloseEdit, showToast]);
  
  const handleIngredientChange = (index, event) => {
    const newIngredients = [...ingredients];
    newIngredients[index][event.target.name] = event.target.value;
    setIngredients(newIngredients);

    // Poista virhe kyseisestä kentästä, jos se on korjattu
    const errorKeyBase = `ingredient-${index}`;
    if (errors[`${errorKeyBase}-${event.target.name}`]) {
      setErrors(prev => {
        const newErrorsLocal = { ...prev };
        delete newErrorsLocal[`${errorKeyBase}-${event.target.name}`];
        return newErrorsLocal;
      });
    }
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredientField = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    if (newIngredients.length === 0 && ingredients.length === 1) {
        setIngredients([{ name: '', amount: '', unit: '' }]);
    } else {
        setIngredients(newIngredients);
    }
    // Poista myös mahdolliset virheet poistetulta riviltä
    setErrors(prev => {
      const newErrorsLocal = { ...prev };
      delete newErrorsLocal[`ingredient-${index}-name`];
      delete newErrorsLocal[`ingredient-${index}-amount`];
      // delete newErrorsLocal[`ingredient-${index}-unit`]; // Yksikkö ei ole enää pakollinen
      return newErrorsLocal;
    });
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (name.trim() === '') {
      newErrors.name = 'Reseptin nimi on pakollinen.';
      isValid = false;
    }

    // Ohjeet eivät ole enää pakollisia tässä, jos niin halutaan.
    // Jos ohjeet halutaan pakollisiksi, alla oleva ehto voidaan palauttaa:
    /*
    if (instructions.trim() === '') {
      newErrors.instructions = 'Ohjeet ovat pakolliset.';
      isValid = false;
    }
    */

    // Ainesosien validointi
    const activeIngredients = ingredients.filter(
      (ing) => ing.name.trim() !== '' || String(ing.amount).trim() !== '' || ing.unit.trim() !== ''
    );

    if (activeIngredients.length === 0 && (name.trim() !== '' || instructions.trim() !== '')) {
      newErrors.ingredients = 'Lisää vähintään yksi ainesosa.';
      isValid = false;
    } else {
      activeIngredients.forEach((ing, index) => {
        // Etsi alkuperäinen indeksi, jos ingredients-taulukko on suodatettu välissä (ei tässä tapauksessa)
        const originalIndex = ingredients.findIndex(originalIng => originalIng === ing);

        if (ing.name.trim() === '') {
          newErrors[`ingredient-${originalIndex}-name`] = 'Ainesosan nimi on pakollinen, jos rivillä on muita tietoja.';
          isValid = false;
        }
        const amountStr = String(ing.amount).trim();
        if (amountStr !== '') { // Vain jos määrä on annettu
          const parsedAmount = Number(amountStr.replace(',', '.'));
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            newErrors[`ingredient-${originalIndex}-amount`] = 'Jos määrä on annettu, sen on oltava positiivinen luku.';
            isValid = false;
          }
        }
        // Yksikkö on valinnainen, joten ei validointia sille tässä
      });
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Täytäthän kaikki pakolliset kentät ja korjaa virheet.", "error");
      return;
    }

    const parsedIngredients = ingredients
      .filter(ing => ing.name.trim() !== '' || String(ing.amount).trim() !== '' || ing.unit.trim() !== '')
      .map(ing => {
        const amountStr = String(ing.amount).trim().replace(',', '.');
        let finalAmount;
        if (amountStr === '') {
          finalAmount = ''; // Jätä tyhjäksi, jos ei annettu
        } else {
          const parsed = parseFloat(amountStr);
          finalAmount = isNaN(parsed) ? '' : parsed;
        }
        return {
          name: ing.name.trim(),
          amount: finalAmount,
          unit: ing.unit.trim(),
        };
      })
      .filter(ing => ing.name.trim() !== ''); // Varmista, että ainesosalla on nimi

    if (parsedIngredients.length === 0 && (name.trim() !== '' || instructions.trim() !== '')) {
      showToast("Lisää vähintään yksi kelvollinen ainesosa (nimi vaaditaan).", "error");
      setErrors(prev => ({...prev, ingredients: "Lisää vähintään yksi ainesosa, jolla on nimi."}));
      return;
    }


    try {
      const recipeRef = doc(db, 'recipes', recipeId);
      await updateDoc(recipeRef, {
        nimi: name.trim(),
        ainesosat: parsedIngredients,
        ohjeet: instructions.trim() ? instructions.trim().split('\n').filter(line => line.trim() !== '') : [],
        muokattu: new Date().toISOString()
      });
      onCloseEdit();
    } catch (err) {
      console.error('Virhe reseptin päivittämisessä:', err);
      showToast("Reseptin päivittäminen epäonnistui. Yritä uudelleen.", "error");
    }
  };

  // isFormValid-ehtoa on yksinkertaistettu vastaamaan validateForm-logiikkaa
  // Pääasiassa tarkistetaan, että nimi on annettu ja jos ainesosia on, ne ovat järkeviä.
  const isFormValid =
    name.trim() !== '' &&
    ingredients.every(ing => {
        const amountStr = String(ing.amount).trim();
        if (amountStr === '') return true; // Tyhjä määrä on ok
        const parsedAmount = Number(amountStr.replace(',', '.'));
        return !isNaN(parsedAmount) && parsedAmount > 0;
    }) &&
    // Jos ainesosia on yritetty lisätä (ei vain tyhjä aloitusrivi), vähintään yhdellä on oltava nimi
    (ingredients.length === 1 && ingredients[0].name === '' && ingredients[0].amount === '' && ingredients[0].unit === '' ? true : ingredients.some(ing => ing.name.trim() !== ''));


  if (loading) return <p className="recipe-form-container skeleton-text">Ladataan reseptiä...</p>;

  return (
    <div className="recipe-form-container">
      <h2>Muokkaa reseptiä: {name || 'Nimetön'}</h2>
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
              // Nimi on pakollinen vain, jos rivillä on muita tietoja (tarkistetaan validateFormissa)
              aria-label={`Ainesosan ${index + 1} nimi`}
              className={errors[`ingredient-${index}-name`] ? 'input-error' : ''}
            />
            <input
              type="text" // Muutettu number -> text
              name="amount"
              placeholder="Määrä (valinnainen)"
              value={ingredient.amount}
              onChange={(e) => handleIngredientChange(index, e)}
              // step="any" // Ei tarvita type="text" kanssa
              aria-label={`Ainesosan ${index + 1} määrä`}
              className={errors[`ingredient-${index}-amount`] ? 'input-error' : ''}
            />
            <input
              type="text"
              name="unit"
              placeholder="Yksikkö (valinnainen)" // Placeholder päivitetty
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(index, e)}
              // Ei enää 'required'
              aria-label={`Ainesosan ${index + 1} yksikkö`}
              // className={errors[`ingredient-${index}-unit`] ? 'input-error' : ''} // Virhettä ei enää aseteta yksikölle
            />
            {ingredients.length > 0 && (
              <button type="button" onClick={() => removeIngredientField(index)} className="remove-ingredient-button">
                Poista
              </button>
            )}
            {errors[`ingredient-${index}-name`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-name`]}</p>}
            {errors[`ingredient-${index}-amount`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-amount`]}</p>}
            {/* {errors[`ingredient-${index}-unit`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-unit`]}</p>} */}

          </div>
        ))}
        {errors.ingredients && <p className="validation-error-message">{errors.ingredients}</p>}
        <button type="button" onClick={addIngredientField} className="add-ingredient-button">
          Lisää ainesosa
        </button>

        <div className="form-group">
          <label htmlFor="edit-instructions">Ohjeet (valinnainen):</label>
          <textarea
            id="edit-instructions"
            value={instructions}
            onChange={(e) => { setInstructions(e.target.value); if (errors.instructions) setErrors(prev => { const newErrors = { ...prev }; delete newErrors.instructions; return newErrors; }); }}
            rows="5"
            // Ei enää 'required', jos halutaan valinnaiseksi
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