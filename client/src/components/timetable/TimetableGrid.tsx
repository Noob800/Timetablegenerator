import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { MOCK_SESSIONS, MOCK_UNITS, MOCK_VENUES, MOCK_LECTURERS, Session } from "@/lib/mockData";
import { Clock, MapPin, User, AlertCircle, Users } from 'lucide-react';

interface TimetableGridProps {
  viewMode: 'program' | 'lecturer' | 'venue';
  filterId?: string;
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
  const startA = parseFloat(a.startTime.replace(':', '.'));
  const endA = parseFloat(a.endTime.replace(':', '.'));
  const startB = parseFloat(b.startTime.replace(':', '.'));
  const endB = parseFloat(b.endTime.replace(':', '.'));
  return startA < endB && startB < endA;
};

// Layout Algorithm: Stack overlapping events vertically
function layoutDaySessions(sessions: Session[]) {
  // Sort by start time, then duration
  const sorted = [...sessions].sort((a, b) => {
    const startA = parseFloat(a.startTime.replace(':', '.'));
    const startB = parseFloat(b.startTime.replace(':', '.'));
    if (startA === startB) {
       const durA = parseFloat(a.endTime.replace(':', '.')) - startA;
       const durB = parseFloat(b.endTime.replace(':', '.')) - startB;
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

export default function TimetableGrid({ viewMode, filterId }: TimetableGridProps) {
  const filteredSessions = MOCK_SESSIONS.filter(session => {
    if (!filterId) return true;
    if (viewMode === 'program') return session.programGroups.some(g => g.includes(filterId) || filterId === 'ALL');
    if (viewMode === 'lecturer') return session.lecturerId === filterId;
    if (viewMode === 'venue') return session.venueId === filterId;
    return true;
  });

  const getUnitDetails = (id: string) => MOCK_UNITS.find(u => u.id === id);
  const getVenueDetails = (id: string) => MOCK_VENUES.find(v => v.id === id);
  const getLecturerDetails = (id: string) => MOCK_LECTURERS.find(l => l.id === id);

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

                       {/* Sessions */}
                       {layoutData.map(({ session, rowIndex }) => {
                          const unit = getUnitDetails(session.unitId);
                          const venue = getVenueDetails(session.venueId);
                          const lecturer = getLecturerDetails(session.lecturerId);
                          
                          // Calculate Horizontal Position
                          const start = parseFloat(session.startTime.replace(':', '.'));
                          const end = parseFloat(session.endTime.replace(':', '.'));
                          const duration = end - start;
                          
                          const left = (start - START_HOUR) * PIXELS_PER_HOUR;
                          const width = duration * PIXELS_PER_HOUR;
                          
                          // Calculate Vertical Position (Stacking)
                          const top = 12 + (rowIndex * (SESSION_HEIGHT + SESSION_GAP));

                          const colorClass = unit?.color || "bg-gray-100 text-gray-800 border-gray-200";
                          const baseColor = colorClass.split('-')[1] || 'gray'; 

                          return (
                            <div 
                              key={session.id}
                              className={cn(
                                "absolute rounded-md border p-2 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden flex flex-col gap-0.5 hover:z-50 hover:scale-[1.02]",
                                "border-l-[4px]",
                                colorClass
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
                                  <span className="font-bold font-mono text-[10px] uppercase tracking-wider opacity-90 truncate max-w-[70%]">{unit?.code}</span>
                                  <div className="flex gap-1 shrink-0">
                                     {session.groupName && <span className="font-bold text-[9px] px-1 rounded bg-black/10">{session.groupName}</span>}
                                     {session.type === 'Lab' && <span className="font-bold text-[9px] px-1 rounded bg-black/5">LAB</span>}
                                     {session.type === 'Exam' && <span className="font-bold text-[9px] px-1 rounded bg-red-500/10 text-red-700">EXAM</span>}
                                  </div>
                               </div>
                               
                               <h4 className="font-semibold leading-tight text-[11px] line-clamp-2 my-auto">{unit?.name}</h4>
                               
                               <div className="flex items-center justify-between text-[10px] opacity-80 mt-auto pt-1 border-t border-black/5">
                                  <div className="flex items-center gap-1">
                                     <MapPin className="w-3 h-3" />
                                     <span className="truncate max-w-[60px]">{venue?.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                     <User className="w-3 h-3" />
                                     <span className="truncate max-w-[80px]">{lecturer?.name.split(' ').pop()}</span>
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
