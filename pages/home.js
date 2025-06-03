import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section style={{
          background: 'linear-gradient(135deg, var(--warm-cream) 0%, var(--primary-peach) 100%)',
          padding: 'var(--spacing-2xl) 0',
          textAlign: 'center'
        }}>
          <div className="container">
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontFamily: "'Playfair Display', serif",
              color: 'var(--primary-orange)',
              marginBottom: 'var(--spacing-lg)',
              fontWeight: '700'
            }}>
              🍴 Bienvenue chez COCO
            </h1>
            
            {/* ...existing content... */}
            
          </div>
        </section>

        {/* ...existing sections... */}

      </main>
      
      <Footer />
    </div>
  );
};

export default HomePage;
