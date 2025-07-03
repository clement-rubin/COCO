import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { value: '2,500+', label: 'Recettes', icon: '📝' },
    { value: '8,900+', label: 'Chefs', icon: '👨‍🍳' },
    { value: '99%', label: 'Satisfaction', icon: '⭐' },
    { value: '24/7', label: 'Disponible', icon: '🌍' }
  ];

  const features = [
    {
      icon: '🎯',
      title: 'Feed Addictif',
      description: 'Des recettes adaptées à vos goûts grâce à notre IA avancée'
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
      title: 'Communauté Active',
      description: 'Partagez et inspirez-vous mutuellement avec des milliers de chefs'
    }
  ];

  const testimonials = [
    {
      name: "Sophie M.",
      role: "Chef amateur",
      text: "COCO a complètement transformé ma façon de cuisiner. Les recettes personnalisées sont un vrai game-changer !",
      avatar: "/images/avatar-1.png",
      rating: 5
    },
    {
      name: "Thomas L.",
      role: "Père de famille",
      text: "Fini le casse-tête du 'Qu'est-ce qu'on mange ce soir ?'. COCO me suggère des idées parfaites.",
      avatar: "/images/avatar-2.png",
      rating: 5
    },
    {
      name: "Émilie P.",
      role: "Nutritionniste",
      text: "Je recommande COCO à tous mes patients. L'application propose des recettes équilibrées adaptées.",
      avatar: "/images/avatar-3.png",
      rating: 5
    }
  ];

  return (
    <>
      <Head>
        <title>COCO - L'app qui transforme votre cuisine</title>
        <meta name="description" content="Découvrez des recettes personnalisées et rejoignez la communauté COCO pour révolutionner votre façon de cuisiner" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </Head>

      <div className={styles.container}>
        {/* Header amélioré */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>🥥</div>
              <div className={styles.logoText}>
                <h1>COCO</h1>
                <p className={styles.subtitle}>L'app qui transforme votre cuisine</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Link href="/login" className={styles.loginButton}>
                Se connecter
              </Link>
              <Link href="/feed" className={styles.actionButton}>
                Collections
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section améliorée */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.badgeContainer}>
              <span className={styles.badge}>
                <span className={styles.badgeIcon}>✨</span>
                Nouveau • Rejoignez +15k chefs passionnés
              </span>
            </div>
            
            <h1 className={styles.heroTitle}>
              Des recettes
              <br />
              <span className={styles.highlightText}>qui vous ressemblent</span>
            </h1>
            
            <p className={styles.heroDescription}>
              COCO révolutionne votre façon de cuisiner avec un feed personnalisé,
              des recettes exclusives et une communauté passionnée de chefs du monde entier.
            </p>
            
            <div className={styles.actionButtons}>
              <Link href="/feed" className={styles.primaryButton}>
                <span className={styles.buttonIcon}>🚀</span>
                <span>Explorer maintenant</span>
                <span className={styles.buttonShine}></span>
              </Link>
              <Link href="/signup" className={styles.secondaryButton}>
                <span className={styles.buttonIcon}>👨‍🍳</span>
                <span>Rejoindre COCO</span>
              </Link>
            </div>
            
            <div className={styles.heroStats}>
              {stats.map((stat, index) => (
                <div key={index} className={styles.statItem}>
                  <span className={styles.statIcon}>{stat.icon}</span>
                  <div className={styles.statContent}>
                    <span className={styles.statValue}>{stat.value}</span>
                    <span className={styles.statLabel}>{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.heroVisual}>
            <div className={styles.floatingCard}>
              <div className={styles.cardContent}>
                <div className={styles.cardImage}></div>
                <div className={styles.cardText}>
                  <h3>Pasta Carbonara</h3>
                  <p>Par Chef Mario • 4.9 ⭐</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Fonctionnalités */}
        <section className={styles.featuresSection}>
          <div className={styles.sectionHeader}>
            <h2>Pourquoi choisir COCO ?</h2>
            <p>Découvrez les fonctionnalités qui font de COCO l'app culinaire de référence</p>
          </div>
          
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section Témoignages */}
        <section className={styles.testimonialsSection}>
          <div className={styles.sectionHeader}>
            <h2>Ce que disent nos chefs</h2>
            <p>Découvrez les retours de notre communauté passionnée</p>
          </div>
          
          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className={styles.testimonialCard}>
                <div className={styles.testimonialHeader}>
                  <div className={styles.testimonialAvatar}>
                    <span>{testimonial.name.charAt(0)}</span>
                  </div>
                  <div className={styles.testimonialInfo}>
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.role}</p>
                    <div className={styles.rating}>
                      {'⭐'.repeat(testimonial.rating)}
                    </div>
                  </div>
                </div>
                <p className={styles.testimonialText}>"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Final */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h2>Prêt à transformer votre cuisine ?</h2>
            <p>Rejoignez la communauté COCO dès aujourd'hui et découvrez des milliers de recettes</p>
            <div className={styles.ctaButtons}>
              <Link href="/signup" className={styles.ctaPrimary}>
                Commencer gratuitement
              </Link>
              <Link href="/about" className={styles.ctaSecondary}>
                En savoir plus
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
