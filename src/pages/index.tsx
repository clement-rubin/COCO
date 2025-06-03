import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Head from 'next/head';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const sectionRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;
      setScrollY(window.scrollY);
      
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

  const testimonials = [
    {
      name: "Sophie M.",
      role: "Chef amateur",
      text: "COCO a complètement transformé ma façon de cuisiner. Les recettes personnalisées sont un vrai game-changer !",
      avatar: "/images/avatar-1.png"
    },
    {
      name: "Thomas L.",
      role: "Père de famille",
      text: "Fini le casse-tête du 'Qu'est-ce qu'on mange ce soir ?'. COCO me suggère des idées parfaites en fonction de ce que j'ai dans mon frigo.",
      avatar: "/images/avatar-2.png"
    },
    {
      name: "Émilie P.",
      role: "Nutritionniste",
      text: "Je recommande COCO à tous mes patients. L'application propose des recettes équilibrées qui correspondent à leurs besoins.",
      avatar: "/images/avatar-3.png"
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

  const parallaxOffset = (multiplier) => {
    return mounted ? scrollY * multiplier : 0;
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
          className="relative min-h-[100vh] flex items-center overflow-hidden"
          style={{
            background: "radial-gradient(circle at 80% 20%, #fff8f0, #ffffff)"
          }}
        >
          {/* Animated shapes */}
          <div className="absolute inset-0 overflow-hidden">
            {mounted && (
              <>
                <motion.div 
                  className="absolute w-[28rem] h-[28rem] rounded-full bg-accent opacity-10"
                  style={{ 
                    top: '-10%', 
                    right: '-10%',
                    filter: 'blur(60px)',
                    transform: `translateY(${parallaxOffset(-0.05)}px)`
                  }}
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 15, 0],
                    opacity: [0.05, 0.08, 0.05]
                  }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div 
                  className="absolute w-[20rem] h-[20rem] rounded-full bg-primary opacity-5"
                  style={{ 
                    bottom: '10%', 
                    left: '-5%',
                    filter: 'blur(40px)',
                    transform: `translateY(${parallaxOffset(0.08)}px)` 
                  }}
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.03, 0.06, 0.03]
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
              </>
            )}
          </div>

          <div className="container max-w-screen-xl mx-auto px-6 md:px-8 relative z-10">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 30 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center md:text-left"
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
                  className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight leading-tight"
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
                  className="text-secondary text-lg mb-8 max-w-lg mx-auto md:mx-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  COCO révolutionne votre façon de cuisiner avec un feed personnalisé,
                  des recettes exclusives et une communauté passionnée.
                </motion.p>
                
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Link href="/feed" className="btn btn-primary btn-lg group">
                    <span className="mr-2 group-hover:animate-pulse">🚀</span>
                    <span>Explorer maintenant</span>
                    <motion.span 
                      className="ml-1 opacity-0 group-hover:opacity-100"
                      initial={{ width: 0 }}
                      animate={{ width: "auto" }}
                      transition={{ duration: 0.2 }}
                    >
                      →
                    </motion.span>
                  </Link>
                  <Link href="/recipes" className="btn btn-ghost btn-lg group">
                    <span className="mr-2">📖</span>
                    <span>Voir les recettes</span>
                  </Link>
                </motion.div>
                
                <motion.div 
                  className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
                  variants={container}
                  initial="hidden"
                  animate={mounted ? "show" : "hidden"}
                >
                  {stats.map((stat, index) => (
                    <motion.div 
                      key={stat.label}
                      variants={item}
                      className="text-center group"
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    >
                      <motion.div 
                        className="text-2xl mb-2 transition-transform"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      >
                        {stat.icon}
                      </motion.div>
                      <div className="text-2xl font-bold text-primary mb-1 group-hover:scale-110 transition-transform">
                        {stat.value}
                      </div>
                      <div className="text-sm text-muted">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: mounted ? 1 : 0, x: mounted ? 0 : 30 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="hidden md:block"
                style={{ transform: `translateY(${parallaxOffset(-0.05)}px)` }}
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

        {/* Features Section with improved layout */}
        <section 
          ref={sectionRefs[1]}
          className="py-24 bg-bg-subtle relative overflow-hidden"
        >
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            {mounted && (
              <>
                <motion.div 
                  className="absolute h-64 w-64 rounded-full bg-primary opacity-5"
                  style={{ 
                    top: '10%', 
                    right: '5%',
                    filter: 'blur(40px)',
                    transform: `translateY(${parallaxOffset(0.03)}px)` 
                  }}
                />
                <motion.div 
                  className="absolute h-80 w-80 rounded-full bg-accent opacity-5"
                  style={{ 
                    bottom: '5%', 
                    left: '10%',
                    filter: 'blur(60px)',
                    transform: `translateY(${parallaxOffset(-0.02)}px)` 
                  }}
                />
              </>
            )}
          </div>
          
          <div className="container max-w-screen-xl mx-auto px-6 md:px-8 relative z-10">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ 
                    y: -5,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                  }}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="card card-content text-center group hover:border-accent transition-all duration-300 relative overflow-hidden"
                >
                  {/* Feature Background Glow */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-primary-light to-accent-light opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                    animate={hoveredFeature === index ? { scale: 1.2 } : { scale: 1 }}
                    transition={{ duration: 1, repeat: hoveredFeature === index ? Infinity : 0, repeatType: "reverse" }}
                  />
                  
                  <motion.div 
                    className="text-4xl mb-5 group-hover:scale-110 transition-transform relative z-10"
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="inline-block">{feature.icon}</span>
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
            
            {/* Added: Visual separator */}
            <div className="flex justify-center mt-16">
              <motion.div 
                className="h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-transparent w-24"
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: "6rem", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </section>
        
        {/* New Section: Testimonials */}
        <section 
          ref={sectionRefs[2]}
          className="py-24 bg-bg-primary relative overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden">
            {mounted && (
              <motion.div 
                className="absolute h-96 w-96 rounded-full bg-gradient-to-br from-accent-light to-primary-light opacity-20"
                style={{ 
                  top: '50%', 
                  left: '10%',
                  filter: 'blur(80px)',
                  transform: `translate(-50%, -50%) translateY(${parallaxOffset(0.04)}px)` 
                }}
              />
            )}
          </div>
          
          <div className="container max-w-screen-xl mx-auto px-6 md:px-8 relative z-10">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <motion.span 
                className="inline-block px-3 py-1 bg-primary-light text-primary rounded-full text-sm font-medium mb-4"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Témoignages ❤️
              </motion.span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nos utilisateurs en parlent</h2>
              <p className="text-lg text-secondary max-w-2xl mx-auto">
                Découvrez comment COCO transforme le quotidien de milliers d'utilisateurs passionnés.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div 
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-bg-surface p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow relative"
                >
                  <div className="absolute -top-5 -left-5 text-4xl opacity-20">❝</div>
                  <div className="absolute -bottom-10 -right-5 text-4xl opacity-20">❞</div>
                  
                  <p className="text-secondary italic mb-6">{testimonial.text}</p>
                  
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl overflow-hidden mr-4">
                      {testimonial.avatar ? (
                        <Image 
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : "👤"}
                    </div>
                    <div>
                      <h4 className="font-medium text-primary">{testimonial.name}</h4>
                      <span className="text-xs text-gray-500">{testimonial.role}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section with enhanced design */}
        <section 
          ref={sectionRefs[3]}
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
          
          <div className="container max-w-screen-xl mx-auto px-6 md:px-8 relative z-10 text-center">
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
                    className="btn bg-white text-accent hover:bg-gray-100 group relative overflow-hidden"
                  >
                    <span className="mr-2 group-hover:animate-bounce">🎯</span>
                    <span className="relative z-10">Partager ma première recette</span>
                    {/* Button hover effect */}
                    <motion.span 
                      className="absolute inset-0 bg-white opacity-20 translate-y-full"
                      whileHover={{ translateY: 0 }}
                      transition={{ duration: 0.3 }}
                    />
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
              
              {/* New: App Store badges */}
              <motion.div 
                className="mt-12 flex flex-wrap justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center">
                  <span className="text-2xl mr-3">📱</span>
                  <div className="text-left">
                    <div className="text-white text-xs opacity-80">Bientôt disponible sur</div>
                    <div className="text-white font-semibold">App Store</div>
                  </div>
                </div>
                <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center">
                  <span className="text-2xl mr-3">🤖</span>
                  <div className="text-left">
                    <div className="text-white text-xs opacity-80">Bientôt disponible sur</div>
                    <div className="text-white font-semibold">Google Play</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Floating Action Button with enhanced animation */}
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

        {/* Progress indicator with enhanced styling */}
        <div className="fixed left-6 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-40 hidden md:flex">
          {[0, 1, 2, 3].map((section) => (
            <motion.button
              key={section}
              className={`w-3 h-3 rounded-full relative ${activeSection === section ? 'bg-accent' : 'bg-gray-300'}`}
              onClick={() => {
                if (sectionRefs[section].current) {
                  sectionRefs[section].current.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              animate={{ 
                scale: activeSection === section ? [1, 1.3, 1] : 1,
                opacity: activeSection === section ? 1 : 0.6
              }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.2 }}
            >
              {activeSection === section && (
                <motion.span
                  className="absolute inset-0 bg-accent rounded-full -z-10"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.8, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ opacity: 0.3 }}
                />
              )}
              <span className="sr-only">Section {section + 1}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
}
