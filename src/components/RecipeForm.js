// src/components/RecipeForm.js
import React, { useState, useRef, useEffect } from 'react';
import { db, collection, addDoc } from '../firebase'; // Varmista, että firebase.js on oikein määritelty
import './RecipeForm.css';


// Cloudinary tiedot ympäristömuuttujista
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const RecipeForm = ({ onRecipeAdded, showToast, initialData, onClearInitialData }) => {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(''); // Tila Cloudinary URL:lle

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
            amount: ing.amount === '' || ing.amount === null || ing.amount === undefined ? '' : String(ing.amount),
            unit: ing.unit || ''
          }))
        : [{ name: '', amount: '', unit: '' }];
      setIngredients(initialIngredients);
      setInstructions(initialData.ohjeet || '');
      // Jos initialDatassa on imageUrl (esim. reseptin tuonnista), näytä se
      if (initialData.imageUrl) {
        setImageUrl(initialData.imageUrl);
        setImagePreview(initialData.imageUrl);
      } else {
        setImageUrl('');
        setImagePreview('');
      }
      setImageFile(null);
      setErrors({});

      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }

      // Huom: onClearInitialData kutsutaan nyt vain, jos se on annettu.
      // Jos haluat aina tyhjentää initialDatan käytön jälkeen, voit poistaa ehtolausekkeen.
      if (onClearInitialData) {
        onClearInitialData();
      }
    }
  }, [initialData, onClearInitialData]);


  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setImageUrl(''); // Nollaa aiempi Cloudinary URL, jos uusi kuva valitaan
    } else {
      setImageFile(null);
      setImagePreview('');
    }
  };

  const uploadImageToCloudinary = async () => {
    if (!imageFile) return null; // Palauta null, jos kuvaa ei ole valittu

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      console.error("Cloudinaryn asetukset puuttuvat. Tarkista .env tiedosto.");
      showToast("Kuvanlatauspalvelun asetukset puuttuvat.", "error");
      return null;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        showToast("Kuva ladattu onnistuneesti!", "success");
        return data.secure_url;
      } else {
        console.error('Virhe kuvan lataamisessa Cloudinaryyn:', data);
        showToast("Kuvan lataaminen epäonnistui.", "error");
        return null;
      }
    } catch (error) {
      console.error('Virhe kuvan lataamisessa Cloudinaryyn:', error);
      showToast("Kuvan lataaminen epäonnistui.", "error");
      return null;
    } finally {
      setIsUploading(false);
    }
  };


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
    if (newIngredients.length === 0 && ingredients.length === 1) {
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

      if (nameTrimmed || amountStrTrimmed || ing.unit.trim()) {
        if (nameTrimmed === '') {
          newErrors[`ingredient-${index}-name`] = 'Ainesosan nimi on pakollinen, jos rivillä on muita tietoja.';
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
    if (activeIngredients.length === 0 && (name.trim() !== '' || instructions.trim() !== '')) {
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

    let finalImageUrl = imageUrl; // Käytä olemassa olevaa URLia, jos kuvaa ei ladata uudelleen (esim. tuodusta datasta)

    if (imageFile) { // Jos uusi kuvatiedosto on valittu, yritä ladata se
        const uploadedUrl = await uploadImageToCloudinary();
        if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
        } else if (!finalImageUrl) { // Jos lataus epäonnistui EIKÄ ole aiempaa URLia
            showToast("Kuvan lataus epäonnistui. Resepti tallennetaan ilman kuvaa.", "warning");
            // Ei keskeytetä reseptin tallennusta, mutta kuva puuttuu
        }
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
      })
      .filter(ing => ing.name.trim() !== '');

    if (processedIngredients.length === 0 && (name.trim() !== '' || instructions.trim() !== '')) {
         showToast("Lisää vähintään yksi kelvollinen ainesosa (nimi vaaditaan).", "error");
         setErrors(prev => ({...prev, ingredients: "Lisää vähintään yksi ainesosa, jolla on nimi."}));
         return;
    }

    const recipeData = {
      nimi: name.trim(),
      ainesosat: processedIngredients,
      ohjeet: instructions.trim() ? instructions.trim().split('\n').filter(line => line.trim() !== '') : [],
      luotu: new Date().toISOString(),
      imageUrl: finalImageUrl || null, // Lisää kuvan URL, tai null jos sitä ei ole
    };

    try {
      await addDoc(collection(db, 'recipes'), recipeData);
      setName('');
      setIngredients([{ name: '', amount: '', unit: '' }]);
      setInstructions('');
      setImageFile(null);
      setImagePreview('');
      setImageUrl('');
      setErrors({});
      if (onRecipeAdded) {
        onRecipeAdded();
      }
      showToast("Resepti lisätty onnistuneesti!", "success");
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
    }) && !isUploading;


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

        {/* Reseptikuvan lisäys */}
        <div className="form-group">
          <label htmlFor="recipeImage">Reseptikuva (valinnainen):</label>
          <input
            type="file"
            id="recipeImage"
            accept="image/*"
            onChange={handleImageChange}
            aria-label="Lataa reseptikuva"
            disabled={isUploading}
          />
          {isUploading && <p>Ladataan kuvaa...</p>}
          {imagePreview && (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Reseptin esikatselu" className="image-preview" />
            </div>
          )}
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
              placeholder="Yksikkö (esim. 'dl')"
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
          + Uusi ainesosa
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

        <button type="submit" className="submit-button" disabled={!isFormSubmittable || isUploading}>
            {isUploading ? 'Ladataan...' : (initialData && initialData.nimi ? 'Tallenna muutokset tuotuun reseptiin' : 'Lisää resepti')}
        </button>
      </form>
    </div>
  );
};

export default RecipeForm;