import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ProfileIndexRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profil')
  }, [router])

  return null
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/profil',
      permanent: false
    }
  }
}
