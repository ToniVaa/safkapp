// src/components/ShoppingList.js
// Tämä komponentti koostaa ja näyttää ostoslistan valituista resepteistä.

import React from 'react';

const ShoppingList = ({ selectedRecipes }) => {
  // Koostaa ostoslistan valituista resepteistä
  const compileShoppingList = () => {
    const combinedIngredients = {};

    selectedRecipes.forEach(recipe => {
      if (recipe.ainesosat && Array.isArray(recipe.ainesosat)) {
        recipe.ainesosat.forEach(ing => {
          if (!ing.name) return;
          // Yhdistetään nimen ja yksikön perusteella
          const key = `${ing.name.trim().toLowerCase()}|${ing.unit || ''}`;
          if (!combinedIngredients[key]) {
            combinedIngredients[key] = {
              name: ing.name,
              amount: parseFloat(ing.amount) || 0,
              unit: ing.unit || ''
            };
          } else {
            combinedIngredients[key].amount += parseFloat(ing.amount) || 0;
          }
        });
      }
    });

    // Palauta järjestetty lista
    return Object.values(combinedIngredients).sort((a, b) =>
      a.name.localeCompare(b.name, 'fi')
    );
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
