# Doom Scrolling

A WebGL book browser that pulls the NYT Best Sellers list into a 3D infinite scroll. Books unfold from a spinning stack, spread out in depth, and let you browse the list by scrolling. Click any book to read its synopsis and open it on Amazon.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.179-black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF)

---

## How it works

On load, the 30 instanced book meshes perform a 5-second intro — spinning out of a stack and fanning apart into a horizontal gallery. After the animation, scrolling drives a per-frame feed algorithm:

- Every frame, each mesh's depth position (Z) is computed by replicating the vertex shader's wrapping math in JS
- Meshes are sorted front-to-back; the visible frontmost mesh always maps to the "current" book in the feed
- Scrolling forward advances the feed index (new books appear from depth); scrolling backward retreads history
- The NYT Hardcover Fiction list loads first for a fast start; the three remaining lists are fetched in the background and appended to the atlas seamlessly

Book cover images are sourced from Open Library's cover API (CORS-friendly), with the NYT-hosted image as fallback and a canvas-generated placeholder if both fail. All covers are packed into a 2D texture atlas (10 columns × N rows) shared across all 30 mesh instances via `InstancedBufferAttribute`.

---

## Tech stack

| Library | Role |
|---|---|
| Three.js | WebGL scene, instanced meshes, custom GLSL shaders |
| GSAP | Intro animation timeline, scroll interpolation |
| Lenis | Smooth scroll driver |
| Tailwind CSS v4 | UI layout |
| Vite + vite-plugin-glsl | Build tooling, GLSL imports |
| NYT Books API | Best Sellers data |
| Open Library Covers API | Book cover images |

---

## Getting started

### 1. Get a NYT API key

Go to [developer.nytimes.com](https://developer.nytimes.com/), create an app, and enable the **Books API**.

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and paste your key:

```
VITE_NYT_API_KEY=your_key_here
```

### 3. Install and run

```bash
npm install
npm run dev
```

---

## Controls

| Action | Effect |
|---|---|
| Scroll wheel | Browse the feed |
| Touch swipe | Browse the feed (mobile) |
| Click anywhere | Open popup for the frontmost book |
| `Esc` or click overlay | Close popup |

---

## Project structure

```
src/
  main.ts        — Entry point; fetches NYT lists, wires background loading
  canvas.ts      — Three.js scene, camera, renderer, click handler
  magazine.ts    — Instanced mesh, texture atlas, per-frame feed mapping
  scroll.ts      — Lenis smooth scroll wrapper
  books.ts       — NYT API fetching, cover loading, placeholder generation
  popup.ts       — Book detail popup show/hide
  style.css      — Global styles, popup, loading screen
  shaders/
    vertex.glsl  — Book spin/unfold/scroll animation
    fragment.glsl — Atlas UV sampling
```

---

## Build

```bash
npm run build
npm run preview
```
