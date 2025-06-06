// src/components/RecipeList.js
import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, deleteDoc, doc } from '../firebase';
import ConfirmModal from './ConfirmModal';
import { ReactComponent as EditIcon } from '../assets/icons/edit-icon.svg';
import { ReactComponent as DeleteIcon } from '../assets/icons/delete-icon.svg';
import './RecipeList.css'; // Oletetaan, että tyylit on määritelty tässä tiedostossa

const RecipeList = ({ onEditRecipe, searchTerm, onSelectRecipes, selectedRecipes = [] }) => {
  const [recipes, setRecipes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'recipes'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recipesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecipes(recipesData);
    });
    return () => unsubscribe();
  }, []);

  const filteredRecipes = recipes
    .filter(recipe =>
      recipe.nimi.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.nimi.localeCompare(b.nimi, 'fi'));

  const handleDeleteClick = (recipe) => {
    setRecipeToDelete(recipe);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (recipeToDelete) {
      try {
        await deleteDoc(doc(db, 'recipes', recipeToDelete.id));
        // Tässä voisi lisätä myös kuvan poiston Cloudinarysta, jos tarpeen.
        // Se vaatisi backend-logiikkaa tai allekirjoitettuja poistopyyntöjä.
      } catch (error) {
        console.error("Virhe reseptin poistossa:", error);
      } finally {
        setShowConfirmModal(false);
        setRecipeToDelete(null);
      }
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setRecipeToDelete(null);
  };

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
              <div className="recipe-header">
                <input
                  type="checkbox"
                  checked={selectedRecipes.includes(recipe.id)}
                  onChange={() => handleCheckboxChange(recipe.id)}
                  className="recipe-checkbox"
                  aria-label="Valitse resepti"
                />
                <span className="recipe-name">{recipe.nimi}</span>
                <button
                  className="expand-btn"
                  aria-label={expandedId === recipe.id ? "Sulje tiedot" : "Näytä tiedot"}
                  onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                >
                  {expandedId === recipe.id ? "−" : "+"}
                </button>
              </div>
              {/* Reseptikuva näytetään tässä, nimen alapuolella */}
              {recipe.imageUrl && (
                <div className="recipe-thumbnail-container">
                  <img src={recipe.imageUrl} alt={recipe.nimi} className="recipe-thumbnail" />
                </div>
              )}
              {expandedId === recipe.id && (
                <div className="recipe-details">
                  <div className="action-buttons-container">
                    <button
                      className="edit-icon-button"
                      aria-label="Muokkaa"
                      onClick={() => onEditRecipe(recipe.id)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="delete-icon-button"
                      aria-label="Poista"
                      onClick={() => handleDeleteClick(recipe)}
                    >
                      <DeleteIcon />
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