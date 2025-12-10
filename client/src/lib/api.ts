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
  name?: string;
  version?: number;
  is_active?: boolean;
}

export interface InstitutionalEvent {
  name: string;
  day: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
  color: string;
}

export interface TimeAllocationPattern {
  pattern: number[];
  label: string;
}

export interface Settings {
  id?: number;
  academic_year: string;
  trimester: string;
  schedule_start_time: string;
  schedule_end_time: string;
  session_duration: number;
  break_duration: number;
  institutional_events: InstitutionalEvent[];
  semester_weeks: number;
  total_hours_per_unit: number;
  allowed_patterns: TimeAllocationPattern[];
  prefer_three_hour_blocks: boolean;
  allow_split_blocks: boolean;
  respect_lecturer_availability?: boolean;
  balance_daily_load?: boolean;
  max_lecturer_hours_per_week?: number;
  enable_conflict_notifications: boolean;
  enable_generation_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UnitWeeklyOverride {
  id?: number;
  unit_code: string;
  custom_weekly_hours: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UnitWithOverrideInfo {
  code: string;
  name: string;
  global_weekly_hours: number;
  has_override: boolean;
  override_weekly_hours: number | null;
  effective_weekly_hours: number;
  override_notes: string | null;
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
  
  // New endpoints for real data
  async getActiveTimetable(): Promise<TimetableOutput> {
    const response = await fetch(`${API_BASE}/timetable/active`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No active timetable found');
      }
      throw new Error('Failed to fetch timetable');
    }
    
    return response.json();
  }
  
  async getAllUnits(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/units`);
    if (!response.ok) throw new Error('Failed to fetch units');
    return response.json();
  }
  
  async getAllLecturers(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/lecturers`);
    if (!response.ok) throw new Error('Failed to fetch lecturers');
    return response.json();
  }
  
  async getAllVenues(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/venues`);
    if (!response.ok) throw new Error('Failed to fetch venues');
    return response.json();
  }
  
  async getSettings(): Promise<Settings> {
    const response = await fetch(`${API_BASE}/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  }
  
  async updateSettings(settings: Omit<Settings, 'id' | 'created_at' | 'updated_at'>): Promise<Settings> {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update settings');
    }
    
    return response.json();
  }
  
  async listTimetables(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/timetable/list`);
    if (!response.ok) throw new Error('Failed to fetch timetables');
    return response.json();
  }
  
  async activateTimetable(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/timetable/${id}/activate`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to activate timetable');
  }
  
  async deleteTimetable(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/timetable/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete timetable');
  }
  
  // Unit Override Methods
  async getAllUnitOverrides(): Promise<UnitWeeklyOverride[]> {
    const response = await fetch(`${API_BASE}/unit-overrides`);
    if (!response.ok) throw new Error('Failed to fetch unit overrides');
    return response.json();
  }
  
  async createOrUpdateUnitOverride(override: Omit<UnitWeeklyOverride, 'id' | 'created_at' | 'updated_at'>): Promise<UnitWeeklyOverride> {
    const response = await fetch(`${API_BASE}/unit-overrides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(override),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create/update unit override');
    }
    
    return response.json();
  }
  
  async deleteUnitOverride(unit_code: string): Promise<void> {
    const response = await fetch(`${API_BASE}/unit-overrides/${encodeURIComponent(unit_code)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete unit override');
    }
  }
  
  async getUnitsWithOverrides(): Promise<UnitWithOverrideInfo[]> {
    const response = await fetch(`${API_BASE}/units/with-overrides`);
    if (!response.ok) throw new Error('Failed to fetch units with override info');
    return response.json();
  }
}

export const api = new API();
