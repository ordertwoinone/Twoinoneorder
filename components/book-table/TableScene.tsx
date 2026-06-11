'use client'
// ─────────────────────────────────────────────────────────────
// TableScene.tsx — 3D floor plan recreated from the reference
// render: indoor dining, private room, kitchen, outdoor terrace.
// Table pins are HTML speech bubbles via drei <Html>.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTableStore } from './useTableStore'
import { TABLES, BookTable, STATUS_COLORS, SELECTED_COLOR, SECTION_TO_AREA } from './tableData'

export type ViewMode = '3d' | 'top' | '360'

// ── Palette (warm stone + dark wood, matches reference) ──────
const C = {
  wall:        '#5C3D2E',
  wallDark:    '#4A3020',
  floorIn:     '#DED2BC',
  floorOut:    '#D3C5AA',
  roomFill:    '#C4B59E',
  wood:        '#7A5230',
  green:       '#5F7F52',
}

// ─────────────── Decor primitives ────────────────────────────

function Wall({ pos, size }: { pos: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={C.wall} roughness={0.8} />
    </mesh>
  )
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 8]} />
        <meshStandardMaterial color="#8A6A3A" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.42, 8, 8]} />
        <meshStandardMaterial color={C.green} roughness={0.85} />
      </mesh>
    </group>
  )
}

function StringLight({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.05, 6, 6]} />
      <meshStandardMaterial color="#FFEDB0" emissive="#FFEDB0" emissiveIntensity={2.4} />
    </mesh>
  )
}

function LabeledRoom({ pos, size, label }: { pos: [number, number, number]; size: [number, number, number]; label: string }) {
  const [w, h] = [size[0], size[1]]
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={C.roomFill} roughness={0.85} />
      </mesh>
      <Text position={[0, h / 2 + 0.16, 0]} fontSize={0.22} color={C.wallDark} anchorX="center" anchorY="bottom" fontWeight={700} maxWidth={w}>
        {label}
      </Text>
    </group>
  )
}

// ─────────────── Table mesh + pin ────────────────────────────

