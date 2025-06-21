import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { handleAuthError } from '../utils/errorHandler'
import { createOrUpdateProfile } from '../lib/supabase'
import { supabase } from '../lib/supabaseClient'

export default function Register() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [step, setStep] = useState(1) // For multi-step registration
  
  const { signUp, user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = router.query.redirect || '/'
      router.push(redirectTo)
    }
  }, [user, router])

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      return
    }
    
    let strength = 0
    // Length check
    if (password.length >= 8) strength += 25
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 25
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 25
    // Contains number or special char
    if (/[0-9!@#$%^&*]/.test(password)) strength += 25
    
    setPasswordStrength(strength)
  }, [password])

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return ''
    if (passwordStrength <= 25) return 'Faible'
    if (passwordStrength <= 50) return 'Moyen'
    if (passwordStrength <= 75) return 'Bon'
    return 'Excellent'
  }

  const getStrengthColor = () => {
    if (passwordStrength === 0) return '#e5e7eb'
    if (passwordStrength <= 25) return '#ef4444'
    if (passwordStrength <= 50) return '#f59e0b'
    if (passwordStrength <= 75) return '#10b981'
    return '#3b82f6'
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      setLoading(false)
      return
    }

    if (displayName.length < 2 || displayName.length > 30) {
      setError('Le nom d\'utilisateur doit contenir entre 2 et 30 caractères')
      setLoading(false)
      return
    }

    try {
      // Create the user account
      const { data, error: signUpError } = await signUp(email, password)
      
      if (signUpError) {
        const errorMessage = handleAuthError(signUpError).userError || 'Une erreur est survenue lors de l\'inscription'
        setError(errorMessage)
        return
      }

      // If the user was created successfully, create a profile for them
      if (data?.user?.id) {
        const userId = data.user.id;
        
        // Format the date of birth if provided
        let formattedDOB = null;
        if (dateOfBirth) {
          formattedDOB = new Date(dateOfBirth).toISOString().split('T')[0];
        }
        
        // Create or update the user profile in the profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              user_id: userId,
              display_name: displayName,
              bio: bio || null,
              location: location || null,
              website: website || null,
              date_of_birth: formattedDOB,
              phone: phone || null,
              is_private: isPrivate,
              total_friends_count: 0,
              total_recipes_count: 0
            }
          ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't show this error to the user, just log it
          // We'll still let them continue since the user was created
        }
      }

      setSuccess(true)
      
      // Redirect to login or confirmation page
      setTimeout(() => {
        router.push('/auth/confirm?email=' + encodeURIComponent(email))
      }, 2000)
    } catch (err) {
      const errorMessage = handleAuthError(err).userError || 'Une erreur est survenue lors de l\'inscription'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <Head>
        <title>Créer un compte - COCO</title>
        <meta name="description" content="Inscrivez-vous et créez votre compte COCO" />
      </Head>

      <div className="register-container">
        <div className="left-panel">
          <div className="logo">
            <span className="emoji">🥥</span>
            <h1>COCO</h1>
          </div>
          <div className="tagline">
            <h2>Rejoignez notre communauté culinaire</h2>
            <p>Créez un compte pour partager et découvrir des recettes exceptionnelles</p>
          </div>
          <div className="features">
            <div className="feature">
              <span className="feature-icon">📝</span>
              <div>
                <h3>Partagez vos créations</h3>
                <p>Publiez vos meilleures recettes</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">❤️</span>
              <div>
                <h3>Favoris illimités</h3>
                <p>Sauvegardez vos recettes préférées</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">🔔</span>
              <div>
                <h3>Restez informé</h3>
                <p>Notifications personnalisées</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Créer un compte</h2>
              <p>Remplissez le formulaire ci-dessous pour commencer</p>
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
                <span>Compte créé avec succès! Veuillez vérifier votre email.</span>
              </div>
            )}            <form onSubmit={handleSubmit} className="register-form">
              {/* Step indicator */}
              <div className="step-indicator">
                <div className={`step ${step >= 1 ? 'active' : ''}`}>
                  <span className="step-number">1</span>
                  <span className="step-text">Compte</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${step >= 2 ? 'active' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-text">Profil</span>
                </div>
              </div>
              
              {/* Step 1: Account Information */}
              {step === 1 && (
                <>
                  <div className="form-group">                    <label htmlFor="email">Adresse email</label>
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
                    <div className="input-hint">
                      Nous vous enverrons un email de confirmation
                    </div>
                  </div>

                  <div className="form-group">                    <label htmlFor="displayName">Nom d'utilisateur</label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Votre pseudo"
                        minLength="2"
                        maxLength="30"
                      />
                    </div>
                    <div className="input-hint">
                      Entre 2 et 30 caractères
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
                        minLength="6"
                      />
                    </div>
                    {password && (
                      <div className="password-strength">
                        <div className="strength-bar">
                          <div 
                            className="strength-progress" 
                            style={{ 
                              width: `${passwordStrength}%`, 
                              backgroundColor: getStrengthColor() 
                            }}
                          ></div>
                        </div>
                        <div className="strength-label" style={{ color: getStrengthColor() }}>
                          {getStrengthLabel()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="••••••••"
                        minLength="6"
                      />
                    </div>
                    {password && confirmPassword && (
                      <div className="input-hint" style={{ color: password === confirmPassword ? '#10b981' : '#ef4444' }}>
                        {password === confirmPassword ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!email || !password || !confirmPassword || !displayName || password !== confirmPassword}
                      className={`next-button ${!email || !password || !confirmPassword || !displayName || password !== confirmPassword ? 'disabled' : ''}`}
                    >
                      Continuer
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Profile Information */}
              {step === 2 && (
                <>
                  <div className="form-group">
                    <label htmlFor="bio">Bio</label>
                    <div className="input-wrapper textarea-wrapper">
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        disabled={loading}
                        placeholder="Parlez-nous de vous..."
                        maxLength="200"
                      />
                    </div>
                    <div className="input-hint">
                      Maximum 200 caractères
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label htmlFor="location">Localisation</label>
                      <div className="input-wrapper">
                        <span className="input-icon">📍</span>
                        <input
                          id="location"
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          disabled={loading}
                          placeholder="Ville, Pays"
                        />
                      </div>
                    </div>

                    <div className="form-group half">
                      <label htmlFor="dateOfBirth">Date de naissance</label>
                      <div className="input-wrapper">
                        <span className="input-icon">🎂</span>
                        <input
                          id="dateOfBirth"
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label htmlFor="website">Site web</label>
                      <div className="input-wrapper">
                        <span className="input-icon">🌐</span>
                        <input
                          id="website"
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          disabled={loading}
                          placeholder="https://monsite.com"
                        />
                      </div>
                    </div>

                    <div className="form-group half">
                      <label htmlFor="phone">Téléphone</label>
                      <div className="input-wrapper">
                        <span className="input-icon">📱</span>
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={loading}
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <div className="checkbox-wrapper">
                      <input
                        id="isPrivate"
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        disabled={loading}
                      />
                      <label htmlFor="isPrivate">Profil privé</label>
                    </div>
                    <div className="input-hint">
                      Un profil privé ne sera visible que par vos amis
                    </div>
                  </div>

                  <div className="terms">
                    <p>
                      En créant un compte, vous acceptez nos{' '}
                      <Link href="/terms" className="terms-link">
                        Conditions d'utilisation
                      </Link>{' '}
                      et notre{' '}
                      <Link href="/privacy" className="terms-link">
                        Politique de confidentialité
                      </Link>
                    </p>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="back-button"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`submit-button ${loading ? 'disabled' : ''}`}
                    >
                      {loading ? (
                        <>
                          <span className="loading-spinner"></span>
                          Création en cours...
                        </>
                      ) : (
                        'Créer mon compte'
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="form-footer">
              <p>Déjà un compte?</p>
              <Link href="/signin" className="signin-link">
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f9fafb;
          padding: 20px;
        }

        .register-container {
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
          background: linear-gradient(135deg, #10b981, #3b82f6);
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
          overflow-y: auto;
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

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
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

        .register-form input {
          width: 100%;
          padding: 16px 16px 16px 50px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .register-form input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        
        .input-hint {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 4px;
        }

        .password-strength {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .strength-bar {
          flex: 1;
          height: 6px;
          background-color: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }

        .strength-progress {
          height: 100%;
          transition: width 0.3s, background-color 0.3s;
        }

        .strength-label {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .terms {
          font-size: 0.85rem;
          color: #6b7280;
          margin: 4px 0;
        }

        .terms-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
        }

        .terms-link:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        .submit-button {
          padding: 16px;
          background: #10b981;
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
          margin-top: 8px;
        }

        .submit-button:hover:not(.disabled) {
          background: #059669;
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
        }        .form-footer p {
          margin: 0;
          color: #6b7280;
        }

        .signin-link {
          color: #10b981;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s;
        }
        
        .textarea-wrapper {
          display: block;
          width: 100%;
        }

        .textarea-wrapper textarea {
          width: 100%;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          min-height: 100px;
          resize: vertical;
          font-family: inherit;
          transition: all 0.3s;
        }

        .textarea-wrapper textarea:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .form-row {
          display: flex;
          gap: 16px;
          width: 100%;
        }

        .form-group.half {
          flex: 1;
          min-width: 0;
        }

        .checkbox-group {
          margin-top: 12px;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .checkbox-wrapper input[type="checkbox"] {
          width: 20px;
          height: 20px;
          padding: 0;
        }
        
        .step-indicator {
          display: flex;
          align-items: center;
          margin-bottom: 32px;
          width: 100%;
        }
        
        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }
        
        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #e5e7eb;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-bottom: 8px;
          transition: all 0.3s;
        }
        
        .step.active .step-number {
          background-color: #10b981;
          color: white;
        }
        
        .step-text {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
        }
        
        .step.active .step-text {
          color: #10b981;
          font-weight: 600;
        }
        
        .step-line {
          flex: 1;
          height: 2px;
          background-color: #e5e7eb;
          margin: 0 8px;
          margin-bottom: 24px;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
        }
        
        .back-button {
          padding: 16px;
          background: #f9fafb;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          flex: 1;
        }
        
        .back-button:hover {
          background: #f3f4f6;
        }
        
        .next-button, .submit-button {
          padding: 16px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          flex: 2;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .next-button:hover:not(.disabled), .submit-button:hover:not(.disabled) {
          background: #059669;
        }
        
        .next-button.disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .signin-link:hover {
          color: #059669;
          text-decoration: underline;
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

        /* Responsive adjustments */
        @media (max-width: 900px) {
          .register-container {
            flex-direction: column;
          }

          .left-panel {
            padding: 40px 20px;
          }

          .features {
            margin-top: 40px;
          }
        }
      `}</style>
    </div>
  )
}