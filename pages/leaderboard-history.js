import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'
import styles from '../styles/Layout.module.css'

export default function LeaderboardHistory() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [monthlyLeaderboards, setMonthlyLeaderboards] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/presentation')
      return
    }
    
    if (user) {
      loadLeaderboardHistory()
    }
  }, [user, loading, router])

  const loadLeaderboardHistory = async () => {
    setHistoryLoading(true)
    try {
      const { data, error } = await supabase
        .from('monthly_leaderboards')
        .select('*')
        .order('month', { ascending: false })
        .limit(12) // Derniers 12 mois
      
      if (error) {
        console.error('Erreur lors du chargement de l\'historique:', error)
        return
      }
      
      setMonthlyLeaderboards(data || [])
      
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const getSeasonLabel = (monthStr) => {
    const [year, month] = monthStr.split('-')
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const getSeasonEmoji = (monthStr) => {
    const month = parseInt(monthStr.split('-')[1])
    if (month >= 3 && month <= 5) return '🌸' // Printemps
    if (month >= 6 && month <= 8) return '☀️' // Été
    if (month >= 9 && month <= 11) return '🍂' // Automne
    return '❄️' // Hiver
  }

  if (loading || historyLoading) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '20px' }}>📚</div>
            <p>Chargement de l'historique des classements...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Historique des Classements - COCO</title>
        <meta name="description" content="Consultez l'historique des classements mensuels COCO" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* En-tête */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <button
              onClick={() => router.back()}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '1.5rem',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              ← Retour
            </button>
            
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#1f2937',
              marginBottom: '10px'
            }}>
              📚 Historique des Classements
            </h1>
            
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              marginBottom: '20px'
            }}>
              Revivez les saisons passées de la communauté COCO
            </p>
          </div>

          {monthlyLeaderboards.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#f9fafb',
              borderRadius: '16px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏆</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                Pas encore d'historique
              </h3>
              <p>Les classements mensuels apparaîtront ici à la fin de chaque mois.</p>
            </div>
          ) : (
            <div>
              {/* Liste des mois */}
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '15px'
                }}>
                  Sélectionnez une saison
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  {monthlyLeaderboards.map((leaderboard) => (
                    <button
                      key={leaderboard.id}
                      onClick={() => setSelectedMonth(selectedMonth === leaderboard.month ? null : leaderboard.month)}
                      style={{
                        background: selectedMonth === leaderboard.month 
                          ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                          : '#fff',
                        color: selectedMonth === leaderboard.month ? 'white' : '#374151',
                        border: selectedMonth === leaderboard.month ? 'none' : '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textAlign: 'left',
                        boxShadow: selectedMonth === leaderboard.month 
                          ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                          : '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '1.5rem' }}>
                          {getSeasonEmoji(leaderboard.month)}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>
                          {getSeasonLabel(leaderboard.month)}
                        </span>
                      </div>
                      
                      <div style={{
                        fontSize: '0.8rem',
                        opacity: 0.8
                      }}>
                        {leaderboard.leaderboard_data?.length || 0} participants
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Détails du mois sélectionné */}
              {selectedMonth && (
                <div style={{
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    {getSeasonEmoji(selectedMonth)}
                    Classement de {getSeasonLabel(selectedMonth)}
                  </h3>
                  
                  {(() => {
                    const leaderboard = monthlyLeaderboards.find(l => l.month === selectedMonth)
                    const data = leaderboard?.leaderboard_data || []
                    
                    return (
                      <div>
                        {/* Podium */}
                        {data.length >= 3 && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                            gap: '12px',
                            marginBottom: '30px',
                            perspective: '300px'
                          }}>
                            {data.slice(0, 3).map((user, idx) => {
                              const position = idx === 0 ? 1 : idx === 1 ? 2 : 3
                              const height = position === 1 ? 80 : position === 2 ? 65 : 55
                              const colors = {
                                1: { bg: '#fbbf24', border: '#f59e0b' },
                                2: { bg: '#e5e7eb', border: '#9ca3af' },
                                3: { bg: '#f59e0b', border: '#d97706' }
                              }

                              return (
                                <div
                                  key={user.user_id}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    order: position === 1 ? 2 : position === 2 ? 1 : 3
                                  }}
                                >
                                  <div style={{
                                    background: colors[position].bg,
                                    width: position === 1 ? 70 : 60,
                                    height,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    border: `2px solid ${colors[position].border}`,
                                    position: 'relative'
                                  }}>
                                    <div style={{ fontSize: position === 1 ? '1.8rem' : '1.5rem' }}>
                                      {position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}
                                    </div>
                                    
                                    {user.avatar_url ? (
                                      <img 
                                        src={user.avatar_url} 
                                        alt="" 
                                        style={{
                                          width: 24, 
                                          height: 24, 
                                          borderRadius: '50%',
                                          border: `2px solid ${colors[position].border}`,
                                          position: 'absolute',
                                          bottom: -6
                                        }} 
                                      />
                                    ) : (
                                      <div style={{
                                        width: 24,
                                        height: 24,
                                        background: colors[position].border,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        color: 'white',
                                        fontWeight: 700,
                                        position: 'absolute',
                                        bottom: -6
                                      }}>
                                        {user.display_name?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div style={{ 
                                    fontSize: '0.8rem', 
                                    fontWeight: 700, 
                                    color: '#1f2937',
                                    textAlign: 'center',
                                    maxWidth: 80,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {user.display_name}
                                  </div>
                                  
                                  <div style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#6b7280',
                                    fontWeight: 600
                                  }}>
                                    {user.recipesCount} recettes
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        
                        {/* Liste complète */}
                        <div>
                          <h4 style={{
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '15px'
                          }}>
                            Classement complet
                          </h4>
                          
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {data.map((user, idx) => (
                              <div
                                key={user.user_id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '12px',
                                  background: idx < 3 ? '#f8fafc' : '#fff',
                                  borderRadius: '8px',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                <div style={{
                                  width: '24px',
                                  textAlign: 'center',
                                  fontWeight: '700',
                                  color: idx < 3 ? '#f59e0b' : '#6b7280'
                                }}>
                                  {idx + 1}
                                </div>
                                
                                {user.avatar_url ? (
                                  <img 
                                    src={user.avatar_url} 
                                    alt="" 
                                    style={{
                                      width: 32, 
                                      height: 32, 
                                      borderRadius: '50%',
                                      border: '1px solid #e5e7eb'
                                    }} 
                                  />
                                ) : (
                                  <div style={{
                                    width: 32,
                                    height: 32,
                                    background: '#f3f4f6',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    color: '#6b7280',
                                    fontWeight: 700
                                  }}>
                                    {user.display_name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                                
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                    {user.display_name}
                                  </div>
                                </div>
                                
                                <div style={{
                                  fontWeight: '700',
                                  color: '#10b981',
                                  fontSize: '1rem'
                                }}>
                                  {user.recipesCount}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
