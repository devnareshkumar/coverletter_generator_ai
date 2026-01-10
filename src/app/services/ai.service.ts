import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private apiKey = signal<string>('');
  private currentProvider = signal<'openai' | 'anthropic' | 'gemini' | 'perplexity'>('openai');

  constructor(private http: HttpClient) {
    this.loadApiKey();
  }

  setApiKey(key: string, provider: 'openai' | 'anthropic' | 'gemini' | 'perplexity') {
    this.apiKey.set(key);
    this.currentProvider.set(provider);
    localStorage.setItem('ai_api_key', key);
    localStorage.setItem('ai_provider', provider);
  }

  private loadApiKey() {
    const key = localStorage.getItem('ai_api_key');
    const provider = localStorage.getItem('ai_provider');
    if (key && provider) {
      this.apiKey.set(key);
      this.currentProvider.set(provider as any);
    }
  }

  parseResume(resumeText: string): Observable<any> {
    if (!this.apiKey()) {
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

    return this.callAI(prompt);
  }

  generateCoverLetter(prompt: string): Observable<any> {
    if (!this.apiKey()) {
      return throwError(() => new Error('API key not configured'));
    }
    return this.callAI(prompt);
  }

  private callAI(prompt: string): Observable<any> {
    const provider = this.currentProvider();
    const key = this.apiKey();

    switch (provider) {
      case 'openai':
        return this.callOpenAI(prompt, key);
      case 'anthropic':
        return this.callAnthropic(prompt, key);
      case 'gemini':
        return this.callGemini(prompt, key);
      case 'perplexity':
        return this.callPerplexity(prompt, key);
      default:
        return throwError(() => new Error('Unknown provider'));
    }
  }

  private callOpenAI(prompt: string, apiKey: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });

    const body = {
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.7
    };

    return this.http.post<any>('https://api.openai.com/v1/chat/completions', body, { headers })
      .pipe(
        map((response: any) => ({
          content: response.choices[0].message.content,
          provider: 'openai',
          tokens: response.usage.total_tokens
        })),
        catchError((error: any) => throwError(() => new Error(`OpenAI Error: ${error.error?.error?.message || error.message}`)))
      );
  }

  private callAnthropic(prompt: string, apiKey: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    });

    const body = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    };

    return this.http.post<any>('https://api.anthropic.com/v1/messages', body, { headers })
      .pipe(
        map((response: any) => ({
          content: response.content[0].text,
          provider: 'anthropic',
          tokens: response.usage.input_tokens + response.usage.output_tokens
        })),
        catchError((error: any) => throwError(() => new Error(`Anthropic Error: ${error.error?.error?.message || error.message}`)))
      );
  }

  private callGemini(prompt: string, apiKey: string): Observable<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    return this.http.post<any>(url, body)
      .pipe(
        map((response: any) => ({
          content: response.candidates[0].content.parts[0].text,
          provider: 'gemini',
          tokens: 0
        })),
        catchError((error: any) => throwError(() => new Error(`Gemini Error: ${error.error?.error?.message || error.message}`)))
      );
  }

  private callPerplexity(prompt: string, apiKey: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });

    const body = {
      model: 'sonar',
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

  clearApiKey() {
    this.apiKey.set('');
    localStorage.removeItem('ai_api_key');
    localStorage.removeItem('ai_provider');
  }

  isConfigured(): boolean {
    return this.apiKey() !== '';
  }

  getProvider() {
    return this.currentProvider();
  }
}
