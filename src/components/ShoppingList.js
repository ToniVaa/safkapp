// src/components/ShoppingList.js
// Tämä komponentti koostaa ja näyttää ostoslistan valituista resepteistä.

import React from 'react';

const ShoppingList = ({ selectedRecipes }) => {
  // Koostaa ostoslistan valituista resepteistä
  const compileShoppingList = () => {
    const combinedIngredients = {};

    selectedRecipes.forEach(recipe => {
      if (recipe.ainesosat) {
        recipe.ainesosat.forEach(ingredient => {
          // Normalisoi nimi ja yksikkö avainta varten (esim. "kermaa-dl")
          const key = `${ingredient.name.toLowerCase().trim()}-${ingredient.unit.toLowerCase().trim()}`;

          if (combinedIngredients[key]) {
            // Jos ainesosa yksikköineen on jo listalla, lisää määrää
            combinedIngredients[key].amount += ingredient.amount;
          } else {
            // Muuten lisää uutena
            combinedIngredients[key] = { ...ingredient };
          }
        });
      }
    });

    // Muunna yhdistetty objekti takaisin järjestetyksi listaksi tulostusta varten
    const shoppingList = Object.values(combinedIngredients).sort((a, b) =>
    a.name.localeCompare(b.name)
    );

    return shoppingList;
  };

  const shoppingItems = compileShoppingList();

  return (
    <div className="shopping-list-container">
    <h2>Ostoslista</h2>
    {selectedRecipes.length === 0 ? (
      <p>Valitse reseptejä "Reseptit"-välilehdeltä luodaksesi ostoslistan.</p>
    ) : (
      <>
      <p>Ostoslista valituista resepteistä:</p>
      <ul className="shopping-items">
      {shoppingItems.length === 0 ? (
        <p>Valituissa resepteissä ei ole ainesosia.</p>
      ) : (
        shoppingItems.map((item, index) => (
          <li key={index}>
          {item.name}: {item.amount} {item.unit}
          </li>
        ))
      )}
      </ul>
      </>
    )}
    </div>
  );
};

export default ShoppingList;
