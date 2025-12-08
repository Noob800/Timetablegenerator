import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { MOCK_SESSIONS, MOCK_UNITS, MOCK_VENUES, MOCK_LECTURERS, Session } from "@/lib/mockData";
import { Clock, MapPin, User, AlertCircle, Users } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TimetableGridProps {
  viewMode: 'program' | 'lecturer' | 'venue';
  filterId?: string; // ID of the program/lecturer/venue to show
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

const ROW_HEIGHT_PX = 96; // h-24
const HEADER_HEIGHT_PX = 48; // h-12

// Helper to layout overlap events
function layoutDayEvents(sessions: Session[]) {
  // Simple column packing algorithm
  // 1. Sort by start time, then duration (desc)
  const sorted = [...sessions].sort((a, b) => {
    if (a.startTime === b.startTime) {
      const durA = parseInt(a.endTime) - parseInt(a.startTime);
      const durB = parseInt(b.endTime) - parseInt(b.startTime);
      return durB - durA;
    }
    return parseInt(a.startTime) - parseInt(b.startTime);
  });

  const columns: Session[][] = [];
  
  sorted.forEach(session => {
    // Find first column where session fits
    let placed = false;
    for (const column of columns) {
      const lastSessionInColumn = column[column.length - 1];
      // Check if this session starts after the last one ends
      if (parseInt(session.startTime) >= parseInt(lastSessionInColumn.endTime)) {
        column.push(session);
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      columns.push([session]);
    }
  });

  // Calculate width and left for each session
  // This is a simplified version. A proper one would check connectivity.
  // For now, we just divide by number of columns if overlaps exist.
  // Actually, let's just use the column index and total columns approach for the whole day?
  // No, that makes non-overlapping sessions narrow.
  
  // Better approach for UI: Just return the columns and let rendering handle width = 100 / columns.length
  // But this applies to the whole day which is wrong.
  
  // Real layouting is complex. Let's do a simplified "Event Group" approach.
  // Group events that overlap with each other.
  
  const groups: Session[][] = [];
  
  // Linear scan to group overlapping events
  let currentGroup: Session[] = [];
  let groupEndTime = 0;
  
  sorted.forEach(session => {
    const start = parseInt(session.startTime);
    const end = parseInt(session.endTime);
    
    if (currentGroup.length === 0) {
      currentGroup.push(session);
      groupEndTime = end;
    } else {
      if (start < groupEndTime) {
        currentGroup.push(session);
        groupEndTime = Math.max(groupEndTime, end);
      } else {
        groups.push(currentGroup);
        currentGroup = [session];
        groupEndTime = end;
      }
    }
  });
  if (currentGroup.length > 0) groups.push(currentGroup);
  
  // Now assign layout props to each session in the groups
  const layoutMap = new Map<string, { left: number, width: number }>();
  
  groups.forEach(group => {
     const count = group.length;
     group.forEach((s, idx) => {
       layoutMap.set(s.id, {
         left: (idx / count) * 100,
         width: 100 / count
       });
     });
  });
  
  return layoutMap;
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

  // Pre-calculate layout for each day
  const dayLayouts = useMemo(() => {
    const layouts: Record<string, Map<string, { left: number, width: number }>> = {};
    DAYS.forEach(day => {
      const daySessions = filteredSessions.filter(s => s.day === day);
      layouts[day] = layoutDayEvents(daySessions);
    });
    return layouts;
  }, [filteredSessions]);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full print:border-0 print:shadow-none">
      <div className="overflow-auto flex-1 thin-scrollbar relative">
        <div className="min-w-[1000px] grid grid-cols-[80px_repeat(5,1fr)] bg-muted/20 print:bg-white relative">
          
          {/* Header Row: Days */}
          <div className="h-12 border-b border-r border-border bg-muted/50 font-mono text-xs text-muted-foreground sticky top-0 z-30 backdrop-blur-sm print:static print:bg-transparent flex items-center justify-center font-bold">
            TIME
          </div>
          {DAYS.map(day => (
            <div key={day} className="h-12 border-b border-r border-border bg-muted/30 font-semibold text-sm flex items-center justify-center sticky top-0 z-30 backdrop-blur-sm print:static print:bg-transparent uppercase tracking-wider">
              {day}
            </div>
          ))}

          {/* Time Slots (Left Column) + Grid Cells */}
          {TIME_SLOTS.map((time, index) => (
            <React.Fragment key={time}>
              <div className="h-24 border-b border-r border-border text-xs text-muted-foreground font-mono text-center flex flex-col justify-start pt-2 bg-muted/10 sticky left-0 z-20 print:static print:bg-transparent">
                {time}
              </div>
              {DAYS.map(day => (
                <div key={`${day}-${time}`} className="h-24 border-b border-r border-border relative bg-background/50 print:bg-transparent">
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Overlay Sessions */}
          <div 
            className="grid grid-cols-[80px_repeat(5,1fr)] gap-0 absolute inset-0 pointer-events-none z-10" 
            style={{ 
              top: `${HEADER_HEIGHT_PX}px`, 
              height: `calc(100% - ${HEADER_HEIGHT_PX}px)` 
            }}
          >
             <div className="row-span-full border-r border-transparent"></div>

             {DAYS.map((day, dayIndex) => (
               <div key={day} className="relative row-span-full border-r border-transparent pointer-events-auto">
                 {filteredSessions.filter(s => s.day === day).map(session => {
                    const unit = getUnitDetails(session.unitId);
                    const venue = getVenueDetails(session.venueId);
                    const lecturer = getLecturerDetails(session.lecturerId);
                    const layout = dayLayouts[day].get(session.id) || { left: 0, width: 100 };
                    
                    const startHour = parseInt(session.startTime.split(':')[0]);
                    const endHour = parseInt(session.endTime.split(':')[0]);
                    const topOffset = (startHour - 7) * ROW_HEIGHT_PX;
                    const height = (endHour - startHour) * ROW_HEIGHT_PX;

                    const colorClass = unit?.color || "bg-gray-100 text-gray-800 border-gray-200";
                    const baseColor = colorClass.split('-')[1] || 'gray'; 

                    // Check for conflict (naive check for demonstration)
                    const isConflict = session.id === 's11' || session.id === 's12';

                    return (
                      <div 
                        key={session.id}
                        className={cn(
                          "absolute px-2 py-1.5 text-xs transition-all cursor-pointer group overflow-hidden flex flex-col gap-0.5 hover:z-50 hover:brightness-95 hover:shadow-md",
                          "border-l-[3px] border-b border-r border-t-0 rounded-sm",
                          colorClass,
                          isConflict && "ring-2 ring-red-500 ring-inset z-50"
                        )}
                        style={{ 
                          top: `${topOffset}px`, 
                          height: `${height}px`,
                          left: `${layout.left}%`,
                          width: `${layout.width}%`,
                          borderColor: `var(--color-${baseColor}-500)`
                        }}
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="font-bold font-mono text-[10px] uppercase tracking-wider opacity-90 truncate">{unit?.code}</span>
                          <div className="flex gap-1 shrink-0">
                            {session.groupName && (
                                <span className="font-bold text-[9px] px-1 rounded bg-black/10 uppercase">{session.groupName}</span>
                            )}
                            {session.type === 'Lab' && <span className="font-bold text-[9px] px-1 rounded bg-black/5 uppercase">LAB</span>}
                            {session.type === 'Exam' && <span className="font-bold text-[9px] px-1 rounded bg-red-500/10 text-red-700 uppercase">EXAM</span>}
                          </div>
                        </div>
                        
                        <h4 className="font-semibold leading-tight text-[11px] mb-auto line-clamp-2">{unit?.name}</h4>
                        
                        <div className="space-y-0.5 opacity-80 mt-1 min-h-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <User className="w-3 h-3 opacity-70 shrink-0" />
                            <span className="truncate">{lecturer?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <MapPin className="w-3 h-3 opacity-70 shrink-0" />
                            <span className="truncate font-medium">{venue?.name}</span>
                          </div>
                          {/* Program Groups List (if space allows, or on hover) */}
                          <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-black/5 mt-1">
                             <Users className="w-3 h-3 opacity-70 shrink-0" />
                             <span className="truncate text-[9px]">{session.programGroups.join(', ')}</span>
                          </div>

                           {isConflict && (
                             <div className="flex items-center gap-1 text-red-600 font-bold bg-red-50/90 p-1 rounded animate-pulse w-full mt-1 justify-center">
                               <AlertCircle className="w-3 h-3" />
                               <span className="text-[9px]">CONFLICT</span>
                             </div>
                           )}
                        </div>
                      </div>
                    );
                 })}
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
