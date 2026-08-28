/**
 * MPLADS RISE — India Heatmap (Real Map using react-leaflet)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Info, Layers, Loader2 } from 'lucide-react';
import { Card, RiskBadge, Button } from '../components/ui';
import type { RiskLevel } from '../types';

type MetricMode = 'risk' | 'funds' | 'delay';

const MOCK_STATE_DATA: Record<string, { riskScore: number; riskLevel: RiskLevel; avgDelay: number; utilizationPct: number; projectCount: number }> = {
  'Andhra Pradesh': { riskScore: 42, riskLevel: 'MEDIUM', avgDelay: 45, utilizationPct: 88.5, projectCount: 145 },
  'Arunachal Pradesh': { riskScore: 25, riskLevel: 'LOW', avgDelay: 20, utilizationPct: 92.1, projectCount: 42 },
  'Assam': { riskScore: 55, riskLevel: 'MEDIUM', avgDelay: 60, utilizationPct: 84.3, projectCount: 210 },
  'Bihar': { riskScore: 78, riskLevel: 'HIGH', avgDelay: 120, utilizationPct: 76.5, projectCount: 340 },
  'Chhattisgarh': { riskScore: 48, riskLevel: 'MEDIUM', avgDelay: 50, utilizationPct: 86.2, projectCount: 125 },
  'Goa': { riskScore: 12, riskLevel: 'LOW', avgDelay: 10, utilizationPct: 96.4, projectCount: 35 },
  'Gujarat': { riskScore: 32, riskLevel: 'LOW', avgDelay: 35, utilizationPct: 91.8, projectCount: 280 },
  'Haryana': { riskScore: 38, riskLevel: 'LOW', avgDelay: 40, utilizationPct: 89.5, projectCount: 160 },
  'Himachal Pradesh': { riskScore: 22, riskLevel: 'LOW', avgDelay: 15, utilizationPct: 94.2, projectCount: 85 },
  'Jharkhand': { riskScore: 68, riskLevel: 'HIGH', avgDelay: 95, utilizationPct: 79.8, projectCount: 190 },
  'Karnataka': { riskScore: 45, riskLevel: 'MEDIUM', avgDelay: 48, utilizationPct: 87.6, projectCount: 310 },
  'Kerala': { riskScore: 18, riskLevel: 'LOW', avgDelay: 12, utilizationPct: 95.7, projectCount: 220 },
  'Madhya Pradesh': { riskScore: 52, riskLevel: 'MEDIUM', avgDelay: 55, utilizationPct: 85.1, projectCount: 360 },
  'Maharashtra': { riskScore: 40, riskLevel: 'LOW', avgDelay: 42, utilizationPct: 88.9, projectCount: 420 },
  'Manipur': { riskScore: 82, riskLevel: 'CRITICAL', avgDelay: 150, utilizationPct: 65.4, projectCount: 55 },
  'Meghalaya': { riskScore: 35, riskLevel: 'LOW', avgDelay: 25, utilizationPct: 90.2, projectCount: 48 },
  'Mizoram': { riskScore: 30, riskLevel: 'LOW', avgDelay: 22, utilizationPct: 91.5, projectCount: 40 },
  'Nagaland': { riskScore: 65, riskLevel: 'HIGH', avgDelay: 85, utilizationPct: 80.1, projectCount: 62 },
  'Odisha': { riskScore: 46, riskLevel: 'MEDIUM', avgDelay: 46, utilizationPct: 86.9, projectCount: 250 },
  'Punjab': { riskScore: 28, riskLevel: 'LOW', avgDelay: 28, utilizationPct: 92.8, projectCount: 175 },
  'Rajasthan': { riskScore: 58, riskLevel: 'HIGH', avgDelay: 75, utilizationPct: 83.4, projectCount: 330 },
  'Sikkim': { riskScore: 15, riskLevel: 'LOW', avgDelay: 8, utilizationPct: 97.1, projectCount: 25 },
  'Tamil Nadu': { riskScore: 26, riskLevel: 'LOW', avgDelay: 24, utilizationPct: 93.6, projectCount: 390 },
  'Telangana': { riskScore: 44, riskLevel: 'MEDIUM', avgDelay: 44, utilizationPct: 87.9, projectCount: 185 },
  'Tripura': { riskScore: 38, riskLevel: 'LOW', avgDelay: 32, utilizationPct: 89.2, projectCount: 50 },
  'Uttar Pradesh': { riskScore: 88, riskLevel: 'CRITICAL', avgDelay: 180, utilizationPct: 62.8, projectCount: 850 },
  'Uttarakhand': { riskScore: 34, riskLevel: 'LOW', avgDelay: 30, utilizationPct: 90.5, projectCount: 110 },
  'West Bengal': { riskScore: 72, riskLevel: 'HIGH', avgDelay: 110, utilizationPct: 75.2, projectCount: 410 },
  'Delhi': { riskScore: 20, riskLevel: 'LOW', avgDelay: 18, utilizationPct: 94.8, projectCount: 95 },
  'Jammu and Kashmir': { riskScore: 60, riskLevel: 'HIGH', avgDelay: 80, utilizationPct: 81.5, projectCount: 130 },
};

function GeoJSONUpdater({ data }: { data: any }) {
  const map = useMap();

  useEffect(() => {
    if (data) {
      map.fitBounds([
        [8.4, 68.7], // SW India
        [37.6, 97.2]  // NE India
      ]);
    }
  }, [data, map]);

  return null;
}

export default function ConstituencyMap() {
  const navigate = useNavigate();
  const [metric, setMetric] = useState<MetricMode>('risk');
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/india_states.geojson')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching GeoJSON:', err);
        setError('Failed to load map data.');
        setLoading(false);
      });
  }, []);

  const getColor = (stateName: string) => {
    const data = MOCK_STATE_DATA[stateName] || { riskScore: 0, avgDelay: 0, utilizationPct: 100 };
    
    if (metric === 'risk') {
      const v = data.riskScore;
      if (v >= 80) return '#dc2626'; // red
      if (v >= 60) return '#ea580c'; // orange
      if (v >= 40) return '#d97706'; // amber
      if (v > 0) return '#16a34a';   // green
      return '#e2e8f0'; // gray for no data
    } else if (metric === 'delay') {
      const v = data.avgDelay;
      if (v >= 100) return '#dc2626';
      if (v >= 60) return '#ea580c';
      if (v >= 30) return '#d97706';
      if (v > 0) return '#16a34a';
      return '#e2e8f0';
    } else {
      const v = data.utilizationPct;
      if (v < 70) return '#dc2626';
      if (v < 85) return '#ea580c';
      if (v < 90) return '#d97706';
      if (v > 0) return '#16a34a';
      return '#e2e8f0';
    }
  };

  const styleGeoJSON = (feature: any) => {
    let stateName = feature.properties.NAME_1 || feature.properties.st_nm;
    if (stateName === 'Orissa') stateName = 'Odisha';
    if (stateName === 'Uttaranchal') stateName = 'Uttarakhand';
    
    return {
      fillColor: getColor(stateName),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.8,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    let stateName = feature.properties.NAME_1 || feature.properties.st_nm;
    if (stateName === 'Orissa') stateName = 'Odisha';
    if (stateName === 'Uttaranchal') stateName = 'Uttarakhand';

    layer.on({
      mouseover: (e: any) => {
        const layer = e.target;
        layer.setStyle({ weight: 2, color: '#333', fillOpacity: 1 });
        layer.bringToFront();
        setHoveredState(stateName);
      },
      mouseout: (e: any) => {
        const layer = e.target;
        layer.setStyle(styleGeoJSON(feature));
        setHoveredState(null);
      }
    });
  };

  return (
    <div className="space-y-4 fade-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            National Surveillance Map
          </h1>
          <p className="text-sm text-slate-500">Real-time geospatial tracking of MPLADS execution & risks</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
          <button onClick={() => setMetric('risk')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${metric === 'risk' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Risk Score</button>
          <button onClick={() => setMetric('funds')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${metric === 'funds' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Fund Utilization</button>
          <button onClick={() => setMetric('delay')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${metric === 'delay' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Avg Delay</button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 relative">
        {/* Main Map Container */}
        <Card className="flex-1 relative overflow-hidden bg-slate-50 border border-slate-300">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-white/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
              Loading real geographic data...
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-500">{error}</div>
          ) : (
            <MapContainer 
              center={[20.5937, 78.9629]} 
              zoom={5} 
              style={{ height: '100%', width: '100%', background: '#f8fafc' }}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <GeoJSONUpdater data={geoData} />
              
              <GeoJSON 
                key={`${metric}-geojson`} // Force re-render when metric changes
                data={geoData} 
                style={styleGeoJSON} 
                onEachFeature={onEachFeature} 
              />
            </MapContainer>
          )}

          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-sm border border-slate-200 z-[1000] text-xs pointer-events-none">
            <div className="font-semibold text-slate-700 mb-2">
              {metric === 'risk' ? 'Anomaly Risk Score' : metric === 'funds' ? 'Fund Utilization %' : 'Average Delay (Days)'}
            </div>
            <div className="space-y-1.5">
              {[
                { c: '#dc2626', l: metric === 'risk' ? '80+ (Critical)' : metric === 'funds' ? '< 70% (Poor)' : '100+ days' },
                { c: '#ea580c', l: metric === 'risk' ? '60 - 79 (High)' : metric === 'funds' ? '70% - 84%' : '60 - 99 days' },
                { c: '#d97706', l: metric === 'risk' ? '40 - 59 (Medium)' : metric === 'funds' ? '85% - 89%' : '30 - 59 days' },
                { c: '#16a34a', l: metric === 'risk' ? '< 40 (Low)' : metric === 'funds' ? '90%+ (Good)' : '< 30 days' },
              ].map(lg => (
                <div key={lg.c} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lg.c }} />
                  <span className="text-slate-600 font-medium">{lg.l}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Info Panel Overlay (Hover) */}
        <div className="w-72 flex flex-col gap-4">
          <Card className="p-4 flex-1">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-blue-600" />
              State Profile
            </h3>
            
            {hoveredState && MOCK_STATE_DATA[hoveredState] ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{hoveredState}</div>
                  <div className="text-xs text-slate-500">{MOCK_STATE_DATA[hoveredState].projectCount} Active Projects</div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Risk Status</div>
                    <RiskBadge level={MOCK_STATE_DATA[hoveredState].riskLevel} score={MOCK_STATE_DATA[hoveredState].riskScore} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1 flex justify-between">
                      <span>Fund Utilization</span>
                      <span className="font-bold text-slate-700">{MOCK_STATE_DATA[hoveredState].utilizationPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${MOCK_STATE_DATA[hoveredState].utilizationPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Average Delay</div>
                    <div className="font-semibold text-slate-800">{MOCK_STATE_DATA[hoveredState].avgDelay} Days</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <Button 
                    variant="secondary" 
                    className="w-full justify-center"
                    onClick={() => navigate(`/projects?state=${encodeURIComponent(hoveredState)}`)}
                  >
                    View Projects in {hoveredState}
                  </Button>
                </div>
              </div>
            ) : hoveredState ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No data available for {hoveredState}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                <MapPin className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Hover over a state on the map<br/>to view detailed metrics</p>
              </div>
            )}
          </Card>
          
          <Card className="p-4 bg-blue-50/50 border-blue-100">
            <h4 className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1"><Info className="w-3.5 h-3.5"/> Map Insights</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Real-time choropleth map powered by React Leaflet. Visualizes state-level aggregation of anomaly risk scores, completion delays, and fund utilization across all MPLADS projects.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
