import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { handleAuthError } from '../utils/errorHandler'
import { createOrUpdateProfile } from '../lib/supabase'
import { supabase } from '../lib/supabaseClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [showDevLogs, setShowDevLogs] = useState(false)
  const [logEntries, setLogEntries] = useState([])
  const logContainerRef = useRef(null)
  
  const { signIn, user } = useAuth()
  const router = useRouter()

  // Add log entry to state
  const addLogEntry = (level, message, data = {}) => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
      id: Date.now(),
      level,
      timestamp,
      message,
      data: JSON.stringify(data, null, 2)
    };
    
    setLogEntries(prev => [...prev, entry]);
    
    // Scroll to bottom of log container
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 10);
    
    // Also log to console with colors
    const colors = {
      debug: '#6b7280',
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    
    console.log(
      `%c[${timestamp}] ${level.toUpperCase()}:%c ${message}`,
      `color: ${colors[level]}; font-weight: bold;`,
      'color: inherit;',
      data
    );
  };
  
  // Debug log function
  const debug = (message, data) => addLogEntry('debug', message, data);
  
  // Info log function
  const info = (message, data) => addLogEntry('info', message, data);
    // Success log function
  const logSuccess = (message, data) => addLogEntry('success', message, data);
  
  // Warning log function
  const warn = (message, data) => addLogEntry('warning', message, data);
  
  // Error log function
  const logError = (message, data) => addLogEntry('error', message, data);

  // Toggle dev logs panel
  const toggleDevLogs = () => {
    debug('Developer logs toggled', { state: !showDevLogs });
    setShowDevLogs(!showDevLogs);
  };
  
  // Clear logs
  const clearLogs = () => {
    debug('Logs cleared');
    setLogEntries([]);
  };

  // Log initial render
  useEffect(() => {
    info('Sign-in page initialized', { 
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      referrer: document.referrer,
      url: window.location.href,
      query: router.query
    });
    
    // Check for redirect parameter
    if (router.query.redirect) {
      info('Redirect parameter detected', { redirectTo: router.query.redirect });
    }
    
    // Check authentication state
    const authState = user ? 'authenticated' : 'unauthenticated';
    info('Initial auth state', { state: authState, user: user?.id || null });
    
    // Add Ctrl+Shift+D keyboard shortcut to toggle dev logs
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDevLogs();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = router.query.redirect || '/'
      info('User already authenticated, redirecting', { 
        userId: user.id,
        redirectTo: redirectTo 
      });
      router.push(redirectTo)
    }
  }, [user, router])
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    debug('Sign-in attempt started', { email, passwordLength: password.length });
    
    // Create a performance marker for timing the authentication process
    const authStartTime = performance.now();

    try {
      info('Authentication attempt', { 
        email, 
        timestamp: new Date().toISOString(),
        network: {
          onLine: navigator.onLine,
          connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          } : 'not available'
        }
      });
      
      const { data, error: signInError } = await signIn(email, password)
      
      if (signInError) {
        const handledError = handleAuthError(signInError);
        const errorMessage = handledError.userError || 'Une erreur est survenue lors de la connexion';
        
        logError('Authentication failed', { 
          email,
          errorCode: signInError.code || 'unknown',
          errorMessage: signInError.message,
          errorDetails: handledError,
          timestamp: new Date().toISOString()
        });
        
        setError(errorMessage);
        return;
      }

      // Success log
      const authDuration = performance.now() - authStartTime;
      
      logSuccess('Authentication successful', { 
        email, 
        userId: data?.user?.id,
        authDuration: `${authDuration.toFixed(2)}ms`,
        authMethod: 'email',
        timestamp: new Date().toISOString()
      });

      // Create or update profile if needed
      if (data?.user?.id) {
        debug('Updating user profile', { 
          userId: data.user.id,
          email: data.user.email
        });
        
        try {
          await createOrUpdateProfile(data.user.id, {
            email: data.user.email,
            displayName: data.user.email.split('@')[0]
          });
          
          logSuccess('Profile updated successfully', {
            userId: data.user.id,
            profileFields: ['email', 'displayName']
          });
          
          // Check if profile exists in profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
            
          if (profileError) {
            warn('Could not fetch user profile', { 
              error: profileError,
              userId: data.user.id
            });
          } else {
            info('User profile data', { 
              profile: profileData,
              userId: data.user.id
            });
          }
          
        } catch (profileErr) {
          warn('Error updating profile', { 
            error: profileErr,
            userId: data.user.id
          });
        }
      }

      setSuccess(true)
      
      // Redirect after successful login
      const redirectTo = router.query.redirect || '/';
      
      info('Redirecting after successful login', { 
        userId: data?.user?.id,
        redirectTo,
        delay: '1000ms'
      });
      
      setTimeout(() => {
        router.push(redirectTo);
      }, 1000);
      
    } catch (err) {
      const handledError = handleAuthError(err);
      const errorMessage = handledError.userError || 'Une erreur est survenue lors de la connexion';
      
      logError('Unexpected authentication error', { 
        email,
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
        handledError,
        timestamp: new Date().toISOString()
      });
      
      setError(errorMessage);
    } finally {
      const totalDuration = performance.now() - authStartTime;
      debug('Sign-in process completed', {
        email,
        success: !error,
        duration: `${totalDuration.toFixed(2)}ms`
      });
      
      setLoading(false);
    }
  }

  return (
    <div className="signin-page">
      <Head>
        <title>Connexion Alternative - COCO</title>
        <meta name="description" content="Connectez-vous à votre compte COCO" />
      </Head>

      <div className="signin-container">
        <div className="left-panel">
          <div className="logo">
            <span className="emoji">🥥</span>
            <h1>COCO</h1>
          </div>
          <div className="tagline">
            <h2>Partagez vos recettes préférées</h2>
            <p>Rejoignez notre communauté et découvrez des milliers de recettes</p>
          </div>
          <div className="features">
            <div className="feature">
              <span className="feature-icon">🍽️</span>
              <div>
                <h3>Recettes Illimitées</h3>
                <p>Accédez à des milliers de recettes</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">👥</span>
              <div>
                <h3>Communauté</h3>
                <p>Partagez avec vos amis</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">📱</span>
              <div>
                <h3>Interface Simple</h3>
                <p>Facile à utiliser partout</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Connexion</h2>
              <p>Entrez vos identifiants pour accéder à votre compte</p>
            </div>

            {error && (
              <div className="error-alert">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="success-alert">
                <span className="alert-icon">✅</span>
                <span>Connexion réussie ! Redirection...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="signin-form">
              <div className="form-group">
                <label htmlFor="email">Adresse email</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Mot de passe</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="password-options">
                <Link href="/forgot-password" className="forgot-link">
                  Mot de passe oublié?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className={`submit-button ${loading || !email || !password ? 'disabled' : ''}`}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <div className="form-footer">
              <p>Pas encore de compte?</p>
              <Link href="/signup" className="signup-link">
                Créer un compte
              </Link>
            </div>

            <div className="alt-login">
              <p>Ou connectez-vous avec</p>
              <div className="alt-login-methods">
                <Link href="/login" className="alt-method">
                  Page de connexion classique
                </Link>
              </div>
            </div>
          </div>
        </div>      </div>

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

      {/* Dev Logs Toggle Button - Always visible */}
      <button 
        onClick={toggleDevLogs} 
        className="dev-logs-toggle"
        title="Toggle Developer Logs (Ctrl+Shift+D)"
      >
        {showDevLogs ? '🔍' : '🐞'}
      </button>

      <style jsx>{`
        .signin-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f9fafb;
          padding: 20px;
        }

        .signin-container {
          display: flex;
          width: 100%;
          max-width: 1200px;
          min-height: 600px;
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .left-panel {
          flex: 1;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
        }

        .logo {
          display: flex;
          align-items: center;
          margin-bottom: 40px;
        }

        .emoji {
          font-size: 3rem;
          margin-right: 12px;
        }

        .logo h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0;
        }

        .tagline {
          margin-bottom: 60px;
        }

        .tagline h2 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 16px 0;
        }

        .tagline p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0;
          line-height: 1.5;
        }

        .features {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .feature-icon {
          font-size: 1.8rem;
          background: rgba(255, 255, 255, 0.2);
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .feature h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
        }

        .feature p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .right-panel {
          flex: 1;
          padding: 60px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-container {
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .form-header h2 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          color: #111827;
        }

        .form-header p {
          margin: 0;
          color: #6b7280;
        }

        .signin-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #374151;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
        }

        .signin-form input {
          width: 100%;
          padding: 16px 16px 16px 50px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .signin-form input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .password-options {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
          margin-bottom: 8px;
        }

        .forgot-link {
          color: #6366f1;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.3s;
        }

        .forgot-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        .submit-button {
          padding: 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .submit-button:hover:not(.disabled) {
          background: #4f46e5;
        }

        .submit-button.disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .form-footer {
          margin-top: 32px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .form-footer p {
          margin: 0;
          color: #6b7280;
        }

        .signup-link {
          color: #6366f1;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s;
        }

        .signup-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        .alt-login {
          margin-top: 32px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          padding-top: 24px;
        }

        .alt-login p {
          margin: 0 0 16px 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .alt-login-methods {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .alt-method {
          padding: 12px 20px;
          background: #f3f4f6;
          border-radius: 8px;
          color: #374151;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .alt-method:hover {
          background: #e5e7eb;
        }

        .error-alert, .success-alert {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          gap: 12px;
        }

        .error-alert {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .success-alert {
          background-color: #d1fae5;
          color: #065f46;
        }

        .alert-icon {
          font-size: 1.2rem;
        }

        .close-button {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          color: currentColor;
        }

        /* Responsive adjustments */        @media (max-width: 900px) {
          .signin-container {
            flex-direction: column;
          }

          .left-panel {
            padding: 40px 20px;
          }

          .features {
            margin-top: 40px;
          }
        }
        
        /* Developer Logs Panel Styles */
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
    </div>
  )
}