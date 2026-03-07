import Phaser from 'phaser'

export default class BoardScene extends Phaser.Scene {
  private tileSize = 64
  private cols = 5
  private rows = 5
  private boardOriginX = 0
  private boardOriginY = 0

  private tiles: Phaser.GameObjects.Rectangle[][] = []
  private tileVeins: Phaser.GameObjects.Graphics[][] = []
  private activeTile: Phaser.GameObjects.Rectangle | null = null

  private player!: Phaser.GameObjects.Arc
  private playerGridX = 0
  private playerGridY = 0
  private isStepping = false
  private currentDir: { x: number; y: number } | null = null
  private coin!: Phaser.GameObjects.Arc
  private coinGridX = 0
  private coinGridY = 0
  private coinsCollected = 0
  private score = 0
  private lastWaveScore = 0
  private waveActive = false
  private visitCounts: number[][] = []

  private moveSpeed = 110
  private swipeThreshold = 30
  private boardFillColor = 0x1a2333
  private boardStrokeColor = 0xc67a42

  constructor() {
    super('BoardScene')
  }

  create() {
    this.layoutBoard()
    this.buildBoard()
    this.resetVisitCounts()
    this.createPlayer()
    this.createCoin()
    this.setupInput()
    this.setActiveTile(this.playerGridX, this.playerGridY)

    this.scale.on('resize', this.handleResize, this)
  }

  private layoutBoard() {
    const width = this.scale.width
    const height = this.scale.height
    const boardSize = Math.min(width, height)

    this.tileSize = boardSize / this.cols
    this.boardOriginX = (width - this.tileSize * this.cols) / 2
    this.boardOriginY = (height - this.tileSize * this.rows) / 2
  }

  private buildBoard() {
    this.tiles.forEach((row) => row.forEach((tile) => tile.destroy()))
    this.tiles = []
    this.tileVeins.forEach((row) => row.forEach((veins) => veins.destroy()))
    this.tileVeins = []

    for (let y = 0; y < this.rows; y++) {
      const row: Phaser.GameObjects.Rectangle[] = []
      const veinsRow: Phaser.GameObjects.Graphics[] = []
      for (let x = 0; x < this.cols; x++) {
        const center = this.gridToPixel(x, y)
        const tile = this.add.rectangle(center.x, center.y, this.tileSize, this.tileSize, 0x000000, 0)
        tile.setStrokeStyle(2, this.boardStrokeColor, 1)
        tile.setFillStyle(this.boardFillColor, 1)
        tile.setDepth(1)
        row.push(tile)
        const veins = this.add.graphics()
        this.redrawVeins(veins, center.x - this.tileSize / 2, center.y - this.tileSize / 2)
        veins.setDepth(2)
        veinsRow.push(veins)
      }
      this.tiles.push(row)
      this.tileVeins.push(veinsRow)
    }
  }

  private createPlayer() {
    const center = this.gridToPixel(this.playerGridX, this.playerGridY)

    this.player = this.add.circle(center.x, center.y, this.tileSize * 0.28, 0xeda16b)
    this.player.setDepth(1)
    this.incrementScore(1)
    this.markVisited(this.playerGridX, this.playerGridY)
  }

  private createCoin() {
    this.coin = this.add.circle(0, 0, this.tileSize * 0.14, 0xe5cec9)
    this.coin.setStrokeStyle(2, 0xc67a42, 1)
    this.coin.setDepth(3)
    this.placeCoin()
  }

  private placeCoin() {
    let attempts = 0
    do {
      this.coinGridX = Phaser.Math.Between(0, this.cols - 1)
      this.coinGridY = Phaser.Math.Between(0, this.rows - 1)
      attempts += 1
    } while (
      attempts < 50 &&
      this.coinGridX === this.playerGridX &&
      this.coinGridY === this.playerGridY
    )

    const center = this.gridToPixel(this.coinGridX, this.coinGridY)
    this.coin.setPosition(center.x, center.y)
    this.coin.setRadius(this.tileSize * 0.14)
  }

