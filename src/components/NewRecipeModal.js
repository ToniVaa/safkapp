// src/components/NewRecipeModal.js
import React from 'react';

const NewRecipeModal = ({ onImport, onCreate, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Uusi resepti</h3>
        <p style={{ marginBottom: '25px' }}>Haluatko tuoda reseptin tekstistä vai luoda uuden tyhjästä?</p>
        <div className="modal-buttons new-recipe-options">
          <button className="action-button-primary" onClick={onImport}>
            Tuo tekstimuodossa
          </button>
          <button className="action-button-primary" onClick={onCreate}>
            Luo uusi
          </button>
          <button className="cancel-button" onClick={onCancel}>
            Peruuta
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewRecipeModal;