// src/App.js
import React, { useState, useEffect, useCallback } from "react";
import RecipeForm from "./components/RecipeForm";
import RecipeList from "./components/RecipeList";
import ShoppingList from "./components/ShoppingList";
import RecipeEditForm from "./components/RecipeEditForm";
import RecipeImporter from "./components/RecipeImporter"; // UUSI: Tuo RecipeImporter
import Login from "./components/Login";
import Toast from "./components/Toast";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { collection, query, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import "./styles.css"; // Olemassa oleva globaali tyylitiedosto

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
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [isLoadingAllowedEmails, setIsLoadingAllowedEmails] = useState(true);
  const [parsedRecipeForForm, setParsedRecipeForForm] = useState(null); // UUSI: Tila jäsennetylle reseptille

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast("Olet kirjautunut ulos.", "success");
    } catch (error) {
      showToast("Uloskirjautuminen epäonnistui.", "error");
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      setShowLogout(scrollY + windowHeight >= docHeight - 100);
      setShowScrollButtons(scrollY > 200 && activeTab === "list" && !editingRecipeId);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab, editingRecipeId]);

  useEffect(() => {
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

  useEffect(() => {
    const fetchAllowedEmails = async () => {
      setIsLoadingAllowedEmails(true);
      try {
        const snapshot = await getDocs(collection(db, "allowedEmails"));
        setAllowedEmails(snapshot.docs.map(doc => doc.data().email.toLowerCase()));
      } catch (error) {
        console.error("Error fetching allowed emails:", error);
        showToast("Virhe sallittujen sähköpostien haussa.", "error");
      } finally {
        setIsLoadingAllowedEmails(false);
      }
    };
    fetchAllowedEmails();
  }, [showToast]);

  const handleSelectedRecipesChange = (newSelected) => {
    setSelectedRecipes(newSelected);
  };

  const handleEditRecipe = (recipeId) => {
    setEditingRecipeId(recipeId);
    setActiveTab("list");
  };

  const handleCloseEdit = useCallback(() => {
    setEditingRecipeId(null);
    setActiveTab("list");
    showToast("Resepti päivitetty onnistuneesti!", "success");
  }, [showToast]);

  const handleRecipeAdded = useCallback(() => {
    setActiveTab("list");
    setParsedRecipeForForm(null); // Nollaa esitäytetty data, kun resepti on lisätty
    showToast("Resepti lisätty onnistuneesti!", "success");
  }, [showToast]);

  const handleRecipeParsed = useCallback((parsedData) => {
    setParsedRecipeForForm(parsedData);
    setActiveTab("form");
    setEditingRecipeId(null);
  }, []);

  const handleClearParsedData = useCallback(() => {
    setParsedRecipeForForm(null);
  }, []);


  if (!user) {
    return <Login onLogin={setUser} showToast={showToast} />;
  }

  if (isLoadingAllowedEmails) {
    return (
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <p>Tarkistetaan käyttöoikeuksia...</p>
      </div>
    );
  }

  if (user && !allowedEmails.includes(user.email.toLowerCase())) {
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
        <img
          src="/safkapp_logo.png" // Varmista, että logo on public-kansiossa
          alt="SafkApp"
          className="app-logo"
        />
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
        {/* UUSI: Tuo resepti -välilehti */}
        <button
          className={activeTab === "import" ? "active" : ""}
          onClick={() => {
            setActiveTab("import");
            setEditingRecipeId(null);
          }}
        >
          Tuo resepti
        </button>
        <button
          className={activeTab === "form" ? "active" : ""}
          onClick={() => {
            setActiveTab("form");
            setEditingRecipeId(null);
            // Jos haluat, että "Luo resepti" -nappi tyhjentää aina tuodun datan:
            // handleClearParsedData();
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
      </nav>

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
            onCloseEdit={handleCloseEdit}
            showToast={showToast}
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
            {activeTab === "import" && (
              <RecipeImporter onRecipeParsed={handleRecipeParsed} showToast={showToast} />
            )}
            {activeTab === "form" && (
              <RecipeForm
                onRecipeAdded={handleRecipeAdded}
                showToast={showToast}
                initialData={parsedRecipeForForm}
                onClearInitialData={handleClearParsedData}
              />
            )}
            {activeTab === "shopping" && (
              <ShoppingList
                selectedRecipes={allRecipes.filter(r => selectedRecipes.includes(r.id))}
              />
            )}
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