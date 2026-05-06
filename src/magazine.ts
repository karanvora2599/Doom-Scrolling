import GUI from "lil-gui"
import * as THREE from "three"
import vertexShader from "./shaders/vertex.glsl"
import fragmentShader from "./shaders/fragment.glsl"
import gsap from "gsap"
import normalizeWheel from "normalize-wheel"
import { Size } from "./types/types"
import { Book, loadBookCover } from "./books"

interface Props {
  scene: THREE.Scene
  debug: GUI
  sizes: Size
  books: Book[]
}

interface ImageInfo {
  width: number
  height: number
  aspectRatio: number
  uvs: {
    xStart: number
    xEnd: number
    yStart: number
    yEnd: number
  }
}

const COVER_W = 512
const COVER_H = 768

export default class Magazine {
  scene: THREE.Scene
  instancedMesh: THREE.InstancedMesh
  geometry: THREE.BoxGeometry
  material: THREE.ShaderMaterial
  meshCount: number = 30
  pageThickness: number = 0.01
  pageSpacing: number = 1
  debug: GUI
  pageDimensions: { width: number; height: number }
  scrollY: { target: number; current: number; direction: number }
  sizes: Size
  imageInfos: ImageInfo[] = []
  atlasTexture: THREE.Texture | null = null
  books: Book[]
  activeBookIndex: number = 0
  isReady: boolean = false

  touch: { startX: number; lastX: number; isActive: boolean }

  constructor({ scene, debug, sizes, books }: Props) {
    this.scene = scene
    this.debug = debug
    this.sizes = sizes
    this.books = books

    this.pageDimensions = { width: 2, height: 3 }
    this.scrollY = { target: 0, current: 0, direction: -1 }
    this.touch = { startX: 0, lastX: 0, isActive: false }

    this.createGeometry()

    this.loadTextureAtlas().then(() => {
      this.createMaterial()
      this.createMeshes()

      const anim = gsap.timeline()

      anim.fromTo(
        this.material.uniforms.uProgress,
        { value: 0 },
        { value: 1, duration: 5, ease: "power2.inOut" }
      )
      anim.fromTo(
        this.material.uniforms.uSplitProgress,
        { value: 0 },
        { value: 1, duration: 1, ease: "power2.inOut" },
        "-=0.6"
      )

      anim.call(() => {
        window.addEventListener("wheel", this.onWheel.bind(this))
        this.addTouchListeners()
        this.isReady = true
      })
    })
  }

