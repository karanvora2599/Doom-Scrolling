import { Book } from "./books"
import gsap from "gsap"

export default class Popup {
  element: HTMLElement
  overlay: HTMLElement
  closeBtn: HTMLElement
  coverImg: HTMLImageElement
  titleEl: HTMLElement
  authorEl: HTMLElement
  publisherEl: HTMLElement
  weeksEl: HTMLElement
  rankEl: HTMLElement
  descriptionEl: HTMLElement
  amazonLink: HTMLAnchorElement
  isOpen: boolean = false

  constructor() {
    this.element = document.getElementById("book-popup")!
    this.overlay = document.getElementById("popup-overlay")!
    this.closeBtn = document.getElementById("popup-close")!
    this.coverImg = document.getElementById(
      "popup-cover-img"
    ) as HTMLImageElement
    this.titleEl = document.getElementById("popup-title")!
    this.authorEl = document.getElementById("popup-author")!
    this.publisherEl = document.getElementById("popup-publisher")!
    this.weeksEl = document.getElementById("popup-weeks")!
    this.rankEl = document.getElementById("popup-rank-num")!
    this.descriptionEl = document.getElementById("popup-description")!
    this.amazonLink = document.getElementById(
      "popup-amazon-link"
    ) as HTMLAnchorElement

    this.overlay.addEventListener("click", () => this.hide())
    this.closeBtn.addEventListener("click", () => this.hide())
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) this.hide()
    })
  }

  show(book: Book) {
    if (this.isOpen) return

    // Populate content
    this.coverImg.src = book.bookImageUrl || book.coverUrl
    this.coverImg.alt = book.title
    this.titleEl.textContent = book.title
    this.authorEl.textContent = `by ${book.author}`
    this.publisherEl.textContent = book.publisher
    this.weeksEl.textContent = `${book.weeksOnList} week${book.weeksOnList !== 1 ? "s" : ""} on list`
    this.rankEl.textContent = String(book.rank)
    this.descriptionEl.textContent = book.description
    this.amazonLink.href = book.amazonUrl

    this.element.style.display = "flex"
    this.isOpen = true

    gsap.fromTo(
      this.element,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: "power2.out" }
    )

    gsap.fromTo(
      "#popup-card",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", delay: 0.05 }
    )
  }

  hide() {
    if (!this.isOpen) return

    gsap.to(this.element, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        this.element.style.display = "none"
        this.isOpen = false
      },
    })
  }
}
