import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function About() {
  const router = useRouter()

  const teamMembers = [
    {
      name: 'L\'équipe COCO',
      role: 'Passionnés de cuisine et technologie',
      description: 'Nous croyons que la cuisine est un langage universel qui rapproche les gens.',
      avatar: '👥'
    }
  ]

  const values = [
    {
      icon: '🤝',
      title: 'Communauté bienveillante',
      description: 'Nous favorisons les échanges respectueux et l\'entraide entre cuisiniers de tous niveaux.'
    },
    {
      icon: '🌱',
      title: 'Apprentissage continu',
      description: 'Chaque partage est une opportunité d\'apprendre et de progresser en cuisine.'
    },
    {
      icon: '🎨',
      title: 'Créativité culinaire',
      description: 'Nous encourageons l\'innovation et l\'expression personnelle à travers la cuisine.'
    },
    {
      icon: '🌍',
      title: 'Diversité culturelle',
      description: 'Nous célébrons la richesse des traditions culinaires du monde entier.'
    }
  ]

  return (
    <div style={{
      background: 'linear-gradient(180deg, #fff5f0 0%, #ffffff 40%)',
      minHeight: '100vh'
    }}>
      <Head>
        <title>À propos de COCO - Notre histoire et mission</title>
        <meta name="description" content="Découvrez l'histoire de COCO, notre mission et l'équipe derrière la communauté culinaire française." />
      </Head>

      {/* Header simple */}
      <div style={{
        padding: '20px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)'
      }}>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          color: 'inherit'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem'
          }}>
            🥥
          </div>
          <span style={{
            fontSize: '1.6rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            COCO
          </span>
        </Link>
      </div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Hero section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            margin: '0 0 20px 0',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            À propos de COCO
          </h1>
          <p style={{
            fontSize: '1.3rem',
            color: '#6b7280',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            COCO est née de l'idée simple que la cuisine rapproche les gens. 
            Nous créons des ponts entre les cuisiniers du monde entier.
          </p>
        </div>

        {/* Notre histoire */}
        <section style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '40px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            📖 Notre histoire
          </h2>
          <div style={{
            fontSize: '1.1rem',
            lineHeight: '1.7',
            color: '#374151'
          }}>
            <p style={{ marginBottom: '20px' }}>
              COCO est née en 2024 d'une passion commune pour la cuisine et le partage. 
              Nous avons observé que malgré l'abondance de recettes en ligne, il manquait 
              un véritable espace communautaire où les cuisiniers pouvaient échanger, 
              s'entraider et progresser ensemble.
            </p>
            <p style={{ marginBottom: '20px' }}>
              Notre vision était simple : créer une plateforme où chaque recette partagée 
              serait une invitation à la découverte, où chaque commentaire serait 
              constructif, et où chaque utilisateur se sentirait partie d'une grande 
              famille culinaire.
            </p>
            <p style={{ margin: 0 }}>
              Aujourd'hui, COCO rassemble des milliers de passionnés qui partagent 
              non seulement leurs recettes, mais aussi leurs histoires, leurs échecs, 
              leurs réussites et leur amour de la cuisine.
            </p>
          </div>
        </section>

        {/* Notre mission */}
        <section style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '40px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🎯 Notre mission
          </h2>
          <div style={{
            fontSize: '1.1rem',
            lineHeight: '1.7',
            color: '#374151'
          }}>
            <p style={{ marginBottom: '20px' }}>
              Démocratiser l'art culinaire en créant une communauté inclusive où 
              chacun peut apprendre, partager et progresser à son rythme.
            </p>
            <ul style={{
              paddingLeft: '20px',
              margin: 0
            }}>
              <li style={{ marginBottom: '12px' }}>
                <strong>Inspirer</strong> en présentant la diversité culinaire mondiale
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Connecter</strong> les cuisiniers autour de leur passion commune
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong>Accompagner</strong> dans l'apprentissage et la progression
              </li>
              <li>
                <strong>Célébrer</strong> chaque succès, petit ou grand
              </li>
            </ul>
          </div>
        </section>

        {/* Nos valeurs */}
        <section style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '40px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            💎 Nos valeurs
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
          }}>
            {values.map((value, index) => (
              <div
                key={index}
                style={{
                  padding: '24px',
                  background: 'rgba(255, 107, 53, 0.05)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 107, 53, 0.1)',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  fontSize: '2.5rem',
                  marginBottom: '16px'
                }}>
                  {value.icon}
                </div>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  {value.title}
                </h3>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#6b7280',
                  lineHeight: '1.5',
                  margin: 0
                }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* L'équipe */}
        <section style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '40px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            👨‍🍳 L'équipe
          </h2>
          {teamMembers.map((member, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '24px',
                background: 'rgba(248, 250, 252, 0.8)',
                borderRadius: '16px'
              }}
            >
              <div style={{
                fontSize: '3rem',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {member.avatar}
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 8px 0'
                }}>
                  {member.name}
                </h3>
                <p style={{
                  fontSize: '1rem',
                  color: '#ff6b35',
                  fontWeight: '600',
                  margin: '0 0 12px 0'
                }}>
                  {member.role}
                </p>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#6b7280',
                  lineHeight: '1.5',
                  margin: 0
                }}>
                  {member.description}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Statistiques */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(247, 147, 30, 0.1))',
          borderRadius: '24px',
          padding: '40px',
          marginBottom: '40px',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '32px'
          }}>
            📊 COCO en chiffres
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '32px'
          }}>
            {[
              { number: '15K+', label: 'Recettes partagées', icon: '📝' },
              { number: '7K+', label: 'Cuisiniers actifs', icon: '👥' },
              { number: '80K+', label: 'Photos de plats', icon: '📸' },
              { number: '2K+', label: 'Défis relevés', icon: '🏆' }
            ].map((stat, index) => (
              <div key={index}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                  {stat.icon}
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: '#ff6b35',
                  marginBottom: '4px'
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rejoindre */}
        <section style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 16px 0'
          }}>
            Prêt à nous rejoindre ?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: '#6b7280',
            margin: '0 0 32px 0',
            lineHeight: '1.6'
          }}>
            Faites partie de cette belle aventure culinaire et découvrez 
            tout ce que COCO peut vous apporter.
          </p>
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => router.push('/signup')}
              style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)'
              }}
            >
              🎉 Rejoindre COCO
            </button>
            <button
              onClick={() => router.push('/presentation')}
              style={{
                background: 'transparent',
                color: '#ff6b35',
                border: '2px solid #ff6b35',
                padding: '16px 32px',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ff6b35'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#ff6b35'
              }}
            >
              Retour à la présentation
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