  async loadTextureAtlas() {
    const images = await Promise.all(
      this.books.map((book) => loadBookCover(book))
    )

    const totalHeight = images.length * COVER_H
    const canvas = document.createElement("canvas")
    canvas.width = COVER_W
    canvas.height = totalHeight
    const ctx = canvas.getContext("2d")!

    let currentY = 0
    this.imageInfos = images.map((img) => {
      // Cover-fit: fill the tile while preserving aspect ratio
      const scale = Math.max(COVER_W / img.width, COVER_H / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const dx = (COVER_W - w) / 2
      const dy = currentY + (COVER_H - h) / 2

      ctx.fillStyle = "#131313"
      ctx.fillRect(0, currentY, COVER_W, COVER_H)
      ctx.drawImage(img, dx, dy, w, h)

      const info: ImageInfo = {
        width: COVER_W,
        height: COVER_H,
        aspectRatio: COVER_W / COVER_H,
        uvs: {
          xStart: 0,
          xEnd: 1,
          yStart: 1 - currentY / totalHeight,
          yEnd: 1 - (currentY + COVER_H) / totalHeight,
        },
      }

      currentY += COVER_H
      return info
    })

    this.atlasTexture = new THREE.Texture(canvas)
    this.atlasTexture.needsUpdate = true
  }

  createMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uProgress: new THREE.Uniform(0),
        uSplitProgress: new THREE.Uniform(0),
        uPageThickness: new THREE.Uniform(this.pageThickness),
        uPageWidth: new THREE.Uniform(this.pageDimensions.width),
        uPageHeight: new THREE.Uniform(this.pageDimensions.height),
        uMeshCount: new THREE.Uniform(this.meshCount),
        uTime: new THREE.Uniform(0),
        uAtlas: new THREE.Uniform(this.atlasTexture),
        uScrollY: { value: 0 },
        uSpeedY: { value: 0 },
        uPageSpacing: new THREE.Uniform(this.pageSpacing),
      },
    })
  }

  onWheel(event: MouseEvent) {
    const normalizedWheel = normalizeWheel(event)
    const scrollY =
      (normalizedWheel.pixelY * this.sizes.height) / window.innerHeight
    this.scrollY.target += scrollY
    this.material.uniforms.uSpeedY.value += scrollY
  }

  addTouchListeners() {
    window.addEventListener("touchstart", this.onTouchStart.bind(this), {
      passive: false,
    })
    window.addEventListener("touchmove", this.onTouchMove.bind(this), {
      passive: false,
    })
    window.addEventListener("touchend", this.onTouchEnd.bind(this), {
      passive: false,
    })
  }

  onTouchStart(event: TouchEvent) {
    event.preventDefault()
    const touch = event.touches[0]
    this.touch.startX = touch.clientX
    this.touch.lastX = touch.clientX
    this.touch.isActive = true
  }

  onTouchMove(event: TouchEvent) {
    if (!this.touch.isActive) return
    event.preventDefault()
    const touch = event.touches[0]
    const deltaX = this.touch.lastX - touch.clientX
    const scrollY = ((deltaX * this.sizes.height) / window.innerHeight) * 2
    this.scrollY.target += scrollY
    this.material.uniforms.uSpeedY.value += scrollY
    this.touch.lastX = touch.clientX
  }

  onTouchEnd(event: TouchEvent) {
    event.preventDefault()
    this.touch.isActive = false
  }

  createGeometry() {
    this.geometry = new THREE.BoxGeometry(
      this.pageDimensions.width,
      this.pageDimensions.height,
      this.pageThickness,
      50,
      50,
      1
    )
  }

  createMeshes() {
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.meshCount
    )

    const aTextureCoords = new Float32Array(this.meshCount * 4)
    const aIndex = new Float32Array(this.meshCount)

    for (let i = 0; i < this.meshCount; i++) {
      const imageIndex = i % this.imageInfos.length
      aTextureCoords[i * 4 + 0] = this.imageInfos[imageIndex].uvs.xStart
      aTextureCoords[i * 4 + 1] = this.imageInfos[imageIndex].uvs.xEnd
      aTextureCoords[i * 4 + 2] = this.imageInfos[imageIndex].uvs.yStart
      aTextureCoords[i * 4 + 3] = this.imageInfos[imageIndex].uvs.yEnd
      aIndex[i] = i
    }

    this.instancedMesh.geometry.setAttribute(
      "aTextureCoords",
      new THREE.InstancedBufferAttribute(aTextureCoords, 4)
    )
    this.instancedMesh.geometry.setAttribute(
      "aIndex",
      new THREE.InstancedBufferAttribute(aIndex, 1)
    )

    this.scene.add(this.instancedMesh)
  }

  // Replicate shader Z-wrapping to find the book visually closest to the camera.
  // Camera is at z=6 looking down -Z; frontmost = largest wrappedZ below 5.5.
  getFrontmostBookIndex(): number {
    if (this.books.length === 0) return -1
    const maxZ =
      this.meshCount * (this.pageSpacing + this.pageThickness) * 0.5
    let bestZ = -Infinity
    let frontIndex = 0

    for (let i = 0; i < this.meshCount; i++) {
      const boxCenterZ =
        this.pageSpacing * (-(i - (this.meshCount - 1) * 0.5))
      const centerZProgress = boxCenterZ - this.scrollY.current
      const raw = ((centerZProgress + maxZ) % (2 * maxZ)) + 2 * maxZ
      const wrappedZ = (raw % (2 * maxZ)) - maxZ

      if (wrappedZ > bestZ && wrappedZ < 5.5) {
        bestZ = wrappedZ
        frontIndex = i % this.books.length
      }
    }

    return frontIndex
  }

  onResize(sizes: Size) {
    this.sizes = sizes
  }

  render() {
    if (this.material) {
      this.scrollY.current = gsap.utils.interpolate(
        this.scrollY.current,
        this.scrollY.target,
        0.12
      )
      this.material.uniforms.uScrollY.value = this.scrollY.current
      this.material.uniforms.uSpeedY.value *= 0.835

      if (this.isReady) {
        this.activeBookIndex = this.getFrontmostBookIndex()
      }
    }
  }
}
