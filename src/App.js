import React, { useState } from 'react';
import Avatar from './components/Avatar';
import DressingModal from './components/DressingModal';

function App() {
    const [dressingOpen, setDressingOpen] = useState(false);
    const [equippedItems, setEquippedItems] = useState([]);

    const handleEquip = (item) => {
        setEquippedItems(prev => {
            return [...prev.filter(i => i.type !== item.type), item];
        });
    };

    return (
        <div>
            <Avatar equippedItems={equippedItems} onClick={() => setDressingOpen(true)} />
            <DressingModal
                isOpen={dressingOpen}
                onClose={() => setDressingOpen(false)}
                avatarItems={equippedItems}
                boutiqueItems={[]}
                onEquip={handleEquip}
            />
        </div>
    );
}

export default App;