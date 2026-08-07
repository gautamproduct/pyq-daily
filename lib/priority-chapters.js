// The first ~3 chapters of each subject's NCERT sequence — the part of the
// syllabus a student has almost certainly covered by early August, whatever
// their board/coaching pace. The daily picker biases toward these so the
// questions are ones students can actually attempt, not deep-syllabus topics
// they haven't reached yet.
//
// Names are the exact `subject` + `chapter` strings from the PW question-bank
// export (verified against the live DB), so re-check this list any time a new
// export changes chapter naming.
//
// Droppers have covered the whole syllabus once, so they get the union of
// class 11 AND class 12 initial chapters (see isPriorityChapter / dropper
// pool handling in lib/daily-set.js).
const INITIAL_CHAPTERS = {
  "11|Physics": ["Units and Measurements", "Motion in a Straight Line", "Motion in a Plane"],
  "11|Chemistry": [
    "Some Basic Concepts of Chemistry",
    "Structure of Atom",
    "Classification of Elements and Periodicity in Properties",
  ],
  "11|Maths": ["Relations and Functions", "Trigonometric Functions", "Complex Numbers and Quadratic Equations"],
  "11|Botany": ["The Living World", "Biological Classification", "Plant Kingdom"],
  "11|Zoology": [
    "Animal Kingdom",
    "Structural Organisation in Animals (Animal Tissues)",
    "Biomolecules",
  ],

  "12|Physics": ["Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity"],
  "12|Chemistry": ["The Solid State", "Solutions", "Electrochemistry"],
  "12|Maths": ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices"],
  "12|Botany": [
    "Sexual Reproduction in Flowering Plants",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
  ],
  "12|Zoology": ["Human Reproduction", "Reproductive Health", "Human Health and Disease"],
};

// Which class pools a group draws from. Droppers mix class 11 + 12.
export function poolClassesFor(klass) {
  return klass === "dropper" ? ["11", "12"] : [klass];
}

// True if `chapter` is an initial chapter for this student. For droppers,
// a chapter counts if it's initial in either class 11 or class 12.
export function isPriorityChapter(klass, subject, chapter) {
  const classes = poolClassesFor(klass);
  return classes.some((c) => (INITIAL_CHAPTERS[`${c}|${subject}`] || []).includes(chapter));
}

export default INITIAL_CHAPTERS;
