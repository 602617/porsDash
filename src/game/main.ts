import Phaser from 'phaser'
import BoardScene from './scene/BoardScene'

export function createGame(container: HTMLDivElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: container.clientWidth || window.innerWidth,
    height: container.clientHeight || window.innerHeight,
    backgroundColor: '#282325',
    scene: [BoardScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  })
}
