import React from 'react';
import Avatar from './Avatar';

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
                    <Avatar equippedItems={avatarItems} size={180} />
                </div>
            </div>
        </div>
    );
}

export default DressingModal;
