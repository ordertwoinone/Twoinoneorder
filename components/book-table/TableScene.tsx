'use client'
// ─────────────────────────────────────────────────────────────
// TableScene.tsx — Interactive 3D floor plan.
// Asset priority (auto-detected at runtime):
//   1. /models/restaurant.glb  — real 3D model (e.g. Meshy AI
//      export of the restaurant) with full orbit controls
//   2. /floor-plan.jpg         — photorealistic render laid
//      flat as a textured plane (tilt/zoom)
//   3. Neither found           — friendly setup notice
// Clickable status pins float above each table in both modes.
// ─────────────────────────────────────────────────────────────

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useTableStore } from './useTableStore'
import {
  TABLES, BookTable, STATUS_COLORS, SELECTED_COLOR,
  SECTION_TO_AREA, PLANE_W, PLANE_H,
} from './tableData'

export type ViewMode = '3d' | 'top' | '360'
type AssetMode = 'detecting' | 'model' | 'image' | 'missing'

const MODEL_URL = '/models/restaurant.glb'
const FLOOR_PLAN_URL = '/floor-plan.png'

// ─────────────── 1. Real 3D model (GLB) ──────────────────────

function MeshyModel() {
  const { scene } = useGLTF(MODEL_URL)
  const group = useRef<THREE.Group>(null)

  // Normalize: scale the model so its footprint matches the
  // pin coordinate system (PLANE_W wide), centered at origin,
  // sitting on y=0.
  useEffect(() => {
    if (!group.current) return
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = PLANE_W / Math.max(size.x, size.z)
    group.current.scale.setScalar(scale)
    group.current.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale,
    )
  }, [scene])

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

// ─────────────── 2. Floor plan image plane ───────────────────

function FloorPlanImage() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let disposed = false
    loader.load(FLOOR_PLAN_URL, (tex) => {
      if (disposed) return
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      setTexture(tex)
    })
    return () => { disposed = true }
  }, [])

  if (!texture) return null

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

// ─────────────── Selection ring under chosen table ───────────

function SelectionRing({ position }: { position: [number, number, number] }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.04, position[2]]}>
      <ringGeometry args={[0.5, 0.72, 40]} />
      <meshBasicMaterial color={SELECTED_COLOR} transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─────────────── Floating table pin ──────────────────────────

function TablePin({ table, pinY }: { table: BookTable; pinY: number }) {
  const { tableStatuses, selectedTable, activeArea, selectTable } = useTableStore()
  const status = tableStatuses[table.id]
  const isSelected = selectedTable === table.id
  const inActiveArea = SECTION_TO_AREA[table.section] === activeArea
  const pinColor = isSelected ? SELECTED_COLOR : STATUS_COLORS[status]
  const clickable = status !== 'booked'

  return (
    <group position={[table.position[0], 0.05, table.position[2]]}>
      <Html position={[0, pinY, 0]} center distanceFactor={11} zIndexRange={[20, 0]}>
        <button
          onClick={() => clickable && selectTable(table.id)}
          style={{
            position: 'relative',
            background: pinColor,
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            fontFamily: 'system-ui, sans-serif',
            padding: '6px 14px',
            borderRadius: 10,
            border: '2px solid rgba(255,255,255,0.9)',
            boxShadow: isSelected
              ? `0 5px 18px ${SELECTED_COLOR}80`
              : '0 4px 12px rgba(0,0,0,0.35)',
            cursor: clickable ? 'pointer' : 'not-allowed',
            opacity: inActiveArea ? 1 : 0.35,
            transform: isSelected ? 'scale(1.12)' : 'scale(1)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {table.id}
          <span style={{
            position: 'absolute',
            left: '50%',
            bottom: -8,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: `8px solid ${pinColor}`,
          }} />
        </button>
      </Html>
      {isSelected && <SelectionRing position={table.position} />}
    </group>
  )
}

// ─────────────── Camera rig for view modes ───────────────────

function CameraRig({ viewMode, isModel }: { viewMode: ViewMode; isModel: boolean }) {
  const { camera } = useThree()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null)

  useEffect(() => {
    if (viewMode === 'top') {
      camera.position.set(0, 22, 0.01)
    } else {
      camera.position.set(0, isModel ? 14 : 13, isModel ? 14 : 11)
    }
    if (controls.current) {
      controls.current.target.set(0, 0, 0)
      controls.current.update()
    }
  }, [viewMode, camera, isModel])

  return (
    <OrbitControls
      ref={controls}
      target={[0, 0, 0]}
      autoRotate={viewMode === '360'}
      autoRotateSpeed={0.9}
      minPolarAngle={0}
      maxPolarAngle={isModel ? Math.PI / 2.25 : Math.PI / 3.4}
      minDistance={6}
      maxDistance={30}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

// ─────────────── Exported scene ──────────────────────────────

export default function TableScene({ viewMode }: { viewMode: ViewMode }) {
  const [asset, setAsset] = useState<AssetMode>('detecting')

  // Detect which asset exists: GLB model first, then image
  useEffect(() => {
    let cancelled = false
    async function detect() {
      try {
        const m = await fetch(MODEL_URL, { method: 'HEAD' })
        if (!cancelled && m.ok) { setAsset('model'); return }
      } catch { /* fall through */ }
      try {
        const i = await fetch(FLOOR_PLAN_URL, { method: 'HEAD' })
        if (!cancelled && i.ok) { setAsset('image'); return }
      } catch { /* fall through */ }
      if (!cancelled) setAsset('missing')
    }
    detect()
    return () => { cancelled = true }
  }, [])

  const isModel = asset === 'model'
  const pinY = isModel ? 2.2 : 0.7

  return (
    <div className="relative w-full h-full">
      {(asset === 'model' || asset === 'image') && (
        <Canvas
          camera={{ position: [0, 13, 11], fov: 42 }}
          gl={{ antialias: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#EFE8DA']} />

          {/* Lighting only matters for the GLB model — the image
              plane uses an unlit material */}
          <ambientLight intensity={1.1} color="#FFF6E8" />
          <directionalLight position={[10, 18, 12]} intensity={1.6} />
          <directionalLight position={[-10, 12, -8]} intensity={0.6} />

          <Suspense fallback={null}>
            {isModel ? <MeshyModel /> : <FloorPlanImage />}
          </Suspense>

          {TABLES.map((t) => <TablePin key={t.id} table={t} pinY={pinY} />)}
          <CameraRig viewMode={viewMode} isModel={isModel} />
        </Canvas>
      )}

      {asset === 'detecting' && (
        <div className="absolute inset-0 flex items-center justify-center text-[#6B7280] text-sm">
          Loading floor plan…
        </div>
      )}

      {asset === 'missing' && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-md px-6 py-5 max-w-md text-center">
            <p className="font-bold text-[#1A1A1A] mb-2">3D floor plan asset missing</p>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">
              Add one of these files to the project:<br />
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">public/models/restaurant.glb</code>
              <span className="mx-1">(3D model — best)</span><br />
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">public/floor-plan.jpg</code>
              <span className="mx-1">(render image)</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
