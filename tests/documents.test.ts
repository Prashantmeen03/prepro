import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { extractDocument, renderResumePdf } from '../server/documents.js';
import { calculateCompletion, profileSchema } from '../server/validation.js';

test('resume PDF is readable by the upload parser and contains the saved fields', async () => {
  const profile = profileSchema.parse({
    personalInfo: { fullName: 'Asha Rao', professionalHeadline: 'Frontend Engineer', email: 'asha@example.test', summary: 'Builds accessible web applications.' },
    workExperience: [{ jobTitle: 'Engineer', company: 'Orbit Studio', responsibilities: ['Created accessible React forms.'] }],
    skills: { frontendTechnologies: ['React', 'CSS', 'HTML'] },
    achievements: ['Community mentor'],
  });
  const bytes = await renderResumePdf(profile);
  const file = new File([Buffer.from(bytes)], 'resume.pdf', { type: 'application/pdf' });
  const text = await extractDocument(file);
  for (const value of ['Asha Rao', 'Frontend Engineer', 'Orbit Studio', 'Community mentor', 'React']) assert.ok(text.includes(value), value);
});

test('long resumes paginate and unsupported font characters do not break export', async () => {
  const profile = profileSchema.parse({
    personalInfo: { fullName: 'Asha ✨' },
    achievements: Array.from({ length: 100 }, (_, i) => `Achievement ${i}: ` + 'Delivered a project. '.repeat(8)),
  });
  const document = await PDFDocument.load(await renderResumePdf(profile));
  assert.ok(document.getPageCount() > 1);
});

test('uploads reject unsupported, oversized, and malformed documents', async () => {
  await assert.rejects(() => extractDocument(new File(['abc'], 'resume.doc')), /PDF or DOCX/);
  await assert.rejects(() => extractDocument(new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'resume.pdf')), /4 MB/);
  await assert.rejects(() => extractDocument(new File(['not a pdf'], 'resume.pdf')), /Unable to read/);
});

test('completion uses field names used by the resume editor', () => {
  const result = calculateCompletion(profileSchema.parse({
    personalInfo: { fullName: 'Asha', professionalHeadline: 'Engineer', email: 'asha@example.test' },
    workExperience: [{ jobTitle: 'Engineer' }], projects: [{ title: 'Portfolio' }], education: [{ degree: 'BSc' }],
    socialLinks: { github: 'https://github.com/example' }, skills: { frontendTechnologies: ['React', 'CSS', 'HTML'] },
    sqlAndDatabaseSkills: ['Postgres'],
  }));
  assert.equal(result.completionPercentage, 100);
  assert.deepEqual(result.missingFields, []);
});
