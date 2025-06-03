import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { value: '1,234', label: 'Recettes', icon: '📝' },
    { value: '5,678', label: 'Chefs', icon: '👨‍🍳' },
    { value: '98%', label: 'Satisfaction', icon: '⭐' },
    { value: '24/7', label: 'Disponible', icon: '🌍' }
  ];

  const features = [
    {
      icon: '🎯',
      title: 'Feed Personnalisé',
      description: 'Des recettes adaptées à vos goûts grâce à notre IA'
    },
    {
      icon: '📱',
      title: 'Mobile-first',
      description: 'Interface optimisée pour cuisiner avec votre téléphone'
    },
    {
      icon: '⚡',
      title: 'Ultra-rapide',
      description: 'Trouvez votre recette parfaite en quelques secondes'
    },
    {
      icon: '🤝',
      title: 'Communauté',
      description: 'Partagez et inspirez-vous mutuellement'
    }
  ];

  const testimonials = [
    {
      name: "Sophie M.",
      role: "Chef amateur",
      text: "COCO a complètement transformé ma façon de cuisiner. Les recettes personnalisées sont un vrai game-changer !",
      avatar: "/images/avatar-1.png"
    },
    {
      name: "Thomas L.",
      role: "Père de famille",
      text: "Fini le casse-tête du 'Qu'est-ce qu'on mange ce soir ?'. COCO me suggère des idées parfaites en fonction de ce que j'ai dans mon frigo.",
      avatar: "/images/avatar-2.png"
    },
    {
      name: "Émilie P.",
      role: "Nutritionniste",
      text: "Je recommande COCO à tous mes patients. L'application propose des recettes équilibrées qui correspondent à leurs besoins.",
      avatar: "/images/avatar-3.png"
    }
  ];

  return (
    <>
      <Head>
        <title>COCO - L'app qui transforme votre cuisine</title>
        <meta name="description" content="Découvrez des recettes personnalisées et rejoignez la communauté COCO pour révolutionner votre façon de cuisiner" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        {/* Header simple */}
        <header className={styles.header}>
          <div className={styles.title}>
            <h1>COCO</h1>
            <p className={styles.subtitle}>L'app qui transforme votre cuisine</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/feed" className={styles.actionButton}>
              Explorer
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <span className={styles.badge}>Nouveau ✨ Rejoignez +10k chefs passionnés</span>
            
            <h1 className={styles.heroTitle}>
              Des recettes
              <span className={styles.highlightText}>qui vous ressemblent</span>
            </h1>
            
            <p className={styles.heroDescription}>
              COCO révolutionne votre façon de cuisiner avec un feed personnalisé,
              des recettes exclusives et une communauté passionnée.
            </p>
            
            <div className={styles.actionButtons}>
              <Link href="/feed" className={styles.primaryButton}>
                <span className={styles.buttonIcon}>🚀</span>
                <span>Explorer maintenant</span>
              </Link>
              <Link href="/recipes" className={styles.secondaryButton}>
                <span className={styles.buttonIcon}>📖</span>
                <span>Voir les recettes</span>
              </Link>
            </div>
            
            <div className={styles.statsContainer}>
              {stats.map((stat) => (
                <div key={stat.label} className={styles.statItem}>
                  <div className={styles.statIcon}>{stat.icon}</div>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.heroImageContainer}>
            <div className={styles.phoneContainer}>
              <div className={styles.phoneMockup}>
                <div className={styles.phoneStatusBar}>
                  <span>9:41</span>
                  <div className={styles.phoneIcons}>
                    <div className={styles.signalIcon}></div>
                    <div className={styles.batteryIcon}></div>
                  </div>
                </div>
                
                <div className={styles.phoneContent}>
                  <div className={styles.recipeHeader}>
                    <div className={styles.chefInfo}>
                      <div className={styles.chefAvatar}>👨‍🍳</div>
                      <div>
                        <div className={styles.chefName}>Chef Pierre</div>
                        <div className={styles.chefFollowers}>2.3k followers</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.recipeInfo}>
                    <h3 className={styles.recipeName}>Pasta Carbonara</h3>
                    <p className={styles.recipeDescription}>
                      Recette authentique italienne en 15 minutes
                    </p>
                    <div className={styles.recipeBadges}>
                      <span className={styles.badge}>⏱️ 15min</span>
                      <span className={styles.badge}>🔥 Facile</span>
                    </div>
                  </div>
                  
                  <div className={styles.recipeActions}>
                    <div className={styles.actionItem}>
                      <div className={styles.actionIcon}>❤️</div>
                      <div className={styles.actionCount}>1.2k</div>
                    </div>
                    <div className={styles.actionItem}>
                      <div className={styles.actionIcon}>💬</div>
                      <div className={styles.actionCount}>89</div>
                    </div>
                    <div className={styles.actionItem}>
                      <div className={styles.actionIcon}>⭐</div>
                      <div className={styles.actionCount}>Save</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.featuresSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.badge}>Fonctionnalités ✨</span>
            <h2 className={styles.sectionTitle}>Pourquoi choisir COCO ?</h2>
            <p className={styles.sectionDescription}>
              Une expérience culinaire nouvelle génération, pensée pour les passionnés de cuisine moderne.
            </p>
          </div>
          
          <div className={styles.featuresGrid}>
            {features.map((feature) => (
              <div key={feature.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section className={styles.testimonialsSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.badge}>Témoignages ❤️</span>
            <h2 className={styles.sectionTitle}>Nos utilisateurs en parlent</h2>
            <p className={styles.sectionDescription}>
              Découvrez comment COCO transforme le quotidien de milliers d'utilisateurs passionnés.
            </p>
          </div>
          
          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className={styles.testimonialCard}>
                <p className={styles.testimonialText}>{testimonial.text}</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.authorAvatar}>
                    {testimonial.avatar ? (
                      <Image 
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className={styles.avatarImage}
                      />
                    ) : "👤"}
                  </div>
                  <div>
                    <h4 className={styles.authorName}>{testimonial.name}</h4>
                    <span className={styles.authorRole}>{testimonial.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Rejoignez la révolution culinaire</h2>
            <p className={styles.ctaDescription}>
              Plus de 5000 chefs partagent déjà leurs meilleures recettes. 
              À votre tour de faire partie de cette communauté passionnée.
            </p>
            
            <div className={styles.ctaButtons}>
              <Link href="/add-recipe" className={styles.primaryButton}>
                <span className={styles.buttonIcon}>🎯</span>
                <span>Partager ma première recette</span>
              </Link>
              <Link href="/feed" className={styles.secondaryButton}>
                <span className={styles.buttonIcon}>📱</span>
                <span>Découvrir le feed</span>
              </Link>
            </div>
            
            <div className={styles.appStoreButtons}>
              <div className={styles.appStoreButton}>
                <span className={styles.appStoreIcon}>📱</span>
                <div>
                  <div className={styles.appStoreText}>Bientôt disponible sur</div>
                  <div className={styles.appStoreName}>App Store</div>
                </div>
              </div>
              <div className={styles.appStoreButton}>
                <span className={styles.appStoreIcon}>🤖</span>
                <div>
                  <div className={styles.appStoreText}>Bientôt disponible sur</div>
                  <div className={styles.appStoreName}>Google Play</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Simple floating action button */}
        <Link href="/feed" className={styles.fabButton} aria-label="Explorer le feed">
          🚀
        </Link>
      </div>
    </>
  );
}
