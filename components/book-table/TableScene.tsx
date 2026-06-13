'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTableStore } from './useTableStore'
import {
  TABLES, BookTable, STATUS_COLORS, SELECTED_COLOR,
  SECTION_TO_AREA, PLANE_W, PLANE_H,
} from './tableData'

export type ViewMode = '3d' | 'top' | '360'

// ─── Floor-plan image laid flat as a textured plane ──────────────

function FloorPlanImage() {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let disposed = false
    loader.load('/floor-plan.png', (tex) => {
      if (disposed) return
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 16
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

// ─── Selection ring under chosen table ───────────────────────────

function SelectionRing({ position }: { position: [number, number, number] }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.04, position[2]]}>
      <ringGeometry args={[0.45, 0.65, 40]} />
      <meshBasicMaterial
        color={SELECTED_COLOR}
        transparent
        opacity={0.85}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Floating table pin ───────────────────────────────────────────

function TablePin({ table }: { table: BookTable }) {
  const { tableStatuses, selectedTable, activeArea, selectTable } = useTableStore()
  const status    = tableStatuses[table.id]
  const isSelected = selectedTable === table.id
  const inActiveArea = SECTION_TO_AREA[table.section] === activeArea
  const pinColor  = isSelected ? SELECTED_COLOR : STATUS_COLORS[status]
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
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            padding: '5px 12px',
            borderRadius: 9,
            border: '2px solid rgba(255,255,255,0.9)',
            boxShadow: isSelected
              ? `0 5px 18px ${SELECTED_COLOR}80`
              : '0 4px 12px rgba(0,0,0,0.35)',
            cursor: clickable ? 'pointer' : 'not-allowed',
            opacity: inActiveArea ? 1 : 0.35,
            transform: isSelected ? 'scale(1.12)' : 'scale(1)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            userSelect: 'none',
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
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `8px solid ${pinColor}`,
          }} />
        </button>
      </Html>

      {isSelected && <SelectionRing position={table.position} />}
    </group>
  )
}

// ─── Camera rig ───────────────────────────────────────────────────

function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  const { camera } = useThree()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null)

  useEffect(() => {
    if (viewMode === 'top') {
      camera.position.set(0, 22, 0.01)
    } else {
      camera.position.set(0, 13, 11)
    }
    controls.current?.target.set(0, 0, 0)
    controls.current?.update()
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
      maxDistance={30}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

// ─── Exported scene ───────────────────────────────────────────────

export default function TableScene({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 13, 11], fov: 42 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#EFE8DA']} />

        <ambientLight intensity={1.1} color="#FFF6E8" />
        <directionalLight position={[10, 18, 12]} intensity={1.6} />
        <directionalLight position={[-10, 12, -8]} intensity={0.6} />

        <Suspense fallback={null}>
          <FloorPlanImage />
          {TABLES.map((t) => <TablePin key={t.id} table={t} />)}
          <CameraRig viewMode={viewMode} />
        </Suspense>
      </Canvas>
    </div>
  )
}
