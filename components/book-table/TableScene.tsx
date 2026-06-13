'use client'

import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTableStore } from './useTableStore'
import { TABLES, BookTable, STATUS_COLORS, SELECTED_COLOR, SECTION_TO_AREA } from './tableData'

export type ViewMode = '3d' | 'top' | '360'

// ─── Colour palette ──────────────────────────────────────────────
const C = {
  floor:        '#F0E8D8',
  floorLine:    '#E0D5C0',
  indoor:       '#FFF3E0',
  outdoor:      '#E8F5E9',
  vip:          '#EDE7F6',
  wall:         '#D6CBBA',
  tableSurface: '#C8A96E',
  tableLeg:     '#A07840',
  chairSeat:    '#B89060',
  divider:      '#C8BCA8',
  zoneLabel:    '#9E8C70',
}

// ─── Floor ───────────────────────────────────────────────────────
function Floor() {
  return (
    <>
      {/* Base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[22, 16]} />
        <meshLambertMaterial color={C.floor} />
      </mesh>
      {/* Subtle grid lines */}
      <gridHelper args={[22, 22, C.floorLine, C.floorLine]} position={[0, 0, 0]} />
    </>
  )
}

// ─── Zone coloured area ──────────────────────────────────────────
function ZoneArea({ cx, cz, w, d, color, label }: {
  cx: number; cz: number; w: number; d: number; color: string; label: string
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.001, cz]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
      {/* Zone border */}
      <lineSegments position={[cx, 0.01, cz]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(w, d)]} />
        <lineBasicMaterial color={C.divider} />
      </lineSegments>
      {/* Zone label */}
      <Html position={[cx - w / 2 + 0.5, 0.1, cz - d / 2 + 0.4]} zIndexRange={[0, 1]}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.zoneLabel,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'none',
        }}>
          {label}
        </span>
      </Html>
    </group>
  )
}

// ─── Single chair ────────────────────────────────────────────────
function Chair({ x, z, angle }: { x: number; z: number; angle: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.32, 0.05, 0.32]} />
        <meshLambertMaterial color={C.chairSeat} />
      </mesh>
    </group>
  )
}

// ─── Table with chairs ───────────────────────────────────────────
function TableObject({ table }: { table: BookTable }) {
  const { tableStatuses, selectedTable } = useTableStore()
  const status = tableStatuses[table.id]
  const isSelected = selectedTable === table.id
  const [tx, , tz] = table.position

  const statusColor = isSelected ? SELECTED_COLOR : STATUS_COLORS[status]

  return (
    <group position={[tx, 0, tz]}>
      {/* Table leg */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.4, 8]} />
        <meshLambertMaterial color={C.tableLeg} />
      </mesh>

      {/* Table surface */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.85, 0.07, 0.85]} />
        <meshLambertMaterial color={C.tableSurface} />
      </mesh>

      {/* Status indicator on table top */}
      <mesh position={[0, 0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 20]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* Selection ring on floor */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial color={SELECTED_COLOR} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 4 chairs */}
      <Chair x={0}    z={-0.72} angle={0} />
      <Chair x={0}    z={ 0.72} angle={Math.PI} />
      <Chair x={-0.72} z={0}   angle={Math.PI / 2} />
      <Chair x={ 0.72} z={0}   angle={-Math.PI / 2} />
    </group>
  )
}

// ─── Table pin (floating label) ───────────────────────────────────
function TablePin({ table }: { table: BookTable }) {
  const { tableStatuses, selectedTable, activeArea, selectTable } = useTableStore()
  const status = tableStatuses[table.id]
  const isSelected = selectedTable === table.id
  const inActiveArea = SECTION_TO_AREA[table.section] === activeArea
  const pinColor = isSelected ? SELECTED_COLOR : STATUS_COLORS[status]
  const clickable = status !== 'booked'
  const [tx, , tz] = table.position

  return (
    <Html position={[tx, 1.6, tz]} center distanceFactor={10} zIndexRange={[20, 0]}>
      <button
        onClick={() => clickable && selectTable(table.id)}
        style={{
          position: 'relative',
          background: pinColor,
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          padding: '4px 10px',
          borderRadius: 8,
          border: '2px solid rgba(255,255,255,0.9)',
          boxShadow: isSelected
            ? `0 4px 16px ${SELECTED_COLOR}90`
            : '0 3px 10px rgba(0,0,0,0.3)',
          cursor: clickable ? 'pointer' : 'not-allowed',
          opacity: inActiveArea ? 1 : 0.3,
          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {table.id}
        {/* Arrow */}
        <span style={{
          position: 'absolute',
          left: '50%',
          bottom: -7,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `7px solid ${pinColor}`,
        }} />
      </button>
    </Html>
  )
}

// ─── Camera ──────────────────────────────────────────────────────
function CameraRig({ viewMode }: { viewMode: ViewMode }) {
  const { camera } = useThree()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null)

  useEffect(() => {
    if (viewMode === 'top') {
      camera.position.set(0, 20, 0.01)
    } else {
      camera.position.set(2, 13, 14)
    }
    controls.current?.target.set(0, 0, 0)
    controls.current?.update()
  }, [viewMode, camera])

  return (
    <OrbitControls
      ref={controls}
      target={[0, 0, 0]}
      autoRotate={viewMode === '360'}
      autoRotateSpeed={0.7}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={5}
      maxDistance={28}
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
    />
  )
}

// ─── Exported scene ───────────────────────────────────────────────
export default function TableScene({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [2, 13, 14], fov: 42 }}
        gl={{ antialias: true }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#EDE5D8']} />

        {/* Lighting */}
        <ambientLight intensity={1.2} color="#FFF8F0" />
        <directionalLight
          position={[8, 16, 10]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-8, 10, -6]} intensity={0.5} color="#E8F0FF" />

        <Suspense fallback={null}>
          {/* Floor */}
          <Floor />

          {/* Zone shading — approximate bounds */}
          <ZoneArea cx={-0.85} cz={4.1}  w={14} d={2.8} color={C.outdoor} label="☀️  Outdoor Terrace" />
          <ZoneArea cx={-3.9}  cz={-2.1} w={7}  d={6.5} color={C.indoor}  label="🍽️  Main Dining Hall" />
          <ZoneArea cx={ 2.1}  cz={-3.4} w={3.5} d={4.5} color={C.vip}   label="👑  VIP Majlis" />

          {/* Table geometry */}
          {TABLES.map((t) => <TableObject key={t.id} table={t} />)}

          {/* Floating labels */}
          {TABLES.map((t) => <TablePin key={t.id} table={t} />)}

          <CameraRig viewMode={viewMode} />
        </Suspense>
      </Canvas>
    </div>
  )
}
