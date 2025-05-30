// src/components/RecipeEditForm.js
import React, { useState, useEffect, useRef } from 'react';
import { db, doc, getDoc, updateDoc } from '../firebase';
import './RecipeForm.css';
// Cloudinary tiedot ympäristömuuttujista
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const RecipeEditForm = ({ recipeId, onCloseEdit, showToast }) => {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null); // Tila valitulle kuvatiedostolle
  const [imagePreview, setImagePreview] = useState(''); // Tila kuvan esikatselulle (data URL)
  const [currentImageUrl, setCurrentImageUrl] = useState(''); // Tila olemassa olevalle Cloudinary URL:lle
  const [isUploading, setIsUploading] = useState(false); // Tila kuvan latauksen seurantaan

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
              amount: ing.amount === '' || ing.amount === null || ing.amount === undefined ? '' : String(ing.amount),
              unit: ing.unit || ''
            }))
            : [{ name: '', amount: '', unit: '' }]);
          setInstructions(data.ohjeet ? data.ohjeet.join('\n') : '');
          if (data.imageUrl) {
            setCurrentImageUrl(data.imageUrl);
            setImagePreview(data.imageUrl); // Näytä olemassa oleva kuva esikatselussa
          } else {
            setCurrentImageUrl('');
            setImagePreview('');
          }
          setImageFile(null); // Nollaa tiedostovalinta aina ladattaessa
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

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result); // Näytä valitun kuvan esikatselu
      };
      reader.readAsDataURL(file);
    } else {
      // Jos käyttäjä peruuttaa tiedoston valinnan, palauta esikatselu nykyiseen kuvaan (jos sellainen on)
      // tai tyhjennä se, jos uutta tiedostoa ei valittu ja vanhaa ei ollut.
      setImageFile(null);
      setImagePreview(currentImageUrl || '');
    }
  };

  const uploadImageToCloudinary = async () => {
    if (!imageFile) return currentImageUrl; // Jos uutta kuvaa ei ole valittu, palauta vanha URL

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        console.error("Cloudinaryn asetukset puuttuvat. Tarkista .env tiedosto.");
        showToast("Kuvanlatauspalvelun asetukset puuttuvat.", "error");
        return null; // Tai currentImageUrl riippuen halutusta toiminnasta
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
        showToast("Kuva päivitetty onnistuneesti!", "success");
        return data.secure_url;
      } else {
        console.error('Virhe kuvan lataamisessa Cloudinaryyn:', data);
        showToast("Kuvan päivittäminen epäonnistui.", "error");
        return currentImageUrl; // Palauta vanha URL virheen sattuessa
      }
    } catch (error) {
      console.error('Virhe kuvan lataamisessa Cloudinaryyn:', error);
      showToast("Kuvan päivittäminen epäonnistui.", "error");
      return currentImageUrl; // Palauta vanha URL virheen sattuessa
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleIngredientChange = (index, event) => {
    const newIngredients = [...ingredients];
    newIngredients[index][event.target.name] = event.target.value;
    setIngredients(newIngredients);

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
    setErrors(prev => {
      const newErrorsLocal = { ...prev };
      delete newErrorsLocal[`ingredient-${index}-name`];
      delete newErrorsLocal[`ingredient-${index}-amount`];
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

    const activeIngredients = ingredients.filter(
      (ing) => ing.name.trim() !== '' || String(ing.amount).trim() !== '' || ing.unit.trim() !== ''
    );

    if (activeIngredients.length === 0 && (name.trim() !== '' || instructions.trim() !== '')) {
      newErrors.ingredients = 'Lisää vähintään yksi ainesosa.';
      isValid = false;
    } else {
      activeIngredients.forEach((ing, index) => {
        const originalIndex = ingredients.findIndex(originalIng => originalIng === ing);

        if (ing.name.trim() === '') {
          newErrors[`ingredient-${originalIndex}-name`] = 'Ainesosan nimi on pakollinen, jos rivillä on muita tietoja.';
          isValid = false;
        }
        const amountStr = String(ing.amount).trim();
        if (amountStr !== '') {
          const parsedAmount = Number(amountStr.replace(',', '.'));
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            newErrors[`ingredient-${originalIndex}-amount`] = 'Jos määrä on annettu, sen on oltava positiivinen luku.';
            isValid = false;
          }
        }
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
    
    let finalImageUrl = currentImageUrl; // Oletuksena vanha kuva

    if (imageFile) { // Jos uusi kuva on valittu, ladataan se
        const uploadedUrl = await uploadImageToCloudinary();
        if (uploadedUrl) {
            finalImageUrl = uploadedUrl;
        } else {
            // Jos lataus epäonnistui, mutta vanha kuva oli olemassa, käytetään sitä.
            // Jos ei ollut vanhaa kuvaa ja lataus epäonnistui, finalImageUrl jää tyhjäksi tai nulliksi.
            // Tässä vaiheessa uploadedUrl on jo palauttanut currentImageUrl, jos lataus epäonnistui ja kuva oli.
            // Tai null/tyhjä, jos kuvaa ei ollut ja lataus epäonnistui.
            // Joten 'finalImageUrl' pitäisi olla oikein asetettu uploadImageToCloudinary-funktion paluuarvon perusteella.
        }
    }


    const parsedIngredients = ingredients
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
        imageUrl: finalImageUrl || null, // Tallenna uusi tai vanha URL, tai null
        muokattu: new Date().toISOString()
      });
      showToast("Resepti päivitetty onnistuneesti!", "success");
      onCloseEdit();
    } catch (err) {
      console.error('Virhe reseptin päivittämisessä:', err);
      showToast("Reseptin päivittäminen epäonnistui. Yritä uudelleen.", "error");
    }
  };

  const isFormValid =
    name.trim() !== '' &&
    ingredients.every(ing => {
        const amountStr = String(ing.amount).trim();
        if (amountStr === '') return true;
        const parsedAmount = Number(amountStr.replace(',', '.'));
        return !isNaN(parsedAmount) && parsedAmount > 0;
    }) &&
    (ingredients.length === 1 && ingredients[0].name === '' && ingredients[0].amount === '' && ingredients[0].unit === '' ? true : ingredients.some(ing => ing.name.trim() !== ''))
    && !isUploading;


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

        {/* Reseptikuvan muokkaus/lisäys */}
        <div className="form-group">
          <label htmlFor="edit-recipeImage">Reseptikuva:</label>
          <input
            type="file"
            id="edit-recipeImage"
            accept="image/*"
            onChange={handleImageChange}
            aria-label="Vaihda tai lisää reseptikuva"
            disabled={isUploading}
          />
          {isUploading && <p>Ladataan kuvaa...</p>}
          {imagePreview && (
            <div className="image-preview-container">
              <p>Nykyinen/uusi kuva:</p>
              <img src={imagePreview} alt="Reseptin esikatselu" className="image-preview" />
            </div>
          )}
          {!imagePreview && currentImageUrl && ( // Tämä ehto on nyt tarpeeton, koska imagePreview näyttää currentImageUrl:n aluksi
             <div className="image-preview-container">
                <p>Nykyinen kuva:</p>
                <img src={currentImageUrl} alt="Nykyinen reseptikuva" className="image-preview" />
            </div>
          )}
          {!imagePreview && !currentImageUrl && <p>Ei kuvaa.</p>}
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
            {errors[`ingredient-${index}-name`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-name`]}</p>}
            {errors[`ingredient-${index}-amount`] && <p className="validation-error-message" style={{ flexBasis: '100%' }}>{errors[`ingredient-${index}-amount`]}</p>}
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
            aria-label="Reseptin ohjeet"
            className={errors.instructions ? 'input-error' : ''}
          ></textarea>
          {errors.instructions && <p className="validation-error-message">{errors.instructions}</p>}
        </div>

        <button type="submit" className="submit-button" disabled={!isFormValid || isUploading}>
            {isUploading ? 'Ladataan...' : 'Tallenna muutokset'}
        </button>
        <button type="button" onClick={onCloseEdit} className="cancel-button">Peruuta</button>
      </form>
    </div>
  );
};

export default RecipeEditForm;