export type SessionType = 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Exam';

export interface Unit {
  id: string;
  code: string;
  name: string;
  color: string;
}

export interface Lecturer {
  id: string;
  name: string;
  department: string;
}

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  type: 'Lecture Hall' | 'Lab' | 'Classroom';
}

export interface Session {
  id: string;
  unitId: string;
  lecturerId: string;
  venueId: string;
  day: string; // 'Monday', 'Tuesday', etc.
  startTime: string; // '08:00'
  endTime: string; // '10:00'
  type: SessionType;
  programGroups: string[]; // ['CS-Y1', 'IT-Y1']
  groupName?: string; // 'Group A', 'Group B' for parallel sessions
}

export const MOCK_UNITS: Unit[] = [
  { id: 'u1', code: 'COMP 100', name: 'Intro to Computer Science', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'u2', code: 'MATH 110', name: 'Calculus I', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'u3', code: 'PHYS 205', name: 'Physics for Engineers', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'u4', code: 'NRSG 343', name: 'Advanced Nursing Practice', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'u5', code: 'THEO 121', name: 'Intro to Theology', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'u6', code: 'CHEM 101', name: 'General Chemistry', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'u7', code: 'EXAM 101', name: 'Final Examination Block', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'u8', code: 'COMM 111', name: 'Communication Skills', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
];

export const MOCK_LECTURERS: Lecturer[] = [
  { id: 'l1', name: 'Dr. James Kubai', department: 'Computer Science' },
  { id: 'l2', name: 'Prof. Sarah Mungai', department: 'Mathematics' },
  { id: 'l3', name: 'Rev. Dr. Alice M', department: 'Theology' },
  { id: 'l4', name: 'Dr. Rose', department: 'Nursing' },
  { id: 'l5', name: 'Dr. Mwenda', department: 'Physics' },
  { id: 'l6', name: 'Mr. John Doe', department: 'Chemistry' },
];

export const MOCK_VENUES: Venue[] = [
  { id: 'v1', name: 'TLH 1', capacity: 200, type: 'Lecture Hall' },
  { id: 'v2', name: 'LAB 1 (Comp)', capacity: 50, type: 'Lab' },
  { id: 'v3', name: 'GF 1 (Science)', capacity: 80, type: 'Classroom' },
  { id: 'v4', name: 'Chapel', capacity: 500, type: 'Lecture Hall' },
  { id: 'v5', name: 'N Lab 3', capacity: 40, type: 'Lab' },
  { id: 'v6', name: 'Physics Lab', capacity: 30, type: 'Lab' },
  { id: 'v7', name: 'Chem Lab', capacity: 30, type: 'Lab' },
];

export const MOCK_SESSIONS: Session[] = [
  // Monday - Shared Lecture
  { id: 's1', unitId: 'u1', lecturerId: 'l1', venueId: 'v1', day: 'Monday', startTime: '08:00', endTime: '10:00', type: 'Lecture', programGroups: ['CS-Y1', 'IT-Y1', 'BBIT-Y1'] },
  
  // Monday - Parallel Labs (Same time, different venues/groups)
  { id: 's2a', unitId: 'u1', lecturerId: 'l1', venueId: 'v2', day: 'Monday', startTime: '10:00', endTime: '13:00', type: 'Lab', programGroups: ['CS-Y1'], groupName: 'Group A' },
  { id: 's2b', unitId: 'u1', lecturerId: 'l6', venueId: 'v5', day: 'Monday', startTime: '10:00', endTime: '13:00', type: 'Lab', programGroups: ['CS-Y1'], groupName: 'Group B' },
  
  // Monday - Afternoon Overlap
  { id: 's3', unitId: 'u4', lecturerId: 'l4', venueId: 'v3', day: 'Monday', startTime: '14:00', endTime: '16:00', type: 'Lecture', programGroups: ['NRSG-Y3'] },
  { id: 's4', unitId: 'u2', lecturerId: 'l2', venueId: 'v1', day: 'Monday', startTime: '14:00', endTime: '16:00', type: 'Lecture', programGroups: ['ENG-Y1'] },

  // Tuesday
  { id: 's5', unitId: 'u5', lecturerId: 'l3', venueId: 'v4', day: 'Tuesday', startTime: '08:00', endTime: '10:00', type: 'Lecture', programGroups: ['ALL-Y1'] },
  
  // Tuesday - Complex Parallel with different durations
  { id: 's6', unitId: 'u3', lecturerId: 'l5', venueId: 'v6', day: 'Tuesday', startTime: '10:00', endTime: '13:00', type: 'Lab', programGroups: ['ENG-Y2'] },
  { id: 's7', unitId: 'u6', lecturerId: 'l6', venueId: 'v7', day: 'Tuesday', startTime: '11:00', endTime: '13:00', type: 'Lab', programGroups: ['SCI-Y1'] },

  // Wednesday - Dense Schedule
  { id: 's8', unitId: 'u8', lecturerId: 'l3', venueId: 'v1', day: 'Wednesday', startTime: '08:00', endTime: '10:00', type: 'Lecture', programGroups: ['ALL-Y1'] },
  { id: 's9', unitId: 'u1', lecturerId: 'l1', venueId: 'v2', day: 'Wednesday', startTime: '10:00', endTime: '12:00', type: 'Lab', programGroups: ['IT-Y1'] },
  { id: 's10', unitId: 'u2', lecturerId: 'l2', venueId: 'v3', day: 'Wednesday', startTime: '10:00', endTime: '12:00', type: 'Tutorial', programGroups: ['CS-Y1'] },
  
  // Thursday - Conflict
  { id: 's11', unitId: 'u2', lecturerId: 'l2', venueId: 'v1', day: 'Thursday', startTime: '09:00', endTime: '11:00', type: 'Lecture', programGroups: ['CS-Y1'] },
  { id: 's12', unitId: 'u2', lecturerId: 'l1', venueId: 'v1', day: 'Thursday', startTime: '09:00', endTime: '11:00', type: 'Lecture', programGroups: ['IT-Y1'] }, // Same venue, same time!

  // Friday - Exams
  { id: 's13', unitId: 'u7', lecturerId: 'l1', venueId: 'v4', day: 'Friday', startTime: '09:00', endTime: '12:00', type: 'Exam', programGroups: ['CS-Y1', 'IT-Y1'] },
];
