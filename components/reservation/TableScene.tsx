'use client'
// ─────────────────────────────────────────────────────────────
// TableScene.tsx — Full 3D scene: floor plan, tables, decor
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTableStore } from './useTableStore'
import { TABLES, TableData } from './tableData'

// ── Palette ──────────────────────────────────────────────────
const C = {
  wood:        '#8B5E3C',
  darkWood:    '#5C3D2E',
  wall:        '#4A3020',
  floorIndoor: '#EAE0CE',
  floorOuter:  '#D6C8AE',
  roomFill:    '#C8BAA8',
  counterTop:  '#A0826B',
  green:       '#6B8F5E',
  orange:      '#F5A623',
  cream:       '#F5F0E8',
  unavailable: '#888888',
}

// ─────────────── Reusable primitives ─────────────────────────

function Wall({ pos, size }: { pos: [number,number,number]; size: [number,number,number] }) {
  return (
    <mesh position={pos} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={C.wall} roughness={0.75} />
    </mesh>
  )
}

function Plant({ position }: { position: [number,number,number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.44, 8]} />
        <meshStandardMaterial color="#7A5920" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.62, 6]} />
        <meshStandardMaterial color="#3D5A35" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow>
        <sphereGeometry args={[0.48, 9, 9]} />
        <meshStandardMaterial color={C.green} roughness={0.8} />
      </mesh>
    </group>
  )
}

function PendantLight({ position }: { position: [number,number,number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1.1, 4]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.22, 0.22, 10, 1, true]} />
        <meshStandardMaterial color="#C8A96E" side={THREE.DoubleSide} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#FFF8E0" emissive="#FFF8E0" emissiveIntensity={3} />
      </mesh>
      <pointLight color="#FFF5D0" intensity={1.2} distance={5.5} decay={2} castShadow={false} />
    </group>
  )
}

function LabeledRoom({
  pos, size, label, color = C.roomFill,
}: {
  pos: [number,number,number]; size: [number,number,number]; label: string; color?: string
}) {
  const [w, h, d] = size
  return (
    <group position={pos}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <Text
        position={[0, h * 0.5 + 0.18, 0]}
        fontSize={0.21}
        color={C.darkWood}
        anchorX="center"
        anchorY="bottom"
        fontWeight={700}
        maxWidth={w - 0.2}
        textAlign="center"
      >
        {label}
      </Text>
    </group>
  )
}

function ServiceCounter({
  pos, size, label,
}: {
  pos: [number,number,number]; size: [number,number,number]; label: string
}) {
  const [w, h, d] = size
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.92, d]} />
        <meshStandardMaterial color="#8B6B4A" roughness={0.7} />
      </mesh>
      <mesh position={[0, h * 0.46 + 0.025, 0]} castShadow>
        <boxGeometry args={[w + 0.08, 0.05, d + 0.08]} />
        <meshStandardMaterial color={C.counterTop} roughness={0.35} metalness={0.1} />
      </mesh>
      <Text
        position={[0, h * 0.5 + 0.22, 0]}
        fontSize={0.19}
        color={C.darkWood}
        anchorX="center"
        anchorY="bottom"
        fontWeight={700}
        maxWidth={w - 0.1}
        textAlign="center"
      >
        {label}
      </Text>
    </group>
  )
}

