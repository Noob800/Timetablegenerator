import React, { useMemo, useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Clock, MapPin, User, AlertCircle, Users, Loader2, Heart, Trophy } from 'lucide-react';
import { api, Settings } from '@/lib/api';
import type { TimetableSession } from '@/lib/api';

interface TimetableGridProps {
  viewMode: 'program' | 'lecturer' | 'venue';
  filterId?: string;
  searchQuery?: string;
  currentSearchIndex?: number;
  onSearchResultsChange?: (count: number) => void;
}

interface Session {
  id: string;
  unit_code: string;
  unit_name: string;
  lecturer_name: string;
  venue_name: string;
  day: string;
  start_time: string;
  end_time: string;
  session_type: string;
  program_groups: string[];
  group_name?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const START_HOUR = 7; // 7 AM
const END_HOUR = 20;  // 8 PM
const HOURS_COUNT = END_HOUR - START_HOUR;
const PIXELS_PER_HOUR = 120; // Width of one hour column
const MIN_ROW_HEIGHT = 120; // Minimum height for a day row
const SESSION_HEIGHT = 80; // Height of a single session card
const SESSION_GAP = 8; // Vertical gap between stacked sessions

// Helper to check if two sessions overlap
const doOverlap = (a: Session, b: Session) => {
  const startA = parseFloat(a.start_time.replace(':', '.'));
  const endA = parseFloat(a.end_time.replace(':', '.'));
  const startB = parseFloat(b.start_time.replace(':', '.'));
  const endB = parseFloat(b.end_time.replace(':', '.'));
  return startA < endB && startB < endA;
};

// Layout Algorithm: Stack overlapping events vertically
function layoutDaySessions(sessions: Session[]) {
  // Sort by start time, then duration
  const sorted = [...sessions].sort((a, b) => {
    const startA = parseFloat(a.start_time.replace(':', '.'));
    const startB = parseFloat(b.start_time.replace(':', '.'));
    if (startA === startB) {
       const durA = parseFloat(a.end_time.replace(':', '.')) - startA;
       const durB = parseFloat(b.end_time.replace(':', '.')) - startB;
       return durB - durA; // Longest first
    }
    return startA - startB;
  });

  const positionedSessions: { session: Session; rowIndex: number }[] = [];
  const rows: Session[][] = []; // Track end times of sessions in each row

  sorted.forEach(session => {
    let placed = false;
    // Try to fit in existing rows
    for (let i = 0; i < rows.length; i++) {
      const rowSessions = rows[i];
      // Check for overlap with ANY session in this row
      const hasOverlap = rowSessions.some(s => doOverlap(s, session));
      
      if (!hasOverlap) {
        rows[i].push(session);
        positionedSessions.push({ session, rowIndex: i });
        placed = true;
        break;
      }
    }

    // If not placed, start a new row
    if (!placed) {
      rows.push([session]);
      positionedSessions.push({ session, rowIndex: rows.length - 1 });
    }
  });

  return {
    sessions: positionedSessions,
    totalRows: Math.max(1, rows.length)
  };
}

export default function TimetableGrid({ 
  viewMode, 
  filterId, 
  searchQuery = '', 
  currentSearchIndex = 0,
  onSearchResultsChange 
}: TimetableGridProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchResultRefs = React.useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load timetable and reference data
        const [timetableData, unitsData, lecturersData, venuesData, settingsData] = await Promise.all([
          api.getActiveTimetable().catch(() => ({ sessions: [], conflicts: [], statistics: {}, metadata: {} })),
          api.getAllUnits().catch(() => []),
          api.getAllLecturers().catch(() => []),
          api.getAllVenues().catch(() => []),
          api.getSettings().catch(() => null)
        ]);
        
        setSessions(timetableData.sessions || []);
        setUnits(unitsData);
        setLecturers(lecturersData);
        setVenues(venuesData);
        setSettings(settingsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load timetable');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredSessions = sessions.filter(session => {
    if (!filterId || filterId === 'all') return true;
    if (viewMode === 'program') return session.program_groups.some(g => g.includes(filterId));
    if (viewMode === 'lecturer') return session.lecturer_name === filterId;
    if (viewMode === 'venue') return session.venue_name === filterId;
    return true;
  });

