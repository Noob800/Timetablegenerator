import React, { useEffect, useState } from 'react';
import Shell from '@/components/layout/Shell';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Plus, Filter, Search, Loader2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api } from '@/lib/api';
import { exportToPDF } from '@/lib/export';
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalSessions: 0,
    conflicts: 0,
    roomUtilization: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<any>(null);
  const [lecturers, setLecturers] = useState<Array<{ name: string }>>([]);
  const [venues, setVenues] = useState<Array<{ name: string }>>([]);
  const [viewMode, setViewMode] = useState<'program' | 'lecturer' | 'venue'>('program');
  const [filterId, setFilterId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<number>(0);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [timetableData, lecturersData, venuesData, settingsData] = await Promise.all([
          api.getActiveTimetable(),
          api.getAllLecturers(),
          api.getAllVenues(),
          api.getSettings()
        ]);
        
        setTimetable(timetableData);
        setSettings(settingsData);
        
        if (timetableData && timetableData.statistics) {
          setStats({
            totalSessions: timetableData.statistics.total_sessions || timetableData.sessions?.length || 0,
            conflicts: timetableData.conflicts?.length || 0,
            roomUtilization: Math.round((timetableData.statistics.venue_utilization || 0) * 100),
            pendingRequests: 0  // TODO: Add pending requests tracking
          });
        }
        
        setLecturers(lecturersData || []);
        setVenues(venuesData || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleViewModeChange = (value: string) => {
    setViewMode(value as 'program' | 'lecturer' | 'venue');
    setFilterId('all'); // Reset filter when changing view mode
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentSearchIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        // Move to next search result
        setCurrentSearchIndex((prev) => (prev + 1) % Math.max(searchResults, 1));
      }
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const title = settings 
        ? `Timetable_${settings.academic_year}_Trimester_${settings.trimester}`.replace(/\//g, '-')
        : 'Master_Timetable';
      await exportToPDF('timetable-grid-export', title);
      toast({
        title: "Success",
        description: "Timetable exported to PDF successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Main Timetable</h2>
            <p className="text-muted-foreground">View and manage the master schedule for all programs.</p>
          </div>
          <div className="flex items-center gap-2">
            {timetable?.conflicts && timetable.conflicts.length > 0 && (
              <Button variant="destructive" className="gap-2" onClick={() => window.location.href = '/conflicts'}>
                <AlertTriangle className="h-4 w-4" />
                {timetable.conflicts.length} Conflicts - Resolve
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={handleExportPDF} disabled={exporting || loading}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload New Data
            </Button>
          </div>
        </div>
        {/* Stats / Quick Info */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalSessions}</div>
                  <p className="text-xs text-muted-foreground">Scheduled sessions</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${stats.conflicts > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {stats.conflicts}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.conflicts > 0 ? 'Requires attention' : 'No conflicts'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.roomUtilization}%</div>
                  <p className="text-xs text-muted-foreground">Average venue usage</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                  <p className="text-xs text-muted-foreground">Change requests</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Grid */}
        <div className="flex flex-col h-[800px] gap-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-card border rounded-lg shadow-sm">
             <div className="flex items-center gap-4 flex-1">
               <div className="relative flex-1 max-w-sm">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Search units, lecturers, venues... (Press Enter to navigate)" 
                   className="pl-9" 
                   value={searchQuery}
                   onChange={handleSearchChange}
                   onKeyDown={handleSearchKeyDown}
                 />
                 {searchQuery && searchResults > 0 && (
                   <div className="absolute right-2.5 top-2.5 text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                     {currentSearchIndex + 1}/{searchResults}
                   </div>
                 )}
               </div>
               <Select value={viewMode} onValueChange={handleViewModeChange}>
                 <SelectTrigger className="w-[180px]">
                   <Filter className="w-4 h-4 mr-2" />
                   <SelectValue placeholder="Filter View" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="program">Master View</SelectItem>
                   <SelectItem value="lecturer">By Lecturer</SelectItem>
                   <SelectItem value="venue">By Venue</SelectItem>
                 </SelectContent>
               </Select>
               
               {viewMode === 'lecturer' && (
                 <Select value={filterId} onValueChange={setFilterId}>
                   <SelectTrigger className="w-[220px]">
                     <SelectValue placeholder="Select Lecturer" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Lecturers</SelectItem>
                     {lecturers.map((lecturer) => (
                       <SelectItem key={lecturer.name} value={lecturer.name}>
                         {lecturer.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}
               
               {viewMode === 'venue' && (
                 <Select value={filterId} onValueChange={setFilterId}>
                   <SelectTrigger className="w-[220px]">
                     <SelectValue placeholder="Select Venue" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Venues</SelectItem>
                     {venues.map((venue) => (
                       <SelectItem key={venue.name} value={venue.name}>
                         {venue.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}
             </div>
             
             <div className="flex items-center gap-2">
               <span className="text-sm text-muted-foreground">Showing Week 1-14</span>
             </div>
          </div>

          <div className="flex-1 min-h-0" id="timetable-grid-export">
            <TimetableGrid 
              viewMode={viewMode} 
              filterId={filterId} 
              searchQuery={searchQuery}
              currentSearchIndex={currentSearchIndex}
              onSearchResultsChange={setSearchResults}
            />
          </div>
        </div>
      </div>
    </Shell>
  );
}
