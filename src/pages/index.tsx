import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Head from 'next/head';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      sectionRefs.forEach((ref, index) => {
        if (!ref.current) return;
        
        const offsetTop = ref.current.offsetTop;
        const height = ref.current.offsetHeight;
        
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + height) {
          setActiveSection(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = [
    { value: '1,234', label: 'Recettes', icon: '📝' },
    { value: '5,678', label: 'Chefs', icon: '👨‍🍳' },
    { value: '98%', label: 'Satisfaction', icon: '⭐' },
    { value: '24/7', label: 'Disponible', icon: '🌍' }
  ];

  const features = [
    {
      icon: '🎯',
      title: 'Feed Personnalisé',
      description: 'Des recettes adaptées à vos goûts grâce à notre IA'
    },
    {
      icon: '📱',
      title: 'Mobile-first',
      description: 'Interface optimisée pour cuisiner avec votre téléphone'
    },
    {
      icon: '⚡',
      title: 'Ultra-rapide',
      description: 'Trouvez votre recette parfaite en quelques secondes'
    },
    {
      icon: '🤝',
      title: 'Communauté',
      description: 'Partagez et inspirez-vous mutuellement'
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <>
      <Head>
        <title>COCO - L'app qui transforme votre cuisine</title>
        <meta name="description" content="Découvrez des recettes personnalisées et rejoignez la communauté COCO pour révolutionner votre façon de cuisiner" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen overflow-hidden">
        {/* Hero Section */}
        <section 
          ref={sectionRefs[0]}
          className="relative min-h-screen flex items-center overflow-hidden"
          style={{
            background: "radial-gradient(circle at 80% 20%, #fff8f0, #ffffff)"
          }}
        >
          {/* Animated shapes */}
          <div className="absolute inset-0 overflow-hidden">
            {mounted && (
              <>
                <motion.div 
                  className="absolute w-96 h-96 rounded-full bg-accent opacity-10"
                  style={{ top: '-10%', right: '-10%' }}
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 15, 0],
                    opacity: [0.05, 0.08, 0.05]
                  }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div 
                  className="absolute w-64 h-64 rounded-full bg-primary opacity-5"
                  style={{ bottom: '10%', left: '-5%' }}
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.03, 0.06, 0.03]
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
              </>
            )}
          </div>

          <div className="container relative z-10">
            <div className="grid lg:grid-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center lg:text-left"
              >
                <motion.span 
                  className="inline-block px-3 py-1 bg-accent-light text-accent rounded-full text-sm font-medium mb-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: mounted ? 1 : 0, scale: mounted ? 1 : 0.8 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  Nouveau ✨ Rejoignez +10k chefs passionnés
                </motion.span>
                
                <motion.h1 
                  className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  Des recettes
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-primary block mt-2">
                    qui vous ressemblent
                  </span>
                </motion.h1>
                
                <motion.p 
                  className="text-secondary text-lg mb-8 max-w-lg mx-auto lg:mx-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  COCO révolutionne votre façon de cuisiner avec un feed personnalisé,
                  des recettes exclusives et une communauté passionnée.
                </motion.p>
                
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Link href="/feed" className="btn btn-primary btn-lg">
                    <span className="mr-2">🚀</span>Explorer maintenant
                  </Link>
                  <Link href="/recipes" className="btn btn-ghost btn-lg">
                    <span className="mr-2">📖</span>Voir les recettes
                  </Link>
                </motion.div>
                
                <motion.div 
                  className="grid grid-2 md:grid-4 gap-6 mt-16"
                  variants={container}
                  initial="hidden"
                  animate={mounted ? "show" : "hidden"}
                >
                  {stats.map((stat, index) => (
                    <motion.div 
                      key={stat.label}
                      variants={item}
                      className="text-center"
                    >
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                      <div className="text-sm text-muted">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : 30 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="hidden lg:block"
              >
                <div className="relative">
                  <motion.div 
                    className="relative z-10 overflow-hidden rounded-3xl shadow-2xl max-w-sm mx-auto"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {/* Phone mockup with feed */}
                    <div className="bg-black rounded-3xl p-3">
                      <div className="rounded-2xl overflow-hidden aspect-[9/19] bg-white">
                        {/* Status Bar */}
                        <div className="p-2 flex justify-between items-center text-xs bg-gray-100">
                          <span>9:41</span>
                          <div className="flex gap-1">
                            <div className="w-4 h-2 bg-black rounded-sm"></div>
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                          </div>
                        </div>
                        
                        {/* App Content */}
                        <div className="relative h-full">
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500"
                            animate={{
                              background: [
                                "linear-gradient(to bottom right, #f97316, #ef4444)",
                                "linear-gradient(to bottom right, #ea580c, #dc2626)",
                                "linear-gradient(to bottom right, #f97316, #ef4444)"
                              ]
                            }}
                            transition={{ duration: 8, repeat: Infinity }}
                          >
                            <div className="absolute inset-0 bg-black opacity-20"></div>
                            <div className="absolute top-4 left-4 right-4 flex items-center gap-2 text-white">
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm">
                                👨‍🍳
                              </div>
                              <div>
                                <div className="font-semibold text-sm">Chef Pierre</div>
                                <div className="text-xs opacity-80">2.3k followers</div>
                              </div>
                            </div>
                            
                            <div className="absolute bottom-16 left-4 right-16 text-white">
                              <h3 className="font-bold text-lg mb-2">Pasta Carbonara</h3>
                              <p className="text-sm opacity-90 mb-4">
                                Recette authentique italienne en 15 minutes
                              </p>
                              <div className="flex gap-2 text-xs">
                                <span className="bg-white bg-opacity-20 px-2 py-1 rounded">⏱️ 15min</span>
                                <span className="bg-white bg-opacity-20 px-2 py-1 rounded">🔥 Facile</span>
                              </div>
                            </div>
                            
                            <motion.div 
                              className="absolute right-4 h-48 bottom-16 flex flex-col gap-6 text-white text-center"
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <div>
                                <motion.div 
                                  className="text-2xl mb-1"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >❤️</motion.div>
                                <div className="text-xs">1.2k</div>
                              </div>
                              <div>
                                <motion.div 
                                  className="text-2xl mb-1"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >💬</motion.div>
                                <div className="text-xs">89</div>
                              </div>
                              <div>
                                <motion.div 
                                  className="text-2xl mb-1"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >⭐</motion.div>
                                <div className="text-xs">Save</div>
                              </div>
                            </motion.div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Decorative elements */}
                  <motion.div 
                    className="absolute -top-10 -right-10 w-24 h-24 bg-accent rounded-full opacity-10"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="absolute -bottom-8 -left-8 w-16 h-16 bg-primary rounded-full opacity-10"
                    animate={{ scale: [1, 1.3, 1], rotate: [0, -30, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
          
          <motion.div 
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-gray-400 text-sm mb-2">Découvrir</span>
            <motion.div 
              className="w-8 h-12 border-2 border-gray-400 rounded-full flex justify-center items-start p-1"
            >
              <motion.div 
                className="w-1 h-2 bg-gray-400 rounded-full"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section 
          ref={sectionRefs[1]}
          className="py-24 bg-bg-subtle"
        >
          <div className="container">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <motion.span 
                className="inline-block px-3 py-1 bg-accent-light text-accent rounded-full text-sm font-medium mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Fonctionnalités ✨
              </motion.span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Pourquoi choisir COCO ?</h2>
              <p className="text-lg text-secondary max-w-2xl mx-auto">
                Une expérience culinaire nouvelle génération, pensée pour les passionnés de cuisine moderne.
              </p>
            </motion.div>
            
            <motion.div 
              className="grid grid-2 lg:grid-4 gap-8"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {features.map((feature, index) => (
                <motion.div 
                  key={feature.title}
                  variants={item}
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                  }}
                  className="card card-content text-center group hover:border-accent transition-all duration-300"
                >
                  <motion.div 
                    className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300"
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section 
          ref={sectionRefs[2]}
          className="py-24 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)"
          }}
        >
          {/* Animated background */}
          {mounted && (
            <>
              <motion.div 
                className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white opacity-10"
                animate={{ 
                  x: [50, 0, 50], 
                  y: [-50, 0, -50],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white opacity-10"
                animate={{ 
                  x: [-30, 0, -30], 
                  y: [30, 0, 30],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              />
            </>
          )}
          
          <div className="container relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-white text-3xl md:text-4xl font-bold mb-6">
                Rejoignez la révolution culinaire
              </h2>
              <p className="text-white text-opacity-90 text-lg mb-8">
                Plus de 5000 chefs partagent déjà leurs meilleures recettes. 
                À votre tour de faire partie de cette communauté passionnée.
              </p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center"
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <motion.div variants={item}>
                  <Link 
                    href="/add-recipe" 
                    className="btn bg-white text-accent hover:bg-gray-100"
                  >
                    <span className="mr-2">🎯</span> Partager ma première recette
                  </Link>
                </motion.div>
                <motion.div variants={item}>
                  <Link 
                    href="/feed" 
                    className="btn btn-ghost text-white border-white hover:bg-white hover:text-accent"
                  >
                    <span className="mr-2">📱</span> Découvrir le feed
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Floating Action Button */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: mounted ? 1 : 0, opacity: mounted ? 1 : 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 15, 
            delay: 1.2 
          }}
        >
          <Link 
            href="/feed" 
            className="fixed bottom-6 right-6 w-14 h-14 bg-accent hover:bg-accent-hover text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 z-50"
            aria-label="Explorer le feed"
          >
            <motion.span
              animate={{ rotate: [0, 20, 0, -20, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              🚀
            </motion.span>
          </Link>
        </motion.div>

        {/* Progress indicator */}
        <div className="fixed left-6 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-40 hidden md:flex">
          {[0, 1, 2].map((section) => (
            <motion.div 
              key={section}
              className={`w-2 h-2 rounded-full ${activeSection === section ? 'bg-accent' : 'bg-gray-300'}`}
              animate={{ 
                scale: activeSection === section ? [1, 1.3, 1] : 1,
                opacity: activeSection === section ? 1 : 0.6
              }}
              transition={{ duration: 0.5 }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