  private setupInput() {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          this.setDirection(0, -1)
          break
        case 'ArrowDown':
          this.setDirection(0, 1)
          break
        case 'ArrowLeft':
          this.setDirection(-1, 0)
          break
        case 'ArrowRight':
          this.setDirection(1, 0)
          break
      }
    })

    let startX = 0
    let startY = 0

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      startX = pointer.x
      startY = pointer.y
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - startX
      const dy = pointer.y - startY
      const distance = Math.max(Math.abs(dx), Math.abs(dy))

      if (distance < this.swipeThreshold) return

      if (Math.abs(dx) > Math.abs(dy)) {
        this.setDirection(dx > 0 ? 1 : -1, 0)
      } else {
        this.setDirection(0, dy > 0 ? 1 : -1)
      }
    })
  }

  private setDirection(dx: number, dy: number) {
    this.currentDir = { x: dx, y: dy }

    this.stepMove()
  }

  private stepMove() {
    if (!this.currentDir || this.isStepping) return

    const nextX = this.playerGridX + this.currentDir.x
    const nextY = this.playerGridY + this.currentDir.y

    if (nextX < 0 || nextX >= this.cols || nextY < 0 || nextY >= this.rows) {
      this.handleLoss()
      return
    }

    if (this.coinsCollected >= 5 && this.isBlocked(nextX, nextY)) {
      this.handleLoss()
      return
    }

    this.playerGridX = nextX
    this.playerGridY = nextY

    const target = this.gridToPixel(nextX, nextY)
    this.isStepping = true
    this.setActiveTile(nextX, nextY)
    this.incrementScore(1)
    this.collectCoinIfNeeded()
    this.markVisited(nextX, nextY)

    const distance = this.tileSize
    const duration = Math.max(60, (distance / this.moveSpeed) * 1000)

    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.isStepping = false
        if (this.currentDir) {
          this.stepMove()
        }
      },
    })
  }

  private setActiveTile(gridX: number, gridY: number) {
    const nextTile = this.tiles[gridY]?.[gridX]
    if (!nextTile || nextTile === this.activeTile) return

    if (this.activeTile) {
      this.tweens.add({
        targets: this.activeTile,
        scale: 1,
        duration: 120,
        ease: 'Sine.easeOut',
      })
    }

    this.activeTile = nextTile
    this.tweens.add({
      targets: this.activeTile,
      scale: 1.08,
      duration: 120,
      ease: 'Sine.easeOut',
    })
  }

  private handleLoss() {
    this.currentDir = null
    this.events.emit('player-lost')
  }

  private handleResize() {
    this.layoutBoard()

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y]?.[x]
        if (!tile) continue
        const center = this.gridToPixel(x, y)
        tile.setPosition(center.x, center.y)
        tile.setSize(this.tileSize, this.tileSize)
        tile.setDisplaySize(this.tileSize, this.tileSize)
        const veins = this.tileVeins[y]?.[x]
        if (veins) {
          this.redrawVeins(veins, center.x - this.tileSize / 2, center.y - this.tileSize / 2)
        }
      }
    }

    const playerCenter = this.gridToPixel(this.playerGridX, this.playerGridY)
    this.player.setPosition(playerCenter.x, playerCenter.y)
    this.player.setRadius(this.tileSize * 0.28)
    this.setActiveTile(this.playerGridX, this.playerGridY)
    this.placeCoin()
  }

  private resetVisitCounts() {
    this.visitCounts = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => 0)
    )
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.updateTileStyle(x, y)
      }
    }
  }

  private markVisited(gridX: number, gridY: number) {
    this.visitCounts[gridY][gridX] += 1
    this.updateTileStyle(gridX, gridY)
  }

  private isBlocked(gridX: number, gridY: number) {
    return this.visitCounts[gridY][gridX] >= 2
  }

  private updateTileStyle(gridX: number, gridY: number, force = false) {
    const tile = this.tiles[gridY]?.[gridX]
    if (!tile) return
    if (this.waveActive && !force) return
    if (this.coinsCollected >= 5 && this.visitCounts[gridY][gridX] >= 2) {
      tile.setStrokeStyle(2, 0xff4040, 1)
    } else {
      tile.setStrokeStyle(2, this.boardStrokeColor, 1)
    }
    tile.setFillStyle(this.boardFillColor, 1)
  }

  private redrawVeins(veins: Phaser.GameObjects.Graphics, x: number, y: number) {
    const w = this.tileSize
    veins.clear()
    veins.setPosition(x, y)
    for (let i = 0; i < 3; i++) {
      const color = i % 2 === 0 ? 0x575861 : 0xe5cec9
      veins.lineStyle(1, color, 0.22)
      const startX = Phaser.Math.Between(0, w)
      const startY = Phaser.Math.Between(0, w)
      const endX = Phaser.Math.Between(0, w)
      const endY = Phaser.Math.Between(0, w)
      veins.beginPath()
      veins.moveTo(startX, startY)
      veins.lineTo(endX, endY)
      veins.strokePath()
    }
  }

  private collectCoinIfNeeded() {
    if (this.playerGridX !== this.coinGridX || this.playerGridY !== this.coinGridY) return
    this.incrementScore(10)
    this.moveSpeed *= 1.02
    this.coinsCollected += 1
    this.spawnCoinBurst()
    this.resetVisitCounts()
    this.markVisited(this.playerGridX, this.playerGridY)
    this.placeCoin()
  }

  private incrementScore(amount: number) {
    const previousScore = this.score
    this.score += amount
    this.events.emit('score-update', this.score)
    const previousBucket = Math.floor(previousScore / 100)
    const nextBucket = Math.floor(this.score / 100)
    if (nextBucket > previousBucket) {
      this.lastWaveScore = nextBucket * 100
      this.spawnRainbowWave()
    }
  }

  private spawnRainbowWave() {
    this.waveActive = true
    const colors = [0x282325, 0x575861, 0x8d8d9b, 0xc67a42, 0xeda16b, 0xe5cec9]
    const diagCount = this.cols + this.rows - 1
    const stepDelay = 32

    for (let d = 0; d < diagCount; d++) {
      this.time.delayedCall(d * stepDelay, () => {
        const color = colors[d % colors.length]
        for (let y = 0; y < this.rows; y++) {
          for (let x = 0; x < this.cols; x++) {
            if (x + y !== d) continue
            const tile = this.tiles[y]?.[x]
            if (!tile) continue
            tile.setFillStyle(color, 0)
            tile.setStrokeStyle(2, color, 1)
            this.tweens.add({
              targets: tile,
              fillAlpha: 0.85,
              duration: 120,
              yoyo: true,
              ease: 'Sine.easeInOut',
            })
            const center = this.gridToPixel(x, y)
            this.spawnFuseGlow(center.x, center.y, color)
            this.spawnSparkles(center.x, center.y, color)
          }
        }
      })
    }

    this.time.delayedCall(diagCount * stepDelay + 200, () => {
      this.waveActive = false
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          this.updateTileStyle(x, y, true)
        }
      }
    })
  }

  private spawnFuseGlow(x: number, y: number, color: number) {
    const glow = this.add.circle(x, y, this.tileSize * 0.18, color, 0.9)
    glow.setBlendMode(Phaser.BlendModes.ADD)
    glow.setDepth(5)
    this.tweens.add({
      targets: glow,
      scale: 1.6,
      alpha: 0,
      duration: 190,
      ease: 'Sine.easeOut',
      onComplete: () => glow.destroy(),
    })
  }

  private spawnSparkles(x: number, y: number, color: number) {
    const count = 4
    for (let i = 0; i < count; i++) {
      const sparkle = this.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(2, 4),
        color
      )
      sparkle.setAlpha(0.9)
      sparkle.setDepth(4)
      this.tweens.add({
        targets: sparkle,
        y: sparkle.y - Phaser.Math.Between(12, 22),
        alpha: 0,
        scale: 1.6,
        duration: 280,
        ease: 'Quad.easeOut',
        onComplete: () => sparkle.destroy(),
      })
    }
  }

  private spawnCoinBurst() {
    const center = this.gridToPixel(this.coinGridX, this.coinGridY)
    const burst = this.add.text(center.x, center.y, '+10', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#eda16b',
      stroke: '#282325',
      strokeThickness: 3,
    })
    burst.setOrigin(0.5)
    burst.setDepth(3)

    this.tweens.add({
      targets: burst,
      y: center.y - this.tileSize * 0.4,
      alpha: 0,
      scale: 1.5,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    })
  }

  private gridToPixel(gridX: number, gridY: number) {
    return {
      x: this.boardOriginX + gridX * this.tileSize + this.tileSize / 2,
      y: this.boardOriginY + gridY * this.tileSize + this.tileSize / 2,
    }
  }
}
