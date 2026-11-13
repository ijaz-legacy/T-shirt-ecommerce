import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { getSticker, parsePlacementRef } from '../../lib/catalog'
import type { StickerPlacement } from '../../lib/types'
import { StickerArt } from '../tee/StickerArt'
import { TEE_VIEW_H, TEE_VIEW_W } from '../tee/teeGeometry'
import { buildStickerCanvas, builtinArtwork } from './designTexture'

/**
 * 3D T-shirt preview for the custom-tees studio.
 *
 * IMPORTANT (per project spec): this ALWAYS loads the real artist model from
 * `client/public/tshirt/tshirt.glb` (served as `/tshirt/tshirt.glb`). It never
 * generates or approximates the garment shape in code.
 *
 * Stickers are not printed onto a flat billboard: each placement becomes a
 * `DecalGeometry` projected onto the actual garment mesh at a raycast hit
 * point, using that face's normal. So artwork wraps the fabric exactly like a
 * real printed/ironed-on sticker. Dragging a sticker re-raycasts the pointer
 * and moves the decal along the surface.
 */

const UP = new THREE.Vector3(0, 1, 0)
const DOWN_Z = new THREE.Vector3(0, 0, -1)
const UP_Z = new THREE.Vector3(0, 0, 1)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

export type TeeSide = 'front' | 'back'

/** Shirt shoulder-to-shoulder width in the 2D viewBox (see teeGeometry). */
const TEE_WIDTH_IN_VIEW = 332
/** Shirt height in the 2D viewBox. */
const TEE_HEIGHT_IN_VIEW = 406

function worldNormalOf(hit: THREE.Intersection): THREE.Vector3 {
  if (!hit.face) return new THREE.Vector3(0, 0, 1)
  return hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
}

/**
 * Builds the decal projector rotation: `+Z` points out of the fabric (so the
 * sticker faces the camera) and `+Y` is the garment's up, then the placement's
 * own rotation is applied as an in-plane roll.
 */
function decalOrientation(normal: THREE.Vector3, rotationDeg: number): THREE.Euler {
  const n = normal.clone().normalize()
  const up = Math.abs(n.dot(UP)) > 0.97 ? new THREE.Vector3(0, 0, 1) : UP.clone()
  const xAxis = new THREE.Vector3().crossVectors(up, n).normalize()
  const yAxis = new THREE.Vector3().crossVectors(n, xAxis).normalize()
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, n)
  const q = new THREE.Quaternion().setFromRotationMatrix(basis)
  q.multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, THREE.MathUtils.degToRad(-rotationDeg)))
  return new THREE.Euler().setFromQuaternion(q)
}

function placementLabel(p: StickerPlacement): string {
  if (p.ref.startsWith('text:')) return p.text?.content?.slice(0, 24) || 'Text'
  const parsed = parsePlacementRef(p.ref)
  if (parsed?.type === 'builtin') return getSticker(parsed.id).nameEn
  // Sticker artwork is served from the database, so its name isn't in the
  // bundle — the 3D overlay only needs a readable label here.
  return 'Artwork'
}

function contactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
    gradient.addColorStop(0, 'rgba(23,21,18,0.3)')
    gradient.addColorStop(0.55, 'rgba(23,21,18,0.1)')
    gradient.addColorStop(1, 'rgba(23,21,18,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

type DecalEntry = {
  mesh: THREE.Mesh
  texture: THREE.CanvasTexture
  sig: string
  artSig: string
  index: number
}

export function Tee3DPreview({
  colorHex,
  placements,
  height,
  selectedIndex = null,
  onSelectPlacement,
  onMovePlacement,
  side = 'front',
  onSideChange,
}: {
  colorHex: string
  placements: StickerPlacement[]
  height?: number
  selectedIndex?: number | null
  onSelectPlacement?: (index: number | null) => void
  onMovePlacement?: (index: number, patch: Partial<StickerPlacement>) => void
  /** Face of the garment currently being viewed/edited. */
  side?: TeeSide
  /** Fired when the customer spins the tee round to the other face. */
  onSideChange?: (side: TeeSide) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const updateOverlayRef = useRef<() => void>(() => {})
  const hiddenRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const bodyMatsRef = useRef<THREE.MeshStandardMaterial[]>([])

  const colorRef = useRef(colorHex)
  colorRef.current = colorHex
  const placementsRef = useRef(placements)
  placementsRef.current = placements
  const selectedRef = useRef<number | null>(selectedIndex)
  selectedRef.current = selectedIndex
  const onSelectRef = useRef(onSelectPlacement)
  onSelectRef.current = onSelectPlacement
  const onMoveRef = useRef(onMovePlacement)
  onMoveRef.current = onMovePlacement
  const sideRef = useRef<TeeSide>(side)
  sideRef.current = side
  const onSideChangeRef = useRef(onSideChange)
  onSideChangeRef.current = onSideChange
  const syncRef = useRef<() => void>(() => {})
  const selectionRef = useRef<() => void>(() => {})
  const syncSideRef = useRef<(side: TeeSide) => void>(() => {})
  const resetViewRef = useRef<() => void>(() => {})

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  // ── scene, model, camera, lights, controls loop ─────────────────
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      // Required by the spec for canvas.toDataURL() preview capture (step 5).
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearAlpha(0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    const canvas = renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.touchAction = 'none'
    host.appendChild(canvas)

    const teeGroup = new THREE.Group()
    scene.add(teeGroup)

    // Decals live in world space (DecalGeometry outputs world-space geometry),
    // so they get their own group at the scene root.
    const decalGroup = new THREE.Group()
    scene.add(decalGroup)

    // Studio lighting so the fabric reads clearly through a full 360° turn.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc8baa6, 1.15))
    const key = new THREE.DirectionalLight(0xfff7ef, 1.45)
    key.position.set(3.2, 5.2, 5.5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xfff3e6, 0.65)
    fill.position.set(-5.2, 1.4, 3.2)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 0.7)
    rim.position.set(-1.2, 3.4, -5.2)
    scene.add(rim)

    const shadowTexture = contactShadowTexture()
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.4),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.5 }),
    )
    shadow.rotation.x = -Math.PI / 2
    scene.add(shadow)

    // OrbitControls: rotate + zoom (pinch on mobile), pan disabled, zoom limited.
    const controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 2.5
    controls.maxDistance = 8
    controls.rotateSpeed = 0.85
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    let bounds = { size: new THREE.Vector3(2.4, 3.4, 1.2), centre: new THREE.Vector3() }

    // Which face is facing the camera. Until the GLB is measured this stays
    // whatever the studio asked for.
    let viewSide: TeeSide = sideRef.current
    const sideDistance = () => camera.position.distanceTo(controls.target)
    const sideZ = (which: TeeSide) => (which === 'front' ? 1 : -1)

    const fitCamera = () => {
      const width = host.clientWidth || 320
      const heightPx = host.clientHeight || Math.round((width * TEE_VIEW_H) / TEE_VIEW_W)
      renderer.setSize(width, heightPx, false)
      camera.aspect = width / heightPx
      const halfTan = Math.tan((camera.fov * Math.PI) / 360)
      // Tight framing so the garment fills the preview (not a tiny thumbnail).
      const halfWidth = Math.hypot(bounds.size.x / 2, bounds.size.z / 2)
      const halfHeight = bounds.size.y / 2
      const distance = Math.max(halfHeight / halfTan, halfWidth / (halfTan * camera.aspect)) * 0.92
      camera.position.set(
        bounds.centre.x,
        bounds.centre.y + bounds.size.y * 0.04,
        bounds.centre.z + distance * sideZ(viewSide),
      )
      camera.near = Math.max(0.05, distance / 100)
      camera.far = distance * 100
      camera.updateProjectionMatrix()
      controls.minDistance = Math.max(0.8, distance * 0.45)
      controls.maxDistance = distance * 2.6
      controls.update()
    }
    fitCamera()

    const resizeObserver = new ResizeObserver(fitCamera)
    resizeObserver.observe(host)

    // ── front / back ───────────────────────────────────────────────
    // Rotating the tee round animates the camera to the other face and keeps
    // the customer's zoom level, so a design can be printed on both sides.
    const sideTween = { active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0 }

    const goToSide = (next: TeeSide) => {
      viewSide = next
      const distance = sideDistance() || 7
      sideTween.from.copy(camera.position)
      sideTween.to.set(
        bounds.centre.x,
        bounds.centre.y + bounds.size.y * 0.04,
        bounds.centre.z + distance * sideZ(next),
      )
      sideTween.t = 0
      sideTween.active = true
    }

    // Spinning the tee by hand past the side switches the edited face too.
    let reported: TeeSide | null = null
    const onOrbitEnd = () => {
      if (sideTween.active) return
      const dz = camera.position.z - bounds.centre.z
      if (Math.abs(dz) < sideDistance() * 0.3) return
      const next: TeeSide = dz >= 0 ? 'front' : 'back'
      if (next === viewSide) return
      viewSide = next
      reported = next
      onSideChangeRef.current?.(next)
    }
    controls.addEventListener('end', onOrbitEnd)

    const applySide = (next: TeeSide) => {
      // Our own orbit-end report comes straight back as a prop: don't re-snap
      // the camera the customer just positioned.
      if (reported === next) { reported = null; viewSide = next; return }
      if (next === viewSide && !sideTween.active) return
      goToSide(next)
    }
    syncSideRef.current = applySide
    resetViewRef.current = () => {
      viewSide = 'front'
      reported = 'front'
      controls.reset()
      onSideChangeRef.current?.('front')
    }

    // ── decals ─────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const pickables: THREE.Mesh[] = []
    const entries = new Map<string, DecalEntry>()
    let syncToken = 0

    const keyFor = (p: StickerPlacement, index: number) => p.id ?? `i${index}:${p.ref}`

    const decalSize = (p: StickerPlacement) => {
      const pct = Math.min(80, Math.max(6, p.scale))
      return bounds.size.y * (pct / 100) * 1.15
    }

    /** Percent coordinates (the 2D editor's units) ⇄ the 3D garment. */
    const pctX = (point: THREE.Vector3) =>
      Math.min(99, Math.max(1, 50 + ((point.x - bounds.centre.x) / (TEE_VIEW_W * (bounds.size.x / TEE_WIDTH_IN_VIEW))) * 100))
    const pctY = (point: THREE.Vector3) =>
      Math.min(99, Math.max(1, 50 - ((point.y - bounds.centre.y) / (TEE_VIEW_H * (bounds.size.y / TEE_HEIGHT_IN_VIEW))) * 100))

    const firstSurface = (origin: THREE.Vector3, dir: THREE.Vector3) => {
      raycaster.set(origin, dir)
      return raycaster.intersectObjects(pickables, false)[0] ?? null
    }

    /** Where a placement should sit on the real garment. */
    const resolveAnchor = (p: StickerPlacement): { mesh: THREE.Mesh; point: THREE.Vector3; normal: THREE.Vector3 } | null => {
      if (!pickables.length) return null
      if (p.decal) {
        const point = new THREE.Vector3().fromArray(p.decal.point)
        const normal = new THREE.Vector3().fromArray(p.decal.normal).normalize()
        const hit = firstSurface(point.clone().addScaledVector(normal, 0.05), normal.clone().negate())
        if (hit) return { mesh: hit.object as THREE.Mesh, point: hit.point.clone(), normal: worldNormalOf(hit) }
        return { mesh: pickables[0], point, normal }
      }
      // Legacy / flat-editor placement: project its x/y onto its own face.
      const which: TeeSide = p.side ?? 'front'
      const wx = bounds.centre.x + ((p.x - 50) / 100) * TEE_VIEW_W * (bounds.size.x / TEE_WIDTH_IN_VIEW)
      const wy = bounds.centre.y - ((p.y - 50) / 100) * TEE_VIEW_H * (bounds.size.y / TEE_HEIGHT_IN_VIEW)
      const origin = new THREE.Vector3(
        wx,
        wy,
        bounds.centre.z + (bounds.size.z * 2 + 1) * sideZ(which),
      )
      const hit = firstSurface(origin, which === 'front' ? DOWN_Z : UP_Z)
      if (!hit) return null
      return { mesh: hit.object as THREE.Mesh, point: hit.point.clone(), normal: worldNormalOf(hit) }
    }

    const applySelection = () => {
      const sel = selectedRef.current
      for (const entry of entries.values()) {
        const material = entry.mesh.material as THREE.MeshStandardMaterial
        material.emissiveIntensity = entry.index === sel ? 0.13 : 0
      }
    }
    selectionRef.current = applySelection

    const syncDecals = async () => {
      if (!pickables.length) return
      const token = ++syncToken
      const list = placementsRef.current
      const builtin = builtinArtwork(hiddenRef.current)
      const alive = new Set<string>()

      for (let index = 0; index < list.length; index++) {
        const p = list[index]
        const key = keyFor(p, index)
        alive.add(key)
        const anchor = resolveAnchor(p)
        if (!anchor) continue

        const artSig = JSON.stringify([p.ref, p.style ?? null, p.text ?? null, p.crop ?? null, builtin.has(index)])
        const size = decalSize(p)
        const sig =
          artSig +
          '|' +
          [size, p.rotation, ...anchor.point.toArray(), ...anchor.normal.toArray()]
            .map((n) => +n.toFixed(4))
            .join(',')

        const existing = entries.get(key)
        if (existing && existing.sig === sig) {
          existing.index = index
          continue
        }

        // Only re-rasterise the artwork when the artwork itself changed.
        const agent = existing && existing.artSig === artSig ? null : await buildStickerCanvas(p, builtin.get(index))
        if (token !== syncToken) return
        let texture: THREE.CanvasTexture
        if (agent) {
          texture = new THREE.CanvasTexture(agent)
          texture.colorSpace = THREE.SRGBColorSpace
          texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
        } else if (existing) {
          texture = existing.texture
        } else {
          continue
        }

        // Depth must be thin so the decal never punches through the opposite
        // side of the garment (that causes the visual "break").
        const geometry = new DecalGeometry(
          anchor.mesh,
          anchor.point,
          decalOrientation(anchor.normal, p.rotation),
          new THREE.Vector3(size, size, Math.max(0.35, Math.min(size * 0.45, 0.65))),
        )
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
          roughness: 0.88,
          metalness: 0,
          side: THREE.DoubleSide,
          alphaTest: 0.02,
        })
        const decal = new THREE.Mesh(geometry, material)
        decal.renderOrder = 3
        // Nudge off the fabric along the normal so it can never z-fight.
        decal.position.copy(anchor.normal).multiplyScalar(0.003 + size * 0.004)
        decal.userData.key = key

        if (existing) {
          decalGroup.remove(existing.mesh)
          existing.mesh.geometry.dispose()
          ;(existing.mesh.material as THREE.Material).dispose()
          if (existing.texture !== texture) existing.texture.dispose()
        }
        decalGroup.add(decal)
        entries.set(key, { mesh: decal, texture, sig, artSig, index })
      }

      for (const [key, entry] of [...entries]) {
        if (alive.has(key)) continue
        decalGroup.remove(entry.mesh)
        entry.mesh.geometry.dispose()
        ;(entry.mesh.material as THREE.Material).dispose()
        entry.texture.dispose()
        entries.delete(key)
      }
      applySelection()
    }
    syncRef.current = () => {
      void syncDecals()
    }

    const decalList = () => Array.from(entries.values(), (entry) => entry.mesh)

    const pointerRay = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return false
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      return true
    }
    let drag: { index: number; pointerId: number } | null = null
    let lastMove = 0

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (!pointerRay(event)) return

      let hitIndex: number | null = null
      const decalHit = raycaster.intersectObjects(decalList(), false)[0]
      if (decalHit) {
        const entry = entries.get(String(decalHit.object.userData.key ?? ''))
        if (entry) hitIndex = entry.index
      }
      if (hitIndex === null) {
        // Fallback: check if clicking on the t-shirt surface near a sticker
        const shirtHit = raycaster.intersectObjects(pickables, false)[0]
        if (shirtHit) {
          const list = placementsRef.current
          for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i]
            const anchor = resolveAnchor(p)
            if (anchor && anchor.point.distanceTo(shirtHit.point) <= decalSize(p) * 0.55) {
              hitIndex = i
              break
            }
          }
        }
      }

      if (hitIndex === null) {
        // Clicked empty fabric -> deselect
        onSelectRef.current?.(null)
        return
      }

      event.preventDefault()
      controls.enabled = false
      try {
        canvas.setPointerCapture(event.pointerId)
      } catch {
        /* pointer capture is best-effort */
      }
      drag = { index: hitIndex, pointerId: event.pointerId }
      onSelectRef.current?.(hitIndex)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      const now = performance.now()
      if (now - lastMove < 16) return
      lastMove = now
      if (!pointerRay(event)) return
      const hit = raycaster.intersectObjects(pickables, false)[0]
      if (!hit) return
      const point = hit.point
      const normal = worldNormalOf(hit)
      onMoveRef.current?.(drag.index, {
        x: pctX(point),
        y: pctY(point),
        side: sideRef.current,
        decal: { point: [point.x, point.y, point.z], normal: [normal.x, normal.y, normal.z] },
      })
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      drag = null
      controls.enabled = true
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    }
    canvas.addEventListener('pointerdown', onPointerDown, true)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    // Wheel over selected decal zooms the sticker scale
    const onCanvasWheel = (event: WheelEvent) => {
      if (selectedRef.current === null) return
      if (!pointerRay(event as unknown as PointerEvent)) return
      const decalHit = raycaster.intersectObjects(decalList(), false)[0]
      if (!decalHit) return
      const entry = entries.get(String(decalHit.object.userData.key ?? ''))
      if (!entry || entry.index !== selectedRef.current) return

      event.preventDefault()
      event.stopPropagation()
      const p = placementsRef.current[entry.index]
      if (!p) return
      const delta = event.deltaY < 0 ? 3 : -3
      const nextScale = Math.min(75, Math.max(8, Math.round(p.scale + delta)))
      onMoveRef.current?.(entry.index, { scale: nextScale })
    }
    canvas.addEventListener('wheel', onCanvasWheel, { passive: false })

    // Overlay update: calculates screen coordinates of the selected decal
    const updateOverlay = () => {
      const el = overlayRef.current
      if (!el) return
      const selIdx = selectedRef.current
      if (selIdx === null || !pickables.length) {
        el.style.display = 'none'
        return
      }
      const p = placementsRef.current[selIdx]
      if (!p) {
        el.style.display = 'none'
        return
      }
      const anchor = resolveAnchor(p)
      if (!anchor) {
        el.style.display = 'none'
        return
      }
      // Hide if decal is on the back or facing away from camera
      const pos = anchor.point.clone()
      const camDir = camera.position.clone().sub(pos).normalize()
      if (anchor.normal.dot(camDir) < 0.1) {
        el.style.display = 'none'
        return
      }
      pos.project(camera)
      const rect = host.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        el.style.display = 'none'
        return
      }
      const cx = (pos.x * 0.5 + 0.5) * rect.width
      const cy = (-pos.y * 0.5 + 0.5) * rect.height
      const dist = camera.position.distanceTo(anchor.point)
      const vFovRad = (camera.fov * Math.PI) / 180
      const pixelsPerUnit = rect.height / (2 * Math.tan(vFovRad / 2) * dist)
      const size = decalSize(p)
      const pxSize = size * pixelsPerUnit

      el.style.display = 'block'
      el.style.width = `${Math.round(pxSize)}px`
      el.style.height = `${Math.round(pxSize)}px`
      el.style.left = `${Math.round(cx)}px`
      el.style.top = `${Math.round(cy)}px`
      el.style.transform = `translate(-50%, -50%) rotate(${p.rotation}deg)`
    }
    updateOverlayRef.current = updateOverlay
    // ── load the real artist model ─────────────────────────────────
    let disposed = false
    new GLTFLoader().load(
      '/tshirt/tshirt.glb',
      (gltf) => {
        if (disposed) return
        const model = gltf.scene

        // Log mesh names and the raw bounding box (spec: verify it loaded).
        const meshNames: string[] = []
        model.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) meshNames.push(obj.name || '(unnamed mesh)')
        })
        const rawBox = new THREE.Box3().setFromObject(model)
        const rawSize = rawBox.getSize(new THREE.Vector3())
        const rawCentre = rawBox.getCenter(new THREE.Vector3())
        console.log('[Tee3D] mesh names:', meshNames.join(', '))
        console.log(
          '[Tee3D] bounding box size=' +
            JSON.stringify(rawSize.toArray().map((n) => +n.toFixed(3))) +
            ' center=' +
            JSON.stringify(rawCentre.toArray().map((n) => +n.toFixed(3))),
        )

        // Merge all sub-meshes into a single seamless continuous mesh so decals
        // never break, tear, or miss triangles across chunk boundaries.
        const subMeshes: THREE.Mesh[] = []
        model.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) subMeshes.push(obj as THREE.Mesh)
        })

        model.updateMatrixWorld(true)
        const geoms = subMeshes.map((m) => {
          const g = m.geometry.clone()
          m.updateWorldMatrix(true, false)
          g.applyMatrix4(m.matrixWorld)
          return g
        })
        const mergedGeom = mergeGeometries(geoms, false)

        const fabricMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorRef.current),
          roughness: 0.92,
          metalness: 0,
          envMapIntensity: 0.2,
          side: THREE.DoubleSide,
        })
        const shirtMesh = new THREE.Mesh(mergedGeom, fabricMat)
        shirtMesh.name = 'tshirt_merged'
        bodyMatsRef.current.push(fabricMat)
        pickables.push(shirtMesh)

        // Auto-scale, then auto-center the scaled mesh
        const rawBox2 = new THREE.Box3().setFromObject(shirtMesh)
        const rawSize2 = rawBox2.getSize(new THREE.Vector3())
        const targetH = 3.45
        const scale = rawSize2.y > 0 ? targetH / rawSize2.y : 1
        shirtMesh.scale.setScalar(scale)
        shirtMesh.updateMatrixWorld(true)

        const scaledBox = new THREE.Box3().setFromObject(shirtMesh)
        const scaledCentre = scaledBox.getCenter(new THREE.Vector3())
        shirtMesh.position.sub(scaledCentre)
        shirtMesh.updateMatrixWorld(true)

        teeGroup.add(shirtMesh)

        // Frame using the garment bounds only.
        const box = new THREE.Box3().setFromObject(shirtMesh)
        bounds = { size: box.getSize(new THREE.Vector3()), centre: box.getCenter(new THREE.Vector3()) }
        shadow.position.set(bounds.centre.x, box.min.y - 0.01, bounds.centre.z + 0.08)

        controls.target.copy(bounds.centre)
        fitCamera()
        controls.saveState()
        controls.update()
        console.log(
          '[Tee3D] framed size=' +
            JSON.stringify(bounds.size.toArray().map((n) => +n.toFixed(3))) +
            ' centre=' +
            JSON.stringify(bounds.centre.toArray().map((n) => +n.toFixed(3))) +
            ' camera=' +
            JSON.stringify(camera.position.toArray().map((n) => +n.toFixed(3))) +
            ' meshes=' +
            pickables.length,
        )

        setLoadState('ready')
        void syncDecals()
      },
      undefined,
      (err) => {
        if (!disposed) {
          console.error('[Tee3D] failed to load /tshirt/tshirt.glb', err)
          setLoadState('error')
        }
      },
    )

    let frame = 0
    let lastFrame = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastFrame) / 1000)
      lastFrame = now
      if (sideTween.active) {
        sideTween.t = Math.min(1, sideTween.t + dt * 2.6)
        const t = sideTween.t
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        camera.position.lerpVectors(sideTween.from, sideTween.to, eased)
        if (t >= 1) sideTween.active = false
      }
      controls.update()
      renderer.render(scene, camera)
      updateOverlay()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown, true)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onCanvasWheel)
      controls.removeEventListener('end', onOrbitEnd)
      controls.dispose()
      controlsRef.current = null
      syncRef.current = () => {}
      selectionRef.current = () => {}
      syncSideRef.current = () => {}
      resetViewRef.current = () => {}
      bodyMatsRef.current = []
      for (const entry of entries.values()) {
        entry.mesh.geometry.dispose()
        ;(entry.mesh.material as THREE.Material).dispose()
        entry.texture.dispose()
      }
      entries.clear()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh && !(object as THREE.Line).isLine) return
        mesh.geometry?.dispose?.()
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const material of materials) {
          const map = (material as THREE.MeshStandardMaterial).map
          map?.dispose()
          material.dispose()
        }
      })
      shadowTexture.dispose()
      renderer.dispose()
      if (canvas.parentNode === host) host.removeChild(canvas)
    }
  }, [])

  // ── tee colour (material only, never geometry) ──────────────────
  useEffect(() => {
    for (const mat of bodyMatsRef.current) mat.color.set(colorHex)
  }, [colorHex])

  // ── keep the decals in sync with the design ─────────────────────
  useEffect(() => {
    syncRef.current()
  }, [placements])

  useEffect(() => {
    selectionRef.current()
  }, [selectedIndex])

  // ── front / back: turn the tee to the face being edited ─────────
  useEffect(() => {
    syncSideRef.current(side)
  }, [side])

  // Built-in vector stickers rendered off-screen so their SVG can be
  // serialised into decal textures.
  const hiddenStickers = placements.map((p, index) => {
    const parsed = parsePlacementRef(p.ref)
    if (parsed?.type !== 'builtin') return null
    return (
      <div key={p.id ?? index} data-placement={index}>
        <StickerArt
          sticker={getSticker(parsed.id)}
          fgOverride={p.style?.fg}
          accentOverride={p.style?.accent}
          size={128}
        />
      </div>
    )
  })

  function handleCornerDown(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const selIdx = selectedRef.current
    if (selIdx === null) return
    const p = placementsRef.current[selIdx]
    if (!p) return
    const el = overlayRef.current
    if (!el) return

    const overlayRect = el.getBoundingClientRect()
    const cx = overlayRect.left + overlayRect.width / 2
    const cy = overlayRect.top + overlayRect.height / 2
    const startDist = Math.hypot(e.clientX - cx, e.clientY - cy)
    const startScale = p.scale

    const onPointerMove = (ev: PointerEvent) => {
      const curDist = Math.hypot(ev.clientX - cx, ev.clientY - cy)
      if (startDist < 5) return
      const ratio = curDist / startDist
      const newScale = Math.round(Math.min(80, Math.max(8, startScale * ratio)))
      onMoveRef.current?.(selIdx, { scale: newScale })
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function handleRotateDown(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const selIdx = selectedRef.current
    if (selIdx === null) return
    const p = placementsRef.current[selIdx]
    if (!p) return
    const el = overlayRef.current
    if (!el) return

    const overlayRect = el.getBoundingClientRect()
    const cx = overlayRect.left + overlayRect.width / 2
    const cy = overlayRect.top + overlayRect.height / 2
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
    const startRot = p.rotation

    const onPointerMove = (ev: PointerEvent) => {
      const curAngle = Math.atan2(ev.clientY - cy, ev.clientX - cx)
      let rot = startRot + ((curAngle - startAngle) * 180) / Math.PI
      while (rot > 180) rot -= 360
      while (rot < -180) rot += 360
      onMoveRef.current?.(selIdx, { rotation: Math.round(rot) })
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const selected = selectedIndex !== null ? placements[selectedIndex] : null

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        // Cap the stage so the tee stays a preview (the price and buy buttons
        // stay on screen) instead of filling the whole column.
        maxWidth: 380,
        margin: '0 auto',
        aspectRatio: `${TEE_VIEW_W} / ${TEE_VIEW_H}`,
        height,
        borderRadius: 16,
        overflow: 'hidden',
        // A neutral stage with enough contrast that light-coloured shirts stay visible.
        background:
          'radial-gradient(110% 85% at 50% 20%, #f3ede4 0%, #e3d8c8 55%, #d6c9b6 100%)',
        border: '1px solid var(--line)',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div
        ref={hostRef}
        style={{ position: 'absolute', inset: 0 }}
        role="img"
        aria-label="3D preview of your tee — drag to rotate, drag a sticker to move it"
      />

      {/* Traditional PowerPoint / Word selection square with 4 corner dots */}
      <div
        ref={overlayRef}
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 35,
          boxSizing: 'border-box',
          border: '2px dashed #0078D4',
          boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9), 0 2px 10px rgba(0,0,0,0.15)',
          transformOrigin: 'center center',
        }}
      >
        {/* Rotation stem & handle */}
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 1.5,
            height: 20,
            background: '#0078D4',
            pointerEvents: 'none',
          }}
        />
        <div
          onPointerDown={handleRotateDown}
          title="Rotate picture"
          style={{
            position: 'absolute',
            top: -26,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '2px solid #0078D4',
            cursor: 'alias',
            boxShadow: '0 2px 6px rgba(0,120,212,0.45)',
            pointerEvents: 'auto',
            touchAction: 'none',
            zIndex: 40,
          }}
        />

        {/* 4 Corner Dots (traditional PowerPoint / Word) */}
        <div onPointerDown={handleCornerDown} title="Drag corner to resize image" style={{ position: 'absolute', top: 0, left: 0, width: 13, height: 13, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'nwse-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 38 }} />
        <div onPointerDown={handleCornerDown} title="Drag corner to resize image" style={{ position: 'absolute', top: 0, left: '100%', width: 13, height: 13, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'nesw-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 38 }} />
        <div onPointerDown={handleCornerDown} title="Drag corner to resize image" style={{ position: 'absolute', top: '100%', left: 0, width: 13, height: 13, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'nesw-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 38 }} />
        <div onPointerDown={handleCornerDown} title="Drag corner to resize image" style={{ position: 'absolute', top: '100%', left: '100%', width: 13, height: 13, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'nwse-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 38 }} />

        {/* 4 Side Dots */}
        <div onPointerDown={handleCornerDown} title="Drag to resize" style={{ position: 'absolute', top: 0, left: '50%', width: 11, height: 11, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'ns-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', zIndex: 37 }} />
        <div onPointerDown={handleCornerDown} title="Drag to resize" style={{ position: 'absolute', top: '100%', left: '50%', width: 11, height: 11, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'ns-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', zIndex: 37 }} />
        <div onPointerDown={handleCornerDown} title="Drag to resize" style={{ position: 'absolute', top: '50%', left: 0, width: 11, height: 11, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'ew-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', zIndex: 37 }} />
        <div onPointerDown={handleCornerDown} title="Drag to resize" style={{ position: 'absolute', top: '50%', left: '100%', width: 11, height: 11, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #0078D4', transform: 'translate(-50%, -50%)', cursor: 'ew-resize', pointerEvents: 'auto', touchAction: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', zIndex: 37 }} />
      </div>
      <div
        ref={hiddenRef}
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, left: -9999, top: -9999, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      >
        {hiddenStickers}
      </div>

      {loadState === 'loading' && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(255,253,249,0.55)', color: 'var(--smoke)', fontSize: 12, fontWeight: 600,
          }}
        >
          Loading 3D t-shirt…
        </div>
      )}
      {loadState === 'error' && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 16,
            color: 'var(--smoke)', fontSize: 12, textAlign: 'center',
          }}
        >
          Couldn&apos;t load <code>/tshirt/tshirt.glb</code>. Check the file path.
        </div>
      )}

      {selected && (
        <span
          style={{
            position: 'absolute', left: 8, top: 8, maxWidth: '70%',
            padding: '5px 10px', borderRadius: 999, background: 'rgba(255,253,249,0.9)',
            border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 10.5, fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none',
          }}
        >
          {placementLabel(selected)} · drag it on the tee
        </span>
      )}

      <button
        type="button"
        onClick={() => resetViewRef.current()}
        title="Back to the front view"
        aria-label="Back to the front view"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          border: '1px solid var(--line)',
          background: 'rgba(255,253,249,0.86)',
          color: 'var(--smoke)',
          cursor: 'pointer',
        }}
      >
        <RotateCcw size={13} />
      </button>
      <span
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 10,
          transform: 'translateX(-50%)',
          maxWidth: 'calc(100% - 20px)',
          padding: '5px 12px',
          borderRadius: 999,
          background: 'rgba(23,21,18,0.72)',
          color: '#fffdf9',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.02em',
          lineHeight: 1.35,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        Click sticker to resize & zoom · Drag corners to scale · Mouse wheel to zoom
      </span>
    </div>
  )
}
