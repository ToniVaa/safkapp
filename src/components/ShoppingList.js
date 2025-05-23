// src/components/ShoppingList.js
// Tämä komponentti koostaa ja näyttää ostoslistan valituista resepteistä.

import React, { useState, useEffect, useMemo } from 'react'; // Lisätty useMemo

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
  'ml': { to: 'dl', threshold: 100, factor: 100 }, // Esim. 100ml -> 1dl
  'dl': { to: 'l', threshold: 10, factor: 10 },   // Esim. 10dl -> 1l
  'g': { to: 'kg', threshold: 1000, factor: 1000 }, // Esim. 1000g -> 1kg
  // Lisää tarvittaessa muita muunnoksia, esim. tl -> dl tai rkl -> dl
  // 'tl': { to: 'ml', threshold: (esim. 20 -> jos 20tl on ~1dl), factor: (montako tl on ml) }
};


const ShoppingList = ({ selectedRecipes }) => {
  const [checkedItems, setCheckedItems] = useState({});

  const shoppingItems = useMemo(() => {
    const combinedIngredients = {};
    selectedRecipes.forEach(recipe => {
      if (recipe.ainesosat && Array.isArray(recipe.ainesosat)) {
        recipe.ainesosat.forEach(ing => {
          if (!ing.name) return;
          
          let amount = parseFloat(String(ing.amount).replace(',', '.')) || 0; // Käsittele pilkku ja varmista numero
          let unit = normalizeUnit(ing.unit); // Normalisoi yksikkö ensin

          // Avain perustuu nimeen ja normalisoituun perusyksikköön (jos muunnos on olemassa ja tehdään)
          // Tai vain nimeen ja normalisoituun yksikköön, jos muunnosta ei tehdä heti
          const key = `${ing.name.trim().toLowerCase()}|${unit}`;

          if (!combinedIngredients[key]) {
            combinedIngredients[key] = {
              name: ing.name.trim(),
              amount: amount,
              unit: unit,
            };
          } else {
            combinedIngredients[key].amount += amount;
          }
        });
      }
    });

    // Muunna yksiköt vasta yhdistämisen jälkeen
    const convertedIngredients = Object.values(combinedIngredients).map(item => {
      const conversion = conversionFactors[item.unit];
      if (conversion && item.amount >= conversion.threshold) {
        // Pyöristetään kahden desimaalin tarkkuuteen, jos tarpeen
        const newAmount = parseFloat((item.amount / conversion.factor).toFixed(2));
        return {
          ...item,
          amount: newAmount,
          unit: conversion.to,
        };
      }
      // Jos määrä on desimaaliluku, mutta ei ylitä muunnosrajaa, varmista että se on järkevästi muotoiltu
      // Esimerkiksi jos halutaan aina max 2 desimaalia
      if (item.amount % 1 !== 0) {
        return {
          ...item,
          amount: parseFloat(item.amount.toFixed(2))
        }
      }
      return item;
    }).sort((a, b) =>
      a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' })
    );

    return convertedIngredients;
  }, [selectedRecipes]);

  useEffect(() => {
    const newCheckedState = {};
    shoppingItems.forEach((item, index) => {
      // Yritetään säilyttää checkboxin tila, jos ainesosa (nimi+yksikkö+määrä) on täysin sama
      // Tämä on yksinkertaistus, parempi avain voisi olla tarpeen jos järjestys muuttuu usein.
      // Tässä käytetään indeksiä, mikä nollaa valinnat listan muuttuessa.
      newCheckedState[index] = false; 
    });
    setCheckedItems(newCheckedState);
  }, [shoppingItems]); 

  const handleCheckboxChange = (index) => {
    setCheckedItems(prevCheckedItems => {
      const newCheckedItems = { ...prevCheckedItems };
      newCheckedItems[index] = !newCheckedItems[index];
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
              {shoppingItems.map((item, index) => (
                <li key={`${item.name}-${item.unit}-${item.amount}-${index}`} className={checkedItems[index] ? 'checked' : ''}> {/* Parempi avain */}
                  <input
                    type="checkbox"
                    className="shopping-item-checkbox"
                    checked={!!checkedItems[index]} 
                    onChange={() => handleCheckboxChange(index)}
                    aria-label={`Merkitse ${item.name} käsitellyksi`}
                  />
                  {/* Varmistetaan, että desimaaliluvut näytetään oikein (esim. pilkulla) */}
                  <span className="shopping-item-name">{item.name}: {String(item.amount).replace('.', ',')} {item.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default ShoppingList;