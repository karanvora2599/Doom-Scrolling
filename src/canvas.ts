import * as THREE from "three"
import { Dimensions, Size } from "./types/types"
import GUI from "lil-gui"
import Scroll from "./scroll"
import Magazine from "./magazine"
import Popup from "./popup"
import { Book } from "./books"

interface Props {
  scroll: Scroll
  books: Book[]
}

export default class Canvas {
  element: HTMLCanvasElement
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  sizes: Size
  dimensions: Dimensions
  time: number
  clock: THREE.Clock
  debug: GUI
  scroll: Scroll
  magazine: Magazine
  popup: Popup
  books: Book[]
  bookStripTitle: HTMLElement
  bookStripRank: HTMLElement
  lastActiveBookIndex: number = -1

  constructor({ scroll, books }: Props) {
    this.scroll = scroll
    this.books = books
    this.element = document.getElementById("webgl") as HTMLCanvasElement
    this.time = 0

    this.createClock()
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.setSizes()
    this.createDebug()
    this.createMagazine()
    this.addEventListeners()

    this.popup = new Popup()
    this.bookStripTitle = document.getElementById("book-strip-title")!
    this.bookStripRank = document.getElementById("book-strip-rank")!

    this.debug.hide()
  }

  createScene() {
    this.scene = new THREE.Scene()
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.scene.add(this.camera)
    this.camera.position.z = 6
  }

  createMagazine() {
    this.magazine = new Magazine({
      scene: this.scene,
      debug: this.debug,
      sizes: this.sizes,
      books: this.books,
    })
  }

  createRenderer() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }
    this.renderer = new THREE.WebGLRenderer({ canvas: this.element, alpha: true })
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
  }

  createDebug() {
    this.debug = new GUI()
  }

  setSizes() {
    const fov = this.camera.fov * (Math.PI / 180)
    const height = this.camera.position.z * Math.tan(fov / 2) * 2
    const width = height * this.camera.aspect
    this.sizes = { width, height }
  }

  createClock() {
    this.clock = new THREE.Clock()
  }

  onClick() {
    if (!this.magazine?.isReady || this.popup.isOpen) return
    const idx = this.magazine.getFrontmostBookIndex()
    const book = this.magazine.books[idx]
    if (idx >= 0 && book) {
      this.popup.show(book)
    }
  }

  addEventListeners() {
    window.addEventListener("resize", this.onResize.bind(this))
    window.addEventListener("click", this.onClick.bind(this))
  }

  onResize() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.setSizes()
    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
    this.magazine?.onResize(this.sizes)
  }

  render() {
    this.time = this.clock.getElapsedTime()
    this.renderer.render(this.scene, this.camera)
    this.magazine?.render()
    this.updateBookStrip()
  }

  updateBookStrip() {
    if (!this.magazine?.isReady || this.magazine.books.length === 0) return
    const idx = this.magazine.activeBookIndex
    if (idx === this.lastActiveBookIndex) return
    this.lastActiveBookIndex = idx
    const book = this.magazine.books[idx]
    if (!book) return
    this.bookStripTitle.textContent = `${book.title}  —  ${book.author}`
    this.bookStripRank.textContent = `#${book.rank} This Week  ·  Click to learn more`
  }
}
