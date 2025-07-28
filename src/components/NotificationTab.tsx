import React from 'react';

interface NotificationTabProps {
  open: boolean;
  onClose: () => void;
}

const NotificationTab: React.FC<NotificationTabProps> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 300,
        height: '100%',
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <button onClick={onClose} style={{ float: 'right' }}>Fermer</button>
      <h3>Notifications</h3>
      <ul>
        <li>Aucune notification pour le moment.</li>
      </ul>
    </div>
  );
};

export default NotificationTab;
