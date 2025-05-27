/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  swcMinify: true,
  poweredByHeader: false,
  compiler: {
    // En production, conservons les console.error pour la journalisation
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  // Ajoute des variables d'environnement publiques pour le suivi côté client
  env: {
    NEXT_PUBLIC_NETLIFY_COMMIT_REF: process.env.NETLIFY_COMMIT_REF,
    NEXT_PUBLIC_NETLIFY_DEPLOY_ID: process.env.NETLIFY_DEPLOY_ID,
    NEXT_PUBLIC_NETLIFY_SITE_NAME: process.env.NETLIFY_SITE_NAME,
  }
}

module.exports = nextConfig
