export const libraryFaculties = ["law", "management", "finance", "marketing", "informatics"] as const;
export const bookLanguages = ["hy", "en", "fr", "ru"] as const;
export const bookCategories = [
  "literature", "romance", "fiction", "mystery", "adventure", "motivation", "philosophy", "history", "politics",
  "business", "law", "economics", "mathematics", "computing",
] as const;

export type LibraryFaculty = typeof libraryFaculties[number];
export type BookLanguage = typeof bookLanguages[number];
export type BookCategory = typeof bookCategories[number];

type Book = {
  id: string;
  title: string;
  author: string;
  language: BookLanguage;
  category: BookCategory;
  faculties: readonly LibraryFaculty[];
  source: string;
  download?: { url: string; format: "PDF" | "EPUB"; hosted?: boolean };
};

type Entry = [id: string, title: string, author: string, category: BookCategory, faculties?: readonly LibraryFaculty[]];
const classics: Entry[] = [
  ["1342", "Pride and Prejudice", "Jane Austen", "romance"],
  ["158", "Emma", "Jane Austen", "romance"],
  ["1260", "Jane Eyre", "Charlotte Brontë", "romance"],
  ["161", "Sense and Sensibility", "Jane Austen", "romance"],
  ["935", "Self Help", "Samuel Smiles", "motivation"],
  ["2274", "How to Live on 24 Hours a Day", "Arnold Bennett", "motivation"],
  ["4507", "As a Man Thinketh", "James Allen", "motivation"],
  ["2680", "Meditations", "Marcus Aurelius", "philosophy"],
  ["1998", "Thus Spake Zarathustra", "Friedrich Nietzsche", "philosophy"],
  ["1497", "The Republic", "Plato", "philosophy", ["law"]],
  ["174", "The Picture of Dorian Gray", "Oscar Wilde", "fiction"],
  ["84", "Frankenstein", "Mary Shelley", "fiction"],
  ["1661", "The Adventures of Sherlock Holmes", "Arthur Conan Doyle", "mystery"],
  ["11", "Alice’s Adventures in Wonderland", "Lewis Carroll", "fiction"],
  ["120", "Treasure Island", "Robert Louis Stevenson", "adventure"],
  ["76", "Adventures of Huckleberry Finn", "Mark Twain", "adventure"],
  ["1232", "The Prince", "Niccolò Machiavelli", "politics", ["law"]],
  ["3300", "The Wealth of Nations", "Adam Smith", "politics", ["finance", "management"]],
  ["43", "The Strange Case of Dr. Jekyll and Mr. Hyde", "Robert Louis Stevenson", "mystery"],
  ["55", "The Wonderful Wizard of Oz", "L. Frank Baum", "adventure"],
];

function wikisourceUrl(language: BookLanguage, page: string) {
  const path = page.replaceAll(" ", "_").split("/").map(encodeURIComponent).join("/");
  return `https://${language}.wikisource.org/wiki/${path}`;
}

function ebook(id: string): Book["download"] {
  return { url: `/library-books/${id}.epub`, format: "EPUB", hosted: true };
}

const englishEditions: Record<string, [slug: string, page: string]> = {
  "1342": ["en-pride-prejudice", "Pride and Prejudice (1813)"],
  "935": ["en-self-help", "Self-Help"],
  "11": ["en-alice", "Alice's Adventures in Wonderland (1866)"],
  "1232": ["en-prince", "The Prince (Byerley)"],
  "43": ["en-dr-jekyll", "Strange Case of Dr Jekyll and Mr Hyde"],
};

export const gutenbergBooks: Book[] = classics.map(([id, title, author, category, faculties = []]) => {
  const edition = englishEditions[id];
  return {
    id, title, author, category, faculties, language: "en",
    source: edition ? wikisourceUrl("en", edition[1]) : `https://www.gutenberg.org/ebooks/${id}`,
    download: edition ? ebook(edition[0]) : { url: `/api/campus/books/${id}`, format: "PDF" },
  };
});

