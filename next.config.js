/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
      'localhost',
      'c0c0r.netlify.app', // Add your Netlify domain
      // Add more domains if you serve images from other places
    ],
  },
  swcMinify: true,
  poweredByHeader: false,
  // Options d'optimisation pour réduire la taille du bundle
  compiler: {
    // En production, retirons tous les console.log mais gardons les erreurs
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error'] }
      : false,
  },
  // Configuration ESLint pour ignorer certaines erreurs pendant le build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Configuration TypeScript pour ignorer certaines erreurs pendant le build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Optimiser pour Netlify serverless
  output: 'standalone',
  // Exclusions pour réduire la taille
  experimental: {
    serverMinification: true,
  },
  // Fournir des valeurs par défaut pour les variables d'environnement en développement
  env: {
    NEXT_PUBLIC_NETLIFY_COMMIT_REF: process.env.NETLIFY_COMMIT_REF || 'development',
    NEXT_PUBLIC_NETLIFY_DEPLOY_ID: process.env.NETLIFY_DEPLOY_ID || 'dev-local',
    NEXT_PUBLIC_NETLIFY_SITE_NAME: process.env.NETLIFY_SITE_NAME || 'coco-local-dev',
  }
}

module.exports = nextConfig
