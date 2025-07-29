import React from 'react';

function DressingModal({ isOpen, onClose, avatarItems, boutiqueItems, onEquip }) {
    if (!isOpen) return null;
    return (
        <div className="dressing-modal">
            <button onClick={onClose}>Fermer</button>
            <div className="dressing-content">
                <div className="boutique-items">
                    {boutiqueItems.map(item => (
                        <div key={item.id} onClick={() => onEquip(item)}>
                            {/* ...affichage de l'item... */}
                        </div>
                    ))}
                </div>
                <div className="avatar-preview">
                    {/* ...affichage de l'avatar avec avatarItems... */}
                </div>
            </div>
        </div>
    );
}

export default DressingModal;
