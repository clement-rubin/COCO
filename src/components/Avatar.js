import React, { useState } from 'react';

// Définition des placements et effets pour chaque type d'objet
const ITEM_PLACEMENTS = {
  hat:    { fontSize: 28, left: 32, top: -7, zIndex: 5, rotate: -5 },
  glasses:{ fontSize: 19, left: 44, top: 41, zIndex: 6, rotate: 2 },
  apron:  { fontSize: 22, left: 41, top: 74, zIndex: 3 },
  accessory: { fontSize: 16, left: 74, top: 74, zIndex: 7 },
  face:   { fontSize: 15, left: 56, top: 68, zIndex: 8 },
  background: { fontSize: 38, left: 8, top: 8, zIndex: 1, opacity: 0.18, blur: 1.1 },
  effect: { fontSize: 21, left: 73, top: 9, zIndex: 9, animate: true },
  badge:  { fontSize: 13, left: 9, top: 82, zIndex: 10 },
  mascot: { fontSize: 18, left: 82, top: 82, zIndex: 11, animate: true }
}

// Rareté → effet glow
const RARITY_GLOW = {
  legendary: 'drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 16px #fbbf24)',
  epic:      'drop-shadow(0 0 8px #8b5cf6) drop-shadow(0 0 12px #a78bfa)',
  rare:      'drop-shadow(0 0 6px #3b82f6)',
  default:   'none'
}

// Helper pour glow selon rareté
function getGlow(rarity) {
  return RARITY_GLOW[rarity] || RARITY_GLOW.default
}

// Affiche l'avatar chef avec les items équipés
export default function Avatar({ equippedItems = [], size = 110, onClick }) {
  // Convertir equippedItems (array) en objet par type
  const equipped = {}
  equippedItems.forEach(item => { equipped[item.type] = item })

  // Base chef
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #fffbe6 60%, #fef3c7 100%)',
        boxShadow: '0 0 0 6px #f59e0b22, 0 4px 24px #f59e0b33',
        overflow: 'visible',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
      title="Voir et personnaliser mon avatar"
    >
      {/* Contour */}
      <div style={{
        boxShadow: '0 0 0 6px #f59e0b22, 0 4px 24px #f59e0b33',
        border: '3px solid #fff',
        borderRadius: '50%',
        position: 'absolute',
        left: 0, top: 0, width: size, height: size, zIndex: 0,
        pointerEvents: 'none'
      }} />
      {/* Fond */}
      {equipped.background && (
        <div style={{
          fontSize: size * 0.38,
          position: 'absolute',
          left: size * 0.08,
          top: size * 0.08,
          zIndex: 1,
          opacity: 0.18,
          filter: 'blur(1px) brightness(1.1)'
        }}>
          {equipped.background.icon}
        </div>
      )}
      {/* Base chef */}
      <div style={{
        fontSize: size * 0.39,
        position: 'absolute',
        left: size * 0.18,
        top: size * 0.18,
        zIndex: 2,
        textShadow: '0 2px 8px #f59e0b22'
      }}>🧑</div>
      {/* Chapeau */}
      {equipped.hat && (
        <div style={{
          fontSize: size * 0.28,
          position: 'absolute',
          left: size * 0.32,
          top: size * -0.07,
          zIndex: 5,
          transform: 'rotate(-5deg)',
          filter: getGlow(equipped.hat.rarity),
          textShadow: '0 2px 8px #f59e0b44'
        }}>
          {equipped.hat.icon}
        </div>
      )}
      {/* Lunettes */}
      {equipped.glasses && (
        <div style={{
          fontSize: size * 0.19,
          position: 'absolute',
          left: size * 0.44,
          top: size * 0.41,
          zIndex: 6,
          transform: 'rotate(2deg)',
          filter: getGlow(equipped.glasses.rarity),
          textShadow: '0 1px 4px #37415122'
        }}>
          {equipped.glasses.icon}
        </div>
      )}
      {/* Tablier */}
      {equipped.apron && (
        <div style={{
          fontSize: size * 0.22,
          position: 'absolute',
          left: size * 0.41,
          top: size * 0.74,
          zIndex: 3,
          filter: getGlow(equipped.apron.rarity),
          textShadow: '0 1px 4px #05966922'
        }}>
          {equipped.apron.icon}
        </div>
      )}
      {/* Accessoire */}
      {equipped.accessory && (
        <div style={{
          fontSize: size * 0.16,
          position: 'absolute',
          left: size * 0.74,
          top: size * 0.74,
          zIndex: 7,
          filter: getGlow(equipped.accessory.rarity),
          textShadow: '0 1px 4px #10b98122'
        }}>
          {equipped.accessory.icon}
        </div>
      )}
      {/* Visage */}
      {equipped.face && (
        <div style={{
          fontSize: size * 0.15,
          position: 'absolute',
          left: size * 0.56,
          top: size * 0.68,
          zIndex: 8,
          filter: getGlow(equipped.face.rarity),
          textShadow: '0 1px 4px #92400e22'
        }}>
          {equipped.face.icon}
        </div>
      )}
      {/* Effet spécial */}
      {equipped.effect && (
        <div style={{
          fontSize: size * 0.21,
          position: 'absolute',
          left: size * 0.73,
          top: size * 0.09,
          zIndex: 9,
          animation: 'effectAnim 1.2s infinite alternate',
          filter: getGlow(equipped.effect.rarity),
          textShadow: '0 1px 4px #f59e0b22'
        }}>
          {equipped.effect.icon}
        </div>
      )}
      {/* Badge */}
      {equipped.badge && (
        <div style={{
          fontSize: size * 0.13,
          position: 'absolute',
          left: size * 0.09,
          top: size * 0.82,
          zIndex: 10,
          filter: getGlow(equipped.badge.rarity),
          textShadow: '0 1px 4px #f59e0b22'
        }}>
          {equipped.badge.icon}
        </div>
      )}
      {/* Mascotte */}
      {equipped.mascot && (
        <div style={{
          fontSize: size * 0.18,
          position: 'absolute',
          left: size * 0.82,
          top: size * 0.82,
          zIndex: 11,
          animation: 'mascotAnim 1.2s infinite alternate',
          filter: getGlow(equipped.mascot.rarity),
          textShadow: '0 1px 4px #8b5cf622'
        }}>
          {equipped.mascot.icon}
        </div>
      )}
      {/* Effet de brillance sur le contour */}
      <div style={{
        position: 'absolute',
        left: size * 0.05,
        top: size * 0.05,
        width: size * 0.9,
        height: size * 0.9,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)',
        zIndex: 12,
        pointerEvents: 'none',
        animation: 'avatarShine 2.5s infinite alternate'
      }} />
      <style jsx>{`
        @keyframes effectAnim {
          0% { filter: brightness(1) scale(1);}
          100% { filter: brightness(1.2) scale(1.08);}
        }
        @keyframes mascotAnim {
          0% { transform: scale(1) rotate(-5deg);}
          100% { transform: scale(1.12) rotate(8deg);}
        }
        @keyframes avatarShine {
          0% { opacity: 0.6;}
          100% { opacity: 1;}
        }
      `}</style>
    </div>
  )
}