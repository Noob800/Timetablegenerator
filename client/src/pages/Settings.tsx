import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Database, Bell, Clock, Calendar, Loader2, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { api, Settings as SettingsType, InstitutionalEvent } from '@/lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = [
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 border-purple-400' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 border-orange-400' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 border-blue-400' },
  { value: 'green', label: 'Green', class: 'bg-green-100 border-green-400' },
  { value: 'red', label: 'Red', class: 'bg-red-100 border-red-400' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 border-yellow-400' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 border-pink-400' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 border-indigo-400' },
];

export default function Settings() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ units: 0, lecturers: 0, venues: 0, timetables: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const settingsData = await api.getSettings();
      setSettings(settingsData);

      const [units, lecturers, venues, timetables] = await Promise.all([
        api.getAllUnits(),
        api.getAllLecturers(),
        api.getAllVenues(),
        api.listTimetables()
      ]);
      
      setStats({
        units: units?.length || 0,
        lecturers: lecturers?.length || 0,
        venues: venues?.length || 0,
        timetables: timetables?.length || 0
      });
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        academic_year: settings.academic_year,
        trimester: settings.trimester,
        schedule_start_time: settings.schedule_start_time,
        schedule_end_time: settings.schedule_end_time,
        session_duration: settings.session_duration,
        break_duration: settings.break_duration,
        institutional_events: settings.institutional_events,
        semester_weeks: settings.semester_weeks,
        total_hours_per_unit: settings.total_hours_per_unit,
        allowed_patterns: settings.allowed_patterns,
        prefer_three_hour_blocks: settings.prefer_three_hour_blocks,
        allow_split_blocks: settings.allow_split_blocks,
        respect_lecturer_availability: settings.respect_lecturer_availability,
        balance_daily_load: settings.balance_daily_load,
        max_lecturer_hours_per_week: settings.max_lecturer_hours_per_week,
        enable_conflict_notifications: settings.enable_conflict_notifications,
        enable_generation_notifications: settings.enable_generation_notifications
      });
      
      setSettings(updated);
      
      toast({
        title: "Success",
        description: "Settings saved successfully. New timetable generations will use these settings.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addInstitutionalEvent = () => {
    if (!settings) return;
    
    const newEvent: InstitutionalEvent = {
      name: "New Event",
      day: "Monday",
      start_time: "12:00",
      end_time: "13:00",
      enabled: true,
      color: "blue"
    };
    
    setSettings({
      ...settings,
      institutional_events: [...settings.institutional_events, newEvent]
    });
  };

  const removeInstitutionalEvent = (index: number) => {
    if (!settings) return;
    
    const newEvents = [...settings.institutional_events];
    newEvents.splice(index, 1);
    
    setSettings({
      ...settings,
      institutional_events: newEvents
    });
  };

  const updateInstitutionalEvent = (index: number, updates: Partial<InstitutionalEvent>) => {
    if (!settings) return;
    
    const newEvents = [...settings.institutional_events];
    newEvents[index] = { ...newEvents[index], ...updates };
    
    setSettings({
      ...settings,
      institutional_events: newEvents
    });
  };

  if (loading || !settings) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">Manage your timetable generation preferences. All changes are saved to the database.</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Academic Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Academic Calendar</CardTitle>
              </div>
              <CardDescription>Configure the current academic year and term settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic-year">Academic Year</Label>
                  <Input
                    id="academic-year"
                    value={settings.academic_year}
                    onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                    placeholder="2024/2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trimester">Trimester</Label>
                  <Select value={settings.trimester} onValueChange={(val) => setSettings({ ...settings, trimester: val })}>
                    <SelectTrigger id="trimester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Trimester 1</SelectItem>
                      <SelectItem value="2">Trimester 2</SelectItem>
                      <SelectItem value="3">Trimester 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Schedule Configuration</CardTitle>
              </div>
              <CardDescription>Set working hours and session durations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={settings.schedule_start_time}
                    onChange={(e) => setSettings({ ...settings, schedule_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={settings.schedule_end_time}
                    onChange={(e) => setSettings({ ...settings, schedule_end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-duration">Session Duration (minutes)</Label>
                  <Select 
                    value={String(settings.session_duration)} 
                    onValueChange={(val) => setSettings({ ...settings, session_duration: parseInt(val) })}
                  >
                    <SelectTrigger id="session-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                      <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                      <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                      <SelectItem value="180">180 minutes (3 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                  <Select 
                    value={String(settings.break_duration)} 
                    onValueChange={(val) => setSettings({ ...settings, break_duration: parseInt(val) })}
                  >
                    <SelectTrigger id="break-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Allocation Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Time Allocation</CardTitle>
              </div>
              <CardDescription>
                Configure how teaching hours are calculated and distributed across the semester.
                This system replaces hardcoded durations with flexible, registrar-defined rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Semester Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Semester Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="semester-weeks">Semester Weeks</Label>
                    <Input
                      id="semester-weeks"
                      type="number"
                      min="1"
                      max="52"
                      value={settings.semester_weeks}
                      onChange={(e) => setSettings({ ...settings, semester_weeks: parseInt(e.target.value) || 14 })}
                    />
                    <p className="text-xs text-muted-foreground">Number of teaching weeks</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total-hours">Total Hours per Unit</Label>
                    <Input
                      id="total-hours"
                      type="number"
                      min="1"
                      max="200"
                      value={settings.total_hours_per_unit}
                      onChange={(e) => setSettings({ ...settings, total_hours_per_unit: parseInt(e.target.value) || 42 })}
                    />
                    <p className="text-xs text-muted-foreground">Total teaching hours per semester</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Calculated Weekly Hours</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                      <span className="font-semibold">
                        {Math.floor(settings.total_hours_per_unit / settings.semester_weeks)} hours/week
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Global default for all units</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Pattern Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Allowed Time-Block Patterns</h3>
                <p className="text-sm text-muted-foreground">
                  Define which weekly scheduling patterns are allowed. For example, if weekly hours = 3,
                  you can allow [3] (one 3-hour block), [2,1] (2-hour + 1-hour), or [1,2] (1-hour + 2-hour).
                </p>
                
                <div className="space-y-3">
                  {settings.allowed_patterns.map((pattern, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex-1">
                        <div className="font-medium">{pattern.label}</div>
                        <div className="text-sm text-muted-foreground">
                          Pattern: [{pattern.pattern.join(', ')}] = {pattern.pattern.reduce((a, b) => a + b, 0)} hours
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newPatterns = settings.allowed_patterns.filter((_, i) => i !== index);
                          setSettings({ ...settings, allowed_patterns: newPatterns });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const newPatterns = [...settings.allowed_patterns, { pattern: [1], label: "New Pattern" }];
                      setSettings({ ...settings, allowed_patterns: newPatterns });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pattern
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Pattern Preferences */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Pattern Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="prefer-three-hour">Prefer 3-Hour Blocks</Label>
                      <p className="text-sm text-muted-foreground">
                        When multiple patterns match, prioritize 3-hour continuous blocks
                      </p>
                    </div>
                    <Switch
                      id="prefer-three-hour"
                      checked={settings.prefer_three_hour_blocks}
                      onCheckedChange={(checked) => setSettings({ ...settings, prefer_three_hour_blocks: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow-split">Allow Split Blocks</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow patterns like [2,1] or [1,2] instead of only single blocks
                      </p>
                    </div>
                    <Switch
                      id="allow-split"
                      checked={settings.allow_split_blocks}
                      onCheckedChange={(checked) => setSettings({ ...settings, allow_split_blocks: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> Use the Unit Overrides page to set custom weekly hours for specific units
                  that differ from the global calculation.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Constraint Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Scheduling Constraints</CardTitle>
              </div>
              <CardDescription>Configure how the solver handles lecturer availability, workload limits, and load balancing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="respect-availability">Respect Lecturer Availability</Label>
                    <p className="text-sm text-muted-foreground">
                      Only schedule sessions on days when lecturers are marked as available
                    </p>
                  </div>
                  <Switch
                    id="respect-availability"
                    checked={settings.respect_lecturer_availability || false}
                    onCheckedChange={(checked) => setSettings({ ...settings, respect_lecturer_availability: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="balance-load">Balance Daily Load</Label>
                    <p className="text-sm text-muted-foreground">
                      Distribute sessions evenly across days and time slots
                    </p>
                  </div>
                  <Switch
                    id="balance-load"
                    checked={settings.balance_daily_load !== undefined ? settings.balance_daily_load : true}
                    onCheckedChange={(checked) => setSettings({ ...settings, balance_daily_load: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-lecturer-hours">Max Lecturer Hours per Week</Label>
                  <Input
                    id="max-lecturer-hours"
                    type="number"
                    min="1"
                    max="40"
                    value={settings.max_lecturer_hours_per_week || 20}
                    onChange={(e) => setSettings({ ...settings, max_lecturer_hours_per_week: parseInt(e.target.value) })}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum teaching hours per lecturer per week (prevents overloading)
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Note:</strong> Disabling "Respect Lecturer Availability" allows more flexibility but may schedule lecturers on their unavailable days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Institutional Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <CardTitle>Institutional Events</CardTitle>
                  </div>
                  <CardDescription>Configure recurring events like devotion, sports, assembly, lunch breaks, etc. that block time in the timetable.</CardDescription>
                </div>
                <Button onClick={addInstitutionalEvent} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.institutional_events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No institutional events configured.</p>
                  <p className="text-sm">Click "Add Event" to create one.</p>
                </div>
              ) : (
                settings.institutional_events.map((event, index) => (
                  <Card key={index} className="border-2">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={event.enabled}
                              onCheckedChange={(checked) => updateInstitutionalEvent(index, { enabled: checked })}
                            />
                            <span className="font-medium">{event.enabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeInstitutionalEvent(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Event Name</Label>
                            <Input
                              value={event.name}
                              onChange={(e) => updateInstitutionalEvent(index, { name: e.target.value })}
                              placeholder="e.g., Morning Devotion"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Day</Label>
                            <Select 
                              value={event.day} 
                              onValueChange={(val) => updateInstitutionalEvent(index, { day: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS.map(day => (
                                  <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={event.start_time}
                              onChange={(e) => updateInstitutionalEvent(index, { start_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={event.end_time}
                              onChange={(e) => updateInstitutionalEvent(index, { end_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Color</Label>
                            <Select 
                              value={event.color} 
                              onValueChange={(val) => updateInstitutionalEvent(index, { color: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLORS.map(color => (
                                  <SelectItem key={color.value} value={color.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-4 h-4 rounded border-2 ${color.class}`} />
                                      {color.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className={`p-3 rounded-md border-2 border-dashed flex items-center justify-center gap-2 ${COLORS.find(c => c.value === event.color)?.class || 'bg-gray-100 border-gray-400'}`}>
                          <span className="font-bold text-sm">Preview: {event.name}</span>
                          <span className="text-xs">({event.start_time} - {event.end_time})</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Configure system notifications and alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="conflict-notif">Conflict Notifications</Label>
                  <p className="text-sm text-muted-foreground">Alert when scheduling conflicts are detected</p>
                </div>
                <Switch
                  id="conflict-notif"
                  checked={settings.enable_conflict_notifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_conflict_notifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="gen-notif">Generation Notifications</Label>
                  <p className="text-sm text-muted-foreground">Alert when timetable generation completes</p>
                </div>
                <Switch
                  id="gen-notif"
                  checked={settings.enable_generation_notifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_generation_notifications: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Database Statistics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Database Statistics</CardTitle>
              </div>
              <CardDescription>Current database status and records count.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats.units}</div>
                  <div className="text-sm text-muted-foreground">Units</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats.lecturers}</div>
                  <div className="text-sm text-muted-foreground">Lecturers</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats.venues}</div>
                  <div className="text-sm text-muted-foreground">Venues</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stats.timetables}</div>
                  <div className="text-sm text-muted-foreground">Timetables</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </Shell>
  );
}
