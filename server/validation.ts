import { z } from 'zod';

const text = z.string().max(10000).default('');
const list = z.array(z.string().max(2000)).max(100).default([]);
export const profileSchema = z.object({
  personalInfo: z.object({ fullName: text, email: text, phone: text, location: text, professionalHeadline: text, summary: text }).default({}),
  socialLinks: z.object({ linkedin: text, github: text, leetcode: text, portfolio: text }).default({}),
  skills: z.object({ programmingLanguages: list, frontendTechnologies: list, backendTechnologies: list, databasesAndSql: list, frameworksAndLibraries: list, developerTools: list, softSkills: list }).default({}),
  workExperience: z.array(z.object({ jobTitle: text, company: text, employmentType: text, startDate: text, endDate: text, current: z.boolean().default(false), location: text, responsibilities: list, achievements: list })).max(50).default([]),
  projects: z.array(z.object({ title: text, description: text, technologies: list, githubUrl: text, liveUrl: text, duration: text })).max(50).default([]),
  education: z.array(z.object({ degree: text, institution: text, fieldOfStudy: text, startDate: text, graduationDate: text, grade: text })).max(50).default([]),
  certificates: z.array(z.object({ name: text, issuingOrganization: text, issueDate: text, expiryDate: text, credentialId: text, verificationUrl: text })).max(50).default([]),
  sqlAndDatabaseSkills: list,
  achievements: list,
});

export type Profile = z.infer<typeof profileSchema>;

export const reportInputSchema = z.object({
  jobDescription: z.string().trim().min(10, 'Job description must be at least 10 characters long.').max(20000),
  selfDescription: z.string().trim().max(20000).default(''),
});

export const reportSchema = z.object({
  title: z.string().min(1),
  matchScore: z.number().min(0).max(100),
  compatibilitySummary: z.string(),
  candidateStrengths: z.array(z.string()),
  technicalQuestions: z.array(z.object({ question: z.string(), intention: z.string(), answer: z.string() })).min(3),
  behavioralQuestions: z.array(z.object({ question: z.string(), intention: z.string(), answer: z.string() })).min(2),
  skillGaps: z.array(z.object({ skill: z.string(), severity: z.enum(['low', 'medium', 'high']) })),
  preparationPlan: z.array(z.object({ day: z.number(), focus: z.string(), tasks: z.array(z.string()) })).min(3),
  recommendations: z.array(z.string()),
});

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function calculateCompletion(profile: Profile) {
  const checks: [boolean, number, string][] = [
    [!!profile.personalInfo.fullName.trim(), 10, 'Full Name'],
    [!!(profile.personalInfo.email.trim() || profile.personalInfo.phone.trim()), 10, 'Contact Email/Phone'],
    [!!(profile.personalInfo.professionalHeadline.trim() || profile.personalInfo.summary.trim()), 10, 'Professional Headline or Summary'],
    [profile.workExperience.length > 0, 20, 'Work Experience / Internships'],
    [profile.projects.length > 0, 15, 'Key Projects'],
    [profile.education.length > 0, 15, 'Education Details'],
    [Object.values(profile.skills).flat().length >= 3, 10, 'At least 3 Skills'],
    [Object.values(profile.socialLinks).some(Boolean), 5, 'Social Links'],
    [profile.certificates.length > 0 || profile.sqlAndDatabaseSkills.length > 0, 5, 'Certifications or Database Skills'],
  ];
  return {
    completionPercentage: checks.reduce((score, [complete, weight]) => score + (complete ? weight : 0), 0),
    missingFields: checks.filter(([complete]) => !complete).map(([, , field]) => field),
  };
}
