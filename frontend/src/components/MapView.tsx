// src/components/MapView.tsx
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Signal } from '../api/apiClient';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SDRStation {
  id: number;
  name: string;
  location: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline';
}

interface MapViewProps {
  stations: SDRStation[];
  signals?: Signal[];
  center?: [number, number];
  zoom?: number;
  onSignalClick?: (signal: Signal) => void;
  onRefresh?: () => Promise<void>;
  height?: string;
  isLoading?: boolean;
  lastUpdate?: Date;
  minZoom?: number;
  maxZoom?: number;
}

const getSignalColor = (label: string): string => {
  const colors: Record<string, string> = {
    Drone: '#ff4444',
    Jamming: '#ff8800',
    Normal: '#00c851',
  };
  return colors[label] || '#00e5ff';
};

const createCustomIcon = (color: string, isStation: boolean = false) => {
  const size = isStation ? 16 : 12;
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// ✅ SetMapView معدل: يعمل مرة واحدة فقط عند التحميل الأول
const SetMapView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      map.setView(center, zoom);
      isFirstRender.current = false;
    }
  }, [center, zoom, map]);

  return null;
};

// Zoom Controls
const ZoomControls = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
      <button
        className="w-10 h-10 bg-gray-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-xl font-bold hover:bg-cyan-600 transition-all border border-gray-700 shadow-lg cursor-pointer"
        onClick={() => map.zoomIn()}
        title="تكبير"
      >
        +
      </button>
      <button
        className="w-10 h-10 bg-gray-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-xl font-bold hover:bg-cyan-600 transition-all border border-gray-700 shadow-lg cursor-pointer"
        onClick={() => map.zoomOut()}
        title="تصغير"
      >
        −
      </button>
    </div>
  );
};

const MapView: React.FC<MapViewProps> = ({
  stations,
  signals = [],
  center = [26.8206, 30.8025],
  zoom = 6,
  onSignalClick,
  onRefresh,
  height = '500px',
  isLoading = false,
  lastUpdate,
  minZoom = 3,
  maxZoom = 18,
}) => {
  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-800" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000] rounded-xl">
          <div className="bg-gray-900 px-6 py-3 rounded-full flex items-center gap-3 shadow-xl">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">جاري تحديث الخريطة...</span>
          </div>
        </div>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="absolute top-4 right-4 z-[1000] bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-cyan-600 transition-all disabled:opacity-50 shadow-lg border border-gray-700 cursor-pointer"
        >
          {isLoading ? '🔄 جاري التحديث...' : '🔄 تحديث'}
        </button>
      )}

      {lastUpdate && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-400 shadow-lg">
          آخر تحديث: {lastUpdate.toLocaleTimeString('ar-EG')}
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <SetMapView center={center} zoom={zoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <ZoomControls />

        {stations.map((station) => (
          <React.Fragment key={station.id}>
            <Marker
              position={[station.lat, station.lng]}
              icon={createCustomIcon('#00e5ff', true)}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-cyan-500">📡 {station.name}</div>
                  <div className="text-sm text-gray-400">{station.location}</div>
                  <div className="text-xs text-green-500 mt-1">● متصل</div>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[station.lat, station.lng]}
              radius={50000}
              pathOptions={{ color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.05, weight: 1 }}
            />
          </React.Fragment>
        ))}

        {signals.slice(0, 200).map((signal, index) => {
          // ✅ استخدام الإحداثيات الفعلية من الـ API
          let position: [number, number];
          if (signal.lat && signal.lng) {
            position = [signal.lat, signal.lng];
          } else {
            const station = stations.find((s) => s.name === signal.station);
            if (station) {
              const latOffset = (Math.sin(index * 123.456) * 0.5) / 5;
              const lngOffset = (Math.cos(index * 789.012) * 0.5) / 5;
              position = [station.lat + latOffset, station.lng + lngOffset];
            } else {
              position = [center[0] + (Math.sin(index) * 0.2), center[1] + (Math.cos(index) * 0.2)];
            }
          }
          
          const color = getSignalColor(signal.label);
          return (
            <Marker
              key={`${signal.id}-${signal.timestamp}-${index}`}
              position={position}
              icon={createCustomIcon(color)}
              eventHandlers={{ click: () => onSignalClick?.(signal) }}
            >
              <Popup>
                <div>
                  <div className="font-bold" style={{ color }}>{signal.label}</div>
                  <div className="text-xs text-gray-300">التردد: {signal.frequency} MHz</div>
                  <div className="text-xs text-gray-300">الثقة: {Math.round(signal.confidence * 100)}%</div>
                  <div className="text-xs text-gray-300">المحطة: {signal.station}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;