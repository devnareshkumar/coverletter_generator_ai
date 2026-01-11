import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly provider = 'perplexity';

  constructor(private http: HttpClient) {}

  parseResume(resumeText: string, apiKey: string, model: string): Observable<any> {
    if (!apiKey) {
      return throwError(() => new Error('API key not configured'));
    }

    const prompt = `Parse the following resume and extract the information in a structured JSON format.
Return ONLY valid JSON with no markdown formatting, no code blocks, no extra text.

Resume text:
${resumeText}

Extract and return ONLY this JSON structure (no markdown, no code blocks):
{
  "name": "Full name of the person",
  "email": "Email address if found",
  "phone": "Phone number if found",
  "location": "Location/address if found",
  "summary": "Professional summary or objective if found, max 2 sentences",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "position": "Job title",
      "company": "Company name",
      "duration": "Time period",
      "description": "Key responsibilities and achievements"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "What it does",
      "technologies": ["tech1", "tech2"],
      "link": "Link if available"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "University name",
      "year": "Graduation year",
      "details": "Any additional details"
    }
  ],
  "certifications": ["cert1", "cert2"]
}`;

    return this.callAI(prompt, apiKey, model);
  }

  generateCoverLetter(prompt: string, apiKey: string, model: string): Observable<any> {
    if (!apiKey) {
      return throwError(() => new Error('API key not configured'));
    }
    return this.callAI(prompt, apiKey, model);
  }

  generateResume(prompt: string, apiKey: string, model: string): Observable<any> {
    if (!apiKey) {
      return throwError(() => new Error('API key not configured'));
    }
    return this.callAI(prompt, apiKey, model);
  }

  private callAI(prompt: string, apiKey: string, model: string): Observable<any> {
    return this.callPerplexity(prompt, apiKey, model);
  }

  private callPerplexity(prompt: string, apiKey: string, model: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });

    const body = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.7
    };

    return this.http.post<any>('https://api.perplexity.ai/chat/completions', body, { headers })
      .pipe(
        map((response: any) => ({
          content: response.choices[0].message.content,
          provider: 'perplexity',
          tokens: 0
        })),
        catchError((error: any) => throwError(() => new Error(`Perplexity Error: ${error.error?.error?.message || error.message}`)))
      );
  }
}