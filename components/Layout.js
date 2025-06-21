import Footer from './Footer'
import Navbar from './Navbar'
import ScrollToTop from './ScrollToTop'
import styles from '../styles/Layout.module.css'

export default function Layout({ children }) {
  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.main}>{children}</main>
      <ScrollToTop />
      <Footer />
    </div>
  )
}
