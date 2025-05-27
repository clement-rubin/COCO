import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../../styles/Categories.module.css'

export default function Categories() {
  const categories = [
    {
      id: 'entree',
      title: 'Entrées',
      image: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?ixlib=rb-4.0.3',
      count: 6
    },
    {
      id: 'plat-principal',
      title: 'Plats principaux',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3',
      count: 12
    },
    {
      id: 'dessert',
      title: 'Desserts',
      image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-4.0.3',
      count: 8
    },
    {
      id: 'boisson',
      title: 'Boissons',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?ixlib=rb-4.0.3',
      count: 4
    }
  ]

  return (
    <div className={styles.container}>
      <Head>
        <title>Catégories de recettes | COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Explorez nos recettes par catégories" />
      </Head>

      <h1>Catégories</h1>
      <p className={styles.intro}>Explorez nos recettes par catégories et trouvez l'inspiration pour votre prochain repas.</p>

      <div className={styles.categoriesGrid}>
        {categories.map(category => (
          <Link href={`/recipes?category=${category.id}`} key={category.id} className={styles.categoryCard}>
            <div className={styles.imageContainer}>
              <Image 
                src={category.image} 
                alt={category.title} 
                fill 
                sizes="(max-width: 768px) 100vw, 300px"
                className={styles.categoryImage} 
              />
            </div>
            <div className={styles.categoryContent}>
              <h2>{category.title}</h2>
              <p>{category.count} recettes</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
