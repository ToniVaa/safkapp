// src/components/RecipeImporter.js
import React, { useState } from 'react';
import './RecipeImporter.css'; // Lisätään tyylitiedosto

// Yksikkösynonyymit ja normalisointi (kuten ShoppingList.js:ssä)
const unitSynonyms = {
  "ml": "ml", "millilitra": "ml", "millilitraa": "ml",
  "cl": "cl", "senttilitra": "cl", "senttilitraa": "cl",
  "dl": "dl", "desilitra": "dl", "desilitraa": "dl",
  "l": "l", "litra": "l", "litraa": "l",
  "g": "g", "gramma": "g", "grammaa": "g",
  "kg": "kg", "kilo": "kg", "kiloa": "kg", "kilogramma": "kg", "kilogrammaa": "kg",
  "kpl": "kpl", "kappaletta": "kpl", "kappale": "kpl",
  "rs": "rs", "rasia": "rs", "rasiaa": "rs",
  "tl": "tl", "teelusikka": "tl", "teelusikkaa": "tl",
  "rkl": "rkl", "ruokalusikka": "rkl", "ruokalusikkaa": "rkl",
  "ripaus": "ripaus",
  "pullo": "plo", "plo": "plo",
  "pkt": "pkt", "paketti": "pkt", "pakettia": "pkt",
  "prk": "prk", "purkki": "prk", "purkkia": "prk",
  "":" ",
};

function normalizeUnit(unit) {
  const lowerUnit = (unit || '').trim().toLowerCase();
  return unitSynonyms[lowerUnit] || lowerUnit;
}

const RecipeImporter = ({ onRecipeParsed, showToast }) => {
  const [recipeText, setRecipeText] = useState('');

  const parseRecipe = () => {
    if (!recipeText.trim()) {
      showToast('Liitä ensin reseptiteksti.', 'error');
      return;
    }

    const lines = recipeText.split('\n').map(line => line.trim());
    let parsedName = '';
    const parsedIngredients = [];
    let parsedInstructions = [];

    let readingStage = 'name'; // 'name', 'ingredients', 'instructions'

    const firstNonEmptyLineIndex = lines.findIndex(line => line !== '');
    if (firstNonEmptyLineIndex !== -1) {
        const potentialName = lines[firstNonEmptyLineIndex];
        if (!/^(ainekset|ainesosat|ohjeet|valmistus)/i.test(potentialName)) {
            parsedName = potentialName;
        }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === '') continue;

      if (/^(ainekset|ainesosat)/i.test(line)) {
        readingStage = 'ingredients';
        if (!parsedName && i > 0 && lines[i-1] && !/^(ainekset|ainesosat|ohjeet|valmistus)/i.test(lines[i-1])) {
            parsedName = lines[i-1];
        }
        continue;
      } else if (/^(ohjeet|valmistus)/i.test(line)) {
        readingStage = 'instructions';
        if (!parsedName) {
            const ingredientsStartIndex = lines.findIndex(l => /^(ainekset|ainesosat)/i.test(l));
            if (ingredientsStartIndex > 0 && lines[ingredientsStartIndex-1] && !/^(ainekset|ainesosat|ohjeet|valmistus)/i.test(lines[ingredientsStartIndex-1])) {
                parsedName = lines[ingredientsStartIndex-1];
            }
        }
        continue;
      }

      if (readingStage === 'ingredients') {
        const ingredientMatch = line.match(/^([\d\/\.,\s]+)?\s*([a-zA-ZäöåÄÖÅμ]+)?\s*(.+)$/i);
        if (ingredientMatch) {
          let amountStr = (ingredientMatch[1] || '1').trim();
          let unit = (ingredientMatch[2] || '').trim();
          let name = (ingredientMatch[3] || '').trim();

          if (amountStr.includes('/')) {
            const parts = amountStr.split('/');
            if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1])) && parseFloat(parts[1]) !== 0) {
              amountStr = (parseFloat(parts[0]) / parseFloat(parts[1])).toString();
            }
          }
          amountStr = amountStr.replace(',', '.');
          const amount = parseFloat(amountStr);

          const commonUnitsForSplitting = ['ml', 'cl', 'dl', 'l', 'g', 'kg', 'kpl', 'rs', 'tl', 'rkl', 'pkt', 'prk', 'ripaus'];
          const nameParts = name.split(' ');
          if (nameParts.length > 1 && commonUnitsForSplitting.includes(nameParts[0].toLowerCase()) && unit === '') {
            unit = nameParts[0];
            name = nameParts.slice(1).join(' ');
          }

          if (name) {
            parsedIngredients.push({
              name: name,
              amount: isNaN(amount) ? 1 : amount,
              unit: normalizeUnit(unit),
            });
          }
        } else if (line) {
            parsedIngredients.push({ name: line, amount: 1, unit: '' });
        }
      } else if (readingStage === 'instructions') {
        parsedInstructions.push(line.replace(/^\d+\.\s*/, '').trim());
      } else if (readingStage === 'name' && !parsedName && line) {
        if (!/^(ainekset|ainesosat|ohjeet|valmistus)/i.test(line)) {
            parsedName = line;
        }
      }
    }
    if (!parsedName && lines.length > 0 && lines[0] && !/^(ainekset|ainesosat|ohjeet|valmistus)/i.test(lines[0])) {
        parsedName = lines[0];
    }

    if (!parsedName && parsedIngredients.length === 0 && parsedInstructions.length === 0) {
        showToast('Reseptin jäsentäminen epäonnistui. Tarkista tekstin muoto.', 'error');
        return;
    }

    onRecipeParsed({
      nimi: parsedName,
      ainesosat: parsedIngredients.length > 0 ? parsedIngredients : [{ name: '', amount: '', unit: '' }],
      ohjeet: parsedInstructions.join('\n'),
    });
    showToast('Resepti jäsennetty ja tiedot siirretty luontilomakkeelle.', 'success');
    setRecipeText('');
  };

  return (
    <div className="recipe-importer-container">
      <h2>Tuo resepti tekstimuodossa</h2>
      <p>
        Liitä reseptin teksti alle. Sovellus yrittää parhaansa mukaan tunnistaa nimen,
        ainesosat ja ohjeet. Tarkista ja muokkaa tiedot ennen tallentamista.
      </p>
      <textarea
        value={recipeText}
        onChange={(e) => setRecipeText(e.target.value)}
        placeholder="Liitä reseptiteksti tähän..."
        rows="15"
        className="recipe-import-textarea"
        aria-label="Reseptiteksti"
      ></textarea>
      <button onClick={parseRecipe} className="parse-recipe-button">
        Jäsennä ja esitäytä lomake
      </button>
    </div>
  );
};

export default RecipeImporter;