import React, { useState } from 'react';

function Avatar({ equippedItems, onClick }) {
    // ...existing code...
    return (
        <div onClick={onClick} style={{ cursor: 'pointer' }}>
            {/* ...affichage de l'avatar avec ses items... */}
        </div>
    );
}

export default Avatar;