  // Search functionality
  const matchesSearch = (session: Session, query: string): boolean => {
    if (!query.trim()) return false;
    const lowerQuery = query.toLowerCase();
    return (
      session.unit_code.toLowerCase().includes(lowerQuery) ||
      session.unit_name.toLowerCase().includes(lowerQuery) ||
      session.lecturer_name.toLowerCase().includes(lowerQuery) ||
      session.venue_name.toLowerCase().includes(lowerQuery)
    );
  };

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filteredSessions
      .map((session, index) => ({ session, index }))
      .filter(({ session }) => matchesSearch(session, searchQuery));
  }, [filteredSessions, searchQuery]);

  // Update search results count
  useEffect(() => {
    if (onSearchResultsChange) {
      onSearchResultsChange(searchMatches.length);
    }
  }, [searchMatches.length, onSearchResultsChange]);

  // Scroll to current search result
  useEffect(() => {
    if (searchMatches.length > 0 && currentSearchIndex < searchResultRefs.current.length) {
      const element = searchResultRefs.current[currentSearchIndex];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSearchIndex, searchMatches.length]);

  const getUnitColor = (code: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-rose-100 text-rose-800 border-rose-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
    ];
    const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getInstitutionalEvents = (day: string) => {
    if (!settings || !settings.institutional_events) return [];
    
    return settings.institutional_events
      .filter(event => event.enabled && event.day === day)
      .map(event => ({
        name: event.name,
        start: event.start_time,
        end: event.end_time,
        color: event.color || 'purple'
      }));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No timetable data available</p>
          <p className="text-xs text-muted-foreground">Generate a timetable to see it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full print:border-0 print:shadow-none">
      
      {/* Header: Time Axis (Horizontal) */}
      <div className="flex border-b border-border bg-muted/50 sticky top-0 z-30 backdrop-blur-sm print:static">
        {/* Corner Spacer */}
        <div className="w-24 shrink-0 border-r border-border bg-muted/50 p-3 font-mono text-xs font-bold text-muted-foreground flex items-center justify-center sticky left-0 z-40">
          DAY \ TIME
        </div>
        
        {/* Time Labels */}
        <div className="flex-1 overflow-hidden relative" style={{ height: '48px' }}>
           <div className="absolute inset-0 flex" style={{ width: `${HOURS_COUNT * PIXELS_PER_HOUR}px` }}>
              {Array.from({ length: HOURS_COUNT }).map((_, i) => {
                const hour = START_HOUR + i;
                const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
                return (
                  <div key={hour} className="border-r border-border/50 text-xs text-muted-foreground font-medium flex items-center justify-start pl-2" style={{ width: `${PIXELS_PER_HOUR}px` }}>
                    {timeLabel}
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      {/* Body: Days (Vertical) */}
      <div className="overflow-auto flex-1 thin-scrollbar relative bg-white">
         <div className="min-w-fit">
            {DAYS.map(day => {
               const daySessions = filteredSessions.filter(s => s.day === day);
               const { sessions: layoutData, totalRows } = layoutDaySessions(daySessions);
               
               // Calculate day row height based on how many stacked items we have
               // Add some padding
               const rowHeight = Math.max(MIN_ROW_HEIGHT, (totalRows * (SESSION_HEIGHT + SESSION_GAP)) + 24);

               return (
                 <div key={day} className="flex border-b border-border group hover:bg-muted/5 transition-colors">
                    {/* Day Label (Sticky Left) */}
                    <div className="w-24 shrink-0 border-r border-border bg-muted/10 p-4 font-bold text-sm flex items-center justify-center sticky left-0 z-20 backdrop-blur-sm uppercase tracking-wider text-muted-foreground writing-vertical-lr md:writing-horizontal-tb">
                       <span className="-rotate-90 md:rotate-0">{day}</span>
                    </div>

                    {/* Timeline Content */}
                    <div className="relative flex-1" style={{ height: `${rowHeight}px`, width: `${HOURS_COUNT * PIXELS_PER_HOUR}px` }}>
                       
                       {/* Background Grid Lines */}
                       <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: HOURS_COUNT }).map((_, i) => (
                             <div key={i} className="border-r border-dashed border-border/30 h-full" style={{ width: `${PIXELS_PER_HOUR}px` }} />
                          ))}
                       </div>

                       {/* Institutional Events (Devotion/Sports/Custom) */}
                       {getInstitutionalEvents(day).map((event, idx) => {
                          const start = parseFloat(event.start.replace(':', '.'));
                          const end = parseFloat(event.end.replace(':', '.'));
                          const duration = end - start;
                          
                          const left = (start - START_HOUR) * PIXELS_PER_HOUR;
                          const width = duration * PIXELS_PER_HOUR;
                          
                          // Color mapping
                          const colorMap: Record<string, { bg: string; border: string; text: string }> = {
                            purple: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
                            orange: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
                            blue: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
                            green: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
                            red: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },
                            yellow: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
                            pink: { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
                            indigo: { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
                          };
                          
                          const colors = colorMap[event.color] || colorMap.purple;
                          const Icon = event.color === 'orange' ? Trophy : Heart;
                          
                          return (
                            <div
                              key={`event-${idx}`}
                              className={cn(
                                "absolute rounded-md border-2 border-dashed p-2 flex items-center justify-center gap-2 pointer-events-none font-bold",
                                colors.bg,
                                colors.border,
                                colors.text
                              )}
                              style={{
                                left: `${left}px`,
                                width: `${width - 8}px`,
                                top: '12px',
                                bottom: '12px',
                                zIndex: 5
                              }}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              <div className="flex flex-col items-center">
                                <span className="text-sm uppercase tracking-wider">{event.name}</span>
                                <span className="text-xs font-normal">{event.start} - {event.end}</span>
                              </div>
                            </div>
                          );
                       })}

                       {/* Sessions */}
                       {layoutData.map(({ session, rowIndex }) => {
                          // Calculate Horizontal Position
                          const start = parseFloat(session.start_time.replace(':', '.'));
                          const end = parseFloat(session.end_time.replace(':', '.'));
                          const duration = end - start;
                          
                          const left = (start - START_HOUR) * PIXELS_PER_HOUR;
                          const width = duration * PIXELS_PER_HOUR;
                          
                          // Calculate Vertical Position (Stacking)
                          const top = 12 + (rowIndex * (SESSION_HEIGHT + SESSION_GAP));

                          const colorClass = getUnitColor(session.unit_code);
                          const baseColor = colorClass.split('-')[1] || 'gray'; 

                          // Check if this session matches search
                          const isSearchMatch = matchesSearch(session, searchQuery);
                          const searchMatchIndex = searchMatches.findIndex(m => m.session.id === session.id);
                          const isCurrentSearchResult = searchMatchIndex === currentSearchIndex;

                          return (
                            <div 
                              key={session.id}
                              ref={isSearchMatch ? (el) => {
                                if (el && searchMatchIndex >= 0) {
                                  searchResultRefs.current[searchMatchIndex] = el;
                                }
                              } : undefined}
                              className={cn(
                                "absolute rounded-md border p-2 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden flex flex-col gap-0.5 hover:z-50 hover:scale-[1.02]",
                                "border-l-[4px]",
                                colorClass,
                                isCurrentSearchResult && "ring-4 ring-yellow-400 ring-offset-2 shadow-2xl z-50 scale-105",
                                isSearchMatch && !isCurrentSearchResult && "ring-2 ring-yellow-300"
                              )}
                              style={{ 
                                left: `${left}px`, 
                                width: `${width - 8}px`, // Slight gap
                                top: `${top}px`,
                                height: `${SESSION_HEIGHT}px`,
                                borderColor: `var(--color-${baseColor}-500)`
                              }}
                            >
                               <div className="flex justify-between items-start">
                                  <span className="font-bold font-mono text-[10px] uppercase tracking-wider opacity-90 truncate max-w-[70%]">{session.unit_code}</span>
                                  <div className="flex gap-1 shrink-0">
                                     {session.group_name && <span className="font-bold text-[9px] px-1 rounded bg-black/10">{session.group_name}</span>}
                                     {session.session_type === 'Lab' && <span className="font-bold text-[9px] px-1 rounded bg-black/5">LAB</span>}
                                     {session.session_type === 'Exam' && <span className="font-bold text-[9px] px-1 rounded bg-red-500/10 text-red-700">EXAM</span>}
                                  </div>
                               </div>
                               
                               <h4 className="font-semibold leading-tight text-[11px] line-clamp-2 my-auto">{session.unit_name}</h4>
                               
                               <div className="flex items-center justify-between text-[10px] opacity-80 mt-auto pt-1 border-t border-black/5">
                                  <div className="flex items-center gap-1">
                                     <MapPin className="w-3 h-3" />
                                     <span className="truncate max-w-[60px]">{session.venue_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                     <User className="w-3 h-3" />
                                     <span className="truncate max-w-[80px]">{session.lecturer_name.split(' ').pop()}</span>
                                  </div>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
}