const openStax: [slug: string, title: string, category: BookCategory, faculties: LibraryFaculty[]][] = [
  ["business-law-i-essentials", "Business Law I Essentials", "law", ["law", "management"]],
  ["business-ethics", "Business Ethics", "business", ["law", "management", "marketing"]],
  ["introduction-intellectual-property", "Introduction to Intellectual Property", "law", ["law", "marketing"]],
  ["principles-management", "Principles of Management", "business", ["management"]],
  ["organizational-behavior", "Organizational Behavior", "business", ["management"]],
  ["entrepreneurship", "Entrepreneurship", "business", ["management", "marketing", "finance"]],
  ["principles-marketing", "Principles of Marketing", "business", ["marketing"]],
  ["principles-finance", "Principles of Finance", "economics", ["finance"]],
  ["principles-financial-accounting", "Principles of Accounting, Volume 1: Financial Accounting", "economics", ["finance", "management"]],
  ["principles-economics-3e", "Principles of Economics 3e", "economics", ["finance", "management", "marketing"]],
  ["introductory-business-statistics-2e", "Introductory Business Statistics 2e", "mathematics", ["finance", "marketing", "informatics"]],
  ["introduction-computer-science", "Introduction to Computer Science", "computing", ["informatics"]],
  ["introduction-python-programming", "Introduction to Python Programming", "computing", ["informatics"]],
  ["calculus-volume-1", "Calculus Volume 1", "mathematics", ["informatics"]],
];

const exo7: [slug: string, file: string, title: string, category: BookCategory][] = [
  ["algebre", "livre-algebre-1", "Algèbre — Cours de première année", "mathematics"],
  ["analyse", "livre-analyse-1", "Analyse — Cours de première année", "mathematics"],
  ["logique", "livre-logique", "Logique", "mathematics"],
  ["geometrie", "livre-geometrie", "Géométrie", "mathematics"],
  ["algorithmes", "livre-algorithmes", "Algorithmes", "computing"],
  ["quantum", "livre-quantum", "Quantum — Mathématiques pour l’informatique quantique", "computing"],
  ["formules", "formules", "Formules de mathématiques", "mathematics"],
  ["python", "livre-python1", "Python au lycée — Tome 1", "computing"],
];

type WikisourceEntry = [slug: string, page: string, title: string, author: string, category: BookCategory, faculties?: readonly LibraryFaculty[]];
const wikisource: Record<"hy" | "fr" | "ru", WikisourceEntry[]> = {
  hy: [
    ["verq", "Վերք Հայաստանի", "Վերք Հայաստանի", "Խաչատուր Աբովյան", "literature"],
    ["samvel", "Սամվել", "Սամվել", "Րաֆֆի", "literature"],
    ["khente", "Խենթը", "Խենթը", "Րաֆֆի", "literature"],
    ["khamsa", "Խամսայի մելիքությունները", "Խամսայի մելիքությունները", "Րաֆֆի", "history"],
    ["kaytser", "Կայծեր", "Կայծեր", "Րաֆֆի", "literature"],
    ["gevorg", "Գևորգ Մարզպետունի", "Գևորգ Մարզպետունի", "Մուրացան", "literature"],
    ["nairi", "Երկիր Նաիրի", "Երկիր Նաիրի", "Եղիշե Չարենց", "literature"],
    ["khatabala", "Խաթաբալա", "Խաթաբալա", "Գաբրիել Սունդուկյան", "literature"],
    ["sako", "Լոռեցի Սաքոն", "Լոռեցի Սաքոն", "Հովհաննես Թումանյան", "literature"],
    ["giqor", "Գիքորը", "Գիքորը", "Հովհաննես Թումանյան", "literature"],
  ],
  fr: [
    ["contrat-social", "Du contrat social/Édition 1762", "Du contrat social", "Jean-Jacques Rousseau", "law", ["law"]],
    ["esprit-lois", "De l’esprit des lois (éd. Nourse)", "De l’esprit des lois", "Montesquieu", "law", ["law"]],
    ["candide", "Candide, ou l’Optimisme/Garnier 1877", "Candide", "Voltaire", "literature"],
    ["miserables", "Les Misérables", "Les Misérables", "Victor Hugo", "literature"],
    ["monte-cristo", "Le Comte de Monte-Cristo", "Le Comte de Monte-Cristo", "Alexandre Dumas", "literature"],
    ["mme-bovary", "Madame Bovary", "Madame Bovary", "Gustave Flaubert", "literature"],
    ["cyrano", "Cyrano de Bergerac (Rostand)", "Cyrano de Bergerac", "Edmond Rostand", "literature"],
  ],
  ru: [
    ["war-and-peace", "Война и мир (Толстой)", "Война и мир", "Лев Толстой", "literature"],
    ["onegin", "Евгений Онегин (Пушкин)", "Евгений Онегин", "Александр Пушкин", "literature"],
    ["crime-and-punishment", "Преступление и наказание (Достоевский)", "Преступление и наказание", "Фёдор Достоевский", "literature"],
    ["idiot", "Идиот (Достоевский)", "Идиот", "Фёдор Достоевский", "literature"],
    ["hero", "Герой нашего времени (Лермонтов)", "Герой нашего времени", "Михаил Лермонтов", "literature"],
    ["woe-from-wit", "Горе от ума (Грибоедов)", "Горе от ума", "Александр Грибоедов", "literature"],
    ["dead-souls", "Мёртвые души (Гоголь)", "Мёртвые души", "Николай Гоголь", "literature"],
    ["inspector", "Ревизор (Гоголь)", "Ревизор", "Николай Гоголь", "literature"],
    ["mumu", "Муму (Тургенев)", "Муму", "Иван Тургенев", "literature"],
    ["overcoat", "Шинель (Гоголь)/ПСС 1938 (СО)", "Шинель", "Николай Гоголь", "literature"],
    ["geometry", "О началах Геометрии, соч. Г. Лобачевского", "О началах геометрии, соч. Г. Лобачевского", "С. С. Гурьев", "mathematics", ["informatics"]],
  ],
};

