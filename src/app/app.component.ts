import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AIService } from './services/ai.service';
import { ResumeData } from './models/job.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  currentStep = signal<'config' | 'resume' | 'parse' | 'review' | 'job' | 'output'>('config');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  
  // Config
  selectedProvider = signal<'openai' | 'anthropic' | 'gemini' | 'perplexity'>('openai');
  apiKey = signal('');
  isApiKeySet = signal(false);
  
  // Resume upload
  resumeText = signal('');
  
  // Parsed resume data
  resumeData = signal<ResumeData | null>(null);
  
  // Job form
  jobTitle = signal('');
  companyName = signal('');
  jobDescription = signal('');
  writingTone = signal<'professional' | 'casual' | 'formal'>('professional');
  
  // Output
  generatedCoverLetter = signal('');

  constructor(private aiService: AIService) {}

  ngOnInit() {
    const savedKey = localStorage.getItem('ai_api_key');
    const savedProvider = localStorage.getItem('ai_provider');
    if (savedKey && savedProvider) {
      this.apiKey.set(savedKey);
      this.selectedProvider.set(savedProvider as any);
      this.isApiKeySet.set(true);
      this.currentStep.set('resume');
    }
  }

  // Step 1: Configure API Key
  saveApiKey() {
    if (!this.apiKey()) {
      this.errorMessage.set('Please enter an API key');
      return;
    }
    
    this.aiService.setApiKey(this.apiKey(), this.selectedProvider());
    this.isApiKeySet.set(true);
    this.currentStep.set('resume');
    this.successMessage.set('API key saved!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  changeApiKey() {
    this.currentStep.set('config');
    this.isApiKeySet.set(false);
  }

  // Step 2: Upload Resume
  parseResume() {
    if (!this.resumeText()) {
      this.errorMessage.set('Please paste your resume');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    this.aiService.parseResume(this.resumeText()).subscribe({
      next: (response: any) => {
        try {
          let jsonStr = typeof response === 'string' ? response : response.content || response;
          
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json').split('```').trim();
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```').split('```').trim();
          }
          
          const parsed = JSON.parse(jsonStr);
          this.resumeData.set(parsed);
          this.currentStep.set('review');
          this.successMessage.set('Resume parsed successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
        } catch (error: any) {
          this.errorMessage.set('Failed to parse resume. Please check the format and try again.');
        }
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.errorMessage.set(`Error: ${error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  // Step 3: Review and Edit Parsed Data
  proceedToJobForm() {
    if (!this.resumeData()) {
      this.errorMessage.set('Resume data not found');
      return;
    }
    this.currentStep.set('job');
    this.successMessage.set('Ready to fill job details!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  editResume() {
    this.currentStep.set('resume');
  }

  // Step 4: Generate Cover Letter
  generateCoverLetter() {
    if (!this.jobTitle() || !this.companyName() || !this.jobDescription()) {
      this.errorMessage.set('Please fill in all job fields');
      return;
    }

    if (!this.resumeData()) {
      this.errorMessage.set('Resume data not found');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    const prompt = this.buildPrompt();
    
    this.aiService.generateCoverLetter(prompt).subscribe({
      next: (response: any) => {
        this.generatedCoverLetter.set(response.content);
        this.currentStep.set('output');
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.errorMessage.set(`Error: ${error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  private buildPrompt(): string {
    if (!this.resumeData()) return '';

    const resume = this.resumeData()!;
    const toneGuide = {
      professional: 'professional, confident, and competent',
      casual: 'friendly, approachable, and genuine',
      formal: 'formal, respectful, and eloquent'
    };

    const educationText = resume.education
      ? resume.education.map((e: any) => `${e.degree} from ${e.institution} (${e.year})`).join(', ')
      : 'Not provided';

    const experienceText = resume.experience
      ? resume.experience.map((e: any) => 
          `Position: ${e.position} at ${e.company} (${e.duration || 'duration not specified'})\nKey Achievements: ${e.description}`
        ).join('\n\n')
      : 'Not provided';

    const projectsText = resume.projects
      ? resume.projects.map((p: any) => 
          `Project: ${p.name}\nDescription: ${p.description}\nTechnologies: ${(p.technologies || []).join(', ')}`
        ).join('\n\n')
      : 'Not provided';

    const skillsText = resume.skills && resume.skills.length > 0
      ? resume.skills.slice(0, 10).join(', ')
      : 'Not provided';

    return `You are an expert career coach and professional cover letter writer. Your task is to write an exceptional, personalized cover letter that will capture the hiring manager's attention and increase the likelihood of an interview.

CANDIDATE PROFILE:
Name: ${resume.name || 'Not provided'}
Contact: ${resume.email || ''} | ${resume.phone || ''}
Location: ${resume.location || 'Not provided'}

PROFESSIONAL SUMMARY:
${resume.summary || 'A skilled professional with diverse experience.'}

CORE COMPETENCIES:
${skillsText}

PROFESSIONAL EXPERIENCE:
${experienceText}

NOTABLE PROJECTS & ACCOMPLISHMENTS:
${projectsText}

EDUCATIONAL BACKGROUND:
${educationText}

---

TARGET JOB POSITION:
Title: ${this.jobTitle()}
Company: ${this.companyName()}

JOB DESCRIPTION & REQUIREMENTS:
${this.jobDescription()}

---

WRITING GUIDELINES:

1. OPENING PARAGRAPH (3-4 sentences):
   - Express genuine enthusiasm for the specific role and company
   - Mention a specific achievement or quality that makes you ideal
   - Create an emotional connection while maintaining professionalism

2. BODY PARAGRAPHS (2-3 paragraphs, 4-5 sentences each):
   - Paragraph 1: Highlight 2-3 most relevant skills and experiences
   - Paragraph 2: Show how your achievements align with job requirements
   - Paragraph 3 (optional): Demonstrate knowledge of company culture and values

3. CLOSING PARAGRAPH (2-3 sentences):
   - Reinforce enthusiasm and fit for the role
   - Include clear call-to-action requesting interview
   - Professional sign-off

4. KEY REQUIREMENTS:
   - Use a ${this.writingTone()} and ${toneGuide[this.writingTone()]} tone
   - Length: 250-350 words (3-4 paragraphs)
   - Avoid generic statements - be specific and concrete
   - Use industry terminology where appropriate
   - Highlight quantifiable achievements and metrics when possible
   - Address the specific job requirements directly
   - Show personality while remaining professional
   - Use active voice and power verbs (designed, led, architected, implemented, etc.)
   - Avoid repeating resume - complement it instead
   - Include 1-2 specific examples that directly match job requirements
   - End with a strong call-to-action

5. ATS OPTIMIZATION:
   - Use keywords from job description naturally
   - Include job title where relevant
   - Maintain clear paragraph structure
   - Avoid tables, graphics, or special formatting

6. FORMAT:
   - Professional business letter format
   - Clear paragraph breaks between sections
   - Proper grammar and punctuation
   - No spelling errors

NOW, write the cover letter based on all the above guidelines. Make it compelling, personalized, and tailored to increase the chance of an interview:`;
  }

  // Step 5: Output Actions
  downloadAsText() {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(this.generatedCoverLetter())}`);
    element.setAttribute('download', 'cover-letter.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    this.successMessage.set('Downloaded as text file!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  downloadAsMarkdown() {
    const markdown = `# Cover Letter\n\n${this.generatedCoverLetter()}`;
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`);
    element.setAttribute('download', 'cover-letter.md');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    this.successMessage.set('Downloaded as markdown file!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedCoverLetter()).then(() => {
      this.successMessage.set('Copied to clipboard!');
      setTimeout(() => this.successMessage.set(null), 3000);
    });
  }

  startOver() {
    this.currentStep.set('resume');
    this.jobTitle.set('');
    this.companyName.set('');
    this.jobDescription.set('');
    this.generatedCoverLetter.set('');
    this.successMessage.set('Ready to generate another cover letter!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  clearApiKey() {
    localStorage.removeItem('ai_api_key');
    localStorage.removeItem('ai_provider');
    this.apiKey.set('');
    this.isApiKeySet.set(false);
    this.currentStep.set('config');
    this.successMessage.set('API key cleared!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
