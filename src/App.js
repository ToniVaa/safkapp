// src/App.js
// Tämä on sovelluksen pääkomponentti, joka hallitsee navigointia ja näyttää eri näkymiä.
// HUOM: Tämä tiedosto on tarkoitettu käytettäväksi perinteisessä React-projektirakenteessa,
// jossa muut komponentit ja tyylit ovat omissa tiedostoissaan.

import React, { useState, useEffect } from "react";
// Tuo kaikki komponentit omista tiedostoistaan
import RecipeForm from "./components/RecipeForm";
import RecipeList from "./components/RecipeList";
import ShoppingList from "./components/ShoppingList";
import RecipeEditForm from "./components/RecipeEditForm";
import RecipeIdeaGenerator from "./components/RecipeIdeaGenerator";
import Login from "./components/Login";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

// Tuo globaalit tyylit
import "./styles.css";

function App() {
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [user, setUser] = useState(null);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      setShowLogout(scrollY + windowHeight >= docHeight - 40);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const allowedEmails = [
    "saara0860@gmail.com",
    "tacerinus@gmail.com",
    // Lisää sallitut sähköpostit tähän
  ];

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Ehdolliset returnit vasta hookkien jälkeen!
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user && !allowedEmails.includes(user.email)) {
    return (
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <h2>Pääsy evätty</h2>
        <p>Tällä Google-tilillä ei ole oikeutta käyttää sovellusta.</p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "2rem",
            background: "none",
            border: "none",
            color: "#bbb",
            fontSize: "0.95rem",
            opacity: 0.5,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Kirjaudu ulos
        </button>
      </div>
    );
  }

  // Käsittelee valittujen reseptien muutokset RecipeList-komponentista
  const handleSelectedRecipesChange = (recipes) => {
    setSelectedRecipes(recipes);
  };

  // Käsittelee reseptin muokkaustilan avaamisen
  const handleEditRecipe = (recipeId) => {
    setEditingRecipeId(recipeId);
    setActiveTab("list"); // Pysy "Reseptit"-välilehdellä, mutta näytä muokkauslomake
  };

  // Käsittelee reseptin muokkaustilan sulkemisen
  const handleCloseEdit = () => {
    setEditingRecipeId(null); // Sulje muokkauslomake
  };

  // Käsittelee uuden reseptin lisäämisen jälkeisen ohjauksen takaisin listaukseen
  const handleRecipeAdded = () => {
    setActiveTab("list");
  };

  return (
    <div className="App">
      {/* CSS-tyylit ladataan styles.css-tiedostosta */}

      <header className="App-header">
        <h1>Resepti- ja Ostoslistasovellus</h1>
      </header>

      <nav className="App-nav">
        <button
          className={
            activeTab === "list" && !editingRecipeId ? "active" : ""
          }
          onClick={() => {
            setActiveTab("list");
            setEditingRecipeId(null);
          }}
        >
          Reseptit
        </button>
        <button
          className={activeTab === "form" ? "active" : ""}
          onClick={() => {
            setActiveTab("form");
            setEditingRecipeId(null);
          }}
        >
          Luo resepti
        </button>
        <button
          className={activeTab === "shopping" ? "active" : ""}
          onClick={() => {
            setActiveTab("shopping");
            setEditingRecipeId(null);
          }}
        >
          Ostoslista
        </button>
        <button
          className={activeTab === "ideas" ? "active" : ""}
          onClick={() => {
            setActiveTab("ideas");
            setEditingRecipeId(null);
          }}
        >
          ✨ Resepti-ideat
        </button>
      </nav>

      <main className="App-main">
        {editingRecipeId ? (
          // Jos reseptiä muokataan, näytä RecipeEditForm
          <RecipeEditForm
            recipeId={editingRecipeId}
            onCloseEdit={handleCloseEdit}
          />
        ) : (
          // Muussa tapauksessa näytä aktiivinen välilehti
          <>
            {activeTab === "list" && (
              <RecipeList
                onSelectRecipes={handleSelectedRecipesChange}
                onEditRecipe={handleEditRecipe}
              />
            )}
            {activeTab === "form" && <RecipeForm onRecipeAdded={handleRecipeAdded} />}
            {activeTab === "shopping" && (
              <ShoppingList selectedRecipes={selectedRecipes} />
            )}
            {activeTab === "ideas" && <RecipeIdeaGenerator />}
          </>
        )}
      </main>

      {/* Huomaamaton uloskirjautumisnappi näkyy vain kun ollaan alalaidassa */}
      {showLogout && (
        <button
          onClick={handleLogout}
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "none",
            border: "none",
            color: "#888",
            fontSize: "0.95rem",
            opacity: 0.7,
            cursor: "pointer",
            textDecoration: "underline",
            zIndex: 1000,
          }}
        >
          Kirjaudu ulos
        </button>
      )}
    </div>
  );
}

export default App;
