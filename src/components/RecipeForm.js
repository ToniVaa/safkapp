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
            amount: ing.amount === '' || ing.amount === null || ing.amount === undefined ? '' : String(ing.amount), // Varmista merkkijono tai tyhjä
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
    }
  }, [initialData, onClearInitialData]);


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
    // Yksikön virhettä ei enää tarvitse erikseen poistaa tässä, koska se on valinnainen
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredientField = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    // Jos poistetaan viimeinen rivi ja se oli tyhjä, älä lisää uutta tyhjää automaattisesti.
    // RecipeForm antaa lisätä uuden tarvittaessa.
    // Jos rivejä on jäljellä, käytä niitä. Jos ei, jätä tyhjäksi (tai RecipeForm voi päättää lisätä tyhjän myöhemmin jos tarpeen)
    if (newIngredients.length === 0 && ingredients.length === 1) {
        setIngredients([{ name: '', amount: '', unit: '' }]); // Säilytä vähintään yksi tyhjä rivi, jos kaikki poistetaan
    } else {
        setIngredients(newIngredients);
    }

    const errorKeyBase = `ingredient-${index}`;
    setErrors(prev => {
      const updatedErrors = { ...prev };
      delete updatedErrors[`${errorKeyBase}-name`];
      delete updatedErrors[`${errorKeyBase}-amount`];
      // Yksikön virhettä ei tarvitse erikseen käsitellä tässä, koska se on valinnainen
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
      // Yksikköä ei enää validoida pakollisena, joten unitTrimmed ei ole osa ehtoa alla

      // Jos jokin kentistä (nimi, määrä, yksikkö) on täytetty, nimi on pakollinen.
      if (nameTrimmed || amountStrTrimmed || ing.unit.trim()) {
        if (nameTrimmed === '') {
          newErrors[`ingredient-${index}-name`] = 'Ainesosan nimi on pakollinen, jos rivillä on muita tietoja.';
          isValid = false;
        }
        // Määrän validointi (jos annettu)
        if (amountStrTrimmed !== '') {
          const parsedAmount = Number(String(ing.amount).replace(',', '.'));
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            newErrors[`ingredient-${index}-amount`] = 'Jos määrä on annettu, sen on oltava positiivinen luku.';
            isValid = false;
          }
        }
        // Yksikkö on nyt valinnainen, joten sille ei ole erillistä virhettä tässä, ellei haluta erityistä logiikkaa
      }
    });
    
    // Varmistetaan, että vähintään yksi ainesosa on lisätty, jos lomaketta yritetään lähettää aktiivisilla ainesosilla
    const activeIngredients = ingredients.filter(ing => ing.name.trim() || String(ing.amount).trim() || ing.unit.trim());
    if (activeIngredients.length === 0 && ingredients.length > 0 && ingredients.some(ing => ing.name || ing.amount || ing.unit)) {
        // Tämä ehto on hieman monimutkainen, tarkoituksena on estää tyhjän reseptin lähetys,
        // mutta sallia lomakkeen alustus tyhjällä rivillä.
        // Jos kaikki rivit ovat täysin tyhjiä, ei pitäisi olla virhettä, mutta submit-nappi voi olla disabloitu.
    } else if (activeIngredients.length === 0 && (name.trim() !== '' || instructions.trim() !== '')) {
        // Jos nimi tai ohjeet on annettu, mutta ei yhtään aktiivista ainesosaa
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
      .filter(ing => ing.name.trim() !== '' || String(ing.amount).trim() !== '' || ing.unit.trim() !== '') // Suodata pois täysin tyhjät rivit
      .map(ing => {
        const amountStr = String(ing.amount).trim().replace(',', '.');
        let finalAmount;
        if (amountStr === '') {
          finalAmount = ''; // Jätä tyhjäksi, jos määrää ei ole annettu
        } else {
          const parsed = parseFloat(amountStr);
          finalAmount = isNaN(parsed) ? '' : parsed; // Tallenna numeerisena tai tyhjänä
        }
        
        return {
          name: ing.name.trim(),
          amount: finalAmount,
          unit: ing.unit.trim(), // Yksikkö voi olla tyhjä
        };
      })
      .filter(ing => ing.name.trim() !== ''); // Varmista vielä, että ainesosalla on nimi

    // Jos ainesosia ei ole yhtään (tai yhtään nimellistä ainesosaa), mutta lomake on muuten täytetty, näytä virhe.
    if (processedIngredients.length === 0 && (name.trim() !== '' || instructions.trim() !== '')) {
         showToast("Lisää vähintään yksi kelvollinen ainesosa (nimi vaaditaan).", "error");
         setErrors(prev => ({...prev, ingredients: "Lisää vähintään yksi ainesosa, jolla on nimi."}));
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
    // Vähintään yksi ainesosa, jolla on nimi
    ingredients.some(ing => ing.name.trim() !== '') &&
    // Kaikki annetut määrät ovat validia positiivisia lukuja
    ingredients.every(ing => {
        const amountStr = String(ing.amount).trim();
        if (amountStr === '') return true; // Tyhjä määrä on ok, jos nimi on annettu
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
              type="text" // Muutettu number -> text, jotta tyhjä arvo on helpompi käsitellä ja sallii pilkun
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
              placeholder="Yksikkö (esim. 'dl')" // Placeholder päivitetty
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(index, e)}
              aria-label={`Ainesosan ${index + 1} yksikkö`}
              // Ei enää 'required' eikä error-luokkaa yksikölle tässä, koska se on valinnainen
            />
            {ingredients.length > 0 && ( // Näytä poista-nappi aina jos rivejä on (tai > 1 jos halutaan aina väh. 1 rivi)
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