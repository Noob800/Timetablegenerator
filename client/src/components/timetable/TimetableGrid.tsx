import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { MOCK_SESSIONS, MOCK_UNITS, MOCK_VENUES, MOCK_LECTURERS } from "@/lib/mockData";
import { Clock, MapPin, User, AlertCircle } from 'lucide-react';
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

export default function TimetableGrid({ viewMode, filterId }: TimetableGridProps) {
  // Mock Filtering Logic
  const filteredSessions = MOCK_SESSIONS.filter(session => {
    if (!filterId) return true; // Show all if no filter (e.g., Master View)
    if (viewMode === 'program') return session.programGroups.some(g => g.includes(filterId) || filterId === 'ALL');
    if (viewMode === 'lecturer') return session.lecturerId === filterId;
    if (viewMode === 'venue') return session.venueId === filterId;
    return true;
  });

  const getSessionStyle = (session: typeof MOCK_SESSIONS[0]) => {
    const startHour = parseInt(session.startTime.split(':')[0]);
    const endHour = parseInt(session.endTime.split(':')[0]);
    const duration = endHour - startHour;
    
    // Grid row mapping (7am is row 1)
    const startRow = startHour - 6; 
    
    return {
      gridRow: `${startRow} / span ${duration}`,
    };
  };

  const getUnitDetails = (id: string) => MOCK_UNITS.find(u => u.id === id);
  const getVenueDetails = (id: string) => MOCK_VENUES.find(v => v.id === id);
  const getLecturerDetails = (id: string) => MOCK_LECTURERS.find(l => l.id === id);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full print:border-0 print:shadow-none">
      <div className="overflow-auto flex-1 thin-scrollbar">
        <div className="min-w-[1000px] grid grid-cols-[80px_repeat(5,1fr)] bg-muted/20 print:bg-white">
          
          {/* Header Row: Days */}
          <div className="p-4 border-b border-r border-border bg-muted/50 font-mono text-xs text-muted-foreground sticky top-0 z-20 backdrop-blur-sm print:static print:bg-transparent">
            TIME / DAY
          </div>
          {DAYS.map(day => (
            <div key={day} className="p-3 border-b border-r border-border bg-muted/30 font-semibold text-sm text-center sticky top-0 z-10 backdrop-blur-sm print:static print:bg-transparent">
              {day}
            </div>
          ))}

          {/* Time Slots (Left Column) + Grid Cells */}
          {TIME_SLOTS.map((time, index) => (
            <React.Fragment key={time}>
              {/* Time Label */}
              <div className="p-2 border-b border-r border-border text-xs text-muted-foreground font-mono text-center flex flex-col justify-start pt-3 bg-muted/10 sticky left-0 z-10 print:static print:bg-transparent">
                {time}
              </div>

              {/* Day Cells for this Time Slot */}
              {DAYS.map(day => (
                <div key={`${day}-${time}`} className="border-b border-r border-border h-24 relative bg-background/50 group hover:bg-muted/5 transition-colors print:bg-transparent">
                  {/* Grid Lines/Background only */}
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Overlay Sessions using CSS Grid on the main container */}
          <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-0 absolute inset-0 pt-[45px] pointer-events-none" style={{ height: 'fit-content' }}>
             {/* Spacer for Time Column */}
             <div className="row-span-full border-r border-transparent"></div>

             {DAYS.map((day, dayIndex) => (
               <div key={day} className="relative row-span-full border-r border-transparent pointer-events-auto">
                 {/* Filter sessions for this day */}
                 {filteredSessions.filter(s => s.day === day).map(session => {
                    const unit = getUnitDetails(session.unitId);
                    const venue = getVenueDetails(session.venueId);
                    const lecturer = getLecturerDetails(session.lecturerId);
                    
                    // Calculate position
                    const startHour = parseInt(session.startTime.split(':')[0]);
                    const endHour = parseInt(session.endTime.split(':')[0]);
                    const topOffset = (startHour - 7) * 96; // 96px is h-24
                    const height = (endHour - startHour) * 96;

                    return (
                      <div 
                        key={session.id}
                        className={cn(
                          "absolute w-[95%] left-[2.5%] rounded-md border p-2 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden flex flex-col gap-1 print:shadow-none print:border-2",
                          unit?.color || "bg-gray-100 border-gray-200"
                        )}
                        style={{ top: `${topOffset}px`, height: `${height - 4}px` }}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold font-mono text-[10px] uppercase tracking-wider opacity-80">{unit?.code}</span>
                          {session.type === 'Lab' && <Badge variant="outline" className="h-4 px-1 text-[9px] bg-white/50 border-white/20">LAB</Badge>}
                        </div>
                        
                        <h4 className="font-semibold leading-tight line-clamp-2">{unit?.name}</h4>
                        
                        <div className="mt-auto space-y-1 opacity-90">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <User className="w-3 h-3" />
                            <span className="truncate">{lecturer?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{venue?.name}</span>
                          </div>
                           {/* Conflict Indicator (Mock) */}
                           {session.id === 's8' && (
                             <div className="flex items-center gap-1 text-red-600 font-bold bg-red-50 p-1 rounded mt-1 animate-pulse">
                               <AlertCircle className="w-3 h-3" />
                               <span>CONFLICT</span>
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
