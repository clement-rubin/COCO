import { useState, useEffect, useRef } from 'react'

const AnimatedEntry = ({ 
  children, 
  animation = 'fadeIn', 
  delay = 0, 
  duration = 400,
  threshold = 0.1,
  triggerOnce = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasAnimated)) {
          setIsVisible(true)
          if (triggerOnce) {
            setHasAnimated(true)
          }
        } else if (!triggerOnce && !entry.isIntersecting) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    const currentElement = elementRef.current
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [threshold, triggerOnce, hasAnimated])

  const animationStyles = {
    opacity: isVisible ? 1 : 0,
    transform: getTransform(animation, isVisible),
    transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
    transitionDelay: `${delay}ms`,
    willChange: 'transform, opacity'
  }

  return (
    <div
      ref={elementRef}
      className={`animated-entry ${className}`}
      style={animationStyles}
    >
      {children}
    </div>
  )
}

function getTransform(animation, isVisible) {
  const transforms = {
    fadeIn: isVisible ? 'translateY(0)' : 'translateY(20px)',
    slideInLeft: isVisible ? 'translateX(0)' : 'translateX(-30px)',
    slideInRight: isVisible ? 'translateX(0)' : 'translateX(30px)',
    scaleIn: isVisible ? 'scale(1)' : 'scale(0.8)',
    bounceIn: isVisible ? 'scale(1)' : 'scale(0.3)',
    rotateIn: isVisible ? 'rotate(0deg) scale(1)' : 'rotate(-10deg) scale(0.8)'
  }
  return transforms[animation] || transforms.fadeIn
}

// Composant pour animations en cascade
export const AnimatedSequence = ({ children, delay = 100 }) => {
  return (
    <>
      {children.map((child, index) => (
        <AnimatedEntry
          key={index}
          delay={index * delay}
          animation="cascadeIn"
        >
          {child}
        </AnimatedEntry>
      ))}
    </>
  )
}

// Hook pour déclencher des animations programmatiquement
export const useAnimation = () => {
  const [isAnimating, setIsAnimating] = useState(false)

  const triggerAnimation = (callback, duration = 400) => {
    setIsAnimating(true)
    if (callback) callback()
    
    setTimeout(() => {
      setIsAnimating(false)
    }, duration)
  }

  return { isAnimating, triggerAnimation }
}

export default AnimatedEntry
