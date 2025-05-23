// src/components/RecipeForm.js
import React, { useState, useRef, useEffect } from 'react';
import { db, collection, addDoc } from '../firebase'; // Varmista, että firebase.js on oikein määritelty

const RecipeForm = ({ onRecipeAdded, showToast, initialData, onClearInitialData }) => {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.nimi || '');
      const initialIngredients = initialData.ainesosat && Array.isArray(initialData.ainesosat) && initialData.ainesosat.length > 0
        ? initialData.ainesosat.map(ing => ({
            name: ing.name || '',
            amount: ing.amount || '', 
            unit: ing.unit || ''
          }))
        : [{ name: '', amount: '', unit: '' }];
      setIngredients(initialIngredients);
      setInstructions(initialData.ohjeet || ''); 
      setErrors({});

      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }

      if (onClearInitialData) {
        onClearInitialData();
      }
    } else {
      if (initialData === null && name === '' && ingredients.length === 1 && ingredients[0].name === '' && ingredients[0].amount === '' && ingredients[0].unit === '' && instructions === '') {
        // Lomake on jo tyhjä
      }
    }
  }, [initialData, onClearInitialData, name, ingredients, instructions]);


  const handleIngredientChange = (index, event) => {
    const newIngredients = [...ingredients];
    newIngredients[index][event.target.name] = event.target.value;
    setIngredients(newIngredients);
    const errorKeyBase = `ingredient-${index}`;
    if (errors[`${errorKeyBase}-name`] && event.target.name === 'name') {
      setErrors(prev => ({ ...prev, [`${errorKeyBase}-name`]: undefined }));
    }
    if (errors[`${errorKeyBase}-amount`] && event.target.name === 'amount') {
      setErrors(prev => ({ ...prev, [`${errorKeyBase}-amount`]: undefined }));
    }
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredientField = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    if (newIngredients.length === 0) {
      setIngredients([{ name: '', amount: '', unit: '' }]);
    } else {
      setIngredients(newIngredients);
    }
    const errorKeyBase = `ingredient-${index}`;
    setErrors(prev => {
      const updatedErrors = { ...prev };
      delete updatedErrors[`${errorKeyBase}-name`];
      delete updatedErrors[`${errorKeyBase}-amount`];
      return updatedErrors;
    });
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (name.trim() === '') {
      newErrors.name = 'Reseptin nimi on pakollinen.';
      isValid = false;
    }

    ingredients.forEach((ing, index) => {
      const nameTrimmed = ing.name.trim();
      const amountStrTrimmed = String(ing.amount).trim();
      const unitTrimmed = ing.unit.trim();

      if (nameTrimmed || amountStrTrimmed || unitTrimmed) {
        if (nameTrimmed === '') { 
          newErrors[`ingredient-${index}-name`] = 'Nimi on pakollinen, jos rivi on täytetty.';
          isValid = false;
        }
        if (amountStrTrimmed !== '') {
          const parsedAmount = Number(String(ing.amount).replace(',', '.'));
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            newErrors[`ingredient-${index}-amount`] = 'Jos määrä on annettu, sen on oltava positiivinen luku.';
            isValid = false;
          }
        }
      }
    });
    
    const activeIngredients = ingredients.filter(ing => ing.name.trim() || String(ing.amount).trim() || ing.unit.trim());
    if (activeIngredients.length === 0) {
        newErrors.ingredients = 'Lisää vähintään yksi ainesosa.';
        isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Tarkista lomakkeen tiedot ja korjaa virheet.", "error");
      return;
    }

    const processedIngredients = ingredients
      .filter(ing => ing.name.trim() !== '' || String(ing.amount).trim() !== '' || ing.unit.trim() !== '')
      .map(ing => {
        const amountStr = String(ing.amount).trim().replace(',', '.');
        let finalAmount;
        if (amountStr === '') {
          finalAmount = ''; 
        } else {
          const parsed = parseFloat(amountStr);
          finalAmount = isNaN(parsed) ? '' : parsed; 
        }
        
        return {
          name: ing.name.trim(),
          amount: finalAmount,
          unit: ing.unit.trim(),
        };
      });
    
    if (processedIngredients.length === 0 && ingredients.some(ing => ing.name || ing.amount || ing.unit)) {
         showToast("Lisää vähintään yksi kelvollinen ainesosa.", "error");
         setErrors(prev => ({...prev, ingredients: "Lisää vähintään yksi kelvollinen ainesosa."}));
         return;
    }

    const recipeData = {
      nimi: name.trim(),
      ainesosat: processedIngredients,
      ohjeet: instructions.trim() ? instructions.trim().split('\n').filter(line => line.trim() !== '') : [],
      luotu: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'recipes'), recipeData);
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

  const isFormSubmittable = 
    name.trim() !== '' &&
    ingredients.some(ing => ing.name.trim() !== '') && 
    ingredients.every(ing => { 
        const amountStr = String(ing.amount).trim();
        if (amountStr === '') return true; 
        const parsedAmount = Number(amountStr.replace(',', '.'));
        return !isNaN(parsedAmount) && parsedAmount > 0;
    });

  return (
    <div className="recipe-form-container">
      <h2>{initialData && initialData.nimi ? 'Muokkaa tuotua reseptiä' : 'Lisää uusi resepti'}</h2>
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label htmlFor="name">Reseptin nimi:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })); }}
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
              placeholder="Ainesosa (esim. 'sokeria')"
              value={ingredient.name}
              onChange={(e) => handleIngredientChange(index, e)}
              aria-label={`Ainesosan ${index + 1} nimi`}
              className={errors[`ingredient-${index}-name`] ? 'input-error' : ''}
            />
            <input
              type="text"
              name="amount"
              placeholder="Määrä (valinnainen)"
              value={ingredient.amount}
              onChange={(e) => handleIngredientChange(index, e)}
              aria-label={`Ainesosan ${index + 1} määrä`}
              className={errors[`ingredient-${index}-amount`] ? 'input-error' : ''}
            />
            <input
              type="text"
              name="unit"
              placeholder="Yksikkö (valinnainen)"
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(index, e)}
              aria-label={`Ainesosan ${index + 1} yksikkö`}
            />
            {ingredients.length > 0 && (
              <button type="button" onClick={() => removeIngredientField(index)} className="remove-ingredient-button">
                Poista
              </button>
            )}
            {errors[`ingredient-${index}-name`] && <p className="validation-error-message" style={{ flexBasis: '100%', marginLeft: 0 }}>{errors[`ingredient-${index}-name`]}</p>}
            {errors[`ingredient-${index}-amount`] && <p className="validation-error-message" style={{ flexBasis: '100%', marginLeft: 0 }}>{errors[`ingredient-${index}-amount`]}</p>}
          </div>
        ))}
        {errors.ingredients && <p className="validation-error-message">{errors.ingredients}</p>}
        <button type="button" onClick={addIngredientField} className="add-ingredient-button">
          Lisää ainesosa
        </button>

        <div className="form-group">
          <label htmlFor="instructions">Ohjeet (valinnainen, jokainen vaihe omalle rivilleen):</label>
          <textarea
            id="instructions"
            value={instructions}
            onChange={(e) => { setInstructions(e.target.value); if (errors.instructions) setErrors(prev => ({ ...prev, instructions: undefined }));}}
            rows="5"
            aria-label="Reseptin ohjeet"
            className={errors.instructions ? 'input-error' : ''}
          ></textarea>
        </div>

        <button type="submit" className="submit-button" disabled={!isFormSubmittable}>
            {initialData && initialData.nimi ? 'Tallenna muutokset tuotuun reseptiin' : 'Lisää resepti'}
        </button>
      </form>
    </div>
  );
};

export default RecipeForm;