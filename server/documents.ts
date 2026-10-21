import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { Profile } from './validation.js';
import { HttpError } from './validation.js';

export async function extractDocument(file: File) {
  if (!file.size) throw new HttpError(400, 'The resume file is empty.');
  if (file.size > 4 * 1024 * 1024) throw new HttpError(413, 'Resume files must be 4 MB or smaller.');
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension !== 'pdf' && extension !== 'docx') throw new HttpError(400, 'Please upload a PDF or DOCX resume.');
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';
  try {
    if (extension === 'pdf') {
      const { PDFParse } = await import('pdf-parse');
      const require = createRequire(import.meta.url);
      PDFParse.setWorker(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try { text = (await parser.getText()).text; }
      finally { await parser.destroy(); }
    } else {
      const mammoth = await import('mammoth');
      text = (await mammoth.extractRawText({ buffer })).value;
    }
  } catch {
    throw new HttpError(400, 'Unable to read this document. Please upload an unencrypted PDF or DOCX file.');
  }
  if (text.trim().length < 20) throw new HttpError(400, 'No readable resume text found. Please use a text-based PDF or DOCX rather than a scanned image.');
  return text.trim().slice(0, 40000);
}

// A text-based PDF avoids requiring a local Chrome installation in Functions.
export async function renderResumePdf(profile: Profile) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 794;
  function line(value: string, heading = false) {
    const size = heading ? 12 : 10;
    const selectedFont = heading ? bold : font;
    // Standard PDF fonts support WinAnsi; normalize unsupported characters.
    const printable = [...value.replace(/[\r\n\t]+/g, ' ')].map(char => {
      try { selectedFont.encodeText(char); return char; } catch { return '?'; }
    }).join('');
    const words = printable.split(/\s+/);
    let row = '';
    const draw = () => {
      if (y < 50) { page = pdf.addPage([595, 842]); y = 794; }
      page.drawText(row, { x: 48, y, size, font: selectedFont, color: rgb(0.08, 0.12, 0.14) });
      y -= heading ? 21 : 15;
      row = '';
    };
    for (const word of words) {
      // Split long URLs/strings too, so text never runs outside the page.
      for (const part of word.match(/.{1,65}/g) || ['']) {
        const next = row ? `${row} ${part}` : part;
        if (selectedFont.widthOfTextAtSize(next, size) > 499 && row) draw();
        row = row ? `${row} ${part}` : part;
      }
    }
    if (row) draw();
  }
  function section(title: string, entries: string[]) {
    const present = entries.filter(Boolean);
    if (!present.length) return;
    y -= 10;
    line(title, true);
    present.forEach(entry => line(entry));
  }
  const info = profile.personalInfo;
  line(info.fullName || 'Resume', true);
  line([info.email, info.phone, info.location].filter(Boolean).join(' | '));
  line(info.professionalHeadline);
  section('Professional Summary', [info.summary]);
  section('Links', Object.entries(profile.socialLinks).filter(([, url]) => url).map(([name, url]) => `${name}: ${url}`));
  section('Skills', Object.entries(profile.skills).filter(([, skills]) => skills.length).map(([name, skills]) => `${name.replace(/([A-Z])/g, ' $1')}: ${skills.join(', ')}`));
  section('Experience', profile.workExperience.flatMap(job => [
    `${job.jobTitle} | ${job.company} | ${job.startDate} - ${job.current ? 'Present' : job.endDate}`,
    ...job.responsibilities.map(text => `- ${text}`), ...job.achievements.map(text => `- ${text}`),
  ]));
  section('Projects', profile.projects.flatMap(project => [project.title, project.description, project.technologies.join(', '), project.githubUrl, project.liveUrl]));
  section('Education', profile.education.map(item => [item.degree, item.fieldOfStudy, item.institution, item.graduationDate, item.grade].filter(Boolean).join(' | ')));
  section('Certifications', profile.certificates.map(item => [item.name, item.issuingOrganization, item.issueDate, item.verificationUrl].filter(Boolean).join(' | ')));
  section('Database Skills', profile.sqlAndDatabaseSkills);
  section('Achievements', profile.achievements);
  return pdf.save();
}
