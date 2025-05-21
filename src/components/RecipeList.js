// src/components/RecipeList.js
// Tämä komponentti hakee reseptit, näyttää ne, mahdollistaa valinnan ja poiston.

import React, { useState, useEffect, useCallback } from 'react';
// Tuo tarvittavat Firebase-funktiot suoraan firebase.js-tiedostosta
import { db, collection, query, onSnapshot, deleteDoc, doc } from '../firebase';
import ConfirmModal from './ConfirmModal'; // Tuo vahvistusikkuna

const RecipeList = ({ onSelectRecipes, onEditRecipe }) => {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState(null);

  // Kuuntelee reaaliaikaisia päivityksiä Firebasesta
  useEffect(() => {
    const q = query(collection(db, 'recipes'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recipesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecipes(recipesData);
    });

    // Puhdistusfunktio (cleanup) kun komponentti poistetaan DOMista
    return () => unsubscribe();
  }, []);

  // Käytä useCallbackia estämään onSelectRecipes-funktion turhat uudelleenluonnokset
  const memoizedOnSelectRecipes = useCallback(onSelectRecipes, [onSelectRecipes]);

  // Päivittää valitut reseptit App-komponentille
  useEffect(() => {
    const selected = recipes.filter(recipe => selectedRecipeIds.includes(recipe.id));
    memoizedOnSelectRecipes(selected);
  }, [selectedRecipeIds, recipes, memoizedOnSelectRecipes]);

  // Käsittelee valintaruudun muutokset
  const handleCheckboxChange = (recipeId) => {
    setSelectedRecipeIds((prevSelected) =>
    prevSelected.includes(recipeId)
    ? prevSelected.filter((id) => id !== recipeId)
    : [...prevSelected, recipeId]
    );
  };

  // Avaa vahvistusmodaalin ennen poistoa
  const handleDeleteClick = (recipe) => {
    setRecipeToDelete(recipe);
    setShowConfirmModal(true);
  };

  // Vahvistaa ja suorittaa poiston
  const confirmDelete = async () => {
    if (recipeToDelete) {
      try {
        await deleteDoc(doc(db, 'recipes', recipeToDelete.id));
        console.log(`Resepti ${recipeToDelete.nimi} poistettu onnistuneesti.`);
        // Poista resepti myös valituista, jos se oli valittuna
        setSelectedRecipeIds(prevSelected => prevSelected.filter(recipeId => recipeId !== recipeToDelete.id));
      } catch (error) {
        console.error('Virhe reseptin poistamisessa: ', error);
        // Tässä voit näyttää virheilmoituksen käyttäjälle
      } finally {
        setShowConfirmModal(false);
        setRecipeToDelete(null);
      }
    }
  };

  // Peruuttaa poiston
  const cancelDelete = () => {
    setShowConfirmModal(false);
    setRecipeToDelete(null);
  };

  return (
    <div className="recipe-list-container">
    <h2>Reseptit</h2>
    {recipes.length === 0 ? (
      <p>Ei reseptejä. Lisää uusia reseptin luo -välilehdeltä.</p>
    ) : (
      <ul className="recipe-items">
      {recipes.map((recipe) => (
        <li key={recipe.id} className="recipe-item">
        <div className="recipe-header">
        <input
        type="checkbox"
        id={`recipe-${recipe.id}`}
        checked={selectedRecipeIds.includes(recipe.id)}
        onChange={() => handleCheckboxChange(recipe.id)}
        aria-label={`Valitse resepti ${recipe.nimi}`}
        />
        {/* Reseptin nimi klikattavaksi muokkausta varten */}
        <label
        htmlFor={`recipe-${recipe.id}`}
        onClick={() => onEditRecipe(recipe.id)}
        style={{ cursor: 'pointer' }} // Osoita klikattavuus
        >
        {recipe.nimi}
        </label>
        <button
        className="delete-icon-button"
        onClick={() => handleDeleteClick(recipe)}
        aria-label={`Poista resepti ${recipe.nimi}`}
        >
        &#x2716; {/* Unicode-merkki ruksille */}
        </button>
        </div>
        <div className="recipe-details">
        <h3>Ainesosat:</h3>
        <ul>
        {recipe.ainesosat && recipe.ainesosat.map((ing, idx) => (
          <li key={idx}>
          {ing.name} {ing.amount} {ing.unit}
          </li>
        ))}
        </ul>
        <h3>Ohjeet:</h3>
        <ol>
        {recipe.ohjeet && recipe.ohjeet.map((inst, idx) => (
          <li key={idx}>{inst}</li>
        ))}
        </ol>
        </div>
        </li>
      ))}
      </ul>
    )}

    {showConfirmModal && recipeToDelete && (
      <ConfirmModal
      message={`Haluatko varmasti poistaa reseptin "${recipeToDelete.nimi}"?`}
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
      />
    )}
    </div>
  );
};

export default RecipeList;
