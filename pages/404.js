import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/404.module.css'

export default function NotFound() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Page non trouvée | COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Page non trouvée" />
      </Head>

      <div className={styles.content}>
        <h1>404</h1>
        <h2>Page non trouvée</h2>
        <p>Désolé, la page que vous recherchez n'existe pas ou a été déplacée.</p>
        <Link href="/" className={styles.button}>
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
