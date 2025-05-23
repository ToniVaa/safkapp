// src/components/RecipeList.js
// Tämä komponentti hakee reseptit, näyttää ne, mahdollistaa valinnan ja poiston.

import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, deleteDoc, doc } from '../firebase';
import ConfirmModal from './ConfirmModal';

// Oletetaan, että SVG-tiedostosi ovat src/assets/icons/ -kansiossa
// Jos polku on eri, muokkaa import-lauseita vastaavasti.
// Jos assets-kansiota tai icons-alikansiota ei ole, luo ne.
import { ReactComponent as EditIcon } from '../assets/icons/edit-icon.svg';
import { ReactComponent as DeleteIcon } from '../assets/icons/delete-icon.svg';

const RecipeList = ({ onEditRecipe, searchTerm, onSelectRecipes, selectedRecipes = [] }) => {
  const [recipes, setRecipes] = useState([]);
  const [expandedId, setExpandedId] = useState(null); // Tila laajennetulle reseptille
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

  // Suodata ja järjestä reseptit aakkosjärjestykseen
  const filteredRecipes = recipes
    .filter(recipe =>
      recipe.nimi.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.nimi.localeCompare(b.nimi, 'fi'));

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
      } catch (error) {
        // Voit näyttää virheilmoituksen käyttäjälle
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

  // Checkboxin muutos
  const handleCheckboxChange = (recipeId) => {
    if (selectedRecipes.includes(recipeId)) {
      onSelectRecipes(selectedRecipes.filter(id => id !== recipeId));
    } else {
      onSelectRecipes([...selectedRecipes, recipeId]);
    }
  };

  return (
    <div className="recipe-list-container">
      <h2>Reseptit</h2>
      {filteredRecipes.length === 0 ? (
        <p>Ei reseptejä. Lisää uusia reseptin luo -välilehdeltä.</p>
      ) : (
        <ul className="recipe-items">
          {filteredRecipes.map((recipe) => (
            <li key={recipe.id} className="recipe-item">
              <div className="recipe-header" style={{ display: "flex", alignItems: "center", minHeight: "4.5rem", padding: "1.2rem 0" }}>
                <input
                  type="checkbox"
                  checked={selectedRecipes.includes(recipe.id)}
                  onChange={() => handleCheckboxChange(recipe.id)}
                  style={{ marginRight: 12, width: 22, height: 22 }}
                  aria-label="Valitse resepti"
                />
                <button
                  className="expand-btn"
                  aria-label={expandedId === recipe.id ? "Sulje tiedot" : "Näytä tiedot"}
                  onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                >
                  {expandedId === recipe.id ? "−" : "+"}
                </button>
                <span style={{ fontWeight: "bold", flex: 1, marginLeft: 8 }}>{recipe.nimi}</span>
              </div>
              {expandedId === recipe.id && (
                <div className="recipe-details">
                  <div className="action-buttons-container" style={{ justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button
                      className="edit-icon-button"
                      aria-label="Muokkaa"
                      onClick={() => onEditRecipe(recipe.id)}
                    >
                      <EditIcon /> {/* SVG-komponentti käytössä */}
                    </button>
                    <button
                      className="delete-icon-button"
                      aria-label="Poista"
                      onClick={() => handleDeleteClick(recipe)}
                    >
                      <DeleteIcon /> {/* SVG-komponentti käytössä */}
                    </button>
                  </div>
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
              )}
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