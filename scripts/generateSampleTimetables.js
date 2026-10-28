import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// -------------------------------------------------------------
// Sample 1: PCTE Ludhiana Format (7 periods, 3 sub-cols per period, merged headers, break)
// -------------------------------------------------------------
function generateSamplePCTE() {
  const wb = XLSX.utils.book_new();

  // Header row 0: Title
  // Header row 1: Day | Class | Period I (3 cols) | Period II (3 cols) | Break (1 col) | Period III (3 cols) | Period IV (3 cols) | Period V (3 cols) | Period VI (3 cols) | Period VII (3 cols)
  // Header row 2: Sub-headers: Day | Class | Sub | Fac | Room | Sub | Fac | Room | ...
  
  const r0 = ['PCTE GROUP OF INSTITUTES, LUDHIANA - MASTER TIMETABLE 2026'];
  const r1 = [
    'DAY', 'CLASS',
    'I (09:00-10:00)', null, null,
    'II (10:05-11:05)', null, null,
    'TEA BREAK',
    'III (11:25-12:25)', null, null,
    'IV (12:30-13:30)', null, null,
    'V (13:35-14:35)', null, null,
    'VI (14:40-15:40)', null, null,
    'VII (15:40-16:40)', null, null,
  ];

  const r2 = [
    'Day', 'Section',
    'Subject', 'Faculty', 'Room',
    'Subject', 'Faculty', 'Room',
    'Break',
    'Subject', 'Faculty', 'Room',
    'Subject', 'Faculty', 'Room',
    'Subject', 'Faculty', 'Room',
    'Subject', 'Faculty', 'Room',
    'Subject', 'Faculty', 'Room',
  ];

  const dataRows = [
    // MONDAY
    ['Monday', 'BCA 1E', 
      'C Programming', 'Dr. Sharma', 'ET-101',
      'Digital Electronics', 'Prof. Harpreet', 'ET-101',
      'TEA',
      'Maths-I', 'Dr. Verma', 'ET-101',
      'Comm. Skills', 'Ms. Neha', 'ET-102',
      'Programming LAB', 'Dr. Sharma', 'LAB-1',
      'Programming LAB', 'Dr. Sharma', 'LAB-1',
      'Mentoring', 'Dr. Sharma', 'ET-101'
    ],
    [null, 'BCA 2A', 
      'Data Structures', 'Er. Gurjeet', 'ET-203',
      'DBMS', 'Dr. Kapoor', 'ET-203',
      'TEA',
      'Python Programming', 'Er. Gurjeet', 'LAB-3',
      'Python Programming', 'Er. Gurjeet', 'LAB-3',
      'Software Engg', 'Prof. Aman', 'ET-203',
      'Web Tech', 'Ms. Simran', 'ET-203',
      'Library', 'Prof. Aman', 'LIB'
    ],
    [null, 'BTECH CSE 7A', 
      'Cloud Computing', 'Dr. Kapoor', 'CS-301',
      'Machine Learning', 'Dr. Verma', 'CS-301',
      'TEA',
      'AI Project LAB', 'Er. Gurjeet', 'AI-LAB',
      'AI Project LAB', 'Er. Gurjeet', 'AI-LAB',
      'Cyber Security', 'Prof. Harpreet', 'CS-301',
      'Entrepreneurship', 'Ms. Neha', 'CS-301',
      'Placement Training', 'Prof. Harpreet', 'AUDI'
    ],
    [null, 'BCA 1A', 
      'Computer Fundamentals', 'Dr. Sharma', 'ET-105',
      'Mathematics-I', 'Dr. Verma', 'ET-105',
      'TEA',
      'Programming in C', 'Er. Gurjeet', 'ET-105',
      'Communication Skills', 'Ms. Neha', 'ET-105',
      'Office Automation LAB', 'Ms. Simran', 'LAB-2',
      'Office Automation LAB', 'Ms. Simran', 'LAB-2',
      'Mentoring', 'Dr. Sharma', 'ET-105'
    ],

    // TUESDAY
    ['Tuesday', 'BCA 1E', 
      'Maths-I', 'Dr. Verma', 'ET-101',
      'C Programming', 'Dr. Sharma', 'ET-101',
      'TEA',
      'Digital Electronics', 'Prof. Harpreet', 'ET-101',
      'Digital LAB', 'Prof. Harpreet', 'HW-LAB',
      'Digital LAB', 'Prof. Harpreet', 'HW-LAB',
      'Comm. Skills', 'Ms. Neha', 'ET-102',
      'Sports', 'Prof. Aman', 'GROUND'
    ],
    [null, 'BCA 2A', 
      'DBMS LAB', 'Dr. Kapoor', 'LAB-2',
      'DBMS LAB', 'Dr. Kapoor', 'LAB-2',
      'TEA',
      'Data Structures', 'Er. Gurjeet', 'ET-203',
      'Software Engg', 'Prof. Aman', 'ET-203',
      'Maths-III', 'Dr. Verma', 'ET-203',
      'Python Programming', 'Er. Gurjeet', 'ET-203',
      'Web Tech', 'Ms. Simran', 'ET-203'
    ],
    [null, 'BTECH CSE 7A', 
      'Machine Learning', 'Dr. Verma', 'CS-301',
      'Cloud Computing', 'Dr. Kapoor', 'CS-301',
      'TEA',
      'Cyber Security', 'Prof. Harpreet', 'CS-301',
      'Machine Learning LAB', 'Dr. Verma', 'AI-LAB',
      'Machine Learning LAB', 'Dr. Verma', 'AI-LAB',
      'Open Elective', 'Ms. Simran', 'ET-203',
      'Placement Training', 'Prof. Harpreet', 'AUDI'
    ],
    [null, 'BCA 1A', 
      'Programming in C', 'Er. Gurjeet', 'ET-105',
      'Computer Fundamentals', 'Dr. Sharma', 'ET-105',
      'TEA',
      'Mathematics-I', 'Dr. Verma', 'ET-105',
      'C Programming LAB', 'Er. Gurjeet', 'LAB-1',
      'C Programming LAB', 'Er. Gurjeet', 'LAB-1',
      'Communication Skills', 'Ms. Neha', 'ET-105',
      'Library', 'Prof. Aman', 'LIB'
    ],

    // WEDNESDAY
    ['Wednesday', 'BCA 1E', 
      'Digital Electronics', 'Prof. Harpreet', 'ET-101',
      'Maths-I', 'Dr. Verma', 'ET-101',
      'TEA',
      'C Programming', 'Dr. Sharma', 'ET-101',
      'Web Design LAB', 'Ms. Simran', 'LAB-1',
      'Web Design LAB', 'Ms. Simran', 'LAB-1',
      'Comm. Skills', 'Ms. Neha', 'ET-102',
      'Seminar', 'Dr. Sharma', 'ET-101'
    ],
    [null, 'BCA 2A', 
      'Software Engg', 'Prof. Aman', 'ET-203',
      'Data Structures', 'Er. Gurjeet', 'ET-203',
      'TEA',
      'DBMS', 'Dr. Kapoor', 'ET-203',
      'Data Structures LAB', 'Er. Gurjeet', 'LAB-3',
      'Data Structures LAB', 'Er. Gurjeet', 'LAB-3',
      'Web Tech', 'Ms. Simran', 'ET-203',
      'Group Discussion', 'Ms. Neha', 'ET-203'
    ],
    [null, 'BTECH CSE 7A', 
      'Cyber Security', 'Prof. Harpreet', 'CS-301',
      'Cloud Computing', 'Dr. Kapoor', 'CS-301',
      'TEA',
      'Machine Learning', 'Dr. Verma', 'CS-301',
      'Cloud Computing LAB', 'Dr. Kapoor', 'CLOUD-LAB',
      'Cloud Computing LAB', 'Dr. Kapoor', 'CLOUD-LAB',
      'Entrepreneurship', 'Ms. Neha', 'CS-301',
      'Industry Talk', 'Er. Gurjeet', 'AUDI'
    ],
    [null, 'BCA 1A', 
      'Mathematics-I', 'Dr. Verma', 'ET-105',
      'Programming in C', 'Er. Gurjeet', 'ET-105',
      'TEA',
      'Computer Fundamentals', 'Dr. Sharma', 'ET-105',
      'Digital Circuits', 'Prof. Harpreet', 'ET-105',
      'Digital Circuits', 'Prof. Harpreet', 'ET-105',
      'Communication Skills', 'Ms. Neha', 'ET-105',
      'Sports', 'Prof. Aman', 'GROUND'
    ],

    // THURSDAY
    ['Thursday', 'BCA 1E', 
      'C Programming', 'Dr. Sharma', 'ET-101',
      'Maths-I', 'Dr. Verma', 'ET-101',
      'TEA',
      'Comm. Skills', 'Ms. Neha', 'ET-102',
      'Comm. LAB', 'Ms. Neha', 'LANG-LAB',
      'Digital Electronics', 'Prof. Harpreet', 'ET-101',
      'Tutorial', 'Dr. Sharma', 'ET-101',
      'Library', 'Prof. Harpreet', 'LIB'
    ],
    [null, 'BCA 2A', 
      'Python Programming', 'Er. Gurjeet', 'ET-203',
      'DBMS', 'Dr. Kapoor', 'ET-203',
      'TEA',
      'Data Structures', 'Er. Gurjeet', 'ET-203',
      'Software Engg LAB', 'Prof. Aman', 'LAB-2',
      'Software Engg LAB', 'Prof. Aman', 'LAB-2',
      'Web Tech', 'Ms. Simran', 'ET-203',
      'Mentoring', 'Er. Gurjeet', 'ET-203'
    ],
    [null, 'BTECH CSE 7A', 
      'Cloud Computing', 'Dr. Kapoor', 'CS-301',
      'Cyber Security', 'Prof. Harpreet', 'CS-301',
      'TEA',
      'Machine Learning', 'Dr. Verma', 'CS-301',
      'Cyber Security LAB', 'Prof. Harpreet', 'SEC-LAB',
      'Cyber Security LAB', 'Prof. Harpreet', 'SEC-LAB',
      'Project Work', 'Dr. Verma', 'AI-LAB',
      'Project Work', 'Dr. Verma', 'AI-LAB'
    ],
    [null, 'BCA 1A', 
      'Computer Fundamentals', 'Dr. Sharma', 'ET-105',
      'Mathematics-I', 'Dr. Verma', 'ET-105',
      'TEA',
      'Digital Circuits LAB', 'Prof. Harpreet', 'HW-LAB',
      'Digital Circuits LAB', 'Prof. Harpreet', 'HW-LAB',
      'Programming in C', 'Er. Gurjeet', 'ET-105',
      'Tutorial', 'Dr. Sharma', 'ET-105',
      'Self Study', 'Dr. Verma', 'LIB'
    ],

    // FRIDAY
    ['Friday', 'BCA 1E', 
      'Programming LAB', 'Dr. Sharma', 'LAB-1',
      'Programming LAB', 'Dr. Sharma', 'LAB-1',
      'TEA',
      'Digital Electronics', 'Prof. Harpreet', 'ET-101',
      'Maths-I', 'Dr. Verma', 'ET-101',
      'C Programming', 'Dr. Sharma', 'ET-101',
      'Value Added Course', 'Er. Gurjeet', 'ET-101',
      'Value Added Course', 'Er. Gurjeet', 'ET-101'
    ],
    [null, 'BCA 2A', 
      'Web Tech LAB', 'Ms. Simran', 'LAB-3',
      'Web Tech LAB', 'Ms. Simran', 'LAB-3',
      'TEA',
      'Data Structures', 'Er. Gurjeet', 'ET-203',
      'DBMS', 'Dr. Kapoor', 'ET-203',
      'Software Engg', 'Prof. Aman', 'ET-203',
      'Aptitude Practice', 'Dr. Verma', 'ET-203',
      'Club Activity', 'Prof. Aman', 'AUDI'
    ],
    [null, 'BTECH CSE 7A', 
      'Major Project Review', 'Dr. Kapoor', 'AI-LAB',
      'Major Project Review', 'Dr. Kapoor', 'AI-LAB',
      'TEA',
      'Cloud Computing', 'Dr. Kapoor', 'CS-301',
      'Machine Learning', 'Dr. Verma', 'CS-301',
      'Cyber Security', 'Prof. Harpreet', 'CS-301',
      'Department Meeting', 'Er. Gurjeet', 'CONF-ROOM',
      'Counseling', 'Ms. Neha', 'CS-301'
    ],
    [null, 'BCA 1A', 
      'C Programming LAB', 'Er. Gurjeet', 'LAB-1',
      'C Programming LAB', 'Er. Gurjeet', 'LAB-1',
      'TEA',
      'Computer Fundamentals', 'Dr. Sharma', 'ET-105',
      'Mathematics-I', 'Dr. Verma', 'ET-105',
      'Communication Skills', 'Ms. Neha', 'ET-105',
      'Digital Circuits', 'Prof. Harpreet', 'ET-105',
      'Club Activity', 'Prof. Aman', 'AUDI'
    ],

    // SATURDAY
    ['Saturday', 'BCA 1E', 
      'Remedial Classes', 'Dr. Sharma', 'ET-101',
      'Remedial Classes', 'Dr. Verma', 'ET-101',
      'TEA',
      'Technical Quiz', 'Ms. Simran', 'ET-101',
      'Sports & Cultural', 'Prof. Harpreet', 'GROUND',
      null, null, null, null, null, null, null, null, null
    ],
    [null, 'BCA 2A', 
      'Hackathon Prep', 'Er. Gurjeet', 'LAB-3',
      'Hackathon Prep', 'Er. Gurjeet', 'LAB-3',
      'TEA',
      'Code Debugging Contest', 'Dr. Kapoor', 'LAB-3',
      'Sports & Cultural', 'Prof. Harpreet', 'GROUND',
      null, null, null, null, null, null, null, null, null
    ],
    [null, 'BTECH CSE 7A', 
      'Industry Seminar', 'Dr. Kapoor', 'AUDI',
      'Industry Seminar', 'Dr. Kapoor', 'AUDI',
      'TEA',
      'Coding Competition', 'Er. Gurjeet', 'AI-LAB',
      'Sports & Cultural', 'Prof. Harpreet', 'GROUND',
      null, null, null, null, null, null, null, null, null
    ],
    [null, 'BCA 1A', 
      'Remedial Classes', 'Dr. Sharma', 'ET-105',
      'Remedial Classes', 'Dr. Verma', 'ET-105',
      'TEA',
      'Technical Quiz', 'Ms. Simran', 'ET-105',
      'Sports & Cultural', 'Prof. Harpreet', 'GROUND',
      null, null, null, null, null, null, null, null, null
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([r0, r1, r2, ...dataRows]);

  // Define merges for Period headers:
  // r1: Day (c:0), Class (c:1),
  // P1: c 2..4, P2: c 5..7, Break: c 8, P3: c 9..11, P4: c 12..14, P5: c 15..17, P6: c 18..20, P7: c 21..23
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 23 } }, // Title
    { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } }, // P1
    { s: { r: 1, c: 5 }, e: { r: 1, c: 7 } }, // P2
    { s: { r: 1, c: 9 }, e: { r: 1, c: 11 } }, // P3
    { s: { r: 1, c: 12 }, e: { r: 1, c: 14 } }, // P4
    { s: { r: 1, c: 15 }, e: { r: 1, c: 17 } }, // P5
    { s: { r: 1, c: 18 }, e: { r: 1, c: 20 } }, // P6
    { s: { r: 1, c: 21 }, e: { r: 1, c: 23 } }, // P7
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'PCTE_Timetable');
  const filePath = path.join(outDir, 'Updated_w_e_f_26-10-2026.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log('Sample 1 generated at:', filePath);
}

