import React, { useState } from 'react';
import NotificationTab from './components/NotificationTab';

function App() {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 1100 }}>
        <button
          onClick={() => setNotifOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 24,
          }}
          aria-label="Notifications"
        >
          <span role="img" aria-label="bell">🔔</span>
        </button>
      </div>
      <NotificationTab open={notifOpen} onClose={() => setNotifOpen(false)} />
      {/* ...existing code... */}
    </>
  );
}

export default App;