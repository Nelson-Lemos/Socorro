import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coords } from '../utils/geo'

export interface MarkerData {
  id: string
  lat: number
  lon: number
  color: string
  available?: string
  nome?: string
  active?: boolean
}

interface Props {
  center: Coords
  zoom?: number
  height?: string
  markers?: MarkerData[]
  pickup?: Coords | null
  route?: [Coords, Coords]
  centerKey?: number
  onMoveEnd?: (center: Coords, zoom: number) => void
  onPick?: (c: Coords) => void
  onMarkerClick?: (id: string) => void
}

function makeIcon(color: string, available?: string, active = false) {
  const fill = available === 'online' ? '#10B981' : available === 'ocupado' ? '#F59E0B' : available === 'offline' ? '#9CA3AF' : color
  const size = active ? 36 : 26
  const html = active
    ? `<div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;inset:-7px;border-radius:50%;border:2px solid #DC2626;opacity:0.35;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;background:${fill};border:3px solid #fff;box-shadow:0 1px 8px rgba(0,0,0,0.35);"></div>
      </div>`
    : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.35);"></div>`
  return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

function pickupIcon() {
  const html = `
    <div style="width:28px;height:28px;border-radius:50%;background:#DC2626;border:3px solid #fff;
      box-shadow:0 1px 8px rgba(220,38,38,0.5);"></div>`
  return L.divIcon({ className: '', html, iconSize: [28, 28], iconAnchor: [14, 14] })
}

function MapEvents({
  onMoveEnd,
  onPick,
}: {
  onMoveEnd?: (c: Coords, z: number) => void
  onPick?: (c: Coords) => void
}) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter()
      onMoveEnd?.({ lat: c.lat, lon: c.lng }, map.getZoom())
    },
    click: (e) => {
      onPick?.({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}

function CenterController({ center, centerKey }: { center: Coords; centerKey: number }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    map.flyTo([center.lat, center.lon], Math.max(map.getZoom(), 14), { duration: 0.6 })
  }, [centerKey, center.lat, center.lon, map])
  return null
}

function RouteController({ route }: { route?: [Coords, Coords] }) {
  const map = useMap()
  useEffect(() => {
    if (!route || route[0].lat === route[1].lat) return
    const bounds = L.latLngBounds([
      [route[0].lat, route[0].lon],
      [route[1].lat, route[1].lon],
    ])
    map.fitBounds(bounds, { padding: [60, 60] })
  }, [route, map])
  return null
}

export default function LeafletMap({
  center,
  zoom = 13,
  height = '100%',
  markers = [],
  pickup = null,
  route,
  centerKey = 0,
  onMoveEnd,
  onPick,
  onMarkerClick,
}: Props) {
  return (
    <div style={{ height, width: '100%', position: 'relative', overflow: 'hidden' }}>
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl
        attributionControl={false}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapEvents onMoveEnd={onMoveEnd} onPick={onPick} />
        <CenterController center={center} centerKey={centerKey} />
        <RouteController route={route} />

        {pickup && <Marker position={[pickup.lat, pickup.lon]} icon={pickupIcon()} />}

        {route && (
          <Polyline
            positions={[
              [route[0].lat, route[0].lon],
              [route[1].lat, route[1].lon],
            ]}
            pathOptions={{ color: '#DC2626', weight: 4, dashArray: '8 6' }}
          />
        )}

        {markers.map((m) => {
          const statusLabel =
            m.available === 'online' ? 'Disponível' : m.available === 'ocupado' ? 'Ocupado' : m.available === 'offline' ? 'Offline' : 'Profissional'
          return (
            <Marker
              key={m.id}
              position={[m.lat, m.lon]}
              icon={makeIcon(m.color, m.available, m.active)}
              eventHandlers={{
                click: () => onMarkerClick?.(m.id),
              }}
            >
              {m.nome && (
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', padding: 4 }}>
                    <p style={{ fontWeight: 700, margin: 0 }}>{m.nome}</p>
                    <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 12 }}>{statusLabel}</p>
                  </div>
                </Popup>
              )}
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}