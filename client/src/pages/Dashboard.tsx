import React from 'react';
import Shell from '@/components/layout/Shell';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Plus, Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
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
            <Button variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              Export PDF
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
              <div className="text-2xl font-bold">1,284</div>
              <p className="text-xs text-muted-foreground">+20% from last trimester</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">3</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">82%</div>
              <p className="text-xs text-muted-foreground">Peak hours 10am-2pm</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Lecturer change requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Grid */}
        <div className="flex flex-col h-[800px] gap-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-card border rounded-lg shadow-sm">
             <div className="flex items-center gap-4 flex-1">
               <div className="relative flex-1 max-w-sm">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input placeholder="Search units, lecturers..." className="pl-9" />
               </div>
               <Select defaultValue="all">
                 <SelectTrigger className="w-[180px]">
                   <Filter className="w-4 h-4 mr-2" />
                   <SelectValue placeholder="Filter View" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Master View</SelectItem>
                   <SelectItem value="program">By Program</SelectItem>
                   <SelectItem value="lecturer">By Lecturer</SelectItem>
                   <SelectItem value="venue">By Venue</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="flex items-center gap-2">
               <span className="text-sm text-muted-foreground">Showing Week 1-14</span>
             </div>
          </div>

          <div className="flex-1 min-h-0">
            <TimetableGrid viewMode="program" filterId="ALL" />
          </div>
        </div>
      </div>
    </Shell>
  );
}
