import Phaser from 'phaser'

export default class BoardScene extends Phaser.Scene {
  private tileSize = 64
  private cols = 5
  private rows = 5
  private boardOriginX = 0
  private boardOriginY = 0

  private tiles: Phaser.GameObjects.Rectangle[][] = []
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
  private visitCounts: number[][] = []

  private moveSpeed = 110
  private swipeThreshold = 30

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

    for (let y = 0; y < this.rows; y++) {
      const row: Phaser.GameObjects.Rectangle[] = []
      for (let x = 0; x < this.cols; x++) {
        const center = this.gridToPixel(x, y)
        const tile = this.add.rectangle(center.x, center.y, this.tileSize, this.tileSize, 0x000000, 0)
        tile.setStrokeStyle(2, 0xffffff, 1)
        row.push(tile)
      }
      this.tiles.push(row)
    }
  }

  private createPlayer() {
    const center = this.gridToPixel(this.playerGridX, this.playerGridY)

    this.player = this.add.circle(center.x, center.y, this.tileSize * 0.28, 0x00ff88)
    this.player.setDepth(1)
    this.incrementScore(1)
    this.markVisited(this.playerGridX, this.playerGridY)
  }

  private createCoin() {
    this.coin = this.add.circle(0, 0, this.tileSize * 0.14, 0xffd34d)
    this.coin.setStrokeStyle(2, 0xf2b400, 1)
    this.coin.setDepth(0)
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
    const duration = Math.max(100, (distance / this.moveSpeed) * 1000)

    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration,
      ease: 'Sine.easeInOut',
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

  private updateTileStyle(gridX: number, gridY: number) {
    const tile = this.tiles[gridY]?.[gridX]
    if (!tile) return
    if (this.coinsCollected >= 5 && this.visitCounts[gridY][gridX] >= 2) {
      tile.setStrokeStyle(2, 0xff4040, 1)
    } else {
      tile.setStrokeStyle(2, 0xffffff, 1)
    }
  }

  private collectCoinIfNeeded() {
    if (this.playerGridX !== this.coinGridX || this.playerGridY !== this.coinGridY) return
    this.incrementScore(10)
    this.moveSpeed *= 1.01
    this.coinsCollected += 1
    this.spawnCoinBurst()
    this.resetVisitCounts()
    this.markVisited(this.playerGridX, this.playerGridY)
    this.placeCoin()
  }

  private incrementScore(amount: number) {
    this.score += amount
    this.events.emit('score-update', this.score)
  }

  private spawnCoinBurst() {
    const center = this.gridToPixel(this.coinGridX, this.coinGridY)
    const burst = this.add.text(center.x, center.y, '+10', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffd34d',
      stroke: '#3b2a00',
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
