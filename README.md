# 🧺 Basket Pack 3D – Prototype

Interactive packing prototype built with **React**, **TypeScript**, and **react-three-fiber**. The scene renders a 12×9×6 voxel basket, lets you preview the current item (ghost), and place it on the grid while we compute basic scoring metrics.

## Getting Started

```bash
npm install
npm run dev    # start local development server
npm run build  # type-check + production build
```

The first load opens `/` with the Three.js canvas and HUD. Hot reload is available during development.

## Controls (MVP)

- **Mouse / touch drag** over the basket plane to move the ghost item.
- **Click / Space** to place the current item (if the placement is valid).
- **Scroll / Q / E** yaw-rotate the ghost in 90° steps.
- **Shift+Scroll / W / S** pitch the ghost to lay items on their side.
- **R** resets the session.
- **Enter** triggers scoring when every item is placed.

The HUD mirrors timer, remaining items, occupancy %, and COM offset. A result panel appears after scoring.

## Current Features

- Voxel-aligned basket grid (12×9×6) with basic lighting and contact shadows.
- Item catalogue encoded from the specification with shape + mass metadata.
- Zustand store powering queue management, ghost snapping, collision checks, occupancy, and score aggregation.
- Scoring hooks for packing efficiency, balance, stability placeholder, and fragile adjustments.
- Responsive overlay HUD + result card built with plain CSS.

## Next Steps

1. **Placement UX**
   - Height adjustment (Shift-drag / 2-finger drag) and finer ghost feedback.
   - Drag handles or gizmos for more precise control on desktop.
2. **Physics & Stability**
   - Integrate `@react-three/cannon` to run the 1.5 s stability simulation and feed real displacement into `computeStabilityScore`.
3. **Scoring Details**
   - Visualise fragile penalty sources and COM heatmap.
   - Persist best scores (Supabase/Firebase) once authentication is ready.
4. **Audio & Feedback**
   - Hook howler.js for placement / success / fail cues.
   - Add quick “Good!” / “NG” pop animations around the ghost.
5. **Mobile Optimisation**
   - Dedicated touch buttons for rotation + placement.
   - Adaptive canvas DPR caps for mid-range devices.

Feel free to iterate on the store or logic modules—everything lives under `src/` with clear directories:

```
src/
  components/   // CanvasStage, HUD, ResultPanel...
  data/         // Item catalogue
  logic/        // placement + scoring helpers
  store/        // Zustand game store
  pages/App.tsx
```
