import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { value: '1,234', label: 'Recettes partagées', icon: '📝' },
    { value: '5,678', label: 'Chefs actifs', icon: '👨‍🍳' },
    { value: '98%', label: 'Satisfaction', icon: '⭐' },
    { value: '24/7', label: 'Disponible', icon: '🌍' }
  ];

  const features = [
    {
      icon: '🎯',
      title: 'Feed personnalisé',
      description: 'Découvrez des recettes adaptées à vos goûts grâce à notre IA'
    },
    {
      icon: '📱',
      title: 'Mobile-first',
      description: 'Interface optimisée pour cuisiner avec votre téléphone'
    },
    {
      icon: '⚡',
      title: 'Ultra-rapide',
      description: 'Trouvez votre recette parfaite en moins de 10 secondes'
    },
    {
      icon: '🤝',
      title: 'Communauté',
      description: 'Partagez, commentez et inspirez-vous mutuellement'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-white py-24">
        <div className="container">
          <div className="text-center max-w-4xl mx-auto">
            <div className={`${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
              <h1 className="mb-6">
                Découvrez des recettes 
                <span className="text-accent block">qui vous ressemblent</span>
              </h1>
              <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
                COCO révolutionne votre façon de cuisiner avec un feed personnalisé, 
                des recettes exclusives et une communauté passionnée.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/feed" className="btn btn-primary btn-lg">
                  🚀 Explorer maintenant
                </Link>
                <Link href="/recipes" className="btn btn-secondary btn-lg">
                  📖 Voir les recettes
                </Link>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-2 md:grid-4 gap-6 mt-16">
              {stats.map((stat, index) => (
                <div 
                  key={stat.label}
                  className={`text-center ${mounted ? 'animate-fade-in' : 'opacity-0'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent opacity-5 rounded-full -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent opacity-5 rounded-full translate-y-32 -translate-x-32"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-bg-subtle">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="mb-4">Pourquoi choisir COCO ?</h2>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              Une expérience culinaire nouvelle génération, pensée pour les passionnés de cuisine moderne.
            </p>
          </div>
          
          <div className="grid grid-2 lg:grid-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className={`card card-content text-center group hover:border-accent transition-all duration-300 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-secondary text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-24">
        <div className="container">
          <div className="grid lg:grid-2 gap-16 items-center">
            {/* Feed Preview */}
            <div className="order-2 lg:order-1">
              <h2 className="mb-6">Feed addictif personnalisé</h2>
              <p className="text-lg text-secondary mb-6">
                Découvrez un flux infini de recettes adaptées à vos goûts, 
                avec des photos alléchantes et des instructions ultra-claires.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-secondary">IA qui apprend de vos préférences</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-secondary">Photos HD et vidéos courtes</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-secondary">Défilement fluide et rapide</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span className="text-secondary">Sauvegarde instantanée</span>
                </li>
              </ul>
              <Link href="/feed" className="btn btn-primary">
                Essayer le feed
              </Link>
            </div>
            
            {/* Mock Feed */}
            <div className="order-1 lg:order-2">
              <div className="relative max-w-sm mx-auto">
                {/* Phone Frame */}
                <div className="bg-gray-900 rounded-3xl p-2 shadow-2xl">
                  <div className="bg-white rounded-2xl overflow-hidden aspect-[9/16]">
                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-4 py-2 text-xs font-medium">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-6 h-2 bg-gray-900 rounded-sm"></div>
                      </div>
                    </div>
                    
                    {/* Feed Content */}
                    <div className="relative h-full bg-gradient-to-br from-orange-400 to-red-500">
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                      <div className="absolute top-4 left-4 right-16">
                        <div className="flex items-center gap-2 text-white">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">
                            👨‍🍳
                          </div>
                          <div>
                            <div className="font-semibold text-sm">Chef Pierre</div>
                            <div className="text-xs opacity-80">2.3k followers</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute bottom-4 left-4 right-16 text-white">
                        <h3 className="font-bold text-lg mb-2">Pasta Carbonara</h3>
                        <p className="text-sm opacity-90 mb-2">
                          Recette authentique italienne en 15 minutes
                        </p>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-white bg-opacity-20 px-2 py-1 rounded">⏱️ 15min</span>
                          <span className="bg-white bg-opacity-20 px-2 py-1 rounded">🔥 Facile</span>
                        </div>
                      </div>
                      
                      <div className="absolute right-4 bottom-16 flex flex-col gap-4 text-white text-center">
                        <div className="cursor-pointer">
                          <div className="text-2xl mb-1">❤️</div>
                          <div className="text-xs">1.2k</div>
                        </div>
                        <div className="cursor-pointer">
                          <div className="text-2xl mb-1">💬</div>
                          <div className="text-xs">89</div>
                        </div>
                        <div className="cursor-pointer">
                          <div className="text-2xl mb-1">⭐</div>
                          <div className="text-xs">Save</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-white mb-6">
            Rejoignez la révolution culinaire
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Plus de 5000 chefs partagent déjà leurs meilleures recettes. 
            À votre tour de faire partie de cette communauté passionnée.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/add-recipe" className="btn bg-white text-primary hover:bg-gray-100">
              🎯 Partager ma première recette
            </Link>
            <Link href="/feed" className="btn btn-ghost text-white border-white hover:bg-white hover:text-primary">
              📱 Découvrir le feed
            </Link>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <Link 
        href="/feed" 
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent hover:bg-accent-hover text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50"
        aria-label="Explorer le feed"
      >
        🚀
      </Link>
    </div>
  );
}
