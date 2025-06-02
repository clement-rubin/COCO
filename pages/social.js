import Head from 'next/head'
import { useState } from 'react'
import SocialFeed from '../components/SocialFeed'
import FriendsFeed from '../components/FriendsFeed'

export default function Social() {
  const [activeTab, setActiveTab] = useState('community')

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--background-light)' }}>
      <Head>
        <title>Communauté - COCO</title>
        <meta name="description" content="Découvrez les dernières créations culinaires de la communauté COCO" />
      </Head>

      {/* Navigation des onglets */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid rgba(255, 107, 53, 0.1)',
        marginBottom: 'var(--spacing-lg)',
        boxShadow: '0 2px 10px rgba(255, 107, 53, 0.05)'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          padding: '0 var(--spacing-md)'
        }}>
          <button
            onClick={() => setActiveTab('community')}
            style={{
              flex: 1,
              padding: 'var(--spacing-lg) var(--spacing-md)',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'community' ? 'var(--primary-orange)' : 'var(--text-medium)',
              borderBottom: activeTab === 'community' ? '3px solid var(--primary-orange)' : '3px solid transparent',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            🌍 Communauté
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            style={{
              flex: 1,
              padding: 'var(--spacing-lg) var(--spacing-md)',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'friends' ? 'var(--primary-orange)' : 'var(--text-medium)',
              borderBottom: activeTab === 'friends' ? '3px solid var(--primary-orange)' : '3px solid transparent',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            👥 Mes Amis
          </button>
        </div>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'community' ? <SocialFeed /> : <FriendsFeed feedType="social" />}
    </div>
  )
}
