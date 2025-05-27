import { useState } from 'react'
import Head from 'next/head'
import styles from '../styles/Contact.module.css'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isError, setIsError] = useState(false)
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }))
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Simple validation
    if (!formData.name || !formData.email || !formData.message) {
      setIsError(true)
      return
    }
    
    // In a real app, you would send the form data to your server or a service
    console.log('Form submitted:', formData)
    
    // Simulate successful submission
    setIsSubmitted(true)
    setIsError(false)
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    })
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Contact | COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Contactez-nous pour toute question ou suggestion" />
      </Head>

      <h1>Contactez-nous</h1>
      
      <div className={styles.content}>
        <div className={styles.info}>
          <div className={styles.infoBlock}>
            <h2>Nous sommes à votre écoute</h2>
            <p>
              Vous avez une question, une suggestion de recette ou vous souhaitez collaborer avec nous ? 
              N'hésitez pas à nous contacter et nous vous répondrons dans les plus brefs délais.
            </p>
          </div>
          
          <div className={styles.infoBlock}>
            <h3>Adresse</h3>
            <p>123 Avenue de la Cuisine<br />75000 Paris, France</p>
          </div>
          
          <div className={styles.infoBlock}>
            <h3>Email</h3>
            <p>contact@coco-cuisine.fr</p>
          </div>
          
          <div className={styles.infoBlock}>
            <h3>Téléphone</h3>
            <p>+33 1 23 45 67 89</p>
          </div>
          
          <div className={styles.social}>
            <h3>Suivez-nous</h3>
            <div className={styles.socialLinks}>
              <a href="#" aria-label="Instagram">Instagram</a>
              <a href="#" aria-label="Facebook">Facebook</a>
              <a href="#" aria-label="Pinterest">Pinterest</a>
            </div>
          </div>
        </div>
        
        <div className={styles.formContainer}>
          {isSubmitted ? (
            <div className={styles.successMessage}>
              <h2>Message envoyé !</h2>
              <p>Merci de nous avoir contactés. Nous vous répondrons dans les plus brefs délais.</p>
              <button onClick={() => setIsSubmitted(false)}>Envoyer un autre message</button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {isError && (
                <div className={styles.errorMessage}>
                  Veuillez remplir tous les champs obligatoires.
                </div>
              )}
              
              <div className={styles.formGroup}>
                <label htmlFor="name">Nom *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="subject">Sujet</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>
              
              <div className={styles.formGroup}>
                <button type="submit">Envoyer</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
