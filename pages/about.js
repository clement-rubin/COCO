import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/About.module.css'

export default function About() {
  return (
    <div className={styles.container}>
      <Head>
        <title>À propos | COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Découvrez l'histoire de COCO - Cuisine & Saveurs et notre passion pour la cuisine" />
      </Head>

      <div className={styles.header}>
        <h1>À propos de COCO</h1>
        <p className={styles.subtitle}>Notre passion pour la cuisine</p>
      </div>

      <div className={styles.content}>
        <div className={styles.imageContainer}>
          <Image
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?ixlib=rb-4.0.3"
            alt="Notre équipe en cuisine"
            width={600}
            height={400}
            className={styles.image}
          />
        </div>

        <div className={styles.text}>
          <h2>Notre histoire</h2>
          <p>
            COCO est né d'une passion partagée pour la cuisine simple, délicieuse et accessible à tous. Notre plateforme a été créée en 2023 avec l'objectif de partager des recettes traditionnelles et modernes qui peuvent être réalisées facilement à la maison.
          </p>
          <p>
            Ce qui a commencé comme un simple blog entre amis s'est transformé en une communauté dynamique de passionnés de cuisine partageant leurs meilleures recettes et astuces culinaires.
          </p>

          <h2>Notre mission</h2>
          <p>
            Nous croyons que la cuisine est un art qui rassemble les gens. Notre mission est de démocratiser la cuisine de qualité en proposant des recettes à la fois simples et savoureuses, adaptées à tous les niveaux et toutes les occasions.
          </p>
          <p>
            Chaque recette est soigneusement testée et photographiée pour vous offrir une expérience visuelle et gustative exceptionnelle. Nous nous efforçons également d'utiliser des ingrédients de saison et locaux autant que possible.
          </p>

          <h2>Rejoignez-nous</h2>
          <p>
            Que vous soyez débutant ou expérimenté en cuisine, COCO est fait pour vous. Explorez nos recettes, partagez vos créations et rejoignez notre communauté de passionnés de cuisine.
          </p>
        </div>
      </div>

      <div className={styles.team}>
        <h2>Notre équipe</h2>
        <div className={styles.teamGrid}>
          <div className={styles.teamMember}>
            <div className={styles.memberImage}>
              <Image
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3"
                alt="Marie Laurent"
                width={150}
                height={150}
                className={styles.avatar}
              />
            </div>
            <h3>Marie Laurent</h3>
            <p>Fondatrice & Chef</p>
          </div>
          <div className={styles.teamMember}>
            <div className={styles.memberImage}>
              <Image
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3"
                alt="Thomas Dubois"
                width={150}
                height={150}
                className={styles.avatar}
              />
            </div>
            <h3>Thomas Dubois</h3>
            <p>Chef & Photographe</p>
          </div>
          <div className={styles.teamMember}>
            <div className={styles.memberImage}>
              <Image
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3"
                alt="Sophie Martin"
                width={150}
                height={150}
                className={styles.avatar}
              />
            </div>
            <h3>Sophie Martin</h3>
            <p>Nutritionniste</p>
          </div>
        </div>
      </div>
    </div>
  )
}
