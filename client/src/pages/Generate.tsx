import React, { useState, useEffect, useRef } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ArrowRight, X, RefreshCw, Trash2, Eye, Settings as SettingsIcon, Clock, Calendar } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { api, Settings } from '@/lib/api';
import { toast } from 'sonner';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface FileUploadState {
  file: File | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  count?: number;
}

export default function Generate() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  const [unitFile, setUnitFile] = useState<FileUploadState>({
    file: null, status: 'idle', message: 'Waiting...'
  });
  const [lecturerFile, setLecturerFile] = useState<FileUploadState>({
    file: null, status: 'idle', message: 'Waiting...'
  });
  const [venueFile, setVenueFile] = useState<FileUploadState>({
    file: null, status: 'idle', message: 'Waiting...'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [timetables, setTimetables] = useState<any[]>([]);
  const [loadingTimetables, setLoadingTimetables] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    units: number;
    lecturers: number;
    venues: number;
  } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const unitInputRef = useRef<HTMLInputElement>(null);
  const lecturerInputRef = useRef<HTMLInputElement>(null);
  const venueInputRef = useRef<HTMLInputElement>(null);

  const allFilesUploaded = unitFile.status === 'success' && 
                          lecturerFile.status === 'success' && 
                          venueFile.status === 'success';
  
  const hasDataInDatabase = dbStatus && 
                           dbStatus.units > 0 && 
                           dbStatus.lecturers > 0 && 
                           dbStatus.venues > 0;
  
  // Prioritize newly uploaded files over database data
  const canGenerate = allFilesUploaded || hasDataInDatabase;
  const willUseNewFiles = allFilesUploaded;

  useEffect(() => {
    loadTimetables();
    checkDatabaseStatus();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const status = await api.getUploadStatus();
      setDbStatus({
        units: status.units || 0,
        lecturers: status.lecturers || 0,
        venues: status.venues || 0
      });
    } catch (error) {
      console.error('Failed to check database status:', error);
    }
  };

  const loadTimetables = async () => {
    setLoadingTimetables(true);
    try {
      const data = await api.listTimetables();
      setTimetables(data || []);
    } catch (error) {
      console.error('Failed to load timetables:', error);
    } finally {
      setLoadingTimetables(false);
    }
  };

  const handleFileSelect = async (
    file: File,
    type: 'units' | 'lecturers' | 'venues',
    setState: React.Dispatch<React.SetStateAction<FileUploadState>>
  ) => {
    setState({ file, status: 'uploading', message: 'Uploading...' });
    
    try {
      let response;
      if (type === 'units') {
        response = await api.uploadUnits(file);
      } else if (type === 'lecturers') {
        response = await api.uploadLecturers(file);
      } else {
        response = await api.uploadVenues(file);
      }
      
      setState({
        file,
        status: 'success',
        message: `${response.count} ${type} uploaded`,
        count: response.count
      });
      toast.success(response.message);
      
      // Refresh database status after successful upload
      await checkDatabaseStatus();
    } catch (error: any) {
      setState({
        file,
        status: 'error',
        message: error.message || 'Upload failed'
      });
      toast.error(`Failed to upload ${type}: ${error.message}`);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStep(2);
    setGenerationProgress('Initializing solver...');
    
    try {
      // Simulate progress updates
      setTimeout(() => setGenerationProgress('Loading data and settings...'), 500);
      setTimeout(() => setGenerationProgress('Creating session requirements...'), 1000);
      setTimeout(() => setGenerationProgress('Building constraint model...'), 1500);
      setTimeout(() => setGenerationProgress('Running CP-SAT optimizer...'), 2000);
      
      const result = await api.generateTimetable();
      
      setGenerationProgress('Saving results...');
      
      if (result.conflicts && result.conflicts.length > 0) {
        toast.warning(`Timetable generated with ${result.conflicts.length} conflicts`, {
          description: 'You can review and resolve conflicts in the Conflicts page.'
        });
      } else {
        toast.success('Timetable generated successfully!', {
          description: `${result.sessions?.length || 0} sessions scheduled with zero conflicts.`
        });
      }
      
      // Reload timetables list
      await loadTimetables();
      
      setTimeout(() => {
        setStep(1);
        setIsGenerating(false);
        setGenerationProgress('');
      }, 1500);
      
    } catch (error: any) {
      setIsGenerating(false);
      setStep(1);
      toast.error(`Generation failed: ${error.message}`);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await api.activateTimetable(id);
      toast.success('Timetable activated - Navigating to dashboard...');
      await loadTimetables();
      // Navigate to dashboard to view the activated timetable
      setTimeout(() => setLocation('/'), 500);
    } catch (error: any) {
      toast.error(`Failed to activate: ${error.message}`);
    }
  };

  const handleViewTimetable = async (id: number, isActive: boolean) => {
    try {
      // If not active, activate it first
      if (!isActive) {
        await api.activateTimetable(id);
        toast.success('Timetable activated');
        await loadTimetables();
      }
      // Navigate to dashboard (master schedule)
      setLocation('/');
    } catch (error: any) {
      toast.error(`Failed to view timetable: ${error.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this timetable version?')) return;
    
    try {
      await api.deleteTimetable(id);
      toast.success('Timetable deleted');
      await loadTimetables();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {settings ? (
              <>Generate Timetable: {settings.academic_year} • Trimester {settings.trimester}</>
            ) : (
              <>Generate New Timetable</>
            )}
          </h1>
          <p className="text-muted-foreground">Upload your academic data files to generate an optimized schedule.</p>
          <p className="text-xs text-muted-foreground mt-2">
            🚀 Powered by Google OR-Tools CP-SAT Constraint Solver
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
          <div className={cn("flex items-center gap-2", step >= 1 && "text-primary")}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center border-current">1</div>
            Upload
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={cn("flex items-center gap-2", step >= 2 && "text-primary")}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center border-current">2</div>
            Generate
          </div>
        </div>

        <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/5">
          <CardContent className="py-12 flex flex-col items-center text-center space-y-4">
            {step === 1 && (
              <>
                {/* Settings Info Banner */}
                {settings && (
                  <div className="w-full mb-4">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="w-full p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    >
                      <div className="flex items-start gap-3 text-left">
                        <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">Time Allocation Configuration</h4>
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {showSettings ? 'Hide' : 'Show'} Details
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {settings.semester_weeks} weeks × {Math.floor(settings.total_hours_per_unit / settings.semester_weeks)} hrs/week = {settings.total_hours_per_unit} total hours per unit
                          </p>
                        </div>
                      </div>
                    </button>
                    {showSettings && (
                      <div className="mt-2 p-4 bg-blue-50/50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg text-sm space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Semester Weeks</div>
                            <div className="font-medium">{settings.semester_weeks} weeks</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Total Hours/Unit</div>
                            <div className="font-medium">{settings.total_hours_per_unit} hours</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Weekly Hours (Global)</div>
                            <div className="font-medium">{Math.floor(settings.total_hours_per_unit / settings.semester_weeks)} hrs/week</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Allowed Patterns</div>
                            <div className="font-medium">{settings.allowed_patterns.length} patterns</div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Pattern Preferences</div>
                          <div className="flex gap-2">
                            {settings.prefer_three_hour_blocks && (
                              <Badge variant="outline" className="text-xs">
                                ✓ Prefer 3-hour blocks
                              </Badge>
                            )}
                            {settings.allow_split_blocks && (
                              <Badge variant="outline" className="text-xs">
                                ✓ Allow split blocks
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          💡 Configure these settings in <a href="/settings" className="text-blue-600 hover:underline">Settings → Time Allocation</a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Database Status Banner */}
                {hasDataInDatabase && (
                  <div className="w-full mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-3 text-left">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900 dark:text-green-100">Database Ready for Generation</h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          {dbStatus.units} units, {dbStatus.lecturers} lecturers, {dbStatus.venues} venues loaded. 
                          You can generate timetables directly or upload new data to replace existing records.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Upload Required Files</h3>
                <p className="text-muted-foreground max-w-sm">
                  Upload your Units, Lecturers, and Venues spreadsheets (CSV or XLSX).
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mt-8 text-left">
                  {/* Units File */}
                  <div
                    className="p-4 bg-background border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => unitInputRef.current?.click()}
                    data-testid="upload-units-card"
                  >
                    <div className="flex items-center gap-3">
                      {unitFile.status === 'uploading' && <Loader2 className="text-blue-600 h-5 w-5 animate-spin" />}
                      {unitFile.status === 'success' && <CheckCircle2 className="text-green-600 h-5 w-5" />}
                      {unitFile.status === 'error' && <AlertCircle className="text-red-600 h-5 w-5" />}
                      {unitFile.status === 'idle' && <FileSpreadsheet className="text-muted-foreground h-5 w-5" />}
                      <div className="text-xs flex-1">
                        <div className="font-medium">Units</div>
                        <div className={cn(
                          "text-muted-foreground",
                          unitFile.status === 'error' && "text-red-600"
                        )}>
                          {unitFile.file?.name || unitFile.message}
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    ref={unitInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, 'units', setUnitFile);
                    }}
                    data-testid="input-units-file"
                  />

                  {/* Lecturers File */}
                  <div
                    className="p-4 bg-background border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => lecturerInputRef.current?.click()}
                    data-testid="upload-lecturers-card"
                  >
                    <div className="flex items-center gap-3">
                      {lecturerFile.status === 'uploading' && <Loader2 className="text-blue-600 h-5 w-5 animate-spin" />}
                      {lecturerFile.status === 'success' && <CheckCircle2 className="text-green-600 h-5 w-5" />}
                      {lecturerFile.status === 'error' && <AlertCircle className="text-red-600 h-5 w-5" />}
                      {lecturerFile.status === 'idle' && <FileSpreadsheet className="text-muted-foreground h-5 w-5" />}
                      <div className="text-xs flex-1">
                        <div className="font-medium">Lecturers</div>
                        <div className={cn(
                          "text-muted-foreground",
                          lecturerFile.status === 'error' && "text-red-600"
                        )}>
                          {lecturerFile.file?.name || lecturerFile.message}
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    ref={lecturerInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, 'lecturers', setLecturerFile);
                    }}
                    data-testid="input-lecturers-file"
                  />

                  {/* Venues File */}
                  <div
                    className="p-4 bg-background border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => venueInputRef.current?.click()}
                    data-testid="upload-venues-card"
                  >
                    <div className="flex items-center gap-3">
                      {venueFile.status === 'uploading' && <Loader2 className="text-blue-600 h-5 w-5 animate-spin" />}
                      {venueFile.status === 'success' && <CheckCircle2 className="text-green-600 h-5 w-5" />}
                      {venueFile.status === 'error' && <AlertCircle className="text-red-600 h-5 w-5" />}
                      {venueFile.status === 'idle' && <FileSpreadsheet className="text-muted-foreground h-5 w-5" />}
                      <div className="text-xs flex-1">
                        <div className="font-medium">Venues</div>
                        <div className={cn(
                          "text-muted-foreground",
                          venueFile.status === 'error' && "text-red-600"
                        )}>
                          {venueFile.file?.name || venueFile.message}
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    ref={venueInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, 'venues', setVenueFile);
                    }}
                    data-testid="input-venues-file"
                  />
                </div>

                {allFilesUploaded && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left max-w-lg w-full">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-600 h-5 w-5 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-green-900">All Files Uploaded</div>
                        <div className="text-sm text-green-700 space-y-1">
                          <div className="flex justify-between">
                            <span>Units:</span> <span className="font-mono font-bold">{unitFile.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Lecturers:</span> <span className="font-mono font-bold">{lecturerFile.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Venues:</span> <span className="font-mono font-bold">{venueFile.count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  className="mt-6 gap-2"
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  data-testid="button-generate-timetable"
                >
                  <RefreshCw className="w-4 h-4" />
                  {willUseNewFiles 
                    ? 'Generate with New Files' 
                    : timetables.length > 0 
                      ? 'Regenerate from Database' 
                      : 'Generate Timetable'}
                </Button>
                {!canGenerate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {hasDataInDatabase ? 'Ready to generate' : 'Please upload all required files or load data into the database'}
                  </p>
                )}
                {canGenerate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {willUseNewFiles 
                      ? `✓ Using newly uploaded files (${unitFile.count} units, ${lecturerFile.count} lecturers, ${venueFile.count} venues)` 
                      : `Using database data (${dbStatus?.units} units, ${dbStatus?.lecturers} lecturers, ${dbStatus?.venues} venues)`}
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <div className="py-8 space-y-6 animate-in fade-in zoom-in duration-500">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" data-testid="loader-generating" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Generating New Timetable Version...</h3>
                  <p className="text-muted-foreground">
                    CP-SAT solver is optimizing your schedule with constraints...
                  </p>
                  {generationProgress && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Clock className="h-4 w-4 animate-pulse" />
                      <span>{generationProgress}</span>
                    </div>
                  )}
                </div>
                {settings && (
                  <div className="mt-6 max-w-md mx-auto">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm text-left">
                      <div className="font-medium text-center mb-3">Generation Parameters</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">Data Source:</div>
                        <div className="font-medium">{willUseNewFiles ? 'Uploaded Files' : 'Database'}</div>
                        <div className="text-muted-foreground">Units:</div>
                        <div className="font-medium">{willUseNewFiles ? unitFile.count : dbStatus?.units}</div>
                        <div className="text-muted-foreground">Weekly Hours:</div>
                        <div className="font-medium">{Math.floor(settings.total_hours_per_unit / settings.semester_weeks)} hrs/week</div>
                        <div className="text-muted-foreground">Patterns:</div>
                        <div className="font-medium">{settings.allowed_patterns.map(p => `[${p.pattern.join(',')}]`).join(', ')}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timetable Versions */}
        {timetables.length > 0 && step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Timetable Versions ({timetables.length})</CardTitle>
              <CardDescription>
                Manage and compare different timetable versions. Activate a version to view it in the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timetables.map((timetable) => (
                  <div
                    key={timetable.id}
                    className={cn(
                      "p-4 border rounded-lg transition-colors",
                      timetable.is_active ? "bg-primary/5 border-primary" : "bg-background hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            Version {timetable.id}
                            {timetable.name && ` - ${timetable.name}`}
                          </h4>
                          {timetable.is_active && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                          <div>
                            Created: {new Date(timetable.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-4 mt-1">
                            <span>Sessions: {timetable.statistics?.total_sessions || 0}</span>
                            <span className={timetable.conflicts?.length > 0 ? "text-destructive" : "text-green-600"}>
                              Conflicts: {timetable.conflicts?.length || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={timetable.is_active ? "default" : "outline"}
                          onClick={() => handleViewTimetable(timetable.id, timetable.is_active)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(timetable.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Sample Files */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Need sample files?</h3>
                <p className="text-sm text-muted-foreground">Download template CSV files to get started</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/backend/sample_data/units.csv" download data-testid="download-units-sample">
                    Units.csv
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/backend/sample_data/lecturers.csv" download data-testid="download-lecturers-sample">
                    Lecturers.csv
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/backend/sample_data/venues.csv" download data-testid="download-venues-sample">
                    Venues.csv
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