// -------------------------------------------------------------
// Sample 2: 5 Periods, 2 columns per period (Subject, Faculty [Room]), Days Mon-Fri
// -------------------------------------------------------------
function generateSample5Period() {
  const wb = XLSX.utils.book_new();

  const r0 = ['INSTITUTE TIMETABLE - 5 PERIOD SCHEDULE (MON-FRI)'];
  const r1 = [
    'DAY', 'SECTION',
    'PERIOD 1 (09:00 - 10:30)', null,
    'PERIOD 2 (10:45 - 12:15)', null,
    'LUNCH',
    'PERIOD 3 (01:00 - 02:30)', null,
    'PERIOD 4 (02:40 - 04:00)', null,
    'PERIOD 5 (04:10 - 05:00)', null
  ];
  const r2 = [
    'Day', 'Section',
    'Course Name', 'Faculty (Room)',
    'Course Name', 'Faculty (Room)',
    'Lunch Break',
    'Course Name', 'Faculty (Room)',
    'Course Name', 'Faculty (Room)',
    'Course Name', 'Faculty (Room)'
  ];

  const dataRows = [
    ['Mon', 'CSE-4A',
      'Operating Systems', 'Dr. Sharma [R-101]',
      'Computer Networks', 'Prof. Aman [R-101]',
      'LUNCH',
      'Database Systems', 'Dr. Kapoor [LAB-A]',
      'OS LAB', 'Dr. Sharma [LAB-B]',
      'Mentoring', 'Er. Gurjeet [R-101]'
    ],
    [null, 'ECE-4B',
      'Signal Processing', 'Prof. Harpreet [R-202]',
      'Microcontrollers', 'Dr. Verma [R-202]',
      'LUNCH',
      'Analog Circuits', 'Ms. Neha [R-202]',
      'Hardware LAB', 'Prof. Harpreet [HW-LAB]',
      'Library', 'Prof. Harpreet [LIB]'
    ],
    ['Tue', 'CSE-4A',
      'Database Systems', 'Dr. Kapoor [R-101]',
      'Operating Systems', 'Dr. Sharma [R-101]',
      'LUNCH',
      'Algorithms', 'Dr. Verma [R-101]',
      'Computer Networks', 'Prof. Aman [R-101]',
      'Sports', 'Prof. Aman [GROUND]'
    ],
    [null, 'ECE-4B',
      'Microcontrollers LAB', 'Dr. Verma [HW-LAB]',
      'Microcontrollers LAB', 'Dr. Verma [HW-LAB]',
      'LUNCH',
      'Signal Processing', 'Prof. Harpreet [R-202]',
      'Analog Circuits', 'Ms. Neha [R-202]',
      'Seminar', 'Ms. Neha [R-202]'
    ],
    ['Wed', 'CSE-4A',
      'Algorithms LAB', 'Dr. Verma [LAB-A]',
      'Algorithms LAB', 'Dr. Verma [LAB-A]',
      'LUNCH',
      'Operating Systems', 'Dr. Sharma [R-101]',
      'Database Systems', 'Dr. Kapoor [R-101]',
      'Technical Writing', 'Ms. Simran [R-101]'
    ],
    [null, 'ECE-4B',
      'Analog Circuits', 'Ms. Neha [R-202]',
      'Signal Processing', 'Prof. Harpreet [R-202]',
      'LUNCH',
      'Microcontrollers', 'Dr. Verma [R-202]',
      'Project Work', 'Prof. Harpreet [HW-LAB]',
      'Project Work', 'Prof. Harpreet [HW-LAB]'
    ],
    ['Thu', 'CSE-4A',
      'Computer Networks', 'Prof. Aman [R-101]',
      'Algorithms', 'Dr. Verma [R-101]',
      'LUNCH',
      'Networks LAB', 'Prof. Aman [LAB-C]',
      'Networks LAB', 'Prof. Aman [LAB-C]',
      'Placement Prep', 'Er. Gurjeet [AUDI]'
    ],
    [null, 'ECE-4B',
      'Signals LAB', 'Prof. Harpreet [HW-LAB]',
      'Signals LAB', 'Prof. Harpreet [HW-LAB]',
      'LUNCH',
      'Analog Circuits', 'Ms. Neha [R-202]',
      'Microcontrollers', 'Dr. Verma [R-202]',
      'Counseling', 'Dr. Verma [R-202]'
    ],
    ['Fri', 'CSE-4A',
      'Cloud Computing', 'Dr. Kapoor [R-101]',
      'AI Intro', 'Er. Gurjeet [R-101]',
      'LUNCH',
      'Database Systems', 'Dr. Kapoor [R-101]',
      'Operating Systems', 'Dr. Sharma [R-101]',
      'Club Activity', 'Ms. Simran [AUDI]'
    ],
    [null, 'ECE-4B',
      'Embedded Systems', 'Dr. Verma [R-202]',
      'Signal Processing', 'Prof. Harpreet [R-202]',
      'LUNCH',
      'Analog Circuits LAB', 'Ms. Neha [HW-LAB]',
      'Analog Circuits LAB', 'Ms. Neha [HW-LAB]',
      'Sports', 'Prof. Aman [GROUND]'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([r0, r1, r2, ...dataRows]);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } }, // P1
    { s: { r: 1, c: 4 }, e: { r: 1, c: 5 } }, // P2
    { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } }, // P3
    { s: { r: 1, c: 9 }, e: { r: 1, c: 10 } }, // P4
    { s: { r: 1, c: 11 }, e: { r: 1, c: 12 } }, // P5
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Alternate_Layout');
  const filePath = path.join(outDir, 'sample_5period_timetable.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log('Sample 2 generated at:', filePath);
}

generateSamplePCTE();
generateSample5Period();
