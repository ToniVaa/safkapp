// src/components/ConfirmModal.js
// Tämä komponentti tarjoaa mukautetun vahvistusikkunan.

import React from 'react';

const ConfirmModal = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="modal-overlay">
        <div className="modal-content">
        <h3>Vahvista toiminto</h3>
        <p>{message}</p>
        <div className="modal-buttons">
        <button className="confirm-button" onClick={onConfirm}>Vahvista</button>
        <button className="cancel-button" onClick={onCancel}>Peruuta</button>
        </div>
        </div>
        </div>
    );
};

export default ConfirmModal;
