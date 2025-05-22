// src/App.js
// Tämä on sovelluksen pääkomponentti, joka hallitsee navigointia ja näyttää eri näkymiä.

import React, { useState, useEffect, useCallback } from "react"; // Lisätty useCallback
import RecipeForm from "./components/RecipeForm";
import RecipeList from "./components/RecipeList";
import ShoppingList from "./components/ShoppingList";
import RecipeEditForm from "./components/RecipeEditForm";
// import RecipeIdeaGenerator from "./components/RecipeIdeaGenerator"; // POISTETTU: Resepti-ideat ominaisuus
import Login from "./components/Login";
import Toast from "./components/Toast"; // Tuo Toast-komponentti
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { db } from "./firebase"; // Tuodaan db Firebase-konfiguraatiosta
import { collection, query, onSnapshot } from "firebase/firestore"; // Tuodaan tarvittavat funktiot Firestore-kirjastosta
import "./styles.css";

function App() {
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [user, setUser] = useState(null);
  const [showLogout, setShowLogout] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [allRecipes, setAllRecipes] = useState([]);

  // Nämä hookit heti alkuun!
  const showToast = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const allowedEmails = [
    "saara0860@gmail.com",
    "tacerinus@gmail.com",
    // Lisää sallitut sähköpostit tähän
  ];

  // Nyt voit käyttää showToastia täällä
  const handleLogout = async () => {
    await signOut(auth);
    showToast("Olet kirjautunut ulos.", "success");
  };

  // kaikki if (!user) ja muut returnit vasta näiden jälkeen!
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Näytä uloskirjautumisnappi, kun ollaan melkein sivun alareunassa
      setShowLogout(scrollY + windowHeight >= docHeight - 100);

      // Näytä hakupalkki ja "Lisää valitut" -nappi, kun on vieritetty alas vähintään 200px
      // ja aktiivinen välilehti on "Reseptit"
      // Korjattu fixed-controls näkyvyyslogiikka:
      setShowScrollButtons(scrollY > 200 && activeTab === "list" && !editingRecipeId);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab, editingRecipeId]); // Lisätty editingRecipeId riippuvuuksiin

  useEffect(() => {
    // Hae kaikki reseptit Firebasesta
    const q = query(collection(db, 'recipes'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recipesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllRecipes(recipesData);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectedRecipesChange = (newSelected) => {
    setSelectedRecipes(newSelected);
  };

  const handleEditRecipe = (recipeId) => {
    setEditingRecipeId(recipeId);
    setActiveTab("list");
  };

  const handleCloseEdit = useCallback(() => {
    setEditingRecipeId(null);
    showToast("Resepti päivitetty onnistuneesti!", "success");
  }, [showToast]);

  const handleRecipeAdded = useCallback(() => {
    setActiveTab("list");
    showToast("Resepti lisätty onnistuneesti!", "success");
  }, [showToast]);

  // Nyt vasta if (!user) ja muut returnit:
  if (!user) {
    return <Login onLogin={setUser} showToast={showToast} />;
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
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
      </div>
    );
  }

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
        {/* POISTETTU: Resepti-ideat -välilehti */}
      </nav>

      {/* Kiinnitetyt hakupalkki ja "Lisää valitut" -nappi, näkyvät vieritettäessä */}
      {/* Korjattu className fixed-controls elementille */}
      <div className={`fixed-controls ${showScrollButtons ? "visible" : ""}`}>
        {activeTab === "list" && !editingRecipeId && (
          <>
            <input
              type="text"
              placeholder="Etsi reseptejä..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input-fixed"
              aria-label="Etsi reseptejä"
            />
            <button
              onClick={() => setActiveTab("shopping")}
              className="add-selected-button-fixed"
            >
              Lisää valitut
            </button>
          </>
        )}
      </div>


      <main className="App-main">
        {editingRecipeId ? (
          <RecipeEditForm
            recipeId={editingRecipeId}
            onCloseEdit={handleCloseEdit} // Käytetään memoizoitua funktiota
            showToast={showToast} // Käytetään memoizoitua funktiota
          />
        ) : (
          <>
            {activeTab === "list" && (
              <RecipeList
                onSelectRecipes={handleSelectedRecipesChange}
                selectedRecipes={selectedRecipes}
                onEditRecipe={handleEditRecipe}
                searchTerm={searchTerm}
                showToast={showToast}
              />
            )}
            {activeTab === "form" && (
              <RecipeForm onRecipeAdded={handleRecipeAdded} showToast={showToast} /> // Käytetään memoizoitua funktiota
            )}
            {activeTab === "shopping" && (
              <ShoppingList
                selectedRecipes={allRecipes.filter(r => selectedRecipes.includes(r.id))}
              />
            )}
            {/* POISTETTU: Resepti-ideat -komponentti */}
          </>
        )}
      </main>

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
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  );
}

export default App;