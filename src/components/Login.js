// filepath: /home/toni/safkapp/src/components/Login.js
import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

function Login({ onLogin }) {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      onLogin(result.user);
    } catch (error) {
      alert("Kirjautuminen epäonnistui");
    }
  };

  return (
    <div>
      <h2>Kirjaudu sisään Googlella</h2>
      <button onClick={handleLogin}>Kirjaudu Googlella</button>
    </div>
  );
}

export default Login;