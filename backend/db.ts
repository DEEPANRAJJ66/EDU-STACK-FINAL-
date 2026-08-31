import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getFirebaseFirestore } from './firebaseAdmin';
import {
  User,
  Test,
  TestFolder,
  Question,
  QuestionOption,
  TestAttempt,
  SubjectType,
  AttemptErrorNotes,
  QuestionErrorNote,
  PlannerTask,
  PlannerAnalytics,
  DayProgressSummary,
} from '../src/types';

export interface DatabaseSchema {
  users: User[];
  passwordHashes: Record<string, string>;
  tests: Test[];
  testFolders: TestFolder[];
  questions: Question[];
  attempts: TestAttempt[];
  errorNotes: AttemptErrorNotes[];
  plannerTasks: PlannerTask[];
}

const DATA_DIR = process.env.NODE_ENV === 'production' ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'edustack_db.json');
// This is the copy of your data committed to your GitHub repo — used to "seed" a fresh
// production database whenever Render restarts and wipes /tmp (which has no memory of
// anything created after this file was last committed).
const SEED_FILE = path.join(process.cwd(), 'data', 'edustack_db.json');

class Database {
  private data: DatabaseSchema = {
    users: [],
    passwordHashes: {},
    tests: [],
    testFolders: [],
    questions: [],
    attempts: [],
    errorNotes: [],
    plannerTasks: [],
  };
  private isLoaded = false;
  public ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // On a fresh production boot, /tmp is empty — copy in the committed snapshot so your
    // existing tests/questions show up, instead of starting completely blank.
    if (process.env.NODE_ENV === 'production' && !fs.existsSync(DB_FILE) && fs.existsSync(SEED_FILE)) {
      fs.copyFileSync(SEED_FILE, DB_FILE);
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          passwordHashes: parsed.passwordHashes || {},
          tests: parsed.tests || [],
          testFolders: parsed.testFolders || [],
          questions: parsed.questions || [],
          attempts: parsed.attempts || [],
          errorNotes: parsed.errorNotes || [],
          plannerTasks: parsed.plannerTasks || [],
        };
        if (!this.data.plannerTasks || this.data.plannerTasks.length === 0) {
          this.seedPlannerTasks();
          this.save();
        }
        this.isLoaded = true;
        this.syncWithFirestore();
        await this.loadLiveDataFromFirestore();
        return;
      } catch (err) {
        console.error('Failed to read db file, initializing with seeds', err);
      }
    }

    this.seedInitialData();
    this.seedPlannerTasks();
    this.save();
    this.isLoaded = true;
    this.syncWithFirestore();
    await this.loadLiveDataFromFirestore();
  }

  // Loads users/attempts/errorNotes that were created live (by real people using the
  // deployed site) from Firestore, since those are the things that must survive a Render
  // restart — tests/questions still come from the committed seed file, since you manage
  // those yourself via code.
  private async loadLiveDataFromFirestore() {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) return;

      const [usersSnap, attemptsSnap, errorNotesSnap] = await Promise.all([
        firestore.collection('live_users').get(),
        firestore.collection('live_attempts').get(),
        firestore.collection('live_errorNotes').get(),
      ]);

      if (!usersSnap.empty) {
        const byId = new Map(this.data.users.map(u => [u.id, u]));
        usersSnap.forEach(doc => byId.set(doc.id, doc.data() as User));
        this.data.users = Array.from(byId.values());
      }

      if (!attemptsSnap.empty) {
        const byId = new Map(this.data.attempts.map(a => [a.id, a]));
        attemptsSnap.forEach(doc => byId.set(doc.id, doc.data() as TestAttempt));
        this.data.attempts = Array.from(byId.values());
      }

      if (!errorNotesSnap.empty) {
        const byId = new Map(this.data.errorNotes.map(e => [e.id, e]));
        errorNotesSnap.forEach(doc => byId.set(doc.id, doc.data() as AttemptErrorNotes));
        this.data.errorNotes = Array.from(byId.values());
      }

      console.log('[Firebase] Loaded live users/attempts/errorNotes from Firestore');
    } catch (err) {
      console.warn('[Firebase] Could not load live data from Firestore, continuing with local snapshot:', err);
    }
  }

  // Fire-and-forget write of one live record to Firestore, so it survives a restart. Errors
  // are only logged (never thrown) so a slow/unavailable Firestore never breaks the actual
  // request the user is waiting on — the local JSON copy (via save()) is still the
  // instant/authoritative source for the current server process.
  private persistLive(collectionName: string, id: string, data: any) {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) return;
      firestore.collection(collectionName).doc(id).set(data, { merge: true }).catch((err: any) => {
        console.warn(`[Firebase] Failed to persist ${collectionName}/${id}:`, err);
      });
    } catch (err) {
      console.warn(`[Firebase] Failed to persist ${collectionName}/${id}:`, err);
    }
  }

  private async syncWithFirestore() {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) return;

      // Sync test documents to Firestore
      const batch = firestore.batch();
      for (const t of this.data.tests.slice(0, 10)) {
        const docRef = firestore.collection('tests').doc(t.id);
        batch.set(docRef, t, { merge: true });
      }
      await batch.commit();
      console.log('[Firebase] Successfully synced records with Firestore');
    } catch (err) {
      console.warn('[Firebase] Firestore background sync notice:', err);
    }
  }

  private saveTimeout: NodeJS.Timeout | null = null;

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        const jsonContent = JSON.stringify(this.data, null, 2);
        const tempFile = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempFile, jsonContent, 'utf-8');
        fs.renameSync(tempFile, DB_FILE);
      } catch (err) {
        console.error('Error persisting database atomically:', err);
      }
    }, 500); // Debounce disk writes by 500ms
  }

  private seedInitialData() {
    const salt = bcrypt.genSaltSync(10);
    const teacherPasswordHash = bcrypt.hashSync('teacher123', salt);
    const studentPasswordHash = bcrypt.hashSync('student123', salt);

    const teacherId = 'user_teacher_1';
    const student1Id = 'user_student_1';
    const student2Id = 'user_student_2';
    const student3Id = 'user_student_3';

    this.data.users = [
      {
        id: teacherId,
        email: 'teacher@edustack.com',
        name: 'Teacher',
        role: 'TEACHER',
        status: 'APPROVED',
        createdAt: new Date('2026-08-01T08:00:00Z').toISOString(),
      },
      {
        id: student1Id,
        email: 'student1@edustack.com',
        name: 'Student 1',
        role: 'STUDENT',
        status: 'ACTIVE',
        createdAt: new Date('2026-08-05T09:30:00Z').toISOString(),
      },
      {
        id: student2Id,
        email: 'student2@edustack.com',
        name: 'Student 2',
        role: 'STUDENT',
        status: 'ACTIVE',
        createdAt: new Date('2026-08-06T10:15:00Z').toISOString(),
      },
      {
        id: student3Id,
        email: 'student3@edustack.com',
        name: 'Student 3',
        role: 'STUDENT',
        status: 'ACTIVE',
        createdAt: new Date('2026-08-07T11:00:00Z').toISOString(),
      },
    ];

    this.data.passwordHashes = {
      [teacherId]: teacherPasswordHash,
      [student1Id]: studentPasswordHash,
      [student2Id]: studentPasswordHash,
      [student3Id]: studentPasswordHash,
    };

    // Tests
    const test1Id = 'test_jee_mock_01';
    const test2Id = 'test_physics_01';
    const test3Id = 'test_chem_01';
    const test4Id = 'test_math_draft_01';

    this.data.tests = [
      {
        id: test1Id,
        teacherId,
        teacherName: 'Teacher',
        title: 'JEE Main Mock 01 Full Test (All Subjects)',
        description: 'Comprehensive 75-question standard format covering Physics, Chemistry, and Mathematics with NTA standard negative marking.',
        testType: 'JEE_MAIN_FULL',
        durationMinutes: 180,
        totalQuestions: 15,
        marksPerQuestion: 4,
        negativeMarks: 1,
        instructions: '1. Total duration of examination is 180 minutes.\n2. The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you.\n3. The Question Palette displayed on the right side of screen will show the status of each question.\n4. +4 for correct answer, -1 for wrong answer, 0 for unattempted.\n5. Click Save & Next to preserve your answer and proceed.',
        status: 'PUBLISHED',
        createdAt: new Date('2026-08-10T10:00:00Z').toISOString(),
        updatedAt: new Date('2026-08-15T14:30:00Z').toISOString(),
      },
      {
        id: test2Id,
        teacherId,
        teacherName: 'Teacher',
        title: 'Physics Mechanics & Electrostatics Test 01',
        description: 'High-yield conceptual and numerical problems on Kinematics, Newton Laws, Capacitors, and Gauss Law.',
        testType: 'PHYSICS',
        durationMinutes: 60,
        totalQuestions: 6,
        marksPerQuestion: 4,
        negativeMarks: 1,
        instructions: 'Attempt all questions. Calculator is NOT permitted. +4 for correct, -1 for incorrect.',
        status: 'PUBLISHED',
        createdAt: new Date('2026-08-12T11:00:00Z').toISOString(),
        updatedAt: new Date('2026-08-14T09:00:00Z').toISOString(),
      },
      {
        id: test3Id,
        teacherId,
        teacherName: 'Teacher',
        title: 'Chemistry Chemical Bonding & Thermodynamics',
        description: 'Targeted test on Hybridization, MOT, Gibbs Free Energy ($\\Delta G = \\Delta H - T\\Delta S$), and Equilibrium constants.',
        testType: 'CHEMISTRY',
        durationMinutes: 45,
        totalQuestions: 5,
        marksPerQuestion: 4,
        negativeMarks: 1,
        instructions: 'Standard JEE marking scheme (+4 / -1). Pay careful attention to sign conventions in Thermodynamics.',
        status: 'PUBLISHED',
        createdAt: new Date('2026-08-14T15:00:00Z').toISOString(),
        updatedAt: new Date('2026-08-16T12:00:00Z').toISOString(),
      },
      {
        id: test4Id,
        teacherId,
        teacherName: 'Teacher',
        title: 'Mathematics Calculus & Vectors Sprint',
        description: 'Draft test under construction for upcoming weekend marathon.',
        testType: 'MATHEMATICS',
        durationMinutes: 90,
        totalQuestions: 4,
        marksPerQuestion: 4,
        negativeMarks: 1,
        instructions: 'Focus on definite integration properties and dot/cross product identities.',
        status: 'DRAFT',
        createdAt: new Date('2026-08-18T16:00:00Z').toISOString(),
        updatedAt: new Date('2026-08-19T10:00:00Z').toISOString(),
      },
    ];

    // Seed questions for test 1 (JEE Main Mock 01)
    const questionsSeed: Question[] = [
      // PHYSICS
      {
        id: 'q_test1_p1',
        testId: test1Id,
        subject: 'PHYSICS',
        orderIndex: 1,
        questionText: 'A particle moves along the x-axis with velocity $v(t) = 3t^2 - 12t + 9$ m/s. What is the displacement of the particle between $t = 0$ s and $t = 3$ s?',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Displacement $\\Delta x = \\int_{0}^{3} v(t) dt = \\int_{0}^{3} (3t^2 - 12t + 9) dt = [t^3 - 6t^2 + 9t]_0^3 = (27 - 54 + 27) - 0 = 0$ meters.',
        options: [
          { id: 'opt_p1_a', questionId: 'q_test1_p1', optionLabel: 'A', optionText: '$0\\text{ m}$', orderIndex: 1 },
          { id: 'opt_p1_b', questionId: 'q_test1_p1', optionLabel: 'B', optionText: '$6\\text{ m}$', orderIndex: 2 },
          { id: 'opt_p1_c', questionId: 'q_test1_p1', optionLabel: 'C', optionText: '$18\\text{ m}$', orderIndex: 3 },
          { id: 'opt_p1_d', questionId: 'q_test1_p1', optionLabel: 'D', optionText: '$9\\text{ m}$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_p1_a',
      },
      {
        id: 'q_test1_p2',
        testId: test1Id,
        subject: 'PHYSICS',
        orderIndex: 2,
        questionText: 'An electric dipole of dipole moment $\\vec{p}$ is placed in a uniform electric field $\\vec{E}$. The torque acting on it is given by:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Torque on a dipole in a uniform electric field is $\\vec{\\tau} = \\vec{p} \\times \\vec{E}$. The potential energy is $U = -\\vec{p} \\cdot \\vec{E}$.',
        options: [
          { id: 'opt_p2_a', questionId: 'q_test1_p2', optionLabel: 'A', optionText: '$\\vec{\\tau} = \\vec{p} \\cdot \\vec{E}$', orderIndex: 1 },
          { id: 'opt_p2_b', questionId: 'q_test1_p2', optionLabel: 'B', optionText: '$\\vec{\\tau} = \\vec{p} \\times \\vec{E}$', orderIndex: 2 },
          { id: 'opt_p2_c', questionId: 'q_test1_p2', optionLabel: 'C', optionText: '$\\vec{\\tau} = \\vec{E} \\times \\vec{p}$', orderIndex: 3 },
          { id: 'opt_p2_d', questionId: 'q_test1_p2', optionLabel: 'D', optionText: '$\\vec{\\tau} = 0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_p2_b',
      },
      {
        id: 'q_test1_p3',
        testId: test1Id,
        subject: 'PHYSICS',
        orderIndex: 3,
        questionText: 'A parallel plate capacitor with plate area $A$ and separation $d$ has capacitance $C_0$. If a dielectric slab of dielectric constant $K = 4$ and thickness $t = \\frac{d}{2}$ is inserted, the new capacitance $C$ becomes:',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$C = \\frac{\\varepsilon_0 A}{d - t + \\frac{t}{K}} = \\frac{\\varepsilon_0 A}{d - \\frac{d}{2} + \\frac{d}{8}} = \\frac{\\varepsilon_0 A}{\\frac{5d}{8}} = \\frac{8}{5} C_0 = 1.6 C_0$.',
        options: [
          { id: 'opt_p3_a', questionId: 'q_test1_p3', optionLabel: 'A', optionText: '$\\frac{5}{8} C_0$', orderIndex: 1 },
          { id: 'opt_p3_b', questionId: 'q_test1_p3', optionLabel: 'B', optionText: '$\\frac{8}{5} C_0$', orderIndex: 2 },
          { id: 'opt_p3_c', questionId: 'q_test1_p3', optionLabel: 'C', optionText: '$2 C_0$', orderIndex: 3 },
          { id: 'opt_p3_d', questionId: 'q_test1_p3', optionLabel: 'D', optionText: '$4 C_0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_p3_b',
      },
      {
        id: 'q_test1_p4',
        testId: test1Id,
        subject: 'PHYSICS',
        orderIndex: 4,
        questionText: 'A simple pendulum of length $L$ oscillates with period $T = 2\\pi \\sqrt{\\frac{L}{g}}$. If the pendulum is in an elevator accelerating upwards with acceleration $a = \\frac{g}{3}$, the new time period is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Effective gravity $g_{eff} = g + a = g + \\frac{g}{3} = \\frac{4g}{3}$. New period $T\' = 2\\pi\\sqrt{\\frac{L}{4g/3}} = \\frac{\\sqrt{3}}{2} T$.',
        options: [
          { id: 'opt_p4_a', questionId: 'q_test1_p4', optionLabel: 'A', optionText: '$\\frac{\\sqrt{3}}{2} T$', orderIndex: 1 },
          { id: 'opt_p4_b', questionId: 'q_test1_p4', optionLabel: 'B', optionText: '$\\frac{2}{\\sqrt{3}} T$', orderIndex: 2 },
          { id: 'opt_p4_c', questionId: 'q_test1_p4', optionLabel: 'C', optionText: '$\\frac{\\sqrt{4}}{3} T$', orderIndex: 3 },
          { id: 'opt_p4_d', questionId: 'q_test1_p4', optionLabel: 'D', optionText: '$\\sqrt{3} T$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_p4_a',
      },
      {
        id: 'q_test1_p5',
        testId: test1Id,
        subject: 'PHYSICS',
        orderIndex: 5,
        questionText: 'A block of mass $m = 2\\text{ kg}$ is resting on a rough horizontal surface with coefficient of static friction $\\mu_s = 0.5$. If a force $F = 8\\text{ N}$ is applied horizontally ($g = 10\\text{ m/s}^2$), the frictional force acting on the block is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Maximum static friction $f_{s,\\max} = \\mu_s N = 0.5 \\times (2 \\times 10) = 10\\text{ N}$. Since applied force $F = 8\\text{ N} < 10\\text{ N}$, the block does not move and static friction exactly equals the applied force $8\\text{ N}$.',
        options: [
          { id: 'opt_p5_a', questionId: 'q_test1_p5', optionLabel: 'A', optionText: '$10\\text{ N}$', orderIndex: 1 },
          { id: 'opt_p5_b', questionId: 'q_test1_p5', optionLabel: 'B', optionText: '$8\\text{ N}$', orderIndex: 2 },
          { id: 'opt_p5_c', questionId: 'q_test1_p5', optionLabel: 'C', optionText: '$0\\text{ N}$', orderIndex: 3 },
          { id: 'opt_p5_d', questionId: 'q_test1_p5', optionLabel: 'D', optionText: '$4\\text{ N}$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_p5_b',
      },

      // CHEMISTRY
      {
        id: 'q_test1_c1',
        testId: test1Id,
        subject: 'CHEMISTRY',
        orderIndex: 6,
        questionText: 'According to Molecular Orbital Theory (MOT), which of the following species is paramagnetic and has a bond order of 2.5?',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$O_2^+$ has 15 electrons. Electronic configuration: $\\sigma 1s^2 \\sigma^*1s^2 \\sigma 2s^2 \\sigma^*2s^2 \\sigma 2p_z^2 (\\pi 2p_x^2 = \\pi 2p_y^2) (\\pi^* 2p_x^1)$. Bond order = $(10 - 5)/2 = 2.5$, with 1 unpaired electron (paramagnetic).',
        options: [
          { id: 'opt_c1_a', questionId: 'q_test1_c1', optionLabel: 'A', optionText: '$N_2$', orderIndex: 1 },
          { id: 'opt_c1_b', questionId: 'q_test1_c1', optionLabel: 'B', optionText: '$O_2^+$', orderIndex: 2 },
          { id: 'opt_c1_c', questionId: 'q_test1_c1', optionLabel: 'C', optionText: '$O_2^{2-}$', orderIndex: 3 },
          { id: 'opt_c1_d', questionId: 'q_test1_c1', optionLabel: 'D', optionText: '$N_2^{2-}$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_c1_b',
      },
      {
        id: 'q_test1_c2',
        testId: test1Id,
        subject: 'CHEMISTRY',
        orderIndex: 7,
        questionText: 'For an endothermic reaction where $\\Delta H > 0$ and $\\Delta S > 0$, the reaction is spontaneous when:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Gibbs Free energy is $\\Delta G = \\Delta H - T\\Delta S$. For spontaneity, $\\Delta G < 0 \\implies \\Delta H - T\\Delta S < 0 \\implies T > \\frac{\\Delta H}{\\Delta S}$ (spontaneous at high temperatures).',
        options: [
          { id: 'opt_c2_a', questionId: 'q_test1_c2', optionLabel: 'A', optionText: '$T < \\frac{\\Delta H}{\\Delta S}$', orderIndex: 1 },
          { id: 'opt_c2_b', questionId: 'q_test1_c2', optionLabel: 'B', optionText: '$T > \\frac{\\Delta H}{\\Delta S}$', orderIndex: 2 },
          { id: 'opt_c2_c', questionId: 'q_test1_c2', optionLabel: 'C', optionText: 'At all temperatures', orderIndex: 3 },
          { id: 'opt_c2_d', questionId: 'q_test1_c2', optionLabel: 'D', optionText: 'Never spontaneous', orderIndex: 4 },
        ],
        correctOptionId: 'opt_c2_b',
      },
      {
        id: 'q_test1_c3',
        testId: test1Id,
        subject: 'CHEMISTRY',
        orderIndex: 8,
        questionText: 'The geometry and hybridization of the central iodine atom in $IF_7$ molecule are respectively:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'In $IF_7$, Iodine has 7 valence electrons and forms 7 bond pairs with zero lone pairs. Steric number = 7 $\\implies sp^3d^3$ hybridization with Pentagonal Bipyramidal geometry.',
        options: [
          { id: 'opt_c3_a', questionId: 'q_test1_c3', optionLabel: 'A', optionText: 'Octahedral, $sp^3d^2$', orderIndex: 1 },
          { id: 'opt_c3_b', questionId: 'q_test1_c3', optionLabel: 'B', optionText: 'Pentagonal bipyramidal, $sp^3d^3$', orderIndex: 2 },
          { id: 'opt_c3_c', questionId: 'q_test1_c3', optionLabel: 'C', optionText: 'Trigonal bipyramidal, $sp^3d$', orderIndex: 3 },
          { id: 'opt_c3_d', questionId: 'q_test1_c3', optionLabel: 'D', optionText: 'Square antiprismatic, $d^4sp^3$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_c3_b',
      },
      {
        id: 'q_test1_c4',
        testId: test1Id,
        subject: 'CHEMISTRY',
        orderIndex: 9,
        questionText: 'Which of the following organic compounds will give positive Iodoform test ($CHI_3$ yellow precipitate)?',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Compounds having $CH_3-C=O$ or $CH_3-CH(OH)-$ group give positive iodoform test. Ethanol ($CH_3CH_2OH$) oxidizes to acetaldehyde ($CH_3CHO$) which gives yellow precipitate of $CHI_3$.',
        options: [
          { id: 'opt_c4_a', questionId: 'q_test1_c4', optionLabel: 'A', optionText: 'Methanol ($CH_3OH$)', orderIndex: 1 },
          { id: 'opt_c4_b', questionId: 'q_test1_c4', optionLabel: 'B', optionText: 'Ethanol ($CH_3CH_2OH$)', orderIndex: 2 },
          { id: 'opt_c4_c', questionId: 'q_test1_c4', optionLabel: 'C', optionText: 'Benzaldehyde ($C_6H_5CHO$)', orderIndex: 3 },
          { id: 'opt_c4_d', questionId: 'q_test1_c4', optionLabel: 'D', optionText: 'Formic acid ($HCOOH$)', orderIndex: 4 },
        ],
        correctOptionId: 'opt_c4_b',
      },
      {
        id: 'q_test1_c5',
        testId: test1Id,
        subject: 'CHEMISTRY',
        orderIndex: 10,
        questionText: 'For a first-order chemical reaction with rate constant $k = 6.93 \\times 10^{-3} \\text{ s}^{-1}$, the half-life period $t_{1/2}$ is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693}{6.93 \\times 10^{-3}} = 100 \\text{ seconds}$.',
        options: [
          { id: 'opt_c5_a', questionId: 'q_test1_c5', optionLabel: 'A', optionText: '$100\\text{ s}$', orderIndex: 1 },
          { id: 'opt_c5_b', questionId: 'q_test1_c5', optionLabel: 'B', optionText: '$50\\text{ s}$', orderIndex: 2 },
          { id: 'opt_c5_c', questionId: 'q_test1_c5', optionLabel: 'C', optionText: '$10\\text{ s}$', orderIndex: 3 },
          { id: 'opt_c5_d', questionId: 'q_test1_c5', optionLabel: 'D', optionText: '$200\\text{ s}$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_c5_a',
      },

      // MATHEMATICS
      {
        id: 'q_test1_m1',
        testId: test1Id,
        subject: 'MATHEMATICS',
        orderIndex: 11,
        questionText: 'The value of the definite integral $I = \\int_{0}^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}} \\, dx$ is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Using King\'s property $\\int_a^b f(x)dx = \\int_a^b f(a+b-x)dx$, $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\cos x}}{\\sqrt{\\cos x} + \\sqrt{\\sin x}} dx$. Adding both gives $2I = \\int_0^{\\pi/2} 1 dx = \\frac{\\pi}{2} \\implies I = \\frac{\\pi}{4}$.',
        options: [
          { id: 'opt_m1_a', questionId: 'q_test1_m1', optionLabel: 'A', optionText: '$\\frac{\\pi}{2}$', orderIndex: 1 },
          { id: 'opt_m1_b', questionId: 'q_test1_m1', optionLabel: 'B', optionText: '$\\frac{\\pi}{4}$', orderIndex: 2 },
          { id: 'opt_m1_c', questionId: 'q_test1_m1', optionLabel: 'C', optionText: '$\\pi$', orderIndex: 3 },
          { id: 'opt_m1_d', questionId: 'q_test1_m1', optionLabel: 'D', optionText: '$0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_m1_b',
      },
      {
        id: 'q_test1_m2',
        testId: test1Id,
        subject: 'MATHEMATICS',
        orderIndex: 12,
        questionText: 'If $\\lim_{x \\to 0} \\frac{e^{2x} - 1 - 2x}{x^2} = L$, then the value of $L$ is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Using Taylor series $e^{2x} = 1 + 2x + \\frac{(2x)^2}{2!} + \\dots = 1 + 2x + 2x^2 + O(x^3)$. Thus $\\frac{e^{2x} - 1 - 2x}{x^2} = \\frac{2x^2}{x^2} = 2$.',
        options: [
          { id: 'opt_m2_a', questionId: 'q_test1_m2', optionLabel: 'A', optionText: '$1$', orderIndex: 1 },
          { id: 'opt_m2_b', questionId: 'q_test1_m2', optionLabel: 'B', optionText: '$2$', orderIndex: 2 },
          { id: 'opt_m2_c', questionId: 'q_test1_m2', optionLabel: 'C', optionText: '$4$', orderIndex: 3 },
          { id: 'opt_m2_d', questionId: 'q_test1_m2', optionLabel: 'D', optionText: '$0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_m2_b',
      },
      {
        id: 'q_test1_m3',
        testId: test1Id,
        subject: 'MATHEMATICS',
        orderIndex: 13,
        questionText: 'The distance between the parallel planes $2x - 2y + z + 3 = 0$ and $4x - 4y + 2z + 5 = 0$ is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Rewrite the second plane as $2x - 2y + z + 2.5 = 0$. Distance $d = \\frac{|d_1 - d_2|}{\\sqrt{a^2+b^2+c^2}} = \\frac{|3 - 2.5|}{\\sqrt{2^2+(-2)^2+1^2}} = \\frac{0.5}{3} = \\frac{1}{6}$.',
        options: [
          { id: 'opt_m3_a', questionId: 'q_test1_m3', optionLabel: 'A', optionText: '$\\frac{1}{6}$', orderIndex: 1 },
          { id: 'opt_m3_b', questionId: 'q_test1_m3', optionLabel: 'B', optionText: '$\\frac{1}{3}$', orderIndex: 2 },
          { id: 'opt_m3_c', questionId: 'q_test1_m3', optionLabel: 'C', optionText: '$\\frac{2}{3}$', orderIndex: 3 },
          { id: 'opt_m3_d', questionId: 'q_test1_m3', optionLabel: 'D', optionText: '$\\frac{1}{2}$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_m3_a',
      },
      {
        id: 'q_test1_m4',
        testId: test1Id,
        subject: 'MATHEMATICS',
        orderIndex: 14,
        questionText: 'If the matrix $A = \\begin{pmatrix} 2 & 3 \\\\ 1 & 2 \\end{pmatrix}$, then the value of $\\det(A^{10})$ is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$\\det(A) = (2)(2) - (3)(1) = 4 - 3 = 1$. Therefore $\\det(A^{10}) = (\\det(A))^{10} = 1^{10} = 1$.',
        options: [
          { id: 'opt_m4_a', questionId: 'q_test1_m4', optionLabel: 'A', optionText: '$1$', orderIndex: 1 },
          { id: 'opt_m4_b', questionId: 'q_test1_m4', optionLabel: 'B', optionText: '$10$', orderIndex: 2 },
          { id: 'opt_m4_c', questionId: 'q_test1_m4', optionLabel: 'C', optionText: '$1024$', orderIndex: 3 },
          { id: 'opt_m4_d', questionId: 'q_test1_m4', optionLabel: 'D', optionText: '$0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_m4_a',
      },
      {
        id: 'q_test1_m5',
        testId: test1Id,
        subject: 'MATHEMATICS',
        orderIndex: 15,
        questionText: 'The number of distinct real roots of the equation $x^3 - 3x + 1 = 0$ in the interval $[-2, 2]$ is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Let $f(x) = x^3 - 3x + 1$. $f\'(x) = 3x^2 - 3 = 3(x-1)(x+1)$. Local maximum at $x=-1$, $f(-1) = 3 > 0$. Local minimum at $x=1$, $f(1) = -1 < 0$. Also $f(-2) = -1 < 0$ and $f(2) = 3 > 0$. By IVT, roots exist in $(-2, -1)$, $(-1, 1)$, and $(1, 2)$. Total 3 real roots.',
        options: [
          { id: 'opt_m5_a', questionId: 'q_test1_m5', optionLabel: 'A', optionText: '$1$', orderIndex: 1 },
          { id: 'opt_m5_b', questionId: 'q_test1_m5', optionLabel: 'B', optionText: '$2$', orderIndex: 2 },
          { id: 'opt_m5_c', questionId: 'q_test1_m5', optionLabel: 'C', optionText: '$3$', orderIndex: 3 },
          { id: 'opt_m5_d', questionId: 'q_test1_m5', optionLabel: 'D', optionText: '$0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_m5_c',
      },
    ];

    // Seed questions for test 2 (Physics test)
    const physicsQuestions: Question[] = [
      {
        id: 'q_test2_1',
        testId: test2Id,
        subject: 'PHYSICS',
        orderIndex: 1,
        questionText: 'A particle is projected with velocity $u$ at an angle $\\theta = 45^\\circ$ with the horizontal. The radius of curvature of its trajectory at the highest point is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'At the apex, speed is $v = u\\cos 45^\\circ = \\frac{u}{\\sqrt{2}}$. Centripetal acceleration is $a_n = g$. Radius of curvature $R = \\frac{v^2}{g} = \\frac{u^2}{2g}$.',
        options: [
          { id: 'opt_t2_1a', questionId: 'q_test2_1', optionLabel: 'A', optionText: '$\\frac{u^2}{g}$', orderIndex: 1 },
          { id: 'opt_t2_1b', questionId: 'q_test2_1', optionLabel: 'B', optionText: '$\\frac{u^2}{2g}$', orderIndex: 2 },
          { id: 'opt_t2_1c', questionId: 'q_test2_1', optionLabel: 'C', optionText: '$\\frac{u^2}{4g}$', orderIndex: 3 },
          { id: 'opt_t2_1d', questionId: 'q_test2_1', optionLabel: 'D', optionText: '$\\frac{2u^2}{g}$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_t2_1b',
      },
      {
        id: 'q_test2_2',
        testId: test2Id,
        subject: 'PHYSICS',
        orderIndex: 2,
        questionText: 'Two concentric conducting spherical shells of radii $R_1$ and $R_2$ ($R_1 < R_2$) carry charges $Q_1$ and $Q_2$. The potential at a distance $r$ ($R_1 < r < R_2$) is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$V(r) = \\frac{1}{4\\pi\\varepsilon_0} \\left( \\frac{Q_1}{r} + \\frac{Q_2}{R_2} \\right)$.',
        options: [
          { id: 'opt_t2_2a', questionId: 'q_test2_2', optionLabel: 'A', optionText: '$\\frac{1}{4\\pi\\varepsilon_0}\\left(\\frac{Q_1}{r} + \\frac{Q_2}{R_2}\\right)$', orderIndex: 1 },
          { id: 'opt_t2_2b', questionId: 'q_test2_2', optionLabel: 'B', optionText: '$\\frac{1}{4\\pi\\varepsilon_0}\\left(\\frac{Q_1 + Q_2}{r}\\right)$', orderIndex: 2 },
          { id: 'opt_t2_2c', questionId: 'q_test2_2', optionLabel: 'C', optionText: '$\\frac{1}{4\\pi\\varepsilon_0}\\left(\\frac{Q_1}{R_1} + \\frac{Q_2}{R_2}\\right)$', orderIndex: 3 },
          { id: 'opt_t2_2d', questionId: 'q_test2_2', optionLabel: 'D', optionText: '$0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_t2_2a',
      }
    ];

    // Seed questions for test 3 (Chemistry Chemical Bonding & Thermo)
    const chemistryQuestions: Question[] = [
      {
        id: 'q_test3_1',
        testId: test3Id,
        subject: 'CHEMISTRY',
        orderIndex: 1,
        questionText: 'Which of the following molecules has a square planar geometry according to VSEPR theory?',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$\\text{XeF}_4$ has 8 valence electrons on Xenon: 4 bonding pairs + 2 lone pairs ($sp^3d^2$ hybridization with square planar molecular geometry).',
        options: [
          { id: 'opt_t3_1a', questionId: 'q_test3_1', optionLabel: 'A', optionText: '$\\text{XeF}_4$', orderIndex: 1 },
          { id: 'opt_t3_1b', questionId: 'q_test3_1', optionLabel: 'B', optionText: '$\\text{SF}_4$', orderIndex: 2 },
          { id: 'opt_t3_1c', questionId: 'q_test3_1', optionLabel: 'C', optionText: '$\\text{SiF}_4$', orderIndex: 3 },
          { id: 'opt_t3_1d', questionId: 'q_test3_1', optionLabel: 'D', optionText: '$\\text{BF}_4^-$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_t3_1a',
      },
      {
        id: 'q_test3_2',
        testId: test3Id,
        subject: 'CHEMISTRY',
        orderIndex: 2,
        questionText: 'For a spontaneous process at constant temperature and pressure, the criterion is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'For spontaneity at constant $T$ and $P$, $\\Delta G < 0$ and $\\Delta S_{\\text{total}} > 0$.',
        options: [
          { id: 'opt_t3_2a', questionId: 'q_test3_2', optionLabel: 'A', optionText: '$\\Delta G < 0$', orderIndex: 1 },
          { id: 'opt_t3_2b', questionId: 'q_test3_2', optionLabel: 'B', optionText: '$\\Delta G > 0$', orderIndex: 2 },
          { id: 'opt_t3_2c', questionId: 'q_test3_2', optionLabel: 'C', optionText: '$\\Delta H < 0$', orderIndex: 3 },
          { id: 'opt_t3_2d', questionId: 'q_test3_2', optionLabel: 'D', optionText: '$\\Delta S_{\\text{system}} > 0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_t3_2a',
      },
      {
        id: 'q_test3_3',
        testId: test3Id,
        subject: 'CHEMISTRY',
        orderIndex: 3,
        questionText: 'The bond order of oxygen molecule $\\text{O}_2^+$ is:',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$\\text{O}_2^+$ has 15 electrons. Electronic configuration: $\\sigma_{1s}^2 \\sigma_{1s}^{*2} \\sigma_{2s}^2 \\sigma_{2s}^{*2} \\sigma_{2p_z}^2 (\\pi_{2p_x}^2 = \\pi_{2p_y}^2) (\\pi_{2p_x}^{*1} = \\pi_{2p_y}^{*0})$. Bond order = $\\frac{N_b - N_a}{2} = \\frac{10 - 5}{2} = 2.5$.',
        options: [
          { id: 'opt_t3_3a', questionId: 'q_test3_3', optionLabel: 'A', optionText: '$2.5$', orderIndex: 1 },
          { id: 'opt_t3_3b', questionId: 'q_test3_3', optionLabel: 'B', optionText: '$2.0$', orderIndex: 2 },
          { id: 'opt_t3_3c', questionId: 'q_test3_3', optionLabel: 'C', optionText: '$1.5$', orderIndex: 3 },
          { id: 'opt_t3_3d', questionId: 'q_test3_3', optionLabel: 'D', optionText: '$3.0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_t3_3a',
      }
    ];

    // Seed questions for test 4 (Mathematics Calculus & Vectors)
    const mathQuestions: Question[] = [
      {
        id: 'q_test4_1',
        testId: test4Id,
        subject: 'MATHEMATICS',
        orderIndex: 1,
        questionText: 'Evaluate the definite integral $\\int_{0}^{\\pi/2} \\frac{\\sin x}{\\sin x + \\cos x} \\, dx$:',
        marks: 4,
        negativeMarks: 1,
        solutionText: 'Using property $\\int_0^a f(x) dx = \\int_0^a f(a-x) dx$, $2I = \\int_0^{\\pi/2} 1 \\, dx = \\frac{\\pi}{2} \\implies I = \\frac{\\pi}{4}$.',
        options: [
          { id: 'opt_t4_1a', questionId: 'q_test4_1', optionLabel: 'A', optionText: '$\\frac{\\pi}{4}$', orderIndex: 1 },
          { id: 'opt_t4_1b', questionId: 'q_test4_1', optionLabel: 'B', optionText: '$\\frac{\\pi}{2}$', orderIndex: 2 },
          { id: 'opt_t4_1c', questionId: 'q_test4_1', optionLabel: 'C', optionText: '$\\pi$', orderIndex: 3 },
          { id: 'opt_t4_1d', questionId: 'q_test4_1', optionLabel: 'D', optionText: '$0$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_t4_1a',
      },
      {
        id: 'q_test4_2',
        testId: test4Id,
        subject: 'MATHEMATICS',
        orderIndex: 2,
        questionText: 'If $\\vec{a} = 2\\hat{i} + \\hat{j} - \\hat{k}$ and $\\vec{b} = \\hat{i} - 2\\hat{j} + 3\\hat{k}$, what is $\\vec{a} \\cdot \\vec{b}$?',
        marks: 4,
        negativeMarks: 1,
        solutionText: '$\\vec{a} \\cdot \\vec{b} = (2)(1) + (1)(-2) + (-1)(3) = 2 - 2 - 3 = -3$.',
        options: [
          { id: 'opt_t4_2a', questionId: 'q_test4_2', optionLabel: 'A', optionText: '$-3$', orderIndex: 1 },
          { id: 'opt_t4_2b', questionId: 'q_test4_2', optionLabel: 'B', optionText: '$3$', orderIndex: 2 },
          { id: 'opt_t4_2c', questionId: 'q_test4_2', optionLabel: 'C', optionText: '$5$', orderIndex: 3 },
          { id: 'opt_t4_2d', questionId: 'q_test4_2', optionLabel: 'D', optionText: '$-5$', orderIndex: 4 },
        ],
        correctOptionId: 'opt_t4_2a',
      }
    ];

    this.data.questions = [...questionsSeed, ...physicsQuestions, ...chemistryQuestions, ...mathQuestions];

    // Seed a completed attempt for student 2 (Student 2) on test 1 so teachers have real analytics immediately
    const attempt1Id = 'attempt_seed_01';
    this.data.attempts = [
      {
        id: attempt1Id,
        testId: test1Id,
        testTitle: 'JEE Main Mock 01 Full Test (All Subjects)',
        testType: 'JEE_MAIN_FULL',
        durationMinutes: 180,
        studentId: student2Id,
        studentName: 'Student 2',
        studentEmail: 'priya@edustack.com',
        startTime: new Date('2026-08-16T10:00:00Z').toISOString(),
        submittedAt: new Date('2026-08-16T12:45:00Z').toISOString(),
        timeTakenSeconds: 9900,
        status: 'SUBMITTED',
        totalScore: 48,
        maxScore: 60,
        totalCorrect: 12,
        totalIncorrect: 2,
        totalUnanswered: 1,
        accuracy: 85.7,
        answers: {
          'q_test1_p1': { questionId: 'q_test1_p1', selectedOptionId: 'opt_p1_a', status: 'ANSWERED', timeSpentSeconds: 180, isCorrect: true, marksAwarded: 4 },
          'q_test1_p2': { questionId: 'q_test1_p2', selectedOptionId: 'opt_p2_b', status: 'ANSWERED', timeSpentSeconds: 90, isCorrect: true, marksAwarded: 4 },
          'q_test1_p3': { questionId: 'q_test1_p3', selectedOptionId: 'opt_p3_b', status: 'ANSWERED', timeSpentSeconds: 210, isCorrect: true, marksAwarded: 4 },
          'q_test1_p4': { questionId: 'q_test1_p4', selectedOptionId: 'opt_p4_a', status: 'ANSWERED', timeSpentSeconds: 150, isCorrect: true, marksAwarded: 4 },
          'q_test1_p5': { questionId: 'q_test1_p5', selectedOptionId: 'opt_p5_a', status: 'ANSWERED', timeSpentSeconds: 120, isCorrect: false, marksAwarded: -1 },
          'q_test1_c1': { questionId: 'q_test1_c1', selectedOptionId: 'opt_c1_b', status: 'ANSWERED', timeSpentSeconds: 140, isCorrect: true, marksAwarded: 4 },
          'q_test1_c2': { questionId: 'q_test1_c2', selectedOptionId: 'opt_c2_b', status: 'ANSWERED', timeSpentSeconds: 80, isCorrect: true, marksAwarded: 4 },
          'q_test1_c3': { questionId: 'q_test1_c3', selectedOptionId: 'opt_c3_b', status: 'ANSWERED', timeSpentSeconds: 100, isCorrect: true, marksAwarded: 4 },
          'q_test1_c4': { questionId: 'q_test1_c4', selectedOptionId: 'opt_c4_b', status: 'ANSWERED', timeSpentSeconds: 95, isCorrect: true, marksAwarded: 4 },
          'q_test1_c5': { questionId: 'q_test1_c5', selectedOptionId: 'opt_c5_a', status: 'ANSWERED', timeSpentSeconds: 70, isCorrect: true, marksAwarded: 4 },
          'q_test1_m1': { questionId: 'q_test1_m1', selectedOptionId: 'opt_m1_b', status: 'ANSWERED', timeSpentSeconds: 240, isCorrect: true, marksAwarded: 4 },
          'q_test1_m2': { questionId: 'q_test1_m2', selectedOptionId: 'opt_m2_b', status: 'ANSWERED', timeSpentSeconds: 190, isCorrect: true, marksAwarded: 4 },
          'q_test1_m3': { questionId: 'q_test1_m3', selectedOptionId: 'opt_m3_a', status: 'ANSWERED', timeSpentSeconds: 220, isCorrect: true, marksAwarded: 4 },
          'q_test1_m4': { questionId: 'q_test1_m4', selectedOptionId: 'opt_m4_b', status: 'ANSWERED', timeSpentSeconds: 160, isCorrect: false, marksAwarded: -1 },
          'q_test1_m5': { questionId: 'q_test1_m5', selectedOptionId: undefined, status: 'NOT_ANSWERED', timeSpentSeconds: 80, isCorrect: false, marksAwarded: 0 },
        },
        subjectStats: {
          PHYSICS: { subject: 'PHYSICS', totalQuestions: 5, attempted: 5, correct: 4, incorrect: 1, score: 15, maxScore: 20, accuracy: 80 },
          CHEMISTRY: { subject: 'CHEMISTRY', totalQuestions: 5, attempted: 5, correct: 5, incorrect: 0, score: 20, maxScore: 20, accuracy: 100 },
          MATHEMATICS: { subject: 'MATHEMATICS', totalQuestions: 5, attempted: 4, correct: 3, incorrect: 1, score: 11, maxScore: 20, accuracy: 75 },
          GENERAL: { subject: 'GENERAL', totalQuestions: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0, accuracy: 0 }
        }
      }
    ];
  }

  // --- USER METHODS ---
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getAllUsers(): User[] {
    return this.data.users;
  }

  public getUsersByRole(role: User['role']): User[] {
    return this.data.users.filter(u => u.role === role);
  }

  /**
   * Create or update a EduStack user profile from a verified Firebase Authentication
   * identity. This is called after the backend has verified a Firebase ID token, so the
   * uid/email here are already authenticated - this method just keeps our profile
   * (role/status) in sync. It never re-authenticates or trusts client-supplied roles for
   * an existing user.
   */
  public upsertUserFromFirebase(profile: {
    uid: string;
    email: string;
    name: string;
    role: User['role'];
    status: User['status'];
  }): User {
    const existingIdx = this.data.users.findIndex(u => u.id === profile.uid);
    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      // Existing profile: never let a registration/sync call silently change role or status.
      // Those are only mutated via explicit admin actions (see updateUserStatus).
      return this.data.users[existingIdx];
    }

    const newUser: User = {
      id: profile.uid,
      email: profile.email.trim().toLowerCase(),
      name: profile.name.trim(),
      role: profile.role,
      status: profile.status,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newUser);
    this.save();
    this.persistLive('live_users', newUser.id, newUser);
    return newUser;
  }

  public updateUserStatus(id: string, status: User['status']): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = {
      ...this.data.users[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    this.persistLive('live_users', id, this.data.users[idx]);
    return this.data.users[idx];
  }

  /**
   * Forcibly promotes (or creates) a profile as Admin/ACTIVE. Unlike upsertUserFromFirebase,
   * this DOES overwrite an existing profile's role/status. Only ever called from the trusted
   * setAdminClaim.ts bootstrap script and the auto-heal check in authenticate() - never from
   * a public route - since it's the one place we intentionally want role escalation.
   */
  public promoteToAdmin(profile: { uid: string; email: string; name: string }): User {
    const existingIdx = this.data.users.findIndex(u => u.id === profile.uid);
    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      this.data.users[existingIdx] = {
        ...this.data.users[existingIdx],
        role: 'ADMIN',
        status: 'ACTIVE',
        updatedAt: now,
      };
      this.save();
      this.persistLive('live_users', this.data.users[existingIdx].id, this.data.users[existingIdx]);
      return this.data.users[existingIdx];
    }

    const newUser: User = {
      id: profile.uid,
      email: profile.email.trim().toLowerCase(),
      name: profile.name.trim(),
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newUser);
    this.save();
    this.persistLive('live_users', newUser.id, newUser);
    return newUser;
  }

  public getAdminOverview() {
    const teachers = this.getUsersByRole('TEACHER');
    const students = this.getUsersByRole('STUDENT');
    return {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'ACTIVE').length,
      suspendedStudents: students.filter(s => s.status === 'SUSPENDED').length,
      totalTeachers: teachers.length,
      activeTeachers: teachers.filter(t => t.status === 'APPROVED').length,
      pendingTeachers: teachers.filter(t => t.status === 'PENDING').length,
      rejectedTeachers: teachers.filter(t => t.status === 'REJECTED').length,
      suspendedTeachers: teachers.filter(t => t.status === 'SUSPENDED').length,
      totalTests: this.data.tests.length,
    };
  }

  // --- TEST METHODS ---
  public getAllTests(): Test[] {
    return this.data.tests.map(t => {
      const qCount = this.data.questions.filter(q => q.testId === t.id).length;
      const aCount = this.data.attempts.filter(a => a.testId === t.id && a.status === 'SUBMITTED').length;
      return { ...t, questionCount: qCount, attemptCount: aCount };
    });
  }

  public getPublishedTests(): Test[] {
    return this.getAllTests().filter(t => t.status === 'PUBLISHED');
  }

  public getTestById(id: string): Test | undefined {
    const test = this.data.tests.find(t => t.id === id);
    if (!test) return undefined;
    const questions = this.getQuestionsByTestId(id);
    const aCount = this.data.attempts.filter(a => a.testId === id && a.status === 'SUBMITTED').length;
    return {
      ...test,
      questions,
      questionCount: questions.length,
      attemptCount: aCount,
    };
  }

  public createTest(test: Test): Test {
    this.data.tests.push(test);
    this.save();
    return test;
  }

  public updateTest(id: string, updates: Partial<Test>): Test | undefined {
    const idx = this.data.tests.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.data.tests[idx] = {
      ...this.data.tests[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.tests[idx];
  }

  public deleteTest(id: string): boolean {
    const initLen = this.data.tests.length;
    this.data.tests = this.data.tests.filter(t => t.id !== id);
    this.data.questions = this.data.questions.filter(q => q.testId !== id);
    this.data.attempts = this.data.attempts.filter(a => a.testId !== id);
    this.save();
    return this.data.tests.length < initLen;
  }

  public duplicateTest(testId: string, teacherId: string): Test | undefined {
    const original = this.getTestById(testId);
    if (!original) return undefined;

    const newTestId = 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const duplicatedTest: Test = {
      ...original,
      id: newTestId,
      teacherId,
      title: `${original.title} (Copy)`,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questionCount: original.questions?.length || 0,
      attemptCount: 0,
    };

    this.data.tests.push(duplicatedTest);

    // Duplicate questions and options
    if (original.questions && original.questions.length > 0) {
      for (const q of original.questions) {
        const newQId = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const newOptions: QuestionOption[] = (q.options || []).map((opt) => ({
          ...opt,
          id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          questionId: newQId,
        }));

        let newCorrectId: string | undefined = undefined;
        if (q.correctOptionId) {
          const oldCorrectIdx = q.options.findIndex(o => o.id === q.correctOptionId);
          if (oldCorrectIdx !== -1 && newOptions[oldCorrectIdx]) {
            newCorrectId = newOptions[oldCorrectIdx].id;
          }
        }

        const duplicatedQ: Question = {
          ...q,
          id: newQId,
          testId: newTestId,
          options: newOptions,
          correctOptionId: newCorrectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.data.questions.push(duplicatedQ);
      }
    }

    this.save();
    return this.getTestById(newTestId);
  }

  // --- TEST FOLDER METHODS ---
  public getFoldersByTeacher(teacherId: string): TestFolder[] {
    return this.data.testFolders.filter(f => f.teacherId === teacherId);
  }

  public getFolderById(id: string): TestFolder | undefined {
    return this.data.testFolders.find(f => f.id === id);
  }

  public createFolder(folder: TestFolder): TestFolder {
    this.data.testFolders.push(folder);
    this.save();
    return folder;
  }

  // True if `targetId` is `folderId` itself or one of its ancestors - i.e. moving
  // `folderId` to become a child of `targetId` would create a cycle.
  private isFolderOrAncestor(folderId: string, targetId: string): boolean {
    let current: string | null | undefined = targetId;
    const visited = new Set<string>();
    while (current) {
      if (current === folderId) return true;
      if (visited.has(current)) break; // guard against any pre-existing corrupt cycle
      visited.add(current);
      current = this.getFolderById(current)?.parentId ?? null;
    }
    return false;
  }

  public updateFolder(
    id: string,
    updates: { name?: string; parentId?: string | null }
  ): TestFolder | undefined | 'CYCLE' {
    const idx = this.data.testFolders.findIndex(f => f.id === id);
    if (idx === -1) return undefined;

    if (updates.parentId !== undefined && updates.parentId !== null) {
      if (updates.parentId === id || this.isFolderOrAncestor(id, updates.parentId)) {
        return 'CYCLE';
      }
    }

    this.data.testFolders[idx] = {
      ...this.data.testFolders[idx],
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.parentId !== undefined ? { parentId: updates.parentId } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.testFolders[idx];
  }

  // Deleting a folder never deletes its contents - subfolders and tests inside it are
  // relocated up to the deleted folder's own parent (or the root), so nothing is lost.
  public deleteFolder(id: string): boolean {
    const folder = this.getFolderById(id);
    if (!folder) return false;

    const parentId = folder.parentId ?? null;

    this.data.testFolders.forEach(f => {
      if (f.parentId === id) f.parentId = parentId;
    });
    this.data.tests.forEach(t => {
      if (t.folderId === id) t.folderId = parentId;
    });

    this.data.testFolders = this.data.testFolders.filter(f => f.id !== id);
    this.save();
    return true;
  }

  // --- QUESTION METHODS ---
  public getQuestionsByTestId(testId: string): Question[] {
    return this.data.questions
      .filter(q => q.testId === testId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getQuestionById(id: string): Question | undefined {
    return this.data.questions.find(q => q.id === id);
  }

  public createQuestion(question: Question): Question {
    this.data.questions.push(question);
    this.reindexTestQuestions(question.testId);
    this.save();
    return question;
  }

  public updateQuestion(id: string, updates: Partial<Question>): Question | undefined {
    const idx = this.data.questions.findIndex(q => q.id === id);
    if (idx === -1) return undefined;
    this.data.questions[idx] = {
      ...this.data.questions[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.questions[idx];
  }

  public deleteQuestion(id: string): boolean {
    const q = this.getQuestionById(id);
    if (!q) return false;
    const testId = q.testId;
    this.data.questions = this.data.questions.filter(item => item.id !== id);
    this.reindexTestQuestions(testId);
    this.save();
    return true;
  }

  public duplicateQuestion(questionId: string): Question | undefined {
    const original = this.getQuestionById(questionId);
    if (!original) return undefined;

    const newQId = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newOptions: QuestionOption[] = (original.options || []).map((opt) => ({
      ...opt,
      id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      questionId: newQId,
    }));

    let newCorrectId: string | undefined = undefined;
    if (original.correctOptionId) {
      const oldIdx = original.options.findIndex(o => o.id === original.correctOptionId);
      if (oldIdx !== -1 && newOptions[oldIdx]) {
        newCorrectId = newOptions[oldIdx].id;
      }
    }

    const newQ: Question = {
      ...original,
      id: newQId,
      orderIndex: original.orderIndex + 1,
      options: newOptions,
      correctOptionId: newCorrectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // shift subsequent questions
    this.data.questions
      .filter(q => q.testId === original.testId && q.orderIndex > original.orderIndex)
      .forEach(q => {
        q.orderIndex += 1;
      });

    this.data.questions.push(newQ);
    this.reindexTestQuestions(original.testId);
    this.save();
    return newQ;
  }

  public reorderQuestions(testId: string, orderedQuestionIds: string[]): Question[] {
    orderedQuestionIds.forEach((id, index) => {
      const q = this.data.questions.find(item => item.id === id && item.testId === testId);
      if (q) {
        q.orderIndex = index + 1;
      }
    });
    this.save();
    return this.getQuestionsByTestId(testId);
  }

  private reindexTestQuestions(testId: string) {
    const testQs = this.getQuestionsByTestId(testId);
    testQs.forEach((q, idx) => {
      q.orderIndex = idx + 1;
    });
    // Update test totalQuestions count and questionCount
    const t = this.data.tests.find(item => item.id === testId);
    if (t) {
      t.totalQuestions = testQs.length;
      t.questionCount = testQs.length;
      t.updatedAt = new Date().toISOString();
    }
  }

  // --- ATTEMPT METHODS ---
  public createAttempt(attempt: TestAttempt): TestAttempt {
    this.data.attempts.push(attempt);
    this.save();
    this.persistLive('live_attempts', attempt.id, attempt);
    return attempt;
  }

  public getAttemptById(id: string): TestAttempt | undefined {
    return this.data.attempts.find(a => a.id === id);
  }

  public getActiveAttempt(studentId: string, testId: string): TestAttempt | undefined {
    return this.data.attempts.find(
      a => a.studentId === studentId && a.testId === testId && a.status === 'IN_PROGRESS'
    );
  }

  public getStudentAttempts(studentId: string): TestAttempt[] {
    return this.data.attempts.filter(a => a.studentId === studentId);
  }

  public getAllAttempts(): TestAttempt[] {
    return this.data.attempts;
  }

  public getTestAttempts(testId: string): TestAttempt[] {
    return this.data.attempts.filter(a => a.testId === testId && a.status === 'SUBMITTED');
  }

  public updateAttempt(id: string, updates: Partial<TestAttempt>): TestAttempt | undefined {
    const idx = this.data.attempts.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    this.data.attempts[idx] = {
      ...this.data.attempts[idx],
      ...updates,
    };
    this.save();
    this.persistLive('live_attempts', id, this.data.attempts[idx]);
    return this.data.attempts[idx];
  }

  public getTeacherStats(teacherId: string): {
    totalTests: number;
    publishedTests: number;
    draftTests: number;
    totalStudents: number;
    totalAttempts: number;
  } {
    const teacherTests = this.data.tests.filter(t => t.teacherId === teacherId);
    const testIds = new Set(teacherTests.map(t => t.id));
    const published = teacherTests.filter(t => t.status === 'PUBLISHED').length;
    const draft = teacherTests.filter(t => t.status === 'DRAFT').length;

    const attempts = this.data.attempts.filter(a => testIds.has(a.testId) && a.status === 'SUBMITTED');
    const studentIds = new Set(attempts.map(a => a.studentId));

    return {
      totalTests: teacherTests.length,
      publishedTests: published,
      draftTests: draft,
      totalStudents: studentIds.size || this.data.users.filter(u => u.role === 'STUDENT').length,
      totalAttempts: attempts.length,
    };
  }

  // --- SMART ERROR NOTES METHODS ---
  public getErrorNotesByAttemptId(attemptId: string): AttemptErrorNotes | undefined {
    return this.data.errorNotes.find(en => en.attemptId === attemptId);
  }

  public getErrorNotesById(id: string): AttemptErrorNotes | undefined {
    return this.data.errorNotes.find(en => en.id === id);
  }

  public getStudentErrorNotes(studentId: string): AttemptErrorNotes[] {
    return this.data.errorNotes.filter(en => en.studentId === studentId);
  }

  public saveErrorNotes(payload: {
    attemptId: string;
    testId: string;
    studentId: string;
    currentQuestionIndex?: number;
    notes: Record<string, QuestionErrorNote>;
    isFullyCompleted?: boolean;
  }): AttemptErrorNotes {
    const existingIdx = this.data.errorNotes.findIndex(en => en.attemptId === payload.attemptId);
    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      const existing = this.data.errorNotes[existingIdx];
      // Merge question notes safely to avoid older overwrite
      const mergedNotes = {
        ...existing.notes,
        ...payload.notes,
      };

      const updated: AttemptErrorNotes = {
        ...existing,
        currentQuestionIndex:
          payload.currentQuestionIndex !== undefined
            ? payload.currentQuestionIndex
            : existing.currentQuestionIndex,
        notes: mergedNotes,
        updatedAt: now,
        isFullyCompleted: payload.isFullyCompleted ?? existing.isFullyCompleted,
        completedAt: payload.isFullyCompleted ? (existing.completedAt || now) : existing.completedAt,
      };

      this.data.errorNotes[existingIdx] = updated;
      this.save();
      this.persistLive('live_errorNotes', updated.id, updated);
      return updated;
    }

    const newRecord: AttemptErrorNotes = {
      id: 'en_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      attemptId: payload.attemptId,
      testId: payload.testId,
      studentId: payload.studentId,
      currentQuestionIndex: payload.currentQuestionIndex || 0,
      notes: payload.notes || {},
      createdAt: now,
      updatedAt: now,
      isFullyCompleted: payload.isFullyCompleted || false,
      completedAt: payload.isFullyCompleted ? now : undefined,
    };

    this.data.errorNotes.push(newRecord);
    this.save();
    this.persistLive('live_errorNotes', newRecord.id, newRecord);
    return newRecord;
  }

  // --- TODO & TIME PLANNER METHODS ---
  private seedPlannerTasks() {
    const now = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const getDateStr = (offsetDays: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const getDayName = (offsetDays: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return daysOfWeek[d.getDay()];
    };

    const studentId = 'user_student_1';

    const sampleTasks: PlannerTask[] = [
      // TODAY'S TASKS (LIVE SCHEDULE)
      {
        id: 'task_today_1',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Solve 50 questions in Electrostatics (Coulomb Law & Field)',
        date: getDateStr(0),
        day: getDayName(0),
        startTime: '09:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 60,
        priority: 'HIGH',
        status: 'COMPLETED',
        startedAt: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
        completedAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
        secondsElapsed: 3600,
        reflection: {
          distractions: 'Brief 5-min phone notification check around question 25.',
          difficulties: 'Flux calculation through truncated cones required double check.',
          improvements: 'Memorize direct shortcut formula for charged hemispherical shells.',
          notes: 'Great focus overall; solved 46/50 questions correctly on first try.',
          distractionTags: ['Phone / Social Media', 'Tricky Formulas'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task_today_2',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Organic Chemistry: Reaction Mechanisms & Named Reactions',
        date: getDateStr(0),
        day: getDayName(0),
        startTime: '11:00',
        plannedDurationMinutes: 45,
        actualDurationMinutes: 50,
        priority: 'HIGH',
        status: 'CONTINUED',
        startedAt: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
        secondsElapsed: 3000,
        continuedCount: 1,
        reflection: {
          distractions: 'Noise from outside during Aldol condensation section.',
          difficulties: 'Cannizzaro vs Cross-Cannizzaro hydride transfer rate comparison.',
          improvements: 'Write mechanisms on whiteboard twice without looking at notes.',
          notes: 'Continued for 5 extra minutes to finish Pinacol-Pinacolone rearrangement.',
          distractionTags: ['Noise / Environment', 'Concept Confusion'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task_today_3',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Calculus: Definite Integration by Substitution & King Rule',
        date: getDateStr(0),
        day: getDayName(0),
        startTime: '14:30',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 0,
        priority: 'URGENT',
        status: 'UPCOMING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task_today_4',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Full JEE Main Mock Test Error Notes Revision',
        date: getDateStr(0),
        day: getDayName(0),
        startTime: '17:00',
        plannedDurationMinutes: 45,
        actualDurationMinutes: 0,
        priority: 'MEDIUM',
        status: 'UPCOMING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // YESTERDAY (DAY -1)
      {
        id: 'task_hist_1',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Rotational Motion: Moment of Inertia & Rolling without slipping',
        date: getDateStr(-1),
        day: getDayName(-1),
        startTime: '08:30',
        plannedDurationMinutes: 75,
        actualDurationMinutes: 75,
        priority: 'URGENT',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86400000 + 4500000).toISOString(),
        secondsElapsed: 4500,
        reflection: {
          distractions: 'None. Kept phone in another room.',
          difficulties: 'Instantaneous axis of rotation questions.',
          improvements: 'Practice 10 more problems on inclined plane with hollow sphere.',
          notes: 'Completed in target 75 mins.',
          distractionTags: [],
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'task_hist_2',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Coordination Chemistry: Crystal Field Theory & Isomerism',
        date: getDateStr(-1),
        day: getDayName(-1),
        startTime: '11:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 60,
        priority: 'HIGH',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86400000 + 3600000).toISOString(),
        secondsElapsed: 3600,
        reflection: {
          distractions: 'Felt slight afternoon fatigue.',
          difficulties: 'Octahedral vs Tetrahedral splitting energy formula Delta_t = 4/9 Delta_o.',
          improvements: 'Review spectrochemical series mnemonics.',
          notes: 'Covered all optical isomerism examples.',
          distractionTags: ['Fatigue / Sleep'],
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'task_hist_3',
        studentId: studentId,
        studentName: 'Student 1',
        title: '3D Geometry: Shortest Distance Between Skew Lines',
        date: getDateStr(-1),
        day: getDayName(-1),
        startTime: '15:00',
        plannedDurationMinutes: 50,
        actualDurationMinutes: 65,
        priority: 'MEDIUM',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86400000 + 3900000).toISOString(),
        secondsElapsed: 3900,
        reflection: {
          distractions: 'Wandered off on unrelated video for 10 mins.',
          difficulties: 'Vector triple product simplification.',
          improvements: 'Keep timer strictly visible on screen.',
          notes: 'Exceeded planned time by 15 mins but understood concept completely.',
          distractionTags: ['Phone / Social Media', 'Procrastination'],
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },

      // DAY -2
      {
        id: 'task_hist_4',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Modern Physics: Photoelectric Effect & De Broglie Wavelength',
        date: getDateStr(-2),
        day: getDayName(-2),
        startTime: '09:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 55,
        priority: 'HIGH',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 172800000).toISOString(),
        completedAt: new Date(Date.now() - 172800000 + 3300000).toISOString(),
        secondsElapsed: 3300,
        reflection: {
          distractions: 'None, high energy morning.',
          difficulties: 'Stopping potential vs frequency graph slope calculation.',
          improvements: 'Remember slope is h/e regardless of metal type.',
          notes: 'Finished 5 mins before planned timer.',
          distractionTags: [],
        },
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: 'task_hist_5',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Thermodynamics: Carnot Cycle & Entropy Numerical Practice',
        date: getDateStr(-2),
        day: getDayName(-2),
        startTime: '14:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 0,
        priority: 'MEDIUM',
        status: 'NOT_COMPLETED',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },

      // DAY -3
      {
        id: 'task_hist_6',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Matrices & Determinants: Cramer Rule & Adjoint Properties',
        date: getDateStr(-3),
        day: getDayName(-3),
        startTime: '10:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 60,
        priority: 'HIGH',
        status: 'COMPLETED',
        reflection: {
          distractions: 'Minor room interruptions.',
          difficulties: 'Complex determinant expansion properties.',
          improvements: 'Practice 20 speed arithmetic problems.',
          notes: 'Solid understanding achieved.',
          distractionTags: ['Noise / Environment'],
        },
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        id: 'task_hist_7',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Ray Optics: Prism Dispersion & Lens Maker Equation',
        date: getDateStr(-3),
        day: getDayName(-3),
        startTime: '15:30',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 60,
        priority: 'HIGH',
        status: 'COMPLETED',
        reflection: {
          distractions: 'None.',
          difficulties: 'Sign convention for silvered spherical lenses.',
          improvements: 'Always draw ray diagram first.',
          notes: 'Very productive study block.',
          distractionTags: [],
        },
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString(),
      },

      // DAY -4
      {
        id: 'task_hist_8',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Chemical Kinetics: Arrhenius Equation & First Order Half Life',
        date: getDateStr(-4),
        day: getDayName(-4),
        startTime: '09:30',
        plannedDurationMinutes: 50,
        actualDurationMinutes: 50,
        priority: 'MEDIUM',
        status: 'COMPLETED',
        reflection: {
          distractions: 'None.',
          difficulties: 'Log calculations without calculator.',
          improvements: 'Memorize log 2, log 3, log 5, log 7 values.',
          notes: 'Mastered graphical representations.',
          distractionTags: [],
        },
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 345600000).toISOString(),
      },
      {
        id: 'task_hist_9',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Probability: Bayes Theorem & Binomial Distribution',
        date: getDateStr(-4),
        day: getDayName(-4),
        startTime: '14:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 70,
        priority: 'URGENT',
        status: 'COMPLETED',
        reflection: {
          distractions: 'Overthinking question wording.',
          difficulties: 'Conditional probability sample space reductions.',
          improvements: 'Draw tree diagrams for Bayes theorem.',
          notes: 'Took 10 extra mins to ensure thorough clarity.',
          distractionTags: ['Concept Confusion'],
        },
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 345600000).toISOString(),
      },

      // DAY -5
      {
        id: 'task_hist_10',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Current Electricity: Kirchhoff Laws & Wheatstone Bridge',
        date: getDateStr(-5),
        day: getDayName(-5),
        startTime: '10:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 60,
        priority: 'HIGH',
        status: 'COMPLETED',
        reflection: {
          distractions: 'Phone notification at start of session.',
          difficulties: 'Nodal voltage method in symmetry circuits.',
          improvements: 'Switch phone to Do Not Disturb.',
          notes: 'Practiced 20 circuit questions.',
          distractionTags: ['Phone / Social Media'],
        },
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        updatedAt: new Date(Date.now() - 432000000).toISOString(),
      },

      // DAY -6
      {
        id: 'task_hist_11',
        studentId: studentId,
        studentName: 'Student 1',
        title: 'Complex Numbers: Geometry of Argand Plane & De Moivre Theorem',
        date: getDateStr(-6),
        day: getDayName(-6),
        startTime: '11:00',
        plannedDurationMinutes: 60,
        actualDurationMinutes: 60,
        priority: 'URGENT',
        status: 'COMPLETED',
        reflection: {
          distractions: 'None.',
          difficulties: 'Locus of |z - z1| / |z - z2| = k (Circle of Apollonius).',
          improvements: 'Practice locus problems on graph paper.',
          notes: 'Strong algebraic mastery.',
          distractionTags: [],
        },
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        updatedAt: new Date(Date.now() - 518400000).toISOString(),
      },
    ];

    this.data.plannerTasks = sampleTasks;
  }

  public getPlannerTasksByStudent(
    studentId: string,
    options?: { date?: string; startDate?: string; endDate?: string }
  ): PlannerTask[] {
    let list = this.data.plannerTasks.filter(t => t.studentId === studentId);

    if (options?.date) {
      list = list.filter(t => t.date === options.date);
    }
    if (options?.startDate && options?.endDate) {
      list = list.filter(t => t.date >= options.startDate! && t.date <= options.endDate!);
    }

    // Sort chronologically by date ASC, then startTime ASC
    return list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }

  public getPlannerTaskById(taskId: string): PlannerTask | undefined {
    return this.data.plannerTasks.find(t => t.id === taskId);
  }

  public createPlannerTask(taskData: {
    studentId: string;
    studentName?: string;
    title: string;
    date?: string;
    day?: string;
    startTime: string;
    plannedDurationMinutes: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }): PlannerTask {
    const now = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const dateStr = taskData.date || now.toISOString().split('T')[0];
    let dayStr = taskData.day;
    if (!dayStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        dayStr = daysOfWeek[d.getDay()];
      } else {
        dayStr = daysOfWeek[now.getDay()];
      }
    }

    const newTask: PlannerTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      studentId: taskData.studentId,
      studentName: taskData.studentName,
      title: taskData.title.trim(),
      date: dateStr,
      day: dayStr,
      startTime: taskData.startTime || '09:00',
      plannedDurationMinutes: Math.max(1, Number(taskData.plannedDurationMinutes) || 30),
      actualDurationMinutes: 0,
      priority: taskData.priority || 'MEDIUM',
      status: 'UPCOMING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.data.plannerTasks.push(newTask);
    this.save();
    return newTask;
  }

  public updatePlannerTask(
    taskId: string,
    studentId: string,
    updates: Partial<PlannerTask>
  ): PlannerTask | null {
    const idx = this.data.plannerTasks.findIndex(t => t.id === taskId && t.studentId === studentId);
    if (idx === -1) return null;

    const existing = this.data.plannerTasks[idx];
    const now = new Date().toISOString();

    const updatedTask: PlannerTask = {
      ...existing,
      ...updates,
      reflection: updates.reflection !== undefined
        ? { ...(existing.reflection || {}), ...updates.reflection }
        : existing.reflection,
      updatedAt: now,
    };

    this.data.plannerTasks[idx] = updatedTask;
    this.save();
    return updatedTask;
  }

  public deletePlannerTask(taskId: string, studentId?: string): boolean {
    const initialLen = this.data.plannerTasks.length;
    this.data.plannerTasks = this.data.plannerTasks.filter(
      t => t.id !== taskId
    );
    if (this.data.plannerTasks.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public getPlannerAnalytics(studentId: string, clientDate?: string): PlannerAnalytics {
    const now = new Date();
    const targetDate = clientDate || now.toISOString().split('T')[0];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const allStudentTasks = this.data.plannerTasks.filter(t => t.studentId === studentId);

    // 1. TODAY SUMMARY
    const todayTasks = allStudentTasks.filter(t => t.date === targetDate);
    const todayCompleted = todayTasks.filter(t => t.status === 'COMPLETED');
    const todayMissed = todayTasks.filter(t => t.status === 'NOT_COMPLETED');
    const todayContinued = todayTasks.filter(t => t.status === 'CONTINUED');
    const todayPlannedMins = todayTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
    const todayActualMins = todayTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);
    const todayOnTime = todayCompleted.filter(
      t => (t.actualDurationMinutes || 0) <= (t.plannedDurationMinutes || 0)
    ).length;
    const todayLateOrContinued = todayCompleted.filter(
      t => (t.actualDurationMinutes || 0) > (t.plannedDurationMinutes || 0)
    ).length + todayContinued.length;

    const todayReflections = todayTasks
      .filter(t => t.reflection && (t.reflection.distractions || t.reflection.difficulties || t.reflection.improvements || t.reflection.notes || (t.reflection.distractionTags && t.reflection.distractionTags.length > 0)))
      .map(t => ({
        taskId: t.id,
        taskTitle: t.title,
        reflection: t.reflection!,
      }));

    const todayDistractionsList: string[] = [];
    todayTasks.forEach(t => {
      if (t.reflection?.distractionTags) {
        todayDistractionsList.push(...t.reflection.distractionTags);
      }
      if (t.reflection?.distractions && !todayDistractionsList.includes(t.reflection.distractions)) {
        todayDistractionsList.push(t.reflection.distractions);
      }
    });

    const targetDateObj = new Date(targetDate);
    const todayDayName = daysOfWeek[targetDateObj.getDay()] || 'Today';

    const todaySummary: DayProgressSummary = {
      date: targetDate,
      day: todayDayName,
      totalTasks: todayTasks.length,
      completedTasks: todayCompleted.length,
      notCompletedTasks: todayMissed.length,
      continuedTasks: todayContinued.length,
      completionPercentage: todayTasks.length > 0 ? Math.round((todayCompleted.length / todayTasks.length) * 100) : 0,
      plannedStudyMinutes: todayPlannedMins,
      actualStudyMinutes: todayActualMins,
      completedOnTimeCount: todayOnTime,
      lateOrContinuedCount: todayLateOrContinued,
      reflections: todayReflections,
      distractionsList: Array.from(new Set(todayDistractionsList)),
    };

    // 2. WEEKLY SUMMARY (Last 7 Days)
    const weekStartObj = new Date(targetDateObj);
    weekStartObj.setDate(targetDateObj.getDate() - 6);
    const weekStartDateStr = weekStartObj.toISOString().split('T')[0];

    const weekTasks = allStudentTasks.filter(
      t => t.date >= weekStartDateStr && t.date <= targetDate
    );

    const weekCompleted = weekTasks.filter(t => t.status === 'COMPLETED');
    const weekMissed = weekTasks.filter(t => t.status === 'NOT_COMPLETED');
    const weekContinued = weekTasks.filter(t => t.status === 'CONTINUED');
    const weekPlannedMins = weekTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
    const weekActualMins = weekTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);
    const weekOnTime = weekCompleted.filter(
      t => (t.actualDurationMinutes || 0) <= (t.plannedDurationMinutes || 0)
    ).length;

    // Daily breakdown for 7 days
    const dailyStats: PlannerAnalytics['week']['dailyStats'] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDateObj);
      d.setDate(targetDateObj.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dDayName = daysOfWeek[d.getDay()];
      const dShortDay = shortDays[d.getDay()];

      const dayT = weekTasks.filter(t => t.date === dStr);
      const dayC = dayT.filter(t => t.status === 'COMPLETED').length;
      const dayPlanned = dayT.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
      const dayActual = dayT.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);

      dailyStats.push({
        date: dStr,
        day: dDayName,
        shortDay: dShortDay,
        completed: dayC,
        total: dayT.length,
        plannedMinutes: dayPlanned,
        actualMinutes: dayActual,
      });
    }

    // Common distractions in the week
    const tagCountMap: Record<string, number> = {};
    const improvementNotesList: string[] = [];
    weekTasks.forEach(t => {
      if (t.reflection?.distractionTags) {
        t.reflection.distractionTags.forEach(tag => {
          tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
        });
      }
      if (t.reflection?.improvements) {
        improvementNotesList.push(t.reflection.improvements);
      }
    });

    const commonDistractionsWeek = Object.entries(tagCountMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    // Consistency score = percentage of days in the week with study activity
    const daysWithActivity = dailyStats.filter(d => d.completed > 0 || d.actualMinutes > 0).length;
    const weekConsistencyScore = Math.round((daysWithActivity / 7) * 100);

    const weekAnalytics: PlannerAnalytics['week'] = {
      startDate: weekStartDateStr,
      endDate: targetDate,
      totalTasks: weekTasks.length,
      completedTasks: weekCompleted.length,
      missedTasks: weekMissed.length,
      continuedTasks: weekContinued.length,
      completionPercentage: weekTasks.length > 0 ? Math.round((weekCompleted.length / weekTasks.length) * 100) : 0,
      totalPlannedMinutes: weekPlannedMins,
      totalActualMinutes: weekActualMins,
      onTimeCompletionCount: weekOnTime,
      onTimeRate: weekCompleted.length > 0 ? Math.round((weekOnTime / weekCompleted.length) * 100) : 100,
      consistencyScore: weekConsistencyScore,
      dailyStats,
      commonDistractions: commonDistractionsWeek,
      improvementNotes: improvementNotesList.slice(0, 8),
    };

    // 3. MONTHLY SUMMARY (Current Month)
    const monthYearStr = targetDate.substring(0, 7); // YYYY-MM
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = targetDateObj.getMonth();
    const currentYear = targetDateObj.getFullYear();
    const monthName = monthNames[monthIndex];

    const monthTasks = allStudentTasks.filter(t => t.date.startsWith(monthYearStr));
    const monthCompleted = monthTasks.filter(t => t.status === 'COMPLETED');
    const monthMissed = monthTasks.filter(t => t.status === 'NOT_COMPLETED');
    const monthContinued = monthTasks.filter(t => t.status === 'CONTINUED');
    const monthPlannedMins = monthTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
    const monthActualMins = monthTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);

    // Group by day for best/weak day calculations
    const monthDaysMap: Record<string, PlannerTask[]> = {};
    monthTasks.forEach(t => {
      if (!monthDaysMap[t.date]) monthDaysMap[t.date] = [];
      monthDaysMap[t.date].push(t);
    });

    const dayPerformanceList = Object.entries(monthDaysMap).map(([dStr, dTasks]) => {
      const cCount = dTasks.filter(t => t.status === 'COMPLETED').length;
      const mCount = dTasks.filter(t => t.status === 'NOT_COMPLETED').length;
      const rate = dTasks.length > 0 ? Math.round((cCount / dTasks.length) * 100) : 0;
      const actualMins = dTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);
      const dObj = new Date(dStr);
      return {
        date: dStr,
        day: daysOfWeek[dObj.getDay()] || dStr,
        completionPercentage: rate,
        actualMinutes: actualMins,
        missedCount: mCount,
        total: dTasks.length,
      };
    });

    const bestPerformingDays = dayPerformanceList
      .filter(d => d.completionPercentage >= 70 && d.total > 0)
      .sort((a, b) => b.completionPercentage - a.completionPercentage || b.actualMinutes - a.actualMinutes)
      .slice(0, 5);

    const lowPerformingDays = dayPerformanceList
      .filter(d => d.completionPercentage < 70 || d.missedCount > 0)
      .sort((a, b) => a.completionPercentage - b.completionPercentage || b.missedCount - a.missedCount)
      .slice(0, 5);

    // Weekly Trends in the month
    const weeklyTrend: PlannerAnalytics['month']['weeklyTrend'] = [];
    const totalDaysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    for (let w = 1; w <= 5; w++) {
      const startDayNum = (w - 1) * 7 + 1;
      if (startDayNum > totalDaysInMonth) break;
      const endDayNum = Math.min(w * 7, totalDaysInMonth);
      const wStartStr = `${monthYearStr}-${String(startDayNum).padStart(2, '0')}`;
      const wEndStr = `${monthYearStr}-${String(endDayNum).padStart(2, '0')}`;

      const wTasks = monthTasks.filter(t => t.date >= wStartStr && t.date <= wEndStr);
      const wCompleted = wTasks.filter(t => t.status === 'COMPLETED').length;
      const wActualMins = wTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);

      weeklyTrend.push({
        weekNumber: w,
        label: `Week ${w} (Day ${startDayNum}-${endDayNum})`,
        completionRate: wTasks.length > 0 ? Math.round((wCompleted / wTasks.length) * 100) : 0,
        studyHours: Number((wActualMins / 60).toFixed(1)),
      });
    }

    const monthTagCountMap: Record<string, number> = {};
    let reflectionsCount = 0;
    monthTasks.forEach(t => {
      if (t.reflection) {
        reflectionsCount++;
        if (t.reflection.distractionTags) {
          t.reflection.distractionTags.forEach(tag => {
            monthTagCountMap[tag] = (monthTagCountMap[tag] || 0) + 1;
          });
        }
      }
    });

    const commonDistractionsMonth = Object.entries(monthTagCountMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    const monthActiveDays = dayPerformanceList.filter(d => d.actualMinutes > 0 || d.completionPercentage > 0).length;
    const daysPassedInMonth = Math.max(1, targetDateObj.getDate());
    const monthConsistencyScore = Math.round((monthActiveDays / daysPassedInMonth) * 100);

    const monthAnalytics: PlannerAnalytics['month'] = {
      monthName,
      year: currentYear,
      totalTasks: monthTasks.length,
      completedTasks: monthCompleted.length,
      missedTasks: monthMissed.length,
      continuedTasks: monthContinued.length,
      completionPercentage: monthTasks.length > 0 ? Math.round((monthCompleted.length / monthTasks.length) * 100) : 0,
      totalPlannedMinutes: monthPlannedMins,
      totalActualMinutes: monthActualMins,
      bestPerformingDays,
      lowPerformingDays,
      consistencyScore: monthConsistencyScore,
      weeklyTrend,
      commonDistractions: commonDistractionsMonth,
      reflectionsCount,
    };

    return {
      today: todaySummary,
      week: weekAnalytics,
      month: monthAnalytics,
    };
  }
}

export const db = new Database();