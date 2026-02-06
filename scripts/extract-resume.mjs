import fs from "fs/promises";
import path from "path";
import { createWorker } from "tesseract.js";

const cwd = process.cwd();
const resumeImagePath = path.join(cwd, "public", "resume.png");
const resumeDataPath = path.join(cwd, "data", "resume.json");
const rawTextPath = path.join(cwd, "data", "resume.raw.txt");

const ABOUT_HEADING = "About";
const ABOUT_SUMMARY =
  "My name is Yash Vora and I am a senior at Purdue University. My strengths lie in my ability to tackle open-ended issues, both with my ability to lead and self-start as well as my prior technical expertise. I'm best positioned in roles where I can quickly learn, iterate, and drive results.";

const MONTH_PATTERN =
  "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*";
const DATE_RANGE_REGEX = new RegExp(
  `(${MONTH_PATTERN}\\s+\\d{4}\\s*[–-]\\s*(?:${MONTH_PATTERN}\\s+\\d{4}|Present))`,
  "i"
);
const SINGLE_DATE_REGEX = new RegExp(`${MONTH_PATTERN}\\s+\\d{4}`, "i");
const GPA_REGEX = /\\b\\d\\.\\d+\\s*GPA\\b/i;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\t]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\u2013|\u2014/g, "–")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitByHeadings(text, headings) {
  const upper = text.toUpperCase();
  const positions = headings
    .map((heading) => ({
      heading,
      index: upper.indexOf(heading),
    }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);

  const result = {};
  for (let i = 0; i < positions.length; i += 1) {
    const start = positions[i];
    const end = positions[i + 1];
    const contentStart = start.index + start.heading.length;
    const contentEnd = end ? end.index : text.length;
    result[start.heading] = text.slice(contentStart, contentEnd).trim();
  }

  return result;
}

function tokenizeLines(sectionText) {
  return sectionText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeDate(value) {
  return value.replace(/\s*[-–]\s*/g, " – ").replace(/\s+/g, " ").trim();
}

function isBullet(line) {
  return /^[•·\-*]/.test(line.trim());
}

function cleanBullet(line) {
  return line.replace(/^[•·\-*]+\s*/, "").trim();
}

function parseTimeline(sectionText) {
  const lines = tokenizeLines(sectionText);
  const items = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const dateMatch = DATE_RANGE_REGEX.exec(line);
    if (!dateMatch) {
      index += 1;
      continue;
    }

    const date = normalizeDate(dateMatch[1]);
    let title = line.replace(dateMatch[1], "").replace(/\|/g, "").trim();
    if (!title && index > 0) {
      title = lines[index - 1];
    }

    let subtitle = "";
    let cursor = index + 1;
    if (cursor < lines.length && !isBullet(lines[cursor])) {
      if (!DATE_RANGE_REGEX.test(lines[cursor])) {
        subtitle = lines[cursor];
        cursor += 1;
      }
    }

    const bullets = [];
    while (cursor < lines.length) {
      const nextLine = lines[cursor];
      if (DATE_RANGE_REGEX.test(nextLine) && !isBullet(nextLine)) {
        break;
      }
      if (isBullet(nextLine)) {
        bullets.push(cleanBullet(nextLine));
      } else if (bullets.length) {
        bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${nextLine}`.trim();
      }
      cursor += 1;
    }

    if (title) {
      items.push({
        title,
        subtitle,
        date,
        bullets: bullets.filter(Boolean),
      });
    }

    index = cursor;
  }

  return items;
}

function parseEducation(sectionText) {
  const lines = tokenizeLines(sectionText);
  if (!lines.length) {
    return null;
  }

  let school = lines[0];
  let date = "";
  let degree = "";
  let gpa = "";

  const headerLineIndex = lines.findIndex((line) => SINGLE_DATE_REGEX.test(line));
  if (headerLineIndex >= 0) {
    const headerLine = lines[headerLineIndex];
    const match = SINGLE_DATE_REGEX.exec(headerLine);
    if (match) {
      date = match[0];
      const title = headerLine.replace(match[0], "").trim();
      if (title) {
        school = title;
      }
    }
    if (lines[headerLineIndex + 1]) {
      degree = lines[headerLineIndex + 1];
    }
  }

  for (const line of lines) {
    const gpaMatch = GPA_REGEX.exec(line);
    if (gpaMatch) {
      gpa = gpaMatch[0];
      break;
    }
  }

  const bulletParts = sectionText
    .split(/[•·]/)
    .map((part) => part.replace(/\n/g, " ").trim())
    .filter(Boolean);

  let coursework = "";
  let awards = "";
  const programs = [];

  for (const part of bulletParts) {
    if (/Coursework/i.test(part)) {
      coursework = part.replace(/Relevant Coursework:\s*/i, "").trim();
    } else if (/Awards/i.test(part)) {
      awards = part.replace(/Awards:\s*/i, "").trim();
    } else if (/Larsen Leaders Academy/i.test(part)) {
      programs.push(part.replace(/^\s*/, "").trim());
    } else if (/IBE Student Council/i.test(part)) {
      programs.push(part.replace(/^\s*/, "").trim());
    }
  }

  return {
    school,
    degree,
    date,
    gpa,
    coursework,
    awards,
    programs,
  };
}

function parseSkills(sectionText) {
  const flat = sectionText.replace(/\n/g, " ");
  const technicalMatch = /Technical:\s*([^B]*)/i.exec(flat);
  const businessMatch = /Business:\s*(.*)$/i.exec(flat);

  return {
    technical: technicalMatch ? technicalMatch[1].trim().replace(/\s+\|\s+/g, ", ") : "",
    business: businessMatch ? businessMatch[1].trim().replace(/\s+\|\s+/g, ", ") : "",
  };
}

function parseAsk(sectionText) {
  return sectionText
    .replace(/\n/g, " ")
    .split(/,|•|·/)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function main() {
  const existing = await readJson(resumeDataPath);
  if (!existing) {
    throw new Error("Missing data/resume.json. Create it before syncing.");
  }

  if (!(await fileExists(resumeImagePath))) {
    console.warn("resume.png not found in public/. Skipping OCR sync.");
    const updated = {
      ...existing,
      about: {
        heading: ABOUT_HEADING,
        summary: ABOUT_SUMMARY,
      },
    };
    await fs.writeFile(resumeDataPath, JSON.stringify(updated, null, 2));
    return;
  }

  const worker = await createWorker("eng");
  const {
    data: { text },
  } = await worker.recognize(resumeImagePath);
  await worker.terminate();

  const normalized = normalizeText(text);
  await fs.writeFile(rawTextPath, normalized);

  const sections = splitByHeadings(normalized, [
    "SUMMARY",
    "EDUCATION",
    "PROFESSIONAL EXPERIENCE",
    "LEADERSHIP AND INVOLVEMENT",
    "SKILLS",
    "ASK ME ABOUT",
  ]);

  const experience = parseTimeline(sections["PROFESSIONAL EXPERIENCE"] ?? "");
  const leadership = parseTimeline(sections["LEADERSHIP AND INVOLVEMENT"] ?? "");
  const education = parseEducation(sections["EDUCATION"] ?? "");
  const skills = parseSkills(sections["SKILLS"] ?? "");
  const ask = parseAsk(sections["ASK ME ABOUT"] ?? "");

  const updated = {
    ...existing,
    about: {
      heading: ABOUT_HEADING,
      summary: ABOUT_SUMMARY,
    },
    education: education?.school ? education : existing.education,
    experience: experience.length ? experience : existing.experience,
    leadership: leadership.length ? leadership : existing.leadership,
    skills:
      skills.technical || skills.business
        ? {
            technical: skills.technical || existing.skills?.technical,
            business: skills.business || existing.skills?.business,
          }
        : existing.skills,
    ask: ask.length ? ask : existing.ask,
  };

  await fs.writeFile(resumeDataPath, JSON.stringify(updated, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
