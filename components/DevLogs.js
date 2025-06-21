import { useRef, useState } from 'react';

export default function DevLogs({ logEntries, showDevLogs, toggleDevLogs, clearLogs }) {
  const logContainerRef = useRef(null);

  return (
    <>
      {/* Developer Logs Panel */}
      {showDevLogs && (
        <div className="dev-logs-panel">
          <div className="dev-logs-header">
            <h3>Developer Logs</h3>
            <div className="dev-logs-actions">
              <button onClick={clearLogs} className="dev-log-btn clear">
                Clear Logs
              </button>
              <button onClick={toggleDevLogs} className="dev-log-btn close">
                Close
              </button>
            </div>
          </div>
          
          <div className="dev-logs-content" ref={logContainerRef}>
            {logEntries.length === 0 ? (
              <div className="dev-logs-empty">
                No logs yet. Interact with the page to generate logs.
              </div>
            ) : (
              logEntries.map((entry) => (
                <div key={entry.id} className={`dev-log-entry ${entry.level}`}>
                  <div className="dev-log-entry-header">
                    <span className="dev-log-level">{entry.level.toUpperCase()}</span>
                    <span className="dev-log-timestamp">{entry.timestamp}</span>
                  </div>
                  <div className="dev-log-message">{entry.message}</div>
                  {entry.data && entry.data !== '{}' && (
                    <pre className="dev-log-data">{entry.data}</pre>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="dev-logs-footer">
            <div className="dev-logs-info">
              <span>Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> to toggle</span>
              <span>Total Logs: {logEntries.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Dev Logs Toggle Button */}
      <button 
        onClick={toggleDevLogs} 
        className="dev-logs-toggle"
        title="Toggle Developer Logs (Ctrl+Shift+D)"
      >
        {showDevLogs ? '🔍' : '🐞'}
      </button>

      <style jsx>{`
        .dev-logs-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #333;
          color: white;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          transition: all 0.3s;
        }
        
        .dev-logs-toggle:hover {
          transform: scale(1.1);
          background: #444;
        }
        
        .dev-logs-panel {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 500px;
          max-width: calc(100vw - 40px);
          height: 600px;
          max-height: calc(100vh - 120px);
          background: rgba(30, 30, 30, 0.9);
          color: #f0f0f0;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          z-index: 999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          backdrop-filter: blur(10px);
          font-family: 'Courier New', monospace;
        }
        
        .dev-logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(40, 40, 40, 0.95);
          border-bottom: 1px solid #444;
        }
        
        .dev-logs-header h3 {
          margin: 0;
          color: #f0f0f0;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .dev-logs-actions {
          display: flex;
          gap: 8px;
        }
        
        .dev-log-btn {
          background: #444;
          border: none;
          color: #f0f0f0;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .dev-log-btn:hover {
          background: #555;
        }
        
        .dev-log-btn.clear {
          background: #4f46e5;
        }
        
        .dev-log-btn.clear:hover {
          background: #6366f1;
        }
        
        .dev-log-btn.close {
          background: #444;
        }
        
        .dev-log-btn.close:hover {
          background: #555;
        }
        
        .dev-logs-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
          background: rgba(20, 20, 20, 0.8);
        }
        
        .dev-logs-empty {
          color: #888;
          text-align: center;
          padding: 24px;
          font-style: italic;
          font-size: 0.9rem;
        }
        
        .dev-log-entry {
          padding: 8px 16px;
          border-bottom: 1px solid rgba(80, 80, 80, 0.3);
          font-size: 0.85rem;
        }
        
        .dev-log-entry:last-child {
          border-bottom: none;
        }
        
        .dev-log-entry.debug {
          color: #999;
        }
        
        .dev-log-entry.info {
          color: #63b3ed;
        }
        
        .dev-log-entry.success {
          color: #68d391;
        }
        
        .dev-log-entry.warning {
          color: #f6ad55;
        }
        
        .dev-log-entry.error {
          color: #fc8181;
        }
        
        .dev-log-entry-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 0.75rem;
        }
        
        .dev-log-level {
          font-weight: bold;
          color: white;
        }
        
        .dev-log-timestamp {
          opacity: 0.7;
        }
        
        .dev-log-message {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .dev-log-data {
          background: rgba(40, 40, 40, 0.8);
          padding: 8px;
          border-radius: 4px;
          margin: 4px 0 0;
          font-size: 0.8rem;
          white-space: pre-wrap;
          overflow-x: auto;
          color: #a3cbfa;
        }
        
        .dev-logs-footer {
          padding: 8px 16px;
          background: rgba(40, 40, 40, 0.95);
          border-top: 1px solid #444;
          font-size: 0.75rem;
        }
        
        .dev-logs-info {
          display: flex;
          justify-content: space-between;
          color: #888;
        }
        
        .dev-logs-info kbd {
          background: #444;
          padding: 1px 4px;
          border-radius: 3px;
          color: white;
          font-size: 0.7rem;
        }
      `}</style>
    </>
  );
}