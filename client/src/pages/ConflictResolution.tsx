import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Clock, Users, MapPin, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface Conflict {
  type: string;
  day?: string;
  time?: string;
  lecturer?: string;
  venue?: string;
  unit?: string;
  sessions?: string[];
  message: string;
}

export default function ConflictResolution() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [timetable, setTimetable] = useState<any>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<number | null>(null);

  useEffect(() => {
    loadActiveTimetable();
  }, []);

  const loadActiveTimetable = async () => {
    setLoading(true);
    try {
      const data = await api.getActiveTimetable();
      setTimetable(data);
      setConflicts(data.conflicts || []);
    } catch (error: any) {
      console.error('Failed to load timetable:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load timetable",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'lecturer_conflict':
        return <Users className="h-4 w-4" />;
      case 'venue_conflict':
        return <MapPin className="h-4 w-4" />;
      case 'time_conflict':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getConflictColor = (type: string) => {
    switch (type) {
      case 'lecturer_conflict':
        return 'destructive';
      case 'venue_conflict':
        return 'destructive';
      case 'time_conflict':
        return 'destructive';
      case 'unassigned_session':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleRegenerate = async () => {
    setResolving(true);
    try {
      await api.generateTimetable();
      toast({
        title: "Success",
        description: "New timetable version generated. Check for conflicts.",
      });
      await loadActiveTimetable();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate timetable",
        variant: "destructive"
      });
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!timetable) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No active timetable found. Please generate one first.</p>
          <Button onClick={() => window.location.href = '/generate'}>
            Go to Generate
          </Button>
        </div>
      </Shell>
    );
  }

  const conflictStats = {
    total: conflicts.length,
    lecturer: conflicts.filter(c => c.type === 'lecturer_conflict').length,
    venue: conflicts.filter(c => c.type === 'venue_conflict').length,
    unassigned: conflicts.filter(c => c.type === 'unassigned_session').length,
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Conflict Resolution</h2>
            <p className="text-muted-foreground">
              Review and resolve scheduling conflicts in your timetable
            </p>
          </div>
          <Button onClick={handleRegenerate} disabled={resolving}>
            {resolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Timetable
              </>
            )}
          </Button>
        </div>

        {/* Conflict Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Conflicts</p>
                  <p className="text-2xl font-bold">{conflictStats.total}</p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${conflictStats.total > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lecturer Conflicts</p>
                  <p className="text-2xl font-bold">{conflictStats.lecturer}</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Venue Conflicts</p>
                  <p className="text-2xl font-bold">{conflictStats.venue}</p>
                </div>
                <MapPin className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unassigned Sessions</p>
                  <p className="text-2xl font-bold">{conflictStats.unassigned}</p>
                </div>
                <BookOpen className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conflict List */}
        {conflicts.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">No Conflicts Found!</h3>
                  <p className="text-muted-foreground mt-1">
                    Your timetable is conflict-free and ready to use.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Detected Conflicts</CardTitle>
              <CardDescription>
                Review each conflict and take action to resolve scheduling issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedConflict(selectedConflict === index ? null : index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getConflictIcon(conflict.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getConflictColor(conflict.type) as any}>
                              {conflict.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {conflict.day && (
                              <span className="text-sm text-muted-foreground">
                                {conflict.day}
                              </span>
                            )}
                            {conflict.time && (
                              <span className="text-sm text-muted-foreground">
                                {conflict.time}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{conflict.message}</p>
                          
                          {selectedConflict === index && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              {conflict.lecturer && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Lecturer:</span>
                                  <span>{conflict.lecturer}</span>
                                </div>
                              )}
                              {conflict.venue && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Venue:</span>
                                  <span>{conflict.venue}</span>
                                </div>
                              )}
                              {conflict.unit && (
                                <div className="flex items-center gap-2 text-sm">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Unit:</span>
                                  <span>{conflict.unit}</span>
                                </div>
                              )}
                              {conflict.sessions && conflict.sessions.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium">Conflicting Sessions:</span>
                                  <div className="mt-1 space-y-1">
                                    {conflict.sessions.map((sessionId, idx) => (
                                      <div key={idx} className="text-xs text-muted-foreground ml-4">
                                        • Session ID: {sessionId}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolution Guide */}
        <Card>
          <CardHeader>
            <CardTitle>How to Resolve Conflicts</CardTitle>
            <CardDescription>Recommended actions to fix scheduling issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Regenerate Timetable</h4>
                  <p className="text-sm text-muted-foreground">
                    Click "Regenerate Timetable" to create a new version with different slot assignments.
                    The solver will try different combinations to minimize conflicts.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <div className="mt-1">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Review Lecturer Availability</h4>
                  <p className="text-sm text-muted-foreground">
                    Check if lecturers have availability constraints that are too restrictive.
                    Update lecturer data to allow more flexible scheduling.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <div className="mt-1">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Add More Venues</h4>
                  <p className="text-sm text-muted-foreground">
                    If venue conflicts are frequent, consider adding more classrooms or labs
                    to provide more scheduling options.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <div className="mt-1">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Adjust Schedule Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    In Settings, try extending working hours or adjusting session durations
                    to create more available time slots.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
