// src/components/ShoppingList.js
// Tämä komponentti koostaa ja näyttää ostoslistan valituista resepteistä.

import React, { useState, useEffect, useMemo } from 'react';

const unitSynonyms = {
  // Tilavuus
  "ml": "ml", "millilitra": "ml", "millilitraa": "ml",
  "cl": "cl", "senttilitra": "cl", "senttilitraa": "cl",
  "dl": "dl", "desilitra": "dl", "desilitraa": "dl",
  "l": "l", "litra": "l", "litraa": "l",
  // Paino
  "g": "g", "gramma": "g", "grammaa": "g",
  "kg": "kg", "kilo": "kg", "kiloa": "kg", "kilogramma": "kg", "kilogrammaa": "kg",
  // Kappalemäärä
  "kpl": "kpl", "kappaletta": "kpl", "kappale": "kpl",
  "rs": "rs", "rasia": "rs", "rasiaa": "rs",
  "tl": "tl", "teelusikka": "tl", "teelusikkaa": "tl",
  "rkl": "rkl", "ruokalusikka": "rkl", "ruokalusikkaa": "rkl",
  "ripaus": "ripaus",
  "pullo": "plo",
  // Muut
  "pkt": "pkt", "paketti": "pkt", "pakettia": "pkt",
  "prk": "prk", "purkki": "prk", "purkkia": "prk",
  "":" ", // Normalisoidaan välilyönniksi, josta sitten tyhjäksi merkkijonoksi alla
};

function normalizeUnit(unit) {
  const lowerUnit = (unit || '').trim().toLowerCase();
  const normalized = unitSynonyms[lowerUnit] || lowerUnit;
  // Palauta tyhjä merkkijono, jos yksikköä ei ole tai se on merkityksetön (vain välilyönti)
  return (normalized === " ") ? "" : normalized;
}

const conversionFactors = {
  'ml': { to: 'dl', threshold: 100, factor: 100 },
  'dl': { to: 'l', threshold: 10, factor: 10 },
  'g': { to: 'kg', threshold: 1000, factor: 1000 },
};


