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
  "":" ",
};

function normalizeUnit(unit) {
  const lowerUnit = (unit || '').trim().toLowerCase();
  return unitSynonyms[lowerUnit] || lowerUnit;
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
          
          let amount = parseFloat(String(ing.amount).replace(',', '.')) || 0;
          let unit = normalizeUnit(ing.unit); 

          // Generoidaan alustava id ainesosalle (voi muuttua yksikkömuunnoksen myötä)
          // Tämä id käytetään väliaikaisesti yhdistämiseen ennen lopullista muunnosta.
          const initialId = `${ing.name.trim().toLowerCase()}-${unit}`;

          if (!combinedIngredients[initialId]) {
            combinedIngredients[initialId] = {
              name: ing.name.trim(),
              amount: amount,
              unit: unit,
              originalId: initialId // Säilytetään alkuperäinen id-muoto myöhempää käyttöä varten checkedItemsissa
            };
          } else {
            combinedIngredients[initialId].amount += amount;
          }
        });
      }
    });

    const convertedIngredients = Object.values(combinedIngredients).map(item => {
      const conversion = conversionFactors[item.unit];
      let currentId = item.originalId; // Käytä alkuperäistä id:tä, ellei yksikkö muutu

      if (conversion && item.amount >= conversion.threshold) {
        const newAmount = parseFloat((item.amount / conversion.factor).toFixed(2));
        currentId = `${item.name.trim().toLowerCase()}-${conversion.to}`; // Päivitä id, jos yksikkö muuttuu
        return {
          name: item.name, // Säilytä alkuperäinen nimen muotoilu
          amount: newAmount,
          unit: conversion.to,
          id: currentId
        };
      }
      
      let finalAmount = item.amount;
      if (item.amount % 1 !== 0) { // Jos on desimaaliluku
         finalAmount = parseFloat(item.amount.toFixed(2));
      }
      
      return {
        name: item.name,
        amount: finalAmount,
        unit: item.unit,
        id: currentId // Käytä alkuperäistä tai päivitettyä id:tä
      };
    }).sort((a, b) =>
      a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' })
    );

    return convertedIngredients;
  }, [selectedRecipes]);

  useEffect(() => {
    setCheckedItems(prevCheckedItems => {
      const newCheckedState = {};
      shoppingItems.forEach(item => {
        const key = item.id; // Käytä ainesosan yksilöivää id:tä avaimena
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
            <p>Valituissa resepteissä ei ole ainesosia.</p>
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
                    <span className="shopping-item-name">{item.name}: {String(item.amount).replace('.', ',')} {item.unit}</span>
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