// ─────────────── Chair ───────────────────────────────────────
function Chair({ pos, rot }: { pos: [number,number,number]; rot: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.04, 0.36]} />
        <meshStandardMaterial color="#7A4E2D" roughness={0.8} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.66, -0.16]} castShadow>
        <boxGeometry args={[0.36, 0.42, 0.04]} />
        <meshStandardMaterial color="#7A4E2D" roughness={0.8} />
      </mesh>
      {/* 4 legs */}
      {([-0.14, 0.14] as const).flatMap((lx) =>
        ([-0.14, 0.14] as const).map((lz) => (
          <mesh key={`${lx}${lz}`} position={[lx, 0.2, lz]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.4, 4]} />
            <meshStandardMaterial color={C.darkWood} roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  )
}

// ─────────────── Interactive Table ───────────────────────────
function Table({ table, dimmed }: { table: TableData; dimmed: boolean }) {
  const topRef  = useRef<THREE.Mesh>(null!)
  const matRef  = useRef<THREE.MeshStandardMaterial>(null!)
  const [hovered, setHovered] = useState(false)

  const { tableStatuses, selectTable } = useTableStore()
  const status       = tableStatuses[table.id] ?? 'available'
  const isSelected   = status === 'selected'
  const isUnavail    = status === 'unavailable'
  const canInteract  = !isUnavail

  const baseColor = isUnavail ? C.unavailable : isSelected ? C.orange : C.wood

  // Pulse emissive on selected; glow on hover
  useFrame(({ clock }) => {
    if (!matRef.current) return
    if (isSelected) {
      matRef.current.emissiveIntensity = 0.28 + Math.sin(clock.elapsedTime * 2.8) * 0.14
    } else if (hovered && canInteract) {
      matRef.current.emissiveIntensity = 0.18
    } else {
      matRef.current.emissiveIntensity = 0
    }
  })

  const chairCount  = table.seats <= 4 ? 4 : 6
  const chairRadius = chairCount === 4 ? 0.9 : 1.05
  const angles = Array.from({ length: chairCount }, (_, i) => (i / chairCount) * Math.PI * 2)

  return (
    <group position={table.position}>
      {/* ── Table top ── */}
      <mesh
        ref={topRef}
        position={[0, 0.76, 0]}
        castShadow
        receiveShadow
        onClick={() => canInteract && !dimmed && selectTable(table.id)}
        onPointerOver={() => { if (canInteract && !dimmed) { setHovered(true); document.body.style.cursor = 'pointer' } }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <cylinderGeometry args={[0.62, 0.62, 0.07, 28]} />
        <meshStandardMaterial
          ref={matRef}
          color={baseColor}
          emissive={isSelected ? C.orange : '#8B5E3C'}
          emissiveIntensity={0}
          roughness={0.45}
          metalness={0.08}
          transparent={dimmed}
          opacity={dimmed ? 0.22 : 1}
        />
      </mesh>

      {/* ── Pedestal ── */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.76, 8]} />
        <meshStandardMaterial color={C.darkWood} roughness={0.85} transparent={dimmed} opacity={dimmed ? 0.22 : 1} />
      </mesh>

      {/* ── Base ── */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 8]} />
        <meshStandardMaterial color={C.darkWood} roughness={0.85} transparent={dimmed} opacity={dimmed ? 0.22 : 1} />
      </mesh>

      {/* ── Plate indicators ── */}
      {!dimmed && angles.map((a, i) => (
        <mesh key={`plate-${i}`} position={[Math.cos(a) * 0.36, 0.815, Math.sin(a) * 0.36]}>
          <cylinderGeometry args={[0.095, 0.095, 0.008, 14]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.3} />
        </mesh>
      ))}

      {/* ── Table ID label ── */}
      {!dimmed && (
        <Text
          position={[0, 0.87, 0]}
          fontSize={0.21}
          color={isUnavail ? '#DDD' : '#F5F0E8'}
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {table.id}
        </Text>
      )}

      {/* ── Chairs ── */}
      {!dimmed && angles.map((a, i) => (
        <Chair
          key={`c-${i}`}
          pos={[Math.cos(a) * chairRadius, 0, Math.sin(a) * chairRadius]}
          rot={a + Math.PI}
        />
      ))}

      {/* ── Floating selection label ── */}
      {isSelected && !dimmed && (
        <Html position={[0, 2.3, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
          <div style={{
            background: 'rgba(245,166,35,0.96)',
            backdropFilter: 'blur(6px)',
            padding: '5px 13px',
            borderRadius: 20,
            color: '#1A120A',
            fontWeight: 800,
            fontSize: 12,
            whiteSpace: 'nowrap',
            boxShadow: '0 3px 14px rgba(245,166,35,0.45)',
            pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}>
            📍 {table.id} · {table.seats} seats
          </div>
        </Html>
      )}
    </group>
  )
}

// ─────────────── Main exported scene component ───────────────
export type ActiveFilter = 'All' | 'Indoor' | 'Outdoor'

export function TableScene({ activeFilter }: { activeFilter: ActiveFilter }) {
  function isDimmed(t: TableData) {
    if (activeFilter === 'All') return false
    if (activeFilter === 'Indoor') return t.section === 'Outdoor'
    return t.section !== 'Outdoor'
  }

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.65} color="#FFF8F0" />
      <directionalLight
        position={[12, 28, 14]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-16}
      />
      <pointLight position={[-6, 7, 0]}  intensity={0.6} color="#FFF5E0" />
      <pointLight position={[ 6, 7, 0]}  intensity={0.6} color="#FFF5E0" />
      <pointLight position={[ 0, 7, 10]} intensity={0.5} color="#FFF5E0" />

      {/* ────────────── INDOOR FLOOR ────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[17, 14.5]} />
        <meshStandardMaterial color={C.floorIndoor} roughness={0.88} />
      </mesh>
      {/* Subtle tile grid */}
      <gridHelper args={[17, 17, '#C5B79A', '#C5B79A']} position={[0, 0.002, 0]} />

      {/* ────────────── OUTDOOR FLOOR ────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 10.75]} receiveShadow>
        <planeGeometry args={[18.5, 7]} />
        <meshStandardMaterial color={C.floorOuter} roughness={0.92} />
      </mesh>
      <gridHelper args={[18.5, 18, '#C0B09A', '#C0B09A']} position={[0, 0, 10.75]} />

      {/* ────────────── INDOOR WALLS ────────────── */}
      {/* Back wall */}
      <Wall pos={[0, 1.4, -7.25]}   size={[17,   2.8, 0.22]} />
      {/* Left wall */}
      <Wall pos={[-8.5, 1.4, 0]}    size={[0.22, 2.8, 14.5]} />
      {/* Right wall */}
      <Wall pos={[8.5, 1.4, 0]}     size={[0.22, 2.8, 14.5]} />
      {/* Front wall left of entrance */}
      <Wall pos={[-4.6, 1.4, 7.25]} size={[8.2,  2.8, 0.22]} />
      {/* Front wall right of entrance */}
      <Wall pos={[5.6, 1.4, 7.25]}  size={[5.8,  2.8, 0.22]} />
      {/* WC/Store back divider */}
      <Wall pos={[-0.5, 1.4, -3.8]} size={[5,    2.8, 0.15]} />

      {/* ────────────── PRIVATE DINING ROOM ────────────── */}
      {/* Side divider (separates private dining from main) */}
      <Wall pos={[2.5, 1.4, -4.9]}  size={[0.15, 2.8, 4.8]} />
      {/* Front wall of private room (with gap for entry) */}
      <Wall pos={[6.2, 1.4, -2.35]} size={[4.8,  2.8, 0.15]} />
      {/* Sign above private dining */}
      <Text
        position={[4.8, 2.6, -2.3]}
        fontSize={0.2}
        color={C.cream}
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        PRIVATE DINING
      </Text>

      {/* ────────────── OUTDOOR PERIMETER WALLS ────────────── */}
      <Wall pos={[-9.25, 1.4, 10.75]} size={[0.22, 2.8, 7]} />
      <Wall pos={[9.25, 1.4, 10.75]}  size={[0.22, 2.8, 7]} />
      <Wall pos={[0, 1.4, 14.25]}     size={[18.5, 2.8, 0.22]} />

      {/* ────────────── STATIC ROOMS ────────────── */}
      <LabeledRoom pos={[-1.8, 1.1, -5.5]} size={[2.0, 2.2, 2.2]} label="WC" />
      <LabeledRoom pos={[ 0.6, 1.1, -5.5]} size={[2.0, 2.2, 2.2]} label="STORE" />
      <LabeledRoom pos={[ 6.8, 1.2, 2.5]}  size={[3.0, 2.4, 8.0]} label={"KITCHEN"} color="#B0A092" />

      {/* ────────────── COUNTERS ────────────── */}
      <ServiceCounter pos={[0.4, 0.56, -2.4]} size={[2.8, 1.12, 3.8]} label={"COFFEE /\nSERVICE\nCOUNTER"} />
      <ServiceCounter pos={[4.8, 0.5, 5.5]}   size={[2.4, 1.0, 1.8]}  label={"PICK UP\nCOUNTER"} />

      {/* ────────────── ENTRANCE "TWO IN ONE" ────────────── */}
      {/* Left door pillar */}
      <mesh position={[-0.65, 1.55, 7.28]} castShadow>
        <boxGeometry args={[0.22, 3.1, 0.32]} />
        <meshStandardMaterial color={C.darkWood} roughness={0.7} />
      </mesh>
      {/* Right door pillar */}
      <mesh position={[0.65, 1.55, 7.28]} castShadow>
        <boxGeometry args={[0.22, 3.1, 0.32]} />
        <meshStandardMaterial color={C.darkWood} roughness={0.7} />
      </mesh>
      {/* Door lintel */}
      <mesh position={[0, 2.72, 7.26]} castShadow>
        <boxGeometry args={[1.52, 0.22, 0.28]} />
        <meshStandardMaterial color={C.darkWood} roughness={0.7} />
      </mesh>
      {/* Sign */}
      <Text
        position={[0, 2.32, 7.1]}
        fontSize={0.28}
        color={C.orange}
        anchorX="center"
        anchorY="middle"
        fontWeight={800}
      >
        TWO IN ONE
      </Text>

      {/* ────────────── PENDANT LIGHTS ────────────── */}
      <PendantLight position={[-4, 3.2, -3]}   />
      <PendantLight position={[-4, 3.2, -0.5]} />
      <PendantLight position={[-2, 3.2,  2.2]} />
      <PendantLight position={[ 0, 3.2,  3]}   />
      <PendantLight position={[ 4.5, 3.2, -3.5]} />
      <PendantLight position={[-1,  3.2,  8]}   />
      <PendantLight position={[ 2,  3.2,  9.5]} />

      {/* ────────────── PLANTS ────────────── */}
      {/* Indoor left wall */}
      <Plant position={[-8, 0, -6]}  />
      <Plant position={[-8, 0, -3]}  />
      <Plant position={[-8, 0,  0.5]}/>
      <Plant position={[-8, 0,  4]}  />
      <Plant position={[-8, 0,  6.5]}/>
      {/* Near private dining */}
      <Plant position={[2.2, 0, -6.8]} />
      <Plant position={[2.2, 0, -2.2]} />
      {/* Outdoor perimeter */}
      <Plant position={[-8.5, 0,  8]}  />
      <Plant position={[-8.5, 0, 11]}  />
      <Plant position={[-8.5, 0, 13.5]}/>
      <Plant position={[ 8.5, 0,  8]}  />
      <Plant position={[ 8.5, 0, 11]}  />
      <Plant position={[ 8.5, 0, 13.5]}/>
      <Plant position={[-3.5, 0, 13.8]}/>
      <Plant position={[ 3.5, 0, 13.8]}/>
      <Plant position={[ 0,   0, 13.8]}/>

      {/* ────────────── OUTDOOR LOUNGE (bottom-left) ────────────── */}
      {/* Sofa */}
      <mesh position={[-7.2, 0.42, 12.2]} castShadow>
        <boxGeometry args={[2.6, 0.44, 0.95]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>
      <mesh position={[-7.2, 0.78, 12.62]} castShadow>
        <boxGeometry args={[2.6, 0.28, 0.18]} />
        <meshStandardMaterial color="#8B7355" roughness={0.8} />
      </mesh>
      {/* Armchairs */}
      <mesh position={[-8.6, 0.38, 11.4]} castShadow>
        <boxGeometry args={[0.75, 0.44, 0.75]} />
        <meshStandardMaterial color="#7A6348" roughness={0.8} />
      </mesh>
      <mesh position={[-5.8, 0.38, 11.4]} castShadow>
        <boxGeometry args={[0.75, 0.44, 0.75]} />
        <meshStandardMaterial color="#7A6348" roughness={0.8} />
      </mesh>
      {/* Low coffee table */}
      <mesh position={[-7.2, 0.3, 11.3]} castShadow>
        <boxGeometry args={[1.1, 0.06, 0.7]} />
        <meshStandardMaterial color={C.wood} roughness={0.5} />
      </mesh>
      <Text position={[-7.2, 0.08, 12.8]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.16} color={C.darkWood} anchorX="center" fontWeight={600}>
        LOUNGE
      </Text>

      {/* ────────────── STRING LIGHTS (outdoor) ────────────── */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={`sl-${i}`} position={[-6 + i * 0.92, 2.85, 10.75]}>
          <sphereGeometry args={[0.055, 6, 6]} />
          <meshStandardMaterial color="#FFF8B0" emissive="#FFF8B0" emissiveIntensity={2.5} />
        </mesh>
      ))}
      {/* String wire */}
      <mesh position={[0, 2.9, 10.75]} rotation={[0, 0, 0]}>
        <boxGeometry args={[13, 0.01, 0.01]} />
        <meshStandardMaterial color="#555" />
      </mesh>

      {/* Wall sconces (outdoor) */}
      {[-8, -4, 0, 4, 8].map((x) => (
        <group key={`sconce-${x}`} position={[x, 2.2, 14.1]}>
          <mesh>
            <boxGeometry args={[0.12, 0.28, 0.12]} />
            <meshStandardMaterial color="#7A6040" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#FFF8D0" emissive="#FFF8D0" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}

      {/* ────────────── INTERACTIVE TABLES ────────────── */}
      {TABLES.map((table) => (
        <Table key={table.id} table={table} dimmed={isDimmed(table)} />
      ))}

      {/* ────────────── CAMERA CONTROLS ────────────── */}
      <OrbitControls
        target={[0, 0, 3.5]}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.3}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        minDistance={13}
        maxDistance={40}
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
      />
    </>
  )
}