const ShoppingList = ({ selectedRecipes }) => {
  const [checkedItems, setCheckedItems] = useState({});

  const shoppingItems = useMemo(() => {
    const combinedIngredients = {};
    selectedRecipes.forEach(recipe => {
      if (recipe.ainesosat && Array.isArray(recipe.ainesosat)) {
        recipe.ainesosat.forEach(ing => {
          if (!ing.name) return;
          
          const nameKey = ing.name.trim().toLowerCase();
          let amount = parseFloat(String(ing.amount).replace(',', '.')) || 0;
          // Jos amount on NaN (esim. tyhjä syöte), käytä 0:aa yhteenlaskussa,
          // mutta huomioidaan, että alkuperäinen määrä saattoi olla "ei määritelty"
          let originalAmountSpecified = ing.amount !== '' && !isNaN(parseFloat(String(ing.amount).replace(',', '.')));
          if (isNaN(amount)) {
            amount = 0;
          }
          
          let currentUnit = normalizeUnit(ing.unit);

          if (!combinedIngredients[nameKey]) {
            combinedIngredients[nameKey] = {
              name: ing.name.trim(),
              amount: amount,
              unit: currentUnit,
              // Seuraa, onko tälle ainesosalle KOSKAAN määritelty ei-tyhjää yksikköä
              hasEverHadExplicitUnit: currentUnit !== "",
              // Seuraa, onko tälle ainesosalle KOSKAAN määritelty numeerista määrää
              hasEverHadNumericAmount: originalAmountSpecified && amount > 0,
            };
          } else {
            combinedIngredients[nameKey].amount += amount;
            if (originalAmountSpecified && amount > 0) {
                combinedIngredients[nameKey].hasEverHadNumericAmount = true;
            }

            // Päivitä yksikkö, jos uusi on spesifimpi (ei tyhjä) ja vanha oli tyhjä
            if (currentUnit && !combinedIngredients[nameKey].unit) {
              combinedIngredients[nameKey].unit = currentUnit;
            }
            // Jos uusi yksikkö on "kpl" ja vanha oli tyhjä, priorisoi "kpl"
            else if (currentUnit && currentUnit.toLowerCase() === 'kpl' && !combinedIngredients[nameKey].unit) {
                combinedIngredients[nameKey].unit = currentUnit;
            }
            // Merkitse, jos yksikkö on nyt määritelty
            if (currentUnit) {
                combinedIngredients[nameKey].hasEverHadExplicitUnit = true;
            }
          }
        });
      }
    });

    // Jälkikäsittely yksiköille ja muunnoksille
    const processedIngredients = Object.values(combinedIngredients).map(item => {
      let finalUnit = item.unit;
      let finalAmount = item.amount;

      // Jos yksikkö on tyhjä JA ainesosalle on joskus määritelty numeerinen määrä,
      // JA sille ei ole koskaan määritelty muuta ei-tyhjää yksikköä, oleta "kpl".
      if (finalUnit === "" && item.hasEverHadNumericAmount && !item.hasEverHadExplicitUnit && finalAmount > 0) {
        finalUnit = "kpl";
      }
      // Jos yksikkö on edelleen tyhjä, mutta määrää on, ja jossain vaiheessa on ollut "kpl", käytä "kpl"
      // Tämä on hieman redundantti ylläolevan kanssa, mutta varmistaa "kpl":n pysyvyyden
      else if (finalUnit === "" && item.hasEverHadNumericAmount && item.unit.toLowerCase() === 'kpl' && finalAmount > 0) {
         finalUnit = "kpl";
      }


      // Tee yksikkömuunnokset (esim. dl -> l)
      const conversion = conversionFactors[finalUnit]; // Käytä finalUnitia tässä
      if (conversion && finalAmount >= conversion.threshold) {
        finalAmount = parseFloat((finalAmount / conversion.factor).toFixed(2));
        finalUnit = conversion.to;
      } else if (finalAmount % 1 !== 0) { // Jos on desimaaliluku ilman muunnosta
         finalAmount = parseFloat(finalAmount.toFixed(2));
      }
      
      // Luodaan uniikki ID lopullisen yksikön ja nimen perusteella
      const itemId = `${item.name.trim().toLowerCase()}-${finalUnit || 'none'}`;

      return {
        name: item.name,
        amount: finalAmount,
        unit: finalUnit,
        id: itemId,
      };
    }).filter(item => item.amount > 0 || (item.amount === 0 && item.unit !== "" && item.unit !== " ")) // Suodata pois nollamäärät ilman yksikköä
      .sort((a, b) =>
      a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' })
    );

    return processedIngredients;
  }, [selectedRecipes]);

  useEffect(() => {
    setCheckedItems(prevCheckedItems => {
      const newCheckedState = {};
      shoppingItems.forEach(item => {
        const key = item.id; 
        newCheckedState[key] = prevCheckedItems[key] || false; 
      });
      return newCheckedState;
    });
  }, [shoppingItems]); 

  const handleCheckboxChange = (itemKey) => {
    setCheckedItems(prevCheckedItems => {
      const newCheckedItems = { ...prevCheckedItems };
      newCheckedItems[itemKey] = !newCheckedItems[itemKey];
      return newCheckedItems;
    });
  };

  return (
    <div className="shopping-list-container">
      <h2>Ostoslista</h2>
      {selectedRecipes.length === 0 ? (
        <p>Valitse reseptejä "Reseptit"-välilehdeltä luodaksesi ostoslistan.</p>
      ) : (
        <>
          <p className="shopping-list-description">Ostoslista valituista resepteistä:</p>
          {shoppingItems.length === 0 ? (
            <p>Valituissa resepteissä ei ole ainesosia tai niiden määrä on nolla.</p>
          ) : (
            <ul className="shopping-items">
              {shoppingItems.map((item) => {
                const itemKey = item.id; 
                return (
                  <li key={itemKey} className={checkedItems[itemKey] ? 'checked' : ''}>
                    <input
                      type="checkbox"
                      className="shopping-item-checkbox"
                      checked={!!checkedItems[itemKey]} 
                      onChange={() => handleCheckboxChange(itemKey)}
                      aria-label={`Merkitse ${item.name} käsitellyksi`}
                    />
                    <span className="shopping-item-name">
                      {item.name}: {String(item.amount).replace('.', ',')}{item.unit ? ` ${item.unit}` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default ShoppingList;