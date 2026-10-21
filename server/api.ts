import { z } from 'zod';
import type { Store } from './store.js';
import { calculateCompletion, HttpError, profileSchema, reportInputSchema } from './validation.js';
import { extractProfile, generateReport, generateStructured } from './ai.js';
import { extractDocument, renderResumePdf } from './documents.js';

type User = { id: string; email?: string; name?: string; userMetadata?: Record<string, unknown> };
type Dependencies = { getUser: () => Promise<User | null>; getStore: () => Store };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBody(req: Request) {
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) throw new HttpError(413, 'Request is too large. Resume files must be 4 MB or smaller.');
  const parsed = new Request(req.url, { method: req.method, headers: req.headers, body: bytes });
  try {
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await parsed.formData();
      return { body: Object.fromEntries(form.entries()), file: form.get('resume') };
    }
    return { body: await parsed.json(), file: null };
  } catch {
    throw new HttpError(400, 'Invalid request body.');
  }
}

function profileResponse(profile: Record<string, any>, message?: string) {
  return json({ profile, ...calculateCompletion(profileSchema.parse(profile)), ...(message ? { message } : {}) });
}

async function pdfResponse(profile: z.infer<typeof profileSchema>, filename: string) {
  const bytes = await renderResumePdf(profile);
  return new Response(Buffer.from(bytes), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  } });
}

export function createApi(deps: Dependencies) {
  return async (req: Request) => {
    try {
      const path = new URL(req.url).pathname.replace(/\/+$/, '');
      const method = req.method;
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && req.headers.get('origin') !== new URL(req.url).origin) {
        throw new HttpError(403, 'This request must originate from this site.');
      }
      if (path === '/api/health' && method === 'GET') {
        try {
          await deps.getStore().health();
          return json({ status: 'online', database: 'connected', timestamp: new Date().toISOString() });
        } catch {
          return json({ status: 'degraded', database: 'unavailable', message: 'The database is not ready. Please try again after deployment completes.' }, 503);
        }
      }
      const user = await deps.getUser();
      if (!user) throw new HttpError(401, 'Please sign in to continue.');
      const username = String(user.userMetadata?.username || user.name || user.email?.split('@')[0] || 'Candidate');
      if (path === '/api/auth/get-me' && method === 'GET') {
        return json({ user: { _id: user.id, id: user.id, username, email: user.email || '' } });
      }
      const store = deps.getStore();
      if (path === '/api/interview' && method === 'GET') {
        return json({ interviewReports: await store.listReports(user.id) });
      }
      if (path === '/api/interview' && method === 'POST') {
        const { body, file } = await readBody(req);
        const input = reportInputSchema.parse(body);
        const resume = file instanceof File ? await extractDocument(file) : '';
        if (!resume && !input.selfDescription) throw new HttpError(400, 'Upload a readable resume or provide a self-description.');
        await store.limitGeneration(user.id);
        const strategy = await generateReport({ ...input, resume });
        const interviewReport = await store.addReport(user.id, { ...input, resume, ...strategy });
        return json({ message: 'Interview report generated successfully.', interviewReport }, 201);
      }
      const reportMatch = path.match(/^\/api\/interview\/report\/([^/]+)$/);
      const resumeMatch = path.match(/^\/api\/interview\/resume\/pdf\/([^/]+)$/);
      if ((reportMatch && method === 'GET') || (resumeMatch && method === 'POST')) {
        const id = z.string().uuid().parse((reportMatch || resumeMatch)![1]);
        const report = await store.getReport(user.id, id);
        if (reportMatch) return json({ interviewReport: report });
        await store.limitGeneration(user.id);
        const data = report as Record<string, unknown>;
        const tailored = await generateStructured(profileSchema, 'Create an ATS-friendly resume tailored to the job description, using only candidate facts present in the resume or self-description. Never invent contact information, employers, degrees, or accomplishments. Leave missing fields empty.', {
          resume: data.resume, selfDescription: data.selfDescription, jobDescription: data.jobDescription,
        });
        return await pdfResponse(tailored, `resume_${id}.pdf`);
      }
      if (path.startsWith('/api/resume/')) {
        const profile = await store.getProfile(user.id, username, user.email || '');
        if (path === '/api/resume/profile' && method === 'GET') return profileResponse(profile);
        if (path === '/api/resume/profile' && method === 'PUT') {
          const { body } = await readBody(req);
          const patch = profileSchema.partial().parse(body);
          return profileResponse(await store.updateProfile(user.id, patch), 'Profile saved.');
        }
        if (path === '/api/resume/file' && method === 'DELETE') {
          return profileResponse(await store.updateProfile(user.id, { resumeFile: null }), 'Resume file reference removed.');
        }
        if (path === '/api/resume/upload' && method === 'POST') {
          const { file } = await readBody(req);
          if (!(file instanceof File)) throw new HttpError(400, 'Please upload a PDF or DOCX resume.');
          const rawText = await extractDocument(file);
          await store.limitGeneration(user.id);
          const extracted = await extractProfile(rawText);
          return profileResponse(await store.updateProfile(user.id, {
            ...extracted,
            resumeFile: { originalName: file.name, fileSize: file.size, fileType: file.type, rawText, uploadedAt: new Date().toISOString() },
          }), 'Resume extracted. Review and edit the details below.');
        }
        if (path === '/api/resume/pdf' && (method === 'GET' || method === 'POST')) {
          return await pdfResponse(profileSchema.parse(profile), 'My_Resume_Profile.pdf');
        }
      }
      throw new HttpError(404, 'API endpoint not found.');
    } catch (error) {
      if (error instanceof z.ZodError) return json({ message: error.issues[0]?.message || 'Invalid input.' }, 400);
      if (error instanceof HttpError) return json({ message: error.message }, error.status);
      // Keep database/provider details and credentials out of public responses and logs.
      return json({ message: 'The request could not complete. Please try again shortly.' }, 500);
    }
  };
}
