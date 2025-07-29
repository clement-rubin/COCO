import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import Progression from '../components/Progression'

export default function ProgressionPage() {
  const { user } = useAuth()

  return (
    <>
      <Head>
        <title>Progression - COCO</title>
        <meta name="description" content="Votre progression, niveaux, badges et trophées sur COCO" />
      </Head>
      <Progression user={user} />
    </>
  )
}