function TableUnit({ table }: { table: BookTable }) {
  const { tableStatuses, selectedTable, activeArea, selectTable } = useTableStore()
  const status = tableStatuses[table.id]
  const isSelected = selectedTable === table.id
  const inActiveArea = SECTION_TO_AREA[table.section] === activeArea
  const pinColor = isSelected ? SELECTED_COLOR : STATUS_COLORS[status]
  const clickable = status !== 'booked'

  return (
    <group position={table.position}>
      {/* Table top */}
      <mesh
        position={[0, 0.72, 0]}
        castShadow
        receiveShadow
        onClick={() => clickable && selectTable(table.id)}
      >
        <cylinderGeometry args={[0.55, 0.55, 0.07, 22]} />
        <meshStandardMaterial
          color={isSelected ? SELECTED_COLOR : status === 'booked' ? '#9A9A9A' : C.wood}
          emissive={isSelected ? SELECTED_COLOR : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : 0}
          roughness={0.5}
        />
      </mesh>
      {/* Pedestal */}
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.72, 8]} />
        <meshStandardMaterial color={C.wallDark} roughness={0.85} />
      </mesh>
      {/* Chairs — simple boxes around the table */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.85, 0.3, Math.sin(a) * 0.85]} castShadow>
          <boxGeometry args={[0.34, 0.6, 0.34]} />
          <meshStandardMaterial color="#6E4A2B" roughness={0.85} />
        </mesh>
      ))}

      {/* ── Floating pin (speech bubble) ── */}
      <Html position={[0, 2, 0]} center distanceFactor={13} zIndexRange={[20, 0]}>
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
            border: '2px solid rgba(255,255,255,0.85)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: clickable ? 'pointer' : 'not-allowed',
            opacity: inActiveArea ? 1 : 0.35,
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
      camera.position.set(0, 42, 4.01) // near-overhead
    } else {
      camera.position.set(0, 20, 26)   // isometric 3D
    }
    if (controls.current) {
      controls.current.target.set(0, 0, 3.5)
      controls.current.update()
    }
  }, [viewMode, camera])

  return (
    <OrbitControls
      ref={controls}
      target={[0, 0, 3.5]}
      autoRotate={viewMode === '360'}
      autoRotateSpeed={1.1}
      minPolarAngle={viewMode === 'top' ? 0 : Math.PI / 8}
      maxPolarAngle={Math.PI / 2.4}
      minAzimuthAngle={viewMode === '360' ? -Infinity : -Math.PI / 4}
      maxAzimuthAngle={viewMode === '360' ? Infinity : Math.PI / 4}
      minDistance={12}
      maxDistance={46}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

// ─────────────── Static floor plan geometry ──────────────────

function FloorPlan() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.85} color="#FFF6E8" />
      <directionalLight
        position={[14, 26, 16]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={70}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-16}
      />
      <pointLight position={[0, 7, 0]} intensity={0.5} color="#FFF2D8" />
      <pointLight position={[0, 6, 10]} intensity={0.45} color="#FFF2D8" />

      {/* Indoor floor 17 × 14.5 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[17, 14.5]} />
        <meshStandardMaterial color={C.floorIn} roughness={0.9} />
      </mesh>
      <gridHelper args={[17, 17, '#C3B499', '#C3B499']} position={[0, 0.002, 0]} />

      {/* Outdoor floor 18.5 × 7 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 10.75]} receiveShadow>
        <planeGeometry args={[18.5, 7]} />
        <meshStandardMaterial color={C.floorOut} roughness={0.92} />
      </mesh>
      <gridHelper args={[18.5, 18, '#BFAF94', '#BFAF94']} position={[0, 0, 10.75]} />

      {/* Indoor perimeter walls */}
      <Wall pos={[0, 1.1, -7.25]}   size={[17, 2.2, 0.22]} />
      <Wall pos={[-8.5, 1.1, 0]}    size={[0.22, 2.2, 14.5]} />
      <Wall pos={[8.5, 1.1, 0]}     size={[0.22, 2.2, 14.5]} />
      <Wall pos={[-4.9, 1.1, 7.25]} size={[7.4, 2.2, 0.22]} />
      <Wall pos={[5.4, 1.1, 7.25]}  size={[6.2, 2.2, 0.22]} />

      {/* Private room (VIP majlis) dividers — top right */}
      <Wall pos={[2.4, 1.1, -4.8]}  size={[0.15, 2.2, 5]} />
      <Wall pos={[5.5, 1.1, -2.3]}  size={[6.2, 2.2, 0.15]} />

      {/* Outdoor perimeter (low walls + planters) */}
      <Wall pos={[-9.25, 0.7, 10.75]} size={[0.22, 1.4, 7]} />
      <Wall pos={[9.25, 0.7, 10.75]}  size={[0.22, 1.4, 7]} />
      <Wall pos={[0, 0.7, 14.25]}     size={[18.5, 1.4, 0.22]} />

      {/* Static rooms */}
      <LabeledRoom pos={[-1.6, 0.95, -5.6]} size={[1.9, 1.9, 2.0]} label="WC" />
      <LabeledRoom pos={[0.7, 0.95, -5.6]}  size={[1.9, 1.9, 2.0]} label="STORE" />
      <LabeledRoom pos={[7.1, 1.0, 3.0]}    size={[2.4, 2.0, 6.5]} label="KITCHEN" />
      <LabeledRoom pos={[-0.2, 0.55, -2.6]} size={[2.6, 1.1, 3.2]} label={'COFFEE /\nCOUNTER'} />

      {/* Entrance arch + sign */}
      <mesh position={[-0.7, 1.4, 7.28]} castShadow>
        <boxGeometry args={[0.2, 2.8, 0.3]} />
        <meshStandardMaterial color={C.wallDark} roughness={0.7} />
      </mesh>
      <mesh position={[0.7, 1.4, 7.28]} castShadow>
        <boxGeometry args={[0.2, 2.8, 0.3]} />
        <meshStandardMaterial color={C.wallDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.5, 7.26]} castShadow>
        <boxGeometry args={[1.6, 0.2, 0.26]} />
        <meshStandardMaterial color={C.wallDark} roughness={0.7} />
      </mesh>
      <Text position={[0, 2.15, 7.1]} fontSize={0.26} color="#E8521A" anchorX="center" anchorY="middle" fontWeight={800}>
        TWO IN ONE
      </Text>
      {/* ENTRANCE label */}
      <Html position={[0, 3.1, 7.3]} center distanceFactor={13} zIndexRange={[5, 0]}>
        <div style={{
          background: '#1A1A1A', color: '#fff', fontWeight: 700, fontSize: 13,
          fontFamily: 'system-ui, sans-serif', padding: '5px 12px', borderRadius: 8,
          whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
        }}>
          ENTRANCE
        </div>
      </Html>

      {/* Plants */}
      <Plant position={[-8, 0, -6]} />
      <Plant position={[-8, 0, -2]} />
      <Plant position={[-8, 0, 2]} />
      <Plant position={[-8, 0, 6]} />
      <Plant position={[2.2, 0, -6.8]} />
      <Plant position={[7.8, 0, -6.8]} />
      <Plant position={[-8.6, 0, 8.2]} />
      <Plant position={[-8.6, 0, 13.4]} />
      <Plant position={[8.6, 0, 8.2]} />
      <Plant position={[8.6, 0, 13.4]} />
      <Plant position={[-5.5, 0, 13.7]} />
      <Plant position={[-1.5, 0, 13.7]} />
      <Plant position={[2.5, 0, 13.7]} />
      <Plant position={[6, 0, 13.7]} />

      {/* String lights across the terrace */}
      {Array.from({ length: 16 }, (_, i) => (
        <StringLight key={i} position={[-7.5 + i, 2.6, 10.75]} />
      ))}
    </>
  )
}

// ─────────────── Exported scene ──────────────────────────────

export default function TableScene({ viewMode }: { viewMode: ViewMode }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 20, 26], fov: 46 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#F5F0E8']} />
      <FloorPlan />
      {TABLES.map((t) => <TableUnit key={t.id} table={t} />)}
      <CameraRig viewMode={viewMode} />
    </Canvas>
  )
}
