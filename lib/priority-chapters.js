// Which chapters a class-11/12 student has realistically already covered in
// school/coaching by early-to-mid August (session starts ~April, so this is
// roughly the first third-to-half of each subject's NCERT sequence). Used to
// bias the daily question picker toward chapters students can actually
// answer, instead of drawing uniformly from the full year's syllabus.
//
// Droppers get the full class-12 pool with no filtering — they've already
// covered the whole syllabus once.
//
// Keys are exact `subject` + `chapter` strings as they appear in the PW
// question-bank export, so this list must be re-checked against chapter
// names any time a new export uses different naming.
const PRIORITY_CHAPTERS = {
  "11|Physics": [
    "Units and Measurements",
    "Mathematical Tools and Vectors",
    "Motion in a Straight Line",
    "Motion in a Plane",
    "Laws of Motion",
    "Work, Energy and Power",
    "Circular Motion",
    "Center of Mass and System of Particles",
    "Rotational Motion",
    "Gravitation",
  ],
  "11|Chemistry": [
    "Some Basic Concepts of Chemistry",
    "Structure of Atom",
    "Classification of Elements and Periodicity in Properties",
    "Chemical Bonding and Molecular Structure",
    "States of Matter",
    "Organic Chemistry: Some Basic Principles and Techniques",
  ],
  "11|Maths": [
    "Basic Maths",
    "Sets",
    "Relations and Functions",
    "Trigonometric Functions",
    "Quadratic Equations",
    "Complex Numbers and Quadratic Equations",
    "Permutations and Combinations",
    "Binomial Theorem",
    "Sequence and Series",
    "Straight Lines",
  ],
  "11|Botany": [
    "The Living World",
    "Biological Classification",
    "Plant Kingdom",
    "Morphology of Flowering Plants",
    "Anatomy of Flowering Plants",
    "Cell: The Unit of Life",
    "Biomolecules",
    "Cell Cycle and Cell Division",
  ],
  "11|Zoology": [
    "Animal Kingdom",
    "Structural Organisation in Animals (Animal Tissues)",
  ],

  "12|Physics": [
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
  ],
  "12|Chemistry": [
    "The Solid State",
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "General Principles and Processes of Isolation of Elements",
    "The P-Block Elements (XII)",
    "The D and F-Block Elements",
    "Coordination Compounds",
  ],
  "12|Maths": [
    "Relations and Functions",
    "Inverse Trigonometric Functions",
    "Matrices",
    "Determinants",
    "Continuity and Differentiability",
    "Application of Derivatives",
  ],
  "12|Botany": [
    "Sexual Reproduction in Flowering Plants",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
  ],
  "12|Zoology": ["Human Reproduction", "Reproductive Health"],
};

export function isPriorityChapter(klass, subject, chapter) {
  const key = `${klass}|${subject}`;
  const list = PRIORITY_CHAPTERS[key];
  if (!list) return false;
  return list.includes(chapter);
}

export default PRIORITY_CHAPTERS;
