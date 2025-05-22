// filepath: /home/toni/safkapp/src/components/Login.js
import React from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login({ onLogin, showToast }) {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
      showToast("Kirjautuminen onnistui!", "success"); // Toast-ilmoitus
    } catch (error) {
      console.error("Kirjautuminen epäonnistui:", error);
      showToast("Kirjautuminen epäonnistui. Yritä uudelleen.", "error"); // Toast-ilmoitus
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    showToast("Olet kirjautunut ulos.", "success"); // Toast-ilmoitus
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f0f0",
      position: "relative"
    }}>
      <div style={{
        background: "#fff",
        padding: "2rem 2.5rem",
        borderRadius: "12px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "bold",
          marginBottom: "1.5rem",
          color: "#e44d26",
          letterSpacing: "2px"
        }}>
          SafkApp
        </h1>
        <h2 style={{ marginBottom: "1.5rem", color: "#4285F4" }}>Kirjaudu sisään</h2>
        <button
          onClick={handleLogin}
          style={{
            background: "#4285F4",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "0.75rem 2rem",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(66,133,244,0.15)"
          }}
        >
          Kirjaudu Googlella
        </button>
      </div>
      <button
        onClick={handleLogout}
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "none",
          border: "none",
          color: "#bbb",
          fontSize: "0.95rem",
          opacity: 0.5,
          cursor: "pointer",
          textDecoration: "underline"
        }}
      >
        Kirjaudu ulos
      </button>
    </div>
  );
}

export default Login;