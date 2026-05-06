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
  uvs: { xStart: number; xEnd: number; yStart: number; yEnd: number }
}

const ATLAS_COLS = 10
const COVER_W = 256
const COVER_H = 384

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
  feedOffset: number = 0

  private loadedImages: HTMLImageElement[] = []

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
      this.updateFeedUVs()

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

  private buildAtlas(images: HTMLImageElement[]) {
    const totalRows = Math.ceil(images.length / ATLAS_COLS)
    const atlasW = ATLAS_COLS * COVER_W
    const atlasH = totalRows * COVER_H

    const canvas = document.createElement("canvas")
    canvas.width = atlasW
    canvas.height = atlasH
    const ctx = canvas.getContext("2d")!

    ctx.fillStyle = "#131313"
    ctx.fillRect(0, 0, atlasW, atlasH)

    this.imageInfos = images.map((img, idx) => {
      const col = idx % ATLAS_COLS
      const row = Math.floor(idx / ATLAS_COLS)

      const tileX = col * COVER_W
      const tileY = row * COVER_H

      const scale = Math.max(COVER_W / img.width, COVER_H / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const dx = tileX + (COVER_W - w) / 2
      const dy = tileY + (COVER_H - h) / 2

      ctx.drawImage(img, dx, dy, w, h)

      return {
        uvs: {
          xStart: col / ATLAS_COLS,
          xEnd: (col + 1) / ATLAS_COLS,
          yStart: 1 - (row + 1) / totalRows,
          yEnd: 1 - row / totalRows,
        },
      }
    })

    if (this.atlasTexture) {
      this.atlasTexture.image = canvas
      this.atlasTexture.needsUpdate = true
    } else {
      this.atlasTexture = new THREE.Texture(canvas)
      this.atlasTexture.needsUpdate = true
    }
  }

  async loadTextureAtlas() {
    const images = await Promise.all(this.books.map((b) => loadBookCover(b)))
    this.loadedImages = images
    this.buildAtlas(images)
  }

  async extendFeed(newBooks: Book[]) {
    const existingTitles = new Set(this.books.map((b) => b.title))
    const unique = newBooks.filter((b) => !existingTitles.has(b.title))
    if (unique.length === 0) return

    const newImages = await Promise.all(unique.map((b) => loadBookCover(b)))
    this.books.push(...unique)
    this.loadedImages.push(...newImages)
    this.buildAtlas(this.loadedImages)
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

  // Replicates shader Z-wrapping math; returns sorted list of meshes front→back.
  private computeMeshRanks(): { i: number; z: number }[] {
    const maxZ = this.meshCount * (this.pageSpacing + this.pageThickness) * 0.5
    const result: { i: number; z: number }[] = []

    for (let i = 0; i < this.meshCount; i++) {
      const boxCenterZ = this.pageSpacing * (-(i - (this.meshCount - 1) * 0.5))
      const centerZProgress = boxCenterZ - this.scrollY.current
      const raw = ((centerZProgress + maxZ) % (2 * maxZ)) + 2 * maxZ
      const wrappedZ = (raw % (2 * maxZ)) - maxZ
      result.push({ i, z: wrappedZ })
    }

    result.sort((a, b) => b.z - a.z) // front (high Z) first
    return result
  }

  updateFeedUVs() {
    if (!this.instancedMesh || this.imageInfos.length === 0) return

    const n = this.imageInfos.length
    this.feedOffset = Math.round(this.scrollY.current)

    const ranks = this.computeMeshRanks()
    const attr = this.instancedMesh.geometry.attributes
      .aTextureCoords as THREE.InstancedBufferAttribute

    let changed = false
    for (let rank = 0; rank < ranks.length; rank++) {
      const { i } = ranks[rank]
      const bookIdx = ((this.feedOffset - rank) % n + n) % n
      const uvs = this.imageInfos[bookIdx].uvs
      const base = i * 4

      if (
        attr.array[base] !== uvs.xStart ||
        attr.array[base + 1] !== uvs.xEnd ||
        attr.array[base + 2] !== uvs.yStart ||
        attr.array[base + 3] !== uvs.yEnd
      ) {
        ;(attr.array as Float32Array)[base] = uvs.xStart
        ;(attr.array as Float32Array)[base + 1] = uvs.xEnd
        ;(attr.array as Float32Array)[base + 2] = uvs.yStart
        ;(attr.array as Float32Array)[base + 3] = uvs.yEnd
        changed = true
      }
    }
    if (changed) attr.needsUpdate = true

    this.activeBookIndex = ((this.feedOffset % n) + n) % n
  }

  getFrontmostBookIndex(): number {
    if (this.books.length === 0) return -1
    const n = this.books.length
    return ((this.feedOffset % n) + n) % n
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

      this.updateFeedUVs()
    }
  }
}
