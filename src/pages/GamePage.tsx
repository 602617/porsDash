import { useEffect, useRef, useState } from 'react'
import { createGame } from '../game/main'
import Phaser from 'phaser'

export default function GamePage() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isStarted, setIsStarted] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isLost, setIsLost] = useState(false)
  const [score, setScore] = useState(0)
  const [scorePopKey, setScorePopKey] = useState(0)

  useEffect(() => {
    if (!isStarted || countdown !== null) return
    if (!containerRef.current) return

    gameRef.current = createGame(containerRef.current)
    const handleLoss = () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
      setIsStarted(false)
      setCountdown(null)
      setIsLost(true)
    }
    let disposed = false
    let sceneRef: Phaser.Scene | null = null
    const attachLossListener = () => {
      const scene = gameRef.current?.scene?.getScene('BoardScene')
      if (scene) {
        sceneRef = scene
        scene.events.once('player-lost', handleLoss)
        scene.events.on('score-update', setScore)
        return
      }
      if (!disposed) {
        window.requestAnimationFrame(attachLossListener)
      }
    }

    attachLossListener()

    return () => {
      disposed = true
      sceneRef?.events.off('player-lost', handleLoss)
      sceneRef?.events.off('score-update', setScore)
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [isStarted, countdown])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      setIsStarted(true)
      return
    }

    const timer = window.setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (score > 0 && score % 10 === 0) {
      setScorePopKey((prev) => prev + 1)
    }
  }, [score])

  const handleStart = () => {
    setIsLost(false)
    setScore(0)
    setCountdown(3)
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        overflow: 'hidden',
        background: '#1e1e1e',
      }}
    >
      <style>{`
        @keyframes scorePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: 700,
        }}
      >
        <div
          key={scorePopKey}
          style={{
            animation: score > 0 && score % 10 === 0 ? 'scorePop 300ms ease-out' : 'none',
          }}
        >
          Score: {score}
        </div>
      </div>
      {!isStarted && !isLost && (
        <div
          style={{
            width: '100%',
            height: 'calc(100% - 64px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: '#ffffff',
          }}
        >
          <h1 style={{ margin: 0 }}>Dashboard Dash</h1>
          <p style={{ margin: 0 }}>Swipe to move. Keep sliding in one direction.</p>
          <button
            onClick={handleStart}
            disabled={countdown !== null}
            style={{
              padding: '12px 20px',
              borderRadius: '999px',
              border: 'none',
              background: '#00ff88',
              color: '#0b0b0b',
              fontWeight: 700,
              cursor: countdown === null ? 'pointer' : 'default',
            }}
          >
            Start Game
          </button>
          {countdown !== null && (
            <div style={{ fontSize: '40px', fontWeight: 800 }}>{countdown}</div>
          )}
        </div>
      )}
      {isLost && (
        <div
          style={{
            width: '100%',
            height: 'calc(100% - 64px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: '#ffffff',
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: '28px' }}>Score: {score}</p>
          <button
            onClick={handleStart}
            style={{
              padding: '12px 20px',
              borderRadius: '999px',
              border: 'none',
              background: '#00ff88',
              color: '#0b0b0b',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100% - 64px)',
          touchAction: 'none',
          display: isStarted ? 'block' : 'none',
        }}
      />
    </div>
  )
}
