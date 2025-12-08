import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ArrowRight, Clock } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useLocation } from 'wouter';
import { cn } from "@/lib/utils";

export default function Generate() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleUpload = () => {
    // Simulate upload
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setUploadProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setStep(2);
          analyzeFiles();
        }, 500);
      }
    }, 200);
  };

  const analyzeFiles = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setStep(3);
    }, 2500);
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
            Analyze
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={cn("flex items-center gap-2", step >= 3 && "text-primary")}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center border-current">3</div>
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
                <h3 className="text-xl font-semibold">Drag & Drop Files Here</h3>
                <p className="text-muted-foreground max-w-sm">
                  Upload your Units, Lecturers, and Venues spreadsheets (CSV or XLSX).
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mt-8 text-left">
                   <div className="p-4 bg-background border rounded-lg flex items-center gap-3">
                     <FileSpreadsheet className="text-green-600 h-5 w-5" />
                     <div className="text-xs">
                       <div className="font-medium">units_2025.xlsx</div>
                       <div className="text-muted-foreground">Waiting...</div>
                     </div>
                   </div>
                   <div className="p-4 bg-background border rounded-lg flex items-center gap-3">
                     <FileSpreadsheet className="text-green-600 h-5 w-5" />
                     <div className="text-xs">
                       <div className="font-medium">lecturers.csv</div>
                       <div className="text-muted-foreground">Waiting...</div>
                     </div>
                   </div>
                   <div className="p-4 bg-background border rounded-lg flex items-center gap-3">
                     <FileSpreadsheet className="text-green-600 h-5 w-5" />
                     <div className="text-xs">
                       <div className="font-medium">venues.xlsx</div>
                       <div className="text-muted-foreground">Waiting...</div>
                     </div>
                   </div>
                </div>

                {uploadProgress > 0 ? (
                  <div className="w-full max-w-xs mt-6 space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
                  </div>
                ) : (
                  <Button size="lg" className="mt-6" onClick={handleUpload}>Select Files</Button>
                )}
              </>
            )}

            {step === 2 && (
              <div className="py-8 space-y-6 animate-in fade-in zoom-in duration-500">
                {isAnalyzing ? (
                  <>
                     <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                     <div className="space-y-2">
                       <h3 className="text-xl font-semibold">Analyzing Data Constraints...</h3>
                       <p className="text-muted-foreground">Checking lecturer availability, room capacities, and program rules.</p>
                     </div>
                  </>
                ) : (
                   <div className="space-y-4">
                     <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                     </div>
                     <h3 className="text-xl font-semibold">Analysis Complete</h3>
                     <div className="text-sm text-left max-w-sm mx-auto space-y-2 bg-background p-4 rounded-lg border">
                       <div className="flex justify-between"><span>Units Found:</span> <span className="font-mono font-bold">142</span></div>
                       <div className="flex justify-between"><span>Lecturers:</span> <span className="font-mono font-bold">45</span></div>
                       <div className="flex justify-between"><span>Venues:</span> <span className="font-mono font-bold">28</span></div>
                       <div className="flex justify-between text-yellow-600"><span>Potential Clashes:</span> <span className="font-mono font-bold">3</span></div>
                     </div>
                   </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                   <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">Ready to Generate</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We are ready to build the schedule. This process will use the hybrid solver to minimize conflicts and optimize for lecturer preferences.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button size="lg" className="gap-2" onClick={() => setLocation('/')}>
                    Generate Timetable <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
