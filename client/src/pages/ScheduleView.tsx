import React from 'react';
import { useRoute } from "wouter";
import Shell from '@/components/layout/Shell';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown, Filter } from 'lucide-react';
import { exportToPDF } from '@/lib/export';
import { useToast } from "@/hooks/use-toast";

const MOCK_OPTIONS = {
  master: [{ id: 'ALL', label: 'All Programs' }],
  program: [
    { id: 'CS-Y1', label: 'Computer Science Year 1' },
    { id: 'IT-Y1', label: 'Information Tech Year 1' },
    { id: 'NRSG-Y3', label: 'Nursing Year 3' }
  ],
  lecturer: [
    { id: 'l1', label: 'Dr. James Kubai' },
    { id: 'l2', label: 'Prof. Sarah Mungai' },
    { id: 'l3', label: 'Rev. Dr. Alice M' }
  ],
  venue: [
    { id: 'v1', label: 'TLH 1' },
    { id: 'v2', label: 'LAB 1 (Comp)' },
    { id: 'v3', label: 'GF 1 (Science)' }
  ]
};

export default function ScheduleView() {
  const [match, params] = useRoute("/schedule/:type");
  const type = (params?.type as 'master' | 'program' | 'lecturer' | 'venue') || 'master';
  const { toast } = useToast();
  
  const [selectedId, setSelectedId] = React.useState<string>(type === 'master' ? 'ALL' : MOCK_OPTIONS[type]?.[0]?.id || '');

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

  const options = MOCK_OPTIONS[type] || [];

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
               <Select value={selectedId} onValueChange={setSelectedId}>
                 <SelectTrigger className="w-[250px]">
                   <Filter className="w-4 h-4 mr-2" />
                   <SelectValue placeholder={`Select ${type}...`} />
                 </SelectTrigger>
                 <SelectContent>
                   {options.map(opt => (
                     <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
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
