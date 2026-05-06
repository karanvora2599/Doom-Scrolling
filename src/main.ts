import "./style.css"
import Canvas from "./canvas"
import Scroll from "./scroll"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { fetchNYTBooks, fetchList, BACKGROUND_LISTS, Book } from "./books"

gsap.registerPlugin(ScrollTrigger)

const NYT_API_KEY = import.meta.env.VITE_NYT_API_KEY as string | undefined

class App {
  canvas: Canvas
  scroll: Scroll

  constructor(books: Book[]) {
    this.scroll = new Scroll()
    this.canvas = new Canvas({ scroll: this.scroll, books })
    this.render()
  }

  render() {
    this.canvas.render()
    requestAnimationFrame(this.render.bind(this))
  }
}

async function loadExtraLists(app: App) {
  for (const list of BACKGROUND_LISTS) {
    try {
      const newBooks = await fetchList(NYT_API_KEY!, list)
      await app.canvas.magazine.extendFeed(newBooks)
    } catch {
      // silently skip failed lists
    }
  }
}

async function init() {
  const loadingScreen = document.getElementById("loading-screen")!
  const loadingMessage = document.getElementById("loading-message")!

  if (!NYT_API_KEY) {
    loadingMessage.textContent =
      'Set VITE_NYT_API_KEY in your .env file and restart the dev server.'
    loadingScreen.classList.add("is-error")
    return
  }

  try {
    loadingMessage.textContent = "Fetching Best Sellers list…"
    const books = await fetchNYTBooks(NYT_API_KEY)

    loadingMessage.textContent = "Loading book covers…"

    // Give cover loading a brief head-start before starting the app
    await new Promise((r) => setTimeout(r, 200))

    const app = new App(books)

    gsap.to(loadingScreen, {
      opacity: 0,
      duration: 0.8,
      delay: 0.3,
      ease: "power2.inOut",
      onComplete: () => {
        loadingScreen.style.display = "none"
      },
    })

    loadExtraLists(app)
  } catch (err) {
    loadingMessage.textContent = `Error: ${(err as Error).message}`
    loadingScreen.classList.add("is-error")
  }
}

init()
