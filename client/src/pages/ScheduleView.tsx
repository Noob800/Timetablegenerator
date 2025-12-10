import React, { useEffect, useState } from 'react';
import { useRoute } from "wouter";
import Shell from '@/components/layout/Shell';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown, Filter, Loader2 } from 'lucide-react';
import { exportToPDF } from '@/lib/export';
import { useToast } from "@/hooks/use-toast";
import { api } from '@/lib/api';

export default function ScheduleView() {
  const [match, params] = useRoute("/schedule/:type");
  const type = (params?.type as 'master' | 'program' | 'lecturer' | 'venue') || 'master';
  const { toast } = useToast();
  
  const [selectedId, setSelectedId] = useState<string>('all');
  const [lecturers, setLecturers] = useState<Array<{ name: string }>>([]);
  const [venues, setVenues] = useState<Array<{ name: string }>>([]);
  const [units, setUnits] = useState<Array<{ code: string; name: string; program_groups: string[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lecturersData, venuesData, unitsData] = await Promise.all([
          api.getAllLecturers(),
          api.getAllVenues(),
          api.getAllUnits()
        ]);
        
        setLecturers(lecturersData || []);
        setVenues(venuesData || []);
        setUnits(unitsData || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Reset selection when type changes
  useEffect(() => {
    setSelectedId('all');
  }, [type]);

  const getTitle = () => {
    switch(type) {
      case 'master': return 'Master Schedule';
      case 'program': return 'Program Timetable';
      case 'lecturer': return 'Lecturer Timetable';
      case 'venue': return 'Venue Timetable';
      default: return 'Timetable';
    }
  };

  const handleExport = async () => {
    toast({
      title: "Generating PDF...",
      description: "Please wait while we prepare your document.",
    });
    await exportToPDF('timetable-grid-container', getTitle());
    toast({
      title: "Export Complete",
      description: "Your PDF has been downloaded.",
    });
  };

  const getOptions = () => {
    if (type === 'lecturer') return lecturers;
    if (type === 'venue') return venues;
    if (type === 'program') {
      // Extract unique program groups from units
      const programGroups = new Set<string>();
      units.forEach(unit => {
        unit.program_groups?.forEach(pg => programGroups.add(pg));
      });
      return Array.from(programGroups).map(pg => ({ name: pg }));
    }
    return [];
  };

  const options = getOptions();

  return (
    <Shell>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{getTitle()}</h2>
            <p className="text-muted-foreground">
              {type === 'master' 
                ? 'Complete overview of all scheduled sessions.' 
                : `Viewing specific schedule by ${type}.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
             {type !== 'master' && (
               <Select value={selectedId} onValueChange={setSelectedId} disabled={loading}>
                 <SelectTrigger className="w-[250px]">
                   {loading ? (
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   ) : (
                     <Filter className="w-4 h-4 mr-2" />
                   )}
                   <SelectValue placeholder={loading ? "Loading..." : `Select ${type}...`} />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All {type === 'lecturer' ? 'Lecturers' : type === 'venue' ? 'Venues' : 'Programs'}</SelectItem>
                   {options.map(opt => (
                     <SelectItem key={opt.name} value={opt.name}>{opt.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             )}
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div id="timetable-grid-container" className="flex-1 min-h-0 border rounded-xl shadow-sm bg-card p-4 bg-white">
          <TimetableGrid viewMode={type === 'master' ? 'program' : type} filterId={selectedId} />
        </div>
      </div>
    </Shell>
  );
}
