export interface Book {
  title: string
  author: string
  description: string
  coverUrl: string
  bookImageUrl: string
  publisher: string
  rank: number
  weeksOnList: number
  amazonUrl: string
  isbn13: string
  isbn10: string
}

function stringToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ")
  let line = ""
  let currentY = y
  for (const word of words) {
    const test = line + word + " "
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, currentY)
      line = word + " "
      currentY += lineHeight
    } else {
      line = test
    }
  }
  ctx.fillText(line.trim(), x, currentY)
}

export function generatePlaceholderImage(
  title: string,
  author: string
): HTMLImageElement {
  const W = 400
  const H = 600
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")!
  const hue = stringToHue(title)

  ctx.fillStyle = `hsl(${hue}, 22%, 20%)`
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = `hsl(${hue}, 40%, 38%)`
  ctx.fillRect(0, 0, W, 6)
  ctx.fillRect(0, H - 6, W, 6)
  ctx.fillRect(40, 40, 2, H - 80)
  ctx.fillRect(W - 42, 40, 2, H - 80)

  ctx.fillStyle = "#f0e6d0"
  ctx.font = "bold 26px Georgia, serif"
  ctx.textAlign = "center"
  wrapText(ctx, title.toUpperCase(), W / 2, 210, 300, 36)

  ctx.fillStyle = `hsl(${hue}, 40%, 55%)`
  ctx.fillRect(140, 320, 120, 1)

  ctx.fillStyle = "#c4a97d"
  ctx.font = "18px Georgia, serif"
  ctx.fillText(author, W / 2, 360)

  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed: ${url}`))
    img.src = url
  })
}

export async function loadBookCover(book: Book): Promise<HTMLImageElement> {
  const sources = [
    `https://covers.openlibrary.org/b/isbn/${book.isbn13}-L.jpg`,
    book.bookImageUrl,
  ]

  for (const src of sources) {
    if (!src) continue
    try {
      const img = await loadImage(src)
      if (img.width > 10 && img.height > 10) return img
    } catch {
      // try next source
    }
  }

  return generatePlaceholderImage(book.title, book.author)
}

function mapBooks(data: any): Book[] {
  return data.results.books.map((b: any): Book => ({
    title: b.title,
    author: b.author,
    description: b.description || "No description available.",
    coverUrl: `https://covers.openlibrary.org/b/isbn/${b.primary_isbn13}-L.jpg`,
    bookImageUrl: b.book_image,
    publisher: b.publisher,
    rank: b.rank,
    weeksOnList: b.weeks_on_list,
    amazonUrl: b.amazon_product_url,
    isbn13: b.primary_isbn13,
    isbn10: b.primary_isbn10,
  }))
}

export async function fetchNYTBooks(apiKey: string): Promise<Book[]> {
  const url = `https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`NYT API returned ${response.status}. Check your API key.`)
  }
  return mapBooks(await response.json())
}

export async function fetchList(apiKey: string, list: string): Promise<Book[]> {
  try {
    const url = `https://api.nytimes.com/svc/books/v3/lists/current/${list}.json?api-key=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) return []
    return mapBooks(await response.json())
  } catch {
    return []
  }
}

export const BACKGROUND_LISTS = [
  "hardcover-nonfiction",
  "paperback-trade-fiction",
  "young-adult-hardcover",
  "graphic-books-and-manga",
  "combined-print-and-e-book-fiction",
  "science",
  "business-books",
]
