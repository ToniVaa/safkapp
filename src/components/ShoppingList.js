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

function autoConvertUnit(amount, unit) {
  if (unit === "ml" && amount >= 100) {
    return { amount: amount / 100, unit: "dl" };
  }
  if (unit === "dl" && amount >= 10) {
    return { amount: amount / 10, unit: "l" };
  }
  if (unit === "g" && amount >= 1000) {
    return { amount: amount / 1000, unit: "kg" };
  }
  return { amount, unit };
}

const ShoppingList = ({ selectedRecipes }) => {
  const [checkedItems, setCheckedItems] = useState({});
  const [hoveredIngredient, setHoveredIngredient] = useState(null);

  const shoppingItems = useMemo(() => {
    const combinedIngredients = {};
    selectedRecipes.forEach(recipe => {
      if (recipe.ainesosat && Array.isArray(recipe.ainesosat)) {
        recipe.ainesosat.forEach(ing => {
          if (!ing.name) return;
          const nameKey = ing.name.trim().toLowerCase();
          const unitKey = normalizeUnit(ing.unit);
          const key = `${nameKey}|${unitKey}`;

          let amount = parseFloat(String(ing.amount).replace(',', '.'));
          if (isNaN(amount)) amount = 0;

          if (!combinedIngredients[key]) {
            combinedIngredients[key] = {
              name: ing.name.trim(),
              amount: amount,
              unit: unitKey,
              recipes: [recipe.nimi],
              hasAmount: !!ing.amount && !isNaN(amount) && amount > 0,
            };
          } else {
            combinedIngredients[key].amount += amount;
            combinedIngredients[key].recipes.push(recipe.nimi);
            if (!!ing.amount && !isNaN(amount) && amount > 0) {
              combinedIngredients[key].hasAmount = true;
            }
          }
        });
      }
    });

    // Jos sama ainesosa löytyy sekä määrällä että ilman määrää, yhdistä ne
    const merged = {};
    Object.values(combinedIngredients).forEach(item => {
      const nameKey = item.name.trim().toLowerCase();
      if (!merged[nameKey]) {
        merged[nameKey] = { ...item };
      } else {
        // Jos jommassakummassa on määrä, käytä sitä ja laske yhteen
        merged[nameKey].amount += item.amount;
        merged[nameKey].recipes = [...new Set([...merged[nameKey].recipes, ...item.recipes])];
        merged[nameKey].unit = merged[nameKey].unit || item.unit;
        merged[nameKey].hasAmount = merged[nameKey].hasAmount || item.hasAmount;
      }
    });

    return Object.values(merged)
      .map(item => {
        let display = item.name;
        if (item.hasAmount) {
          let { amount, unit } = autoConvertUnit(item.amount, item.unit);
          amount = unit === "l" || unit === "kg"
            ? String(Number(amount).toLocaleString("fi-FI", { maximumFractionDigits: 2 }))
            : String(amount).replace('.', ',');
          display = `${item.name}: ${amount}${unit ? ` ${unit}` : ''}`;
        }
        return {
          ...item,
          display
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' }));
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

  // Luo ostoslista yhdistämällä ainesosat (esimerkki)
  const allIngredients = {};
  selectedRecipes.forEach(recipe => {
    recipe.ainesosat.forEach(ing => {
      const key = ing.name.trim().toLowerCase();
      if (!allIngredients[key]) {
        allIngredients[key] = { ...ing, recipes: [recipe.nimi] };
      } else {
        allIngredients[key].recipes.push(recipe.nimi);
      }
    });
  });

  const ingredientList = Object.values(allIngredients);

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
              {shoppingItems.map((item, idx) => {
                // Selvitä reseptit, joissa tämä ainesosa on
                const matchingIngredient = ingredientList.find(ing =>
                  ing.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
                return (
                  <li
                    key={item.id}
                    className="shopping-list-item"
                    onMouseEnter={() => setHoveredIngredient(idx)}
                    onMouseLeave={() => setHoveredIngredient(null)}
                    style={{ position: "relative" }}
                  >
                    <input
                      type="checkbox"
                      className="shopping-item-checkbox"
                      checked={!!checkedItems[item.id]}
                      onChange={() => handleCheckboxChange(item.id)}
                      aria-label={`Merkitse ${item.name} käsitellyksi`}
                    />
                    <span className="shopping-item-name">
                      {item.display}
                    </span>
                    {hoveredIngredient === idx && matchingIngredient && (
                      <div className="ingredient-tooltip">
                        {matchingIngredient.recipes.length === 1
                          ? `Resepti:\n${matchingIngredient.recipes[0]}`
                          : `Reseptit:\n${matchingIngredient.recipes.join('\n')}`}
                      </div>
                    )}
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