import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import RecipeCard from '../components/RecipeCard'

export default function Home() {
  const featuredRecipes = [
    {
      id: 1,
      title: "Tarte aux pommes traditionnelle",
      description: "Une délicieuse tarte aux pommes à la française",
      image: "https://images.unsplash.com/photo-1568571780765-9276107cecf3?ixlib=rb-4.0.3",
      prepTime: "30 min",
      cookTime: "45 min"
    },
    {
      id: 2,
      title: "Poulet rôti aux herbes",
      description: "Poulet rôti juteux avec herbes fraîches",
      image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?ixlib=rb-4.0.3",
      prepTime: "15 min",
      cookTime: "1h30"
    },
    {
      id: 3,
      title: "Pasta Carbonara",
      description: "La vraie recette italienne de carbonara",
      image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?ixlib=rb-4.0.3",
      prepTime: "10 min",
      cookTime: "15 min"
    }
  ]

  return (
    <div className={styles.container}>
      <Head>
        <title>COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Découvrez les meilleures recettes de cuisine" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>COCO - Cuisine & Saveurs</h1>
          <p>Découvrez des recettes savoureuses, simples et authentiques</p>
          <Link href="/recipes" className={styles.button}>
            Explorer les recettes
          </Link>
        </div>
      </section>

      <section className={styles.featured}>
        <h2>Recettes à découvrir</h2>
        <div className={styles.recipeGrid}>
          {featuredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
        <div className={styles.viewAll}>
          <Link href="/recipes">
            Voir toutes les recettes
          </Link>
        </div>
      </section>
    </div>
  )
}
