'use client'
// ─────────────────────────────────────────────────────────────
// TableScene.tsx — Interactive floor plan using the actual
// photorealistic render (public/floor-plan.jpg) as a textured
// plane, with clickable status pins floating above each table.
// This keeps the exact look of the architectural render while
// still allowing tilt / zoom / 360° rotation.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTableStore } from './useTableStore'
import {
  TABLES, BookTable, STATUS_COLORS, SELECTED_COLOR,
  SECTION_TO_AREA, PLANE_W, PLANE_H,
} from './tableData'

export type ViewMode = '3d' | 'top' | '360'

const FLOOR_PLAN_URL = '/floor-plan.jpg'

// ─────────────── Floor plan plane (the render image) ─────────

function FloorPlanImage({ onMissing }: { onMissing: () => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let disposed = false
    loader.load(
      FLOOR_PLAN_URL,
      (tex) => {
        if (disposed) return
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 8
        setTexture(tex)
      },
      undefined,
      () => onMissing(),
    )
    return () => { disposed = true }
  }, [onMissing])

  if (!texture) return null

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      {/* Basic material — image keeps its baked lighting untouched */}
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

// ─────────────── Selection ring under the chosen table ───────

function SelectionRing({ position }: { position: [number, number, number] }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.02, position[2]]}>
      <ringGeometry args={[0.5, 0.72, 40]} />
      <meshBasicMaterial color={SELECTED_COLOR} transparent opacity={0.85} toneMapped={false} />
    </mesh>
  )
}

// ─────────────── Floating table pin ──────────────────────────

function TablePin({ table }: { table: BookTable }) {
  const { tableStatuses, selectedTable, activeArea, selectTable } = useTableStore()
  const status = tableStatuses[table.id]
  const isSelected = selectedTable === table.id
  const inActiveArea = SECTION_TO_AREA[table.section] === activeArea
  const pinColor = isSelected ? SELECTED_COLOR : STATUS_COLORS[status]
  const clickable = status !== 'booked'

  return (
    <group position={[table.position[0], 0.05, table.position[2]]}>
      <Html position={[0, 0.7, 0]} center distanceFactor={11} zIndexRange={[20, 0]}>
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
          {/* Triangle pointer */}
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

function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  const { camera } = useThree()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null)

  useEffect(() => {
    if (viewMode === 'top') {
      camera.position.set(0, 20, 0.01) // straight overhead
    } else {
      camera.position.set(0, 13, 11)   // gentle isometric tilt
    }
    if (controls.current) {
      controls.current.target.set(0, 0, 0)
      controls.current.update()
    }
  }, [viewMode, camera])

  return (
    <OrbitControls
      ref={controls}
      target={[0, 0, 0]}
      autoRotate={viewMode === '360'}
      autoRotateSpeed={0.9}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 3.4}
      minDistance={6}
      maxDistance={26}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

// ─────────────── Exported scene ──────────────────────────────

export default function TableScene({ viewMode }: { viewMode: ViewMode }) {
  const [missing, setMissing] = useState(false)

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 13, 11], fov: 42 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#EFE8DA']} />
        <FloorPlanImage onMissing={() => setMissing(true)} />
        {!missing && TABLES.map((t) => <TablePin key={t.id} table={t} />)}
        <CameraRig viewMode={viewMode} />
      </Canvas>

      {/* Friendly notice if the render image hasn't been added yet */}
      {missing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-md px-6 py-5 max-w-sm text-center">
            <p className="font-bold text-[#1A1A1A] mb-1">Floor plan image missing</p>
            <p className="text-[13px] text-[#6B7280]">
              Save the restaurant render as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">public/floor-plan.jpg</code> and refresh.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
