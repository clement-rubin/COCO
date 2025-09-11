import { useState, useEffect } from 'react';
import { getUserStatsComplete } from '../utils/profileUtils';
import { 
  getActiveMissions, 
  getCompletedMissions, 
  getCurrentProgress,
  getMissionProgress 
} from '../utils/missionUtils';
import React from 'react';

export default function MissionPreview({ user, onMissionClick }) {
  const [missions, setMissions] = useState([]);
  const [completedMissions, setCompletedMissions] = useState([]);
  const [stats, setStats] = useState({
    recipesCount: 0,
    friendsCount: 0,
    likesReceived: 0
  });
  const [loading, setLoading] = useState(true);

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Charger les missions actives
        const activeMissions = getActiveMissions();
        setMissions(activeMissions);

        // Charger les missions complétées
        const completed = getCompletedMissions();
        setCompletedMissions(completed);

        // Charger les stats utilisateur
        if (user?.id) {
          const userStats = await getUserStatsComplete(user.id);
          setStats(userStats);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des missions:', error);
      }
      
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 16,
        textAlign: 'center',
        color: '#64748b'
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          ⏳ Chargement des missions...
        </div>
      </div>
    );
  }

  // Filtrer les missions non complétées pour l'aperçu
  const activeMissions = missions.filter(m => !completedMissions.includes(m.id)).slice(0, 2);

  if (activeMissions.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 16,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
          Toutes les missions terminées !
        </div>
        <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
          De nouvelles missions arrivent bientôt
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
      borderRadius: 16,
      padding: '16px',
      marginBottom: 16,
      border: '1px solid #f59e0b22'
    }}>
      {/* En-tête */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <div style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: '#92400e'
          }}>
            Missions actives
          </div>
        </div>
        
        {onMissionClick && (
          <button
            onClick={onMissionClick}
            style={{
              background: 'transparent',
              border: '1px solid #f59e0b',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#f59e0b',
              cursor: 'pointer'
            }}
          >
            Voir tout
          </button>
        )}
      </div>

      {/* Missions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: activeMissions.length === 1 ? '1fr' : 'repeat(2, 1fr)',
        gap: 12
      }}>
        {activeMissions.map(mission => {
          const progress = getCurrentProgress(mission, stats, user);
          const percent = getMissionProgress(mission, stats, user);
          
          return (
            <div key={mission.id} style={{
              background: '#fff',
              borderRadius: 12,
              padding: '12px 10px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
              border: '1px solid #f59e0b22',
              textAlign: 'center',
              cursor: onMissionClick ? 'pointer' : 'default',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
              onClick={onMissionClick}
              onMouseEnter={(e) => {
                if (onMissionClick) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (onMissionClick) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.1)';
                }
              }}
            >
              {/* Icône et badge difficulté */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{mission.icon}</span>
                <div style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  color: mission.difficulty === 'facile' ? '#10b981' : 
                         mission.difficulty === 'moyen' ? '#f59e0b' : '#ef4444',
                  background: '#fff',
                  borderRadius: 6,
                  padding: '1px 4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  {mission.difficulty === 'facile' ? '●' : 
                   mission.difficulty === 'moyen' ? '●●' : '●●●'}
                </div>
              </div>
              
              {/* Titre tronqué */}
              <div style={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#374151',
                marginBottom: 6,
                lineHeight: 1.2,
                height: '2.4rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {mission.title}
              </div>
              
              {/* Barre de progression */}
              <div style={{
                background: '#f3f4f6',
                borderRadius: 8,
                height: 6,
                marginBottom: 6,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: percent === 100 ? '#10b981' : 
                             percent > 50 ? '#f59e0b' : '#8b5cf6',
                  borderRadius: 8,
                  transition: 'width 0.5s ease'
                }} />
              </div>
              
              {/* Progrès et récompense */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  color: '#6b7280',
                  fontWeight: 600
                }}>
                  {progress}/{mission.target}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  color: '#f59e0b',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <span>🪙</span>
                  <span>{mission.reward.coins}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message d'encouragement */}
      <div style={{
        marginTop: 12,
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#92400e',
        fontWeight: 500
      }}>
        Terminez vos missions pour gagner des CocoCoins ! 🎉
      </div>
    </div>
  );
}