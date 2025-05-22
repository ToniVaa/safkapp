// src/App.js
// Tämä on sovelluksen pääkomponentti, joka hallitsee navigointia ja näyttää eri näkymiä.

import React, { useState, useEffect } from "react";
import RecipeForm from "./components/RecipeForm";
import RecipeList from "./components/RecipeList";
import ShoppingList from "./components/ShoppingList";
import RecipeEditForm from "./components/RecipeEditForm";
import RecipeIdeaGenerator from "./components/RecipeIdeaGenerator";
import Login from "./components/Login";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import "./styles.css";

function App() {
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [user, setUser] = useState(null);
  const [showLogout, setShowLogout] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleSelectedRecipesChange = (recipes) => {
    setSelectedRecipes(recipes);
  };

  const handleEditRecipe = (recipeId) => {
    setEditingRecipeId(recipeId);
    setActiveTab("list");
  };

  const handleCloseEdit = () => {
    setEditingRecipeId(null);
  };

  const handleRecipeAdded = () => {
    setActiveTab("list");
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>SafkApp</h1>
      </header>

      <nav className="App-nav">
        <button
          className={activeTab === "list" && !editingRecipeId ? "active" : ""}
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

      {/* Kiinteä "Lisää valitut" -nappi oikeaan yläkulmaan vain reseptit-välilehdellä */}
      {activeTab === "list" && (
        <button
          onClick={() => setActiveTab("shopping")}
          style={{
            position: "fixed",
            top: 24,
            right: 32,
            zIndex: 2000,
            background: "#e44d26",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "0.7rem 1.5rem",
            fontSize: "1.1rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
            cursor: "pointer",
            fontWeight: "bold",
            letterSpacing: "1px"
          }}
        >
          Lisää valitut
        </button>
      )}

      {/* Kiinteä hakupalkki oikeaan yläkulmaan vain reseptit-välilehdellä */}
      {activeTab === "list" && (
        <input
          type="text"
          placeholder="Etsi reseptejä..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            position: "fixed",
            top: 24,
            right: 220,
            zIndex: 2000,
            padding: "0.7rem 1.2rem",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "1.1rem",
            width: "220px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            background: "#fff"
          }}
        />
      )}

      <main className="App-main">
        {editingRecipeId ? (
          <RecipeEditForm
            recipeId={editingRecipeId}
            onCloseEdit={handleCloseEdit}
          />
        ) : (
          <>
            {activeTab === "list" && (
              <RecipeList
                onSelectRecipes={handleSelectedRecipesChange}
                onEditRecipe={handleEditRecipe}
                searchTerm={searchTerm}
              />
            )}
            {activeTab === "form" && (
              <RecipeForm onRecipeAdded={handleRecipeAdded} />
            )}
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