const hostedEditions = new Set([
  "hy-gevorg", "hy-giqor", "hy-khamsa", "hy-khatabala", "hy-khente", "hy-nairi", "hy-sako", "hy-samvel",
  "fr-candide", "fr-contrat-social", "fr-cyrano", "fr-esprit-lois",
  "ru-mumu", "ru-onegin", "ru-overcoat",
]);

export const books: Book[] = [
  {
    id: "fr-bastiat-loi", title: "La Loi", author: "Frédéric Bastiat", language: "fr", category: "law",
    faculties: ["law", "finance"], source: "https://bastiat.org/fr/la_loi.html",
  },
  ...openStax.map(([slug, title, category, faculties]): Book => ({
    id: `openstax-${slug}`, title, category, faculties, author: "OpenStax", language: "en",
    source: `https://openstax.org/details/books/${slug}`,
  })),
  ...exo7.map(([slug, file, title, category]): Book => ({
    id: `exo7-${slug}`, title, category, faculties: ["informatics"], author: "Exo7", language: "fr",
    source: `https://exo7.emath.fr/cours/${file}.pdf`,
    download: { url: `https://exo7.emath.fr/cours/${file}.pdf`, format: "PDF" },
  })),
  ...(["hy", "fr", "ru"] as const).flatMap((language) => wikisource[language].map(([slug, page, title, author, category, faculties = []]): Book => {
    const id = `${language}-${slug}`;
    return {
      id, title, author, category, faculties, language,
      source: wikisourceUrl(language, page),
      download: hostedEditions.has(id) ? ebook(id) : undefined,
    };
  })),
  ...gutenbergBooks,
];

const searchable = (text: string) => text.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replaceAll("œ", "oe");

export function filterBooks({ query = "", faculty = "", language = "", category = "", format = "" }: {
  query?: string;
  faculty?: string;
  language?: string;
  category?: string;
  format?: string;
} = {}) {
  const terms = searchable(query).trim().split(/\s+/).filter(Boolean);
  return books.filter((book) => {
    if (faculty && !book.faculties.some((value) => value === faculty)) return false;
    if (language && book.language !== language) return false;
    if (category && book.category !== category) return false;
    if (format && (book.download?.format ?? "online") !== format) return false;
    const text = searchable(`${book.title} ${book.author}`);
    return terms.every((term) => text.includes(term));
  });
}
