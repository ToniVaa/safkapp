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

const ShoppingList = ({ selectedRecipes }) => {
  const [checkedItems, setCheckedItems] = useState({});

  // Käytetään useMemo-hookia shoppingItems-listan laskemiseen.
  // Tämä varmistaa, että shoppingItems-objekti on sama, jos selectedRecipes ei muutu.
  const shoppingItems = useMemo(() => {
    const combinedIngredients = {};
    selectedRecipes.forEach(recipe => {
      if (recipe.ainesosat && Array.isArray(recipe.ainesosat)) {
        recipe.ainesosat.forEach(ing => {
          if (!ing.name) return;
          const normalizedUnit = normalizeUnit(ing.unit);
          // Käytetään uniikkia avainta, joka sisältää myös alkuperäisen reseptin ID:n (jos saatavilla)
          // tai ainakin ainesosan nimen ja yksikön varmistamaan parempi pysyvyys
          const key = `${ing.name.trim().toLowerCase()}|${normalizedUnit}`;
          if (!combinedIngredients[key]) {
            combinedIngredients[key] = {
              name: ing.name,
              amount: parseFloat(ing.amount) || 0,
              unit: normalizedUnit,
              // Lisätään yksilöivä id, jos mahdollista, tai käytetään indeksiä myöhemmin
              // Tässä tapauksessa indeksi map-funktiossa on edelleen käytössä avaimena checkedItems-tilassa
            };
          } else {
            combinedIngredients[key].amount += parseFloat(ing.amount) || 0;
          }
        });
      }
    });
    return Object.values(combinedIngredients).sort((a, b) =>
      a.name.localeCompare(b.name, 'fi')
    );
  }, [selectedRecipes]); // Riippuu selectedRecipes-propista

  // Tämä useEffect ajetaan vain, kun shoppingItems-lista *itsessään* muuttuu
  // (eli kun reseptivalikoima muuttuu), ei pelkästään checkedItems-tilan muuttuessa.
  useEffect(() => {
    const newCheckedState = {};
    shoppingItems.forEach((item, index) => {
      // Jos halutaan säilyttää valinta, jos sama tuote (tunnistettuna esim. nimen ja yksikön perusteella)
      // on edelleen listalla, tarvittaisiin monimutkaisempi logiikka.
      // Yksinkertaisin on nollata kaikki valinnat, kun lista muuttuu.
      newCheckedState[index] = false; // Oletuksena ei valittu, kun lista päivittyy
    });
    setCheckedItems(newCheckedState);
  }, [shoppingItems]); // Nyt useEffect riippuu shoppingItems-muuttujasta

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
                <li key={index} className={checkedItems[index] ? 'checked' : ''}>
                  <input
                    type="checkbox"
                    className="shopping-item-checkbox"
                    checked={!!checkedItems[index]} // Varmistetaan, että arvo on boolean
                    onChange={() => handleCheckboxChange(index)}
                    aria-label={`Merkitse ${item.name} käsitellyksi`}
                  />
                  <span className="shopping-item-name">{item.name}: {item.amount} {item.unit}</span>
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