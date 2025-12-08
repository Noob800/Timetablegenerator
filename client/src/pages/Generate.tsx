import React, { useState, useEffect, useRef } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ArrowRight, X } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { api } from '@/lib/api';
import { toast } from 'sonner';

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
  const [generatedTimetableId, setGeneratedTimetableId] = useState<string | null>(null);
  
  const unitInputRef = useRef<HTMLInputElement>(null);
  const lecturerInputRef = useRef<HTMLInputElement>(null);
  const venueInputRef = useRef<HTMLInputElement>(null);

  const allFilesUploaded = unitFile.status === 'success' && 
                          lecturerFile.status === 'success' && 
                          venueFile.status === 'success';

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
    
    try {
      const result = await api.generateTimetable();
      
      if (result.conflicts && result.conflicts.length > 0) {
        toast.warning(`Timetable generated with ${result.conflicts.length} conflicts`);
      } else {
        toast.success('Timetable generated successfully!');
      }
      
      // Store timetable in sessionStorage for viewing
      sessionStorage.setItem('generated_timetable', JSON.stringify(result));
      
      setTimeout(() => {
        setLocation('/');
      }, 1500);
      
    } catch (error: any) {
      setIsGenerating(false);
      setStep(1);
      toast.error(`Generation failed: ${error.message}`);
    }
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Generate New Timetable</h1>
          <p className="text-muted-foreground">Upload your academic data files to generate an optimized schedule.</p>
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
                  disabled={!allFilesUploaded}
                  onClick={handleGenerate}
                  data-testid="button-generate-timetable"
                >
                  Generate Timetable <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {step === 2 && (
              <div className="py-8 space-y-6 animate-in fade-in zoom-in duration-500">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" data-testid="loader-generating" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Generating Timetable...</h3>
                  <p className="text-muted-foreground">
                    Using OR-Tools constraint solver to optimize schedule and minimize conflicts.
                  </p>
                  <p className="text-sm text-muted-foreground">This may take 10-30 seconds.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
