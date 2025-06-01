import Head from 'next/head'
import SocialFeed from '../components/SocialFeed'

export default function Social() {
  return (
    <div>
      <Head>
        <title>Feed Social - COCO</title>
        <meta name="description" content="Découvrez les dernières créations culinaires de la communauté COCO" />
      </Head>

      <SocialFeed />
    </div>
  )
}
