// src/App.js
// Tämä on sovelluksen pääkomponentti, joka hallitsee navigointia ja näyttää eri näkymiä.
// HUOM: Tämä tiedosto on tarkoitettu käytettäväksi perinteisessä React-projektirakenteessa,
// jossa muut komponentit ja tyylit ovat omissa tiedostoissaan.

import React, { useState } from 'react';

// Tuo kaikki komponentit omista tiedostoistaan
import RecipeForm from './components/RecipeForm';
import RecipeList from './components/RecipeList';
import ShoppingList from './components/ShoppingList';
import RecipeEditForm from './components/RecipeEditForm';
import RecipeIdeaGenerator from './components/RecipeIdeaGenerator';

// Tuo globaalit tyylit
import './styles.css';

function App() {
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'form', 'shopping', 'ideas'
  const [editingRecipeId, setEditingRecipeId] = useState(null); // Tila muokattavan reseptin ID:lle

  // Käsittelee valittujen reseptien muutokset RecipeList-komponentista
  const handleSelectedRecipesChange = (recipes) => {
    setSelectedRecipes(recipes);
  };

  // Käsittelee reseptin muokkaustilan avaamisen
  const handleEditRecipe = (recipeId) => {
    setEditingRecipeId(recipeId);
    setActiveTab('list'); // Pysy "Reseptit"-välilehdellä, mutta näytä muokkauslomake
  };

  // Käsittelee reseptin muokkaustilan sulkemisen
  const handleCloseEdit = () => {
    setEditingRecipeId(null); // Sulje muokkauslomake
  };

  // Käsittelee uuden reseptin lisäämisen jälkeisen ohjauksen takaisin listaukseen
  const handleRecipeAdded = () => {
    setActiveTab('list');
  };

  return (
    <div className="App">
    {/* CSS-tyylit ladataan styles.css-tiedostosta */}

    <header className="App-header">
    <h1>Resepti- ja Ostoslistasovellus</h1>
    </header>

    <nav className="App-nav">
    <button
    className={activeTab === 'list' && !editingRecipeId ? 'active' : ''}
    onClick={() => { setActiveTab('list'); setEditingRecipeId(null); }}
    >
    Reseptit
    </button>
    <button
    className={activeTab === 'form' ? 'active' : ''}
    onClick={() => { setActiveTab('form'); setEditingRecipeId(null); }}
    >
    Luo resepti
    </button>
    <button
    className={activeTab === 'shopping' ? 'active' : ''}
    onClick={() => { setActiveTab('shopping'); setEditingRecipeId(null); }}
    >
    Ostoslista
    </button>
    <button
    className={activeTab === 'ideas' ? 'active' : ''}
    onClick={() => { setActiveTab('ideas'); setEditingRecipeId(null); }}
    >
    ✨ Resepti-ideat
    </button>
    </nav>

    <main className="App-main">
    {editingRecipeId ? (
      // Jos reseptiä muokataan, näytä RecipeEditForm
      <RecipeEditForm recipeId={editingRecipeId} onCloseEdit={handleCloseEdit} />
    ) : (
      // Muussa tapauksessa näytä aktiivinen välilehti
      <>
      {activeTab === 'list' && (
        <RecipeList onSelectRecipes={handleSelectedRecipesChange} onEditRecipe={handleEditRecipe} />
      )}
      {activeTab === 'form' && (
        <RecipeForm onRecipeAdded={handleRecipeAdded} />
      )}
      {activeTab === 'shopping' && (
        <ShoppingList selectedRecipes={selectedRecipes} />
      )}
      {activeTab === 'ideas' && (
        <RecipeIdeaGenerator />
      )}
      </>
    )}
    </main>
    </div>
  );
}

export default App;
