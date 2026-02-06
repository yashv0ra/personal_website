import resumeData from "@/data/resume.json";

type ResumeLink = {
  label: string;
  url: string;
};

type ResumeBasics = {
  name: string;
  location: string;
  email: string;
  links: ResumeLink[];
};

type ResumeAbout = {
  heading?: string;
  summary: string;
};

type TimelineItem = {
  title: string;
  subtitle: string;
  date: string;
  bullets: string[];
  tags?: string[];
};

type ResumeEducation = {
  school: string;
  degree: string;
  date: string;
  gpa: string;
  coursework: string;
  awards: string;
  programs: string[];
};

type ResumeSkills = {
  technical: string;
  business: string;
};

export type ResumeData = {
  basics: ResumeBasics;
  about: ResumeAbout;
  education: ResumeEducation;
  experience: TimelineItem[];
  leadership: TimelineItem[];
  skills: ResumeSkills;
  ask: string[];
};

export const resume = resumeData as ResumeData;

function formatTimeline(items: TimelineItem[]): string {
  return items
    .map((item) => {
      const bullets = item.bullets.map((bullet) => `- ${bullet}`).join("\n");
      return `${item.title} (${item.subtitle}, ${item.date})\n${bullets}`;
    })
    .join("\n");
}

export function buildResumeContext(data: ResumeData): string {
  const lines = [
    `Name: ${data.basics.name}`,
    `Location: ${data.basics.location}`,
    `Email: ${data.basics.email}`,
    "",
    "About:",
    data.about.summary,
    "",
    "Summary of Experience:",
    formatTimeline(data.experience),
    "",
    "Leadership:",
    formatTimeline(data.leadership),
    "",
    "Education:",
    `${data.education.school}: ${data.education.degree} (${data.education.date}), ${data.education.gpa}`,
    `Coursework: ${data.education.coursework}`,
    `Awards: ${data.education.awards}`,
    `Programs: ${data.education.programs.join("; ")}`,
  ];

  return lines.join("\n").trim();
}
