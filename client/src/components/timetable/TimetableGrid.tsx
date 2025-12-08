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

const ROW_HEIGHT_PX = 96; // h-24 = 6rem = 96px
const HEADER_HEIGHT_PX = 48; // h-12 = 3rem = 48px

export default function TimetableGrid({ viewMode, filterId }: TimetableGridProps) {
  // Mock Filtering Logic
  const filteredSessions = MOCK_SESSIONS.filter(session => {
    if (!filterId) return true; // Show all if no filter (e.g., Master View)
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
              {/* Time Label */}
              <div className="h-24 border-b border-r border-border text-xs text-muted-foreground font-mono text-center flex flex-col justify-start pt-2 bg-muted/10 sticky left-0 z-20 print:static print:bg-transparent">
                {time}
              </div>

              {/* Day Cells for this Time Slot */}
              {DAYS.map(day => (
                <div key={`${day}-${time}`} className="h-24 border-b border-r border-border relative bg-background/50 print:bg-transparent">
                  {/* Grid Lines/Background only */}
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Overlay Sessions using CSS Grid on the main container */}
          <div 
            className="grid grid-cols-[80px_repeat(5,1fr)] gap-0 absolute inset-0 pointer-events-none z-10" 
            style={{ 
              top: `${HEADER_HEIGHT_PX}px`, 
              height: `calc(100% - ${HEADER_HEIGHT_PX}px)` 
            }}
          >
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
                    const topOffset = (startHour - 7) * ROW_HEIGHT_PX;
                    const height = (endHour - startHour) * ROW_HEIGHT_PX;

                    // Parse color classes to get base color for border
                    const colorClass = unit?.color || "bg-gray-100 text-gray-800 border-gray-200";
                    // Simplistic extraction of color family for border-l
                    const baseColor = colorClass.split('-')[1] || 'gray'; 

                    return (
                      <div 
                        key={session.id}
                        className={cn(
                          "absolute w-full px-2 py-1.5 text-xs transition-all cursor-pointer group overflow-hidden flex flex-col gap-0.5 hover:z-50 hover:brightness-95",
                          "border-l-[3px] border-b border-r border-t-0",
                          colorClass
                        )}
                        style={{ 
                          top: `${topOffset}px`, 
                          height: `${height}px`,
                          borderColor: `var(--color-${baseColor}-500)` // Use Tailwind var if possible, or rely on the class
                        }}
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <span className="font-bold font-mono text-[10px] uppercase tracking-wider opacity-90">{unit?.code}</span>
                          {session.type === 'Lab' && <span className="font-bold text-[9px] px-1 rounded bg-black/5 uppercase">LAB</span>}
                          {session.type === 'Exam' && <span className="font-bold text-[9px] px-1 rounded bg-red-500/10 text-red-700 uppercase">EXAM</span>}
                        </div>
                        
                        <h4 className="font-semibold leading-tight line-clamp-2 text-[11px] mb-auto">{unit?.name}</h4>
                        
                        <div className="space-y-0.5 opacity-80 mt-1">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <User className="w-3 h-3 opacity-70" />
                            <span className="truncate">{lecturer?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <MapPin className="w-3 h-3 opacity-70" />
                            <span className="truncate font-medium">{venue?.name}</span>
                          </div>
                           {/* Conflict Indicator */}
                           {session.id === 's8' && (
                             <div className="flex items-center gap-1 text-red-600 font-bold bg-red-50/80 p-0.5 rounded animate-pulse w-fit mt-0.5">
                               <AlertCircle className="w-3 h-3" />
                               <span className="text-[9px]">CLASH</span>
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
