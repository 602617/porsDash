import Phaser from 'phaser'

type Direction = { x: number; y: number }

type BoardTheme = {
  fill: number
  stroke: number
  blocked: number
  vein: [number, number]
  background: number
  player: number
  coin: number
  coinStroke: number
}

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
  private moveProgress = 0
  private currentDir: Direction | null = null
  private queuedDir: Direction | null = null
  private coin!: Phaser.GameObjects.Arc
  private coinGridX = 0
  private coinGridY = 0
  private coinsCollected = 0
  private score = 0
  private waveActive = false
  private discoActive = false
  private discoTimer: Phaser.Time.TimerEvent | null = null
  private discoPhase = 0
  private visitCounts: number[][] = []

  private readonly boardThemes: BoardTheme[] = [
    {
      fill: 0x1a2333,
      stroke: 0xc67a42,
      blocked: 0xff4040,
      vein: [0x575861, 0xe5cec9],
      background: 0x282325,
      player: 0xeda16b,
      coin: 0xe5cec9,
      coinStroke: 0xc67a42,
    },
    {
      fill: 0x102a43,
      stroke: 0x3dd6d0,
      blocked: 0xff5e78,
      vein: [0x1f6f8b, 0xa9f1df],
      background: 0x081b29,
      player: 0x52b3d9,
      coin: 0xe1fffb,
      coinStroke: 0x3dd6d0,
    },
    {
      fill: 0x18230f,
      stroke: 0x8bc34a,
      blocked: 0xff7043,
      vein: [0x355e3b, 0xd4e157],
      background: 0x0c1309,
      player: 0xc5e478,
      coin: 0xf2ff9f,
      coinStroke: 0x8bc34a,
    },
    {
      fill: 0x24163f,
      stroke: 0xff5db1,
      blocked: 0xffaa5e,
      vein: [0x5d3f8c, 0xffb3e6],
      background: 0x130a25,
      player: 0xff7ecf,
      coin: 0xffd6f0,
      coinStroke: 0xff5db1,
    },
    {
      fill: 0x2b1710,
      stroke: 0xff7f50,
      blocked: 0xffe066,
      vein: [0x6b2f1a, 0xffb36b],
      background: 0x1a0f0b,
      player: 0xff9966,
      coin: 0xffd5a6,
      coinStroke: 0xff7f50,
    },
    {
      fill: 0x0f2d2b,
      stroke: 0x5ce1c6,
      blocked: 0xff6b6b,
      vein: [0x1f6f67, 0xb2fff0],
      background: 0x071716,
      player: 0x7fffd4,
      coin: 0xdbfff7,
      coinStroke: 0x5ce1c6,
    },
  ]
  private currentThemeIndex = 0
  private readonly discoPalette = [0x282325, 0x575861, 0x8d8d9b, 0xc67a42, 0xeda16b, 0xe5cec9]

  private moveSpeed = 220
  private swipeThreshold = 18
  private boardFillColor = this.boardThemes[0].fill
  private boardStrokeColor = this.boardThemes[0].stroke
  private blockedStrokeColor = this.boardThemes[0].blocked
  private veinPrimaryColor = this.boardThemes[0].vein[0]
  private veinSecondaryColor = this.boardThemes[0].vein[1]

  constructor() {
    super('BoardScene')
  }

  create() {
    this.currentDir = null
    this.queuedDir = null
    this.moveProgress = 0
    this.discoActive = false
    this.discoPhase = 0
    this.discoTimer?.remove(false)
    this.discoTimer = null
    this.layoutBoard()
    this.buildBoard()
    this.resetVisitCounts()
    this.createPlayer()
    this.createCoin()
    this.applyTheme(this.currentThemeIndex)
    this.setupInput()
    this.setActiveTile(this.playerGridX, this.playerGridY)

    this.scale.on('resize', this.handleResize, this)
    this.events.once('shutdown', () => {
      this.discoTimer?.remove(false)
      this.discoTimer = null
    })
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
    const theme = this.getCurrentTheme()

    this.player = this.add.circle(center.x, center.y, this.tileSize * 0.28, theme.player)
    this.player.setDepth(1)
    this.incrementScore(1)
    this.markVisited(this.playerGridX, this.playerGridY)
  }

  private createCoin() {
    const theme = this.getCurrentTheme()
    this.coin = this.add.circle(0, 0, this.tileSize * 0.14, theme.coin)
    this.coin.setStrokeStyle(2, theme.coinStroke, 1)
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

    let anchorX = 0
    let anchorY = 0

    const trySetDirectionFromDelta = (dx: number, dy: number) => {
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      if (distance < this.swipeThreshold) return false

      if (Math.abs(dx) > Math.abs(dy)) {
        this.setDirection(dx > 0 ? 1 : -1, 0)
      } else {
        this.setDirection(0, dy > 0 ? 1 : -1)
      }

      return true
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      anchorX = pointer.x
      anchorY = pointer.y
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return
      const changed = trySetDirectionFromDelta(pointer.x - anchorX, pointer.y - anchorY)
      if (changed) {
        anchorX = pointer.x
        anchorY = pointer.y
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      trySetDirectionFromDelta(pointer.x - anchorX, pointer.y - anchorY)
    })
  }

  private setDirection(dx: number, dy: number) {
    const nextDir: Direction = { x: dx, y: dy }
    if (!this.currentDir) {
      this.currentDir = nextDir
      return
    }

    if (this.moveProgress === 0 && this.canMoveInDirection(nextDir)) {
      this.currentDir = nextDir
      this.queuedDir = null
      return
    }

    this.queuedDir = nextDir
  }

  private canMoveInDirection(direction: Direction) {
    const nextX = this.playerGridX + direction.x
    const nextY = this.playerGridY + direction.y

    if (nextX < 0 || nextX >= this.cols || nextY < 0 || nextY >= this.rows) {
      return false
    }

    if (this.coinsCollected >= 5 && this.isBlocked(nextX, nextY)) {
      return false
    }

    return true
  }

  private selectDirectionForStep(): Direction | null {
    if (this.queuedDir) {
      const queued = this.queuedDir
      this.queuedDir = null

      if (this.canMoveInDirection(queued)) {
        return queued
      }
    }

    return this.currentDir
  }

  update(_time: number, delta: number) {
    if (delta <= 0 || !this.currentDir) return
    this.updateMovement(delta)
  }

  private updateMovement(delta: number) {
    let remainingDistance = (this.moveSpeed * delta) / 1000

    while (remainingDistance > 0 && this.currentDir) {
      if (this.moveProgress === 0) {
        const direction = this.selectDirectionForStep()
        if (!direction) return
        this.currentDir = direction

        if (!this.canMoveInDirection(direction)) {
          this.handleLoss()
          return
        }
      }

      const direction = this.currentDir
      const distanceToTileCenter = this.tileSize - this.moveProgress
      const travel = Math.min(distanceToTileCenter, remainingDistance)

      this.player.x += direction.x * travel
      this.player.y += direction.y * travel
      this.moveProgress += travel
      remainingDistance -= travel

      if (this.moveProgress < this.tileSize - 0.001) continue

      this.playerGridX += direction.x
      this.playerGridY += direction.y
      const center = this.gridToPixel(this.playerGridX, this.playerGridY)
      this.player.setPosition(center.x, center.y)
      this.moveProgress = 0
      this.setActiveTile(this.playerGridX, this.playerGridY)
      this.incrementScore(1)
      this.collectCoinIfNeeded()
      this.markVisited(this.playerGridX, this.playerGridY)
      this.pumpPlayerIfDisco()
    }
  }

  private setActiveTile(gridX: number, gridY: number) {
    const nextTile = this.tiles[gridY]?.[gridX]
    if (!nextTile || nextTile === this.activeTile) return

    if (this.activeTile) {
      this.tweens.add({
        targets: this.activeTile,
        scale: 1,
        duration: 70,
        ease: 'Sine.easeOut',
      })
    }

    this.activeTile = nextTile
    this.tweens.add({
      targets: this.activeTile,
      scale: 1.03,
      duration: 70,
      ease: 'Sine.easeOut',
    })
  }

  private handleLoss() {
    this.currentDir = null
    this.queuedDir = null
    this.moveProgress = 0
    if (this.discoActive || this.discoTimer) {
      this.stopDiscoMode()
    }
    this.events.emit('player-lost')
  }

  private handleResize() {
    this.layoutBoard()
    this.moveProgress = 0

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
    if (this.discoActive && !force) return
    if (this.coinsCollected >= 5 && this.visitCounts[gridY][gridX] >= 2) {
      tile.setStrokeStyle(2, this.blockedStrokeColor, 1)
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
      const color = i % 2 === 0 ? this.veinPrimaryColor : this.veinSecondaryColor
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
    const speedMultiplier = this.score >= 200 ? 1.012 : 1.03
    this.moveSpeed *= speedMultiplier
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
    this.syncDiscoState(previousScore, this.score)
    const previousBucket = Math.floor(previousScore / 100)
    const nextBucket = Math.floor(this.score / 100)
    if (nextBucket > previousBucket) {
      this.spawnRainbowWave(() => {
        this.applyTheme(nextBucket % this.boardThemes.length)
      })
    }
  }

  private spawnRainbowWave(onComplete?: () => void) {
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
      if (onComplete) {
        onComplete()
        return
      }
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          this.updateTileStyle(x, y, true)
        }
      }
    })
  }

  private isDiscoScore(score: number) {
    return score >= 500 && score < 600
  }

  private syncDiscoState(previousScore: number, nextScore: number) {
    const wasDisco = this.isDiscoScore(previousScore)
    const isDisco = this.isDiscoScore(nextScore)

    if (!wasDisco && isDisco) {
      this.startDiscoMode()
      return
    }

    if (wasDisco && !isDisco) {
      this.stopDiscoMode()
    }
  }

  private startDiscoMode() {
    if (this.discoActive) return
    this.discoActive = true
    this.discoPhase = 0
    this.discoTimer?.remove(false)
    this.applyDiscoFrame()
    this.discoTimer = this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => this.applyDiscoFrame(),
    })
  }

  private stopDiscoMode() {
    this.discoActive = false
    this.discoTimer?.remove(false)
    this.discoTimer = null
    this.tweens.killTweensOf(this.player)
    this.player.setScale(1)
    this.applyTheme(this.currentThemeIndex)
  }

  private applyDiscoFrame() {
    if (!this.discoActive) return

    const phase = this.discoPhase
    const palette = this.discoPalette
    const paletteLen = palette.length
    this.cameras.main.setBackgroundColor(palette[phase % paletteLen])

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.tiles[y]?.[x]
        if (!tile) continue
        const fill = palette[(phase + x + y) % paletteLen]
        const stroke = palette[(phase + x * 2 + y + 2) % paletteLen]
        tile.setFillStyle(fill, 1)
        tile.setStrokeStyle(2, stroke, 1)
      }
    }

    this.player.setFillStyle(palette[(phase + 3) % paletteLen], 1)
    this.coin.setFillStyle(palette[(phase + 5) % paletteLen], 1)
    this.coin.setStrokeStyle(2, palette[(phase + 1) % paletteLen], 1)
    this.discoPhase = (phase + 1) % paletteLen
  }

  private pumpPlayerIfDisco() {
    if (!this.discoActive) return
    this.tweens.killTweensOf(this.player)
    this.player.setScale(1)
    this.tweens.add({
      targets: this.player,
      scale: 1.18,
      duration: 110,
      yoyo: true,
      ease: 'Sine.easeInOut',
    })
  }

  private getCurrentTheme() {
    return this.boardThemes[this.currentThemeIndex]
  }

  private applyTheme(themeIndex: number) {
    const len = this.boardThemes.length
    this.currentThemeIndex = ((themeIndex % len) + len) % len
    const theme = this.getCurrentTheme()

    this.boardFillColor = theme.fill
    this.boardStrokeColor = theme.stroke
    this.blockedStrokeColor = theme.blocked
    this.veinPrimaryColor = theme.vein[0]
    this.veinSecondaryColor = theme.vein[1]

    this.cameras.main.setBackgroundColor(theme.background)

    this.player.setFillStyle(theme.player, 1)
    this.coin.setFillStyle(theme.coin, 1)
    this.coin.setStrokeStyle(2, theme.coinStroke, 1)

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const center = this.gridToPixel(x, y)
        const veins = this.tileVeins[y]?.[x]
        if (veins) {
          this.redrawVeins(veins, center.x - this.tileSize / 2, center.y - this.tileSize / 2)
        }
        this.updateTileStyle(x, y, true)
      }
    }
  }

  private toCssColor(color: number) {
    return `#${color.toString(16).padStart(6, '0')}`
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
    const theme = this.getCurrentTheme()
    const center = this.gridToPixel(this.coinGridX, this.coinGridY)
    const burst = this.add.text(center.x, center.y, '+10', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: this.toCssColor(theme.player),
      stroke: this.toCssColor(theme.background),
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
