// API Client for FastAPI Backend

const API_BASE = '/api';

export interface UploadResponse {
  success: boolean;
  message: string;
  count: number;
  preview: any[];
}

export interface UploadStatus {
  units: number;
  lecturers: number;
  venues: number;
  ready: boolean;
}

export interface TimetableSession {
  id: string;
  unit_code: string;
  unit_name: string;
  lecturer_name: string;
  venue_name: string;
  day: string;
  start_time: string;
  end_time: string;
  session_type: string;
  program_groups: string[];
  group_name?: string;
}

export interface TimetableOutput {
  sessions: TimetableSession[];
  conflicts: any[];
  statistics: {
    total_sessions: number;
    lectures: number;
    labs: number;
    tutorials: number;
    conflicts: number;
  };
  metadata: Record<string, any>;
}

class API {
  async uploadUnits(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload/units`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }
    
    return response.json();
  }
  
  async uploadLecturers(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload/lecturers`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }
    
    return response.json();
  }
  
  async uploadVenues(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/upload/venues`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }
    
    return response.json();
  }
  
  async getUploadStatus(): Promise<UploadStatus> {
    const response = await fetch(`${API_BASE}/upload/status`);
    
    if (!response.ok) {
      throw new Error('Failed to get upload status');
    }
    
    return response.json();
  }
  
  async generateTimetable(): Promise<TimetableOutput> {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Generation failed');
    }
    
    return response.json();
  }
  
  async clearData(): Promise<void> {
    const response = await fetch(`${API_BASE}/clear`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear data');
    }
  }
  
  async healthCheck(): Promise<{ status: string; database_configured: boolean }> {
    const response = await fetch(`${API_BASE}/../health`);
    return response.json();
  }
}

export const api = new API();
