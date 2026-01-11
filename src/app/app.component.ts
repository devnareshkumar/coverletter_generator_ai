import { Component, signal, PLATFORM_ID, Inject, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AIService } from './services/ai.service';
import { FileParserService } from './services/file-parser.service';
import { ThemeService, Theme } from './services/theme.service';
import { ResumeData, Experience, Project, Education } from './models/job.model';
import { GenerationModalComponent, GenerationResult } from './generation-modal.component';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, GenerationModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  currentStep = signal<'main' | 'output'>('main');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  private isBrowser: boolean;

  // Config
  apiKey = signal('');
  aiModels = [
    { id: 'sonar', name: 'Sonar' },
    { id: 'sonar pro', name: 'Sonar Pro' },
    { id: 'sonar reasoning pro', name: 'Sonar Reasoning Pro' },
    { id: 'sonar deep research', name: 'Sonar Deep Research' }
  ];
  selectedAiModel = signal(this.aiModels[0].id);

  // Resume upload
  resumeText = signal('');
  selectedFile = signal<File | null>(null);
  resumeParsed = signal(false); // New signal to track if resume has been parsed

  // Parsed resume data
  resumeData = signal<ResumeData | null>(null);

  // Getter to determine if resume data is ready for generation
  get isResumeReady(): boolean {
    return this.resumeParsed() && this.resumeData() !== null && Object.keys(this.resumeData() || {}).length > 0;
  }


  // Job form
  jobTitle = signal('');
  companyName = signal('');
  jobDescription = signal('');
  writingTone = signal<'professional' | 'casual' | 'formal'>('professional');
  selectedTemplate = signal<'classic' | 'modern' | 'creative'>('classic');

  // New signals and getters for generation logic
  generateInProgress = signal(false);

  get jobDetailsValid(): boolean {
    return !!this.jobTitle() && !!this.companyName() && !!this.jobDescription();
  }

  // Output
  generatedCoverLetter = signal('');

  // Modal states
  showProfileModal = false;
  activeModalTab = signal<'basic' | 'experience' | 'projects' | 'education'>('basic');

  // Generation modal
  showGenerationModal = signal(false);
  generationResult = signal<GenerationResult | null>(null);

  // Edit indices (null for add, number for edit)
  editingExperienceIndex: number | null = null;
  editingProjectIndex: number | null = null;
  editingEducationIndex: number | null = null;

  // Flags to track if we're adding new items
  isAddingExperience = false;
  isAddingProject = false;
  isAddingEducation = false;

  // Edit data
  editProfileData = {
    name: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    skillsString: ''
  };

  editExperienceData: Experience = {
    position: '',
    company: '',
    duration: '',
    description: ''
  };

  editProjectData = {
    name: '',
    description: '',
    technologiesString: '',
    link: ''
  };

  editEducationData: Education = {
    degree: '',
    institution: '',
    year: '',
    details: ''
  };

  constructor(
    private aiService: AIService,
    private fileParserService: FileParserService,
    @Inject(PLATFORM_ID) platformId: object,
    public themeService: ThemeService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.themeService.startSystemThemeListener();
    }
  }

  setTheme(theme: string) {
    this.themeService.setTheme(theme as Theme);
  }

  updateResumeData(key: keyof ResumeData, value: any) {
    const currentData = this.resumeData();
    if (currentData) {
      // Create a new object to ensure change detection
      const updatedData = { ...currentData, [key]: value };
      this.resumeData.set(updatedData);
    }
  }

  updateSkills(skillsString: string) {
    const skillsArray = skillsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
    this.updateResumeData('skills', skillsArray);
  }

  updateExperience(index: number, field: keyof Experience, value: any) {
    const currentData = this.resumeData();
    if (currentData && currentData.experience[index]) {
      const updatedExperience = { ...currentData.experience[index], [field]: value };
      const updatedExperiences = [...currentData.experience];
      updatedExperiences[index] = updatedExperience;
      this.updateResumeData('experience', updatedExperiences);
    }
  }

  onFileSelected(event: Event) {
    console.log('onFileSelected called', event);
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);
      this.resumeText.set(''); // Clear text area if file is selected
      this.errorMessage.set(null); // Clear any previous error
    } else {
      this.selectedFile.set(null);
    }
  }

  // Step 2: Parse Resume
  parseResume() {
    console.log('parseResume called');
    this.errorMessage.set(null);
    this.isLoading.set(true);

    if (this.selectedFile()) {
      this.fileParserService.parseFile(this.selectedFile()!).subscribe({
        next: (content) => {
          this.callAIServiceForParsing(content);
        },
        error: (error) => {
          this.errorMessage.set(error.message);
          this.isLoading.set(false);
        }
      });
    } else if (this.resumeText()) {
      this.callAIServiceForParsing(this.resumeText());
    } else {
      this.errorMessage.set('Please paste your resume or upload a file.');
      this.isLoading.set(false);
    }
  }

  private callAIServiceForParsing(content: string) {
    if (!content) {
      this.errorMessage.set('Resume content is empty.');
      this.isLoading.set(false);
      return;
    }
    if (!this.apiKey()) {
      this.errorMessage.set('Please enter your Perplexity API key.');
      this.isLoading.set(false);
      return;
    }

    this.aiService.parseResume(content, this.apiKey(), this.selectedAiModel()).subscribe({
      next: (response: any) => {
        try {
          let jsonStr = typeof response === 'string' ? response : response.content || response;
          
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
          }
          
          const parsed = JSON.parse(jsonStr);
          this.resumeData.set(parsed);
          this.resumeParsed.set(true); // Set resumeParsed to true on successful parsing
          this.successMessage.set('Resume parsed successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
        } catch (error: any) {
          this.errorMessage.set('Failed to parse resume. Please check the format and try again.');
          this.resumeParsed.set(false); // Reset on error
        }
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.errorMessage.set(`Error: ${error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  // Step 3: Generate Cover Letter
  generateCoverLetter() {
    console.log('generateCoverLetter called');
    this.errorMessage.set(null);

    if (!this.apiKey()) {
      this.errorMessage.set('Please enter your Perplexity API key before generating.');
      return;
    }
    if (!this.isResumeReady) {
      this.errorMessage.set('Please parse your resume first.');
      return;
    }
    if (!this.jobDetailsValid) {
      this.errorMessage.set('Please fill in all job details (Job Title, Company Name, Job Description).');
      return;
    }

    this.generateInProgress.set(true);
    
    // If resumeData is not set, parse resume first (this case should ideally be handled by isResumeReady check)
    // The previous logic here was redundant given the isResumeReady check.
    // We can proceed directly to generate if isResumeReady is true.
    this.proceedToGenerate();
  }

  // Generate Resume
  generateResume() {
    console.log('generateResume called');
    this.errorMessage.set(null);

    if (!this.resumeData()) {
      this.errorMessage.set('Please upload and parse your resume first before generating a tailored resume.');
      return;
    }
    if (!this.apiKey()) {
      this.errorMessage.set('Please enter your Perplexity API key before generating.');
      return;
    }
    if (!this.isResumeReady) {
      this.errorMessage.set('Please parse your resume first.');
      return;
    }
    if (!this.jobTitle() || !this.companyName()) {
      this.errorMessage.set('Please fill in Job Title and Company Name.');
      return;
    }

    this.generateInProgress.set(true);
    const prompt = this.buildResumePrompt();

    this.aiService.generateResume(
      prompt,
      this.apiKey(),
      this.selectedAiModel()
    ).subscribe({
      next: (response: any) => {
        const result: GenerationResult = {
          resume: response.content || response,
          type: 'resume'
        };
        this.generationResult.set(result);
        this.showGenerationModal.set(true);
        this.generateInProgress.set(false);
        this.successMessage.set('Resume generated successfully!');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error: any) => {
        this.errorMessage.set(`Error generating resume: ${error.message}`);
        this.generateInProgress.set(false);
      }
    });
  }

  // Generate Both Cover Letter and Resume
  generateBoth() {
    console.log('generateBoth called');
    this.errorMessage.set(null);

    if (!this.apiKey()) {
      this.errorMessage.set('Please enter your Perplexity API key before generating.');
      return;
    }
    if (!this.isResumeReady) {
      this.errorMessage.set('Please parse your resume first.');
      return;
    }
    if (!this.jobDetailsValid) {
      this.errorMessage.set('Please fill in all job details (Job Title, Company Name, Job Description).');
      return;
    }

    this.generateInProgress.set(true);
    // The previous logic here was redundant given the isResumeReady check.
    // We can proceed directly to generate if isResumeReady is true.
    this.proceedToGenerateBoth();
  }

  private callAIServiceForParsingAndGenerate(content: string) {
    if (!content) {
      this.errorMessage.set('Resume content is empty for generation.');
      this.isLoading.set(false);
      return;
    }
    this.aiService.parseResume(content, this.apiKey(), this.selectedAiModel()).subscribe({
      next: (response: any) => {
        try {
          let jsonStr = typeof response === 'string' ? response : response.content || response;
          
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
          }
          
          const parsed = JSON.parse(jsonStr);
          this.resumeData.set(parsed);
          this.resumeParsed.set(true); // Set resumeParsed to true on successful parsing
          this.proceedToGenerate(); // Only proceed to generate after successful parsing
        } catch (error: any) {
          this.errorMessage.set('Failed to parse resume before generating. Please check the format.');
          this.resumeParsed.set(false); // Reset on error
          this.isLoading.set(false);
        }
      },
      error: (error: any) => {
        this.errorMessage.set(`Error parsing resume before generating: ${error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  private proceedToGenerate() {
    this.generateInProgress.set(true);
    const prompt = this.buildPrompt();

    this.aiService.generateCoverLetter(
      prompt,
      this.apiKey(),
      this.selectedAiModel()
    ).subscribe({
      next: (response: any) => {
        const result: GenerationResult = {
          coverLetter: response.content || response,
          type: 'coverLetter'
        };
        this.generationResult.set(result);
        this.showGenerationModal.set(true);
        this.generateInProgress.set(false);
        this.successMessage.set('Cover letter generated successfully!');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error: any) => {
        this.errorMessage.set(`Error generating cover letter: ${error.message}`);
        this.generateInProgress.set(false);
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
          `Position: ${e.position} at ${e.company} (${e.duration || 'duration not specified'})
Key Achievements: ${e.description}`
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

  private buildResumePrompt(): string {
    if (!this.resumeData()) return '';

    const resume = this.resumeData()!;
    const toneGuide = {
      professional: 'professional, confident, and competent',
      casual: 'friendly, approachable, and genuine',
      formal: 'formal, respectful, and eloquent'
    };

    // Extract user's actual resume content
    const educationText = resume.education
      ? resume.education.map((e: any) => `${e.degree} from ${e.institution} (${e.year})`).join(', ')
      : 'Not provided';

    const experienceText = resume.experience
      ? resume.experience.map((e: any) =>
          `Position: ${e.position} at ${e.company} (${e.duration || 'duration not specified'})
Key Achievements: ${e.description}`
        ).join('\n\n')
      : 'Not provided';

    const projectsText = resume.projects
      ? resume.projects.map((p: any) =>
          `Project: ${p.name}\nDescription: ${p.description}\nTechnologies: ${(p.technologies || []).join(', ')}`
        ).join('\n\n')
      : 'Not provided';

    const skillsText = resume.skills && resume.skills.length > 0
      ? resume.skills.slice(0, 15).join(', ')
      : 'Not provided';

    return `You are an expert career coach and professional resume writer. Your task is to OPTIMIZE and TAILOR an existing resume for a specific job application.

CRITICAL RULES:
- DO NOT invent new experiences, companies, projects, or skills
- DO NOT create fake achievements or qualifications
- ONLY use the candidate's actual experience provided below
- Reorder, emphasize, and rephrase existing content to match the job
- Add relevant keywords from the job description ONLY if they genuinely match the candidate's skills
- Keep all dates, companies, and positions exactly as provided

CANDIDATE'S ACTUAL RESUME DATA:
Name: ${resume.name || 'Not provided'}
Contact: ${resume.email || ''} | ${resume.phone || ''}
Location: ${resume.location || 'Not provided'}

PROFESSIONAL SUMMARY:
${resume.summary || 'A skilled professional with diverse experience.'}

ACTUAL SKILLS (do not add new ones):
${skillsText}

ACTUAL PROFESSIONAL EXPERIENCE (keep all details intact):
${experienceText}

ACTUAL PROJECTS & ACCOMPLISHMENTS (do not invent new ones):
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

TAILORING INSTRUCTIONS:

1. RESUME STRUCTURE (keep professional format):
   - Contact Information (use candidate's actual details)
   - Professional Summary (optimize existing summary for this job)
   - Core Competencies/Skills (prioritize job-relevant skills from candidate's actual skills)
   - Professional Experience (reorder to put most relevant experience first, emphasize job-matching achievements)
   - Education (keep as provided)
   - Projects (highlight most relevant projects first)

2. TAILORING APPROACH:
   - Reorder experience sections to prioritize job-relevant roles
   - Emphasize achievements that match job requirements
   - Use keywords from job description that appear in candidate's actual experience/skills
   - Rephrase bullet points to better highlight job-relevant aspects
   - Keep all factual information (companies, dates, positions) exactly the same

3. CONTENT RULES:
   - Use a ${this.writingTone()} and ${toneGuide[this.writingTone()]} tone
   - Include quantifiable achievements and metrics where present in original
   - Use action verbs (designed, led, architected, implemented, etc.)
   - Length: Appropriate for experience level (1-2 pages worth of content)
   - Show career progression using candidate's actual timeline

4. ATS OPTIMIZATION:
   - Include job title variations where they match candidate's actual roles
   - Use standard section headers
   - Maintain clear formatting

5. ABSOLUTELY FORBIDDEN:
   - Do not create new job experiences
   - Do not invent new companies or projects
   - Do not add skills the candidate doesn't actually have
   - Do not fabricate achievements or qualifications
   - Do not change dates, company names, or job titles

NOW, optimize and tailor the candidate's existing resume for this specific job application. Use only their actual experience and qualifications:`;
  }

  private callAIServiceForParsingAndGenerateBoth(content: string) {
    if (!content) {
      this.errorMessage.set('Resume content is empty for generation.');
      this.isLoading.set(false);
      return;
    }
    this.aiService.parseResume(content, this.apiKey(), this.selectedAiModel()).subscribe({
      next: (response: any) => {
        try {
          let jsonStr = typeof response === 'string' ? response : response.content || response;

          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
          }

          const parsed = JSON.parse(jsonStr);
          this.resumeData.set(parsed);
          this.resumeParsed.set(true); // Set resumeParsed to true on successful parsing
          this.proceedToGenerateBoth(); // Only proceed to generate after successful parsing
        } catch (error: any) {
          this.errorMessage.set('Failed to parse resume before generating. Please check the format.');
          this.resumeParsed.set(false); // Reset on error
          this.isLoading.set(false);
        }
      },
      error: (error: any) => {
        this.errorMessage.set(`Error parsing resume before generating: ${error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  private proceedToGenerateBoth() {
    this.generateInProgress.set(true);
    const coverLetterPrompt = this.buildPrompt();
    const resumePrompt = this.buildResumePrompt();

    // Generate both cover letter and resume
    const combinedPrompt = `Please generate both a cover letter and a resume for the following job application:

FIRST, generate the COVER LETTER:
${coverLetterPrompt}

SECOND, generate the RESUME:
${resumePrompt}

Please provide both documents clearly separated with headers.`;

    this.aiService.generateCoverLetter(
      combinedPrompt,
      this.apiKey(),
      this.selectedAiModel()
    ).subscribe({
      next: (response: any) => {
        const content = response.content || response;
        // Parse the combined response to separate cover letter and resume
        const result: GenerationResult = this.parseCombinedResponse(content);
        this.generationResult.set(result);
        this.showGenerationModal.set(true);
        this.generateInProgress.set(false);
        this.successMessage.set('Cover letter and resume generated successfully!');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (error: any) => {
        this.errorMessage.set(`Error generating documents: ${error.message}`);
        this.generateInProgress.set(false);
      }
    });
  }

  // Step 4: Output Actions
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

  downloadAsPdf() {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const text = this.generatedCoverLetter();
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    doc.text(lines, margin, margin);
    doc.save('cover-letter.pdf');
    this.successMessage.set('Downloaded as PDF file!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.generatedCoverLetter()).then(() => {
      this.successMessage.set('Copied to clipboard!');
      setTimeout(() => this.successMessage.set(null), 3000);
    });
  }

  startOver() {
    this.currentStep.set('main');
    this.jobTitle.set('');
    this.companyName.set('');
    this.jobDescription.set('');
    this.generatedCoverLetter.set('');
    this.successMessage.set('Ready to generate another cover letter!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  // Profile Modal Methods
  openProfileModal() {
    if (this.resumeData()) {
      const data = this.resumeData()!;
      this.editProfileData = {
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || '',
        summary: data.summary || '',
        skillsString: data.skills ? data.skills.join(', ') : ''
      };
      this.activeModalTab.set('basic');
      this.showProfileModal = true;
    }
  }

  closeProfileModal() {
    this.showProfileModal = false;
    this.activeModalTab.set('basic');
    // Reset all editing flags
    this.editingExperienceIndex = null;
    this.editingProjectIndex = null;
    this.editingEducationIndex = null;
    this.isAddingExperience = false;
    this.isAddingProject = false;
    this.isAddingEducation = false;
  }

  setActiveTab(tab: 'basic' | 'experience' | 'projects' | 'education') {
    this.activeModalTab.set(tab);
  }

  updateProfile() {
    if (this.resumeData()) {
      const updatedData = { ...this.resumeData()! };
      updatedData.name = this.editProfileData.name;
      updatedData.email = this.editProfileData.email;
      updatedData.phone = this.editProfileData.phone;
      updatedData.location = this.editProfileData.location;
      updatedData.summary = this.editProfileData.summary;
      updatedData.skills = this.editProfileData.skillsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
      this.resumeData.set(updatedData);
      this.closeProfileModal();
      this.successMessage.set('Profile updated successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  // Experience Modal Methods
  addExperience() {
    this.editingExperienceIndex = null;
    this.isAddingExperience = true;
    this.editExperienceData = {
      position: '',
      company: '',
      duration: '',
      description: ''
    };
    this.activeModalTab.set('experience');
    this.showProfileModal = true;
  }

  editExperience(index: number) {
    if (this.resumeData()?.experience?.[index]) {
      this.editingExperienceIndex = index;
      this.isAddingExperience = false;
      this.editExperienceData = { ...this.resumeData()!.experience![index] };
      this.activeModalTab.set('experience');
      this.showProfileModal = true;
    }
  }

  closeExperienceModal() {
    this.showProfileModal = false;
    this.editingExperienceIndex = null;
    this.isAddingExperience = false;
    this.activeModalTab.set('basic');
  }

  saveExperience() {
    if (this.resumeData()) {
      const updatedData = { ...this.resumeData()! };
      if (!updatedData.experience) {
        updatedData.experience = [];
      }

      if (this.editingExperienceIndex !== null) {
        // Edit existing
        updatedData.experience[this.editingExperienceIndex] = { ...this.editExperienceData };
      } else {
        // Add new
        updatedData.experience.push({ ...this.editExperienceData });
      }

      this.resumeData.set(updatedData);
      this.closeExperienceModal();
      this.successMessage.set(`Experience ${this.editingExperienceIndex !== null ? 'updated' : 'added'} successfully!`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  deleteExperience(index: number) {
    if (this.resumeData()?.experience && confirm('Are you sure you want to delete this experience?')) {
      const updatedData = { ...this.resumeData()! };
      updatedData.experience!.splice(index, 1);
      this.resumeData.set(updatedData);
      this.successMessage.set('Experience deleted successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  // Project Modal Methods
  addProject() {
    this.editingProjectIndex = null;
    this.isAddingProject = true;
    this.editProjectData = {
      name: '',
      description: '',
      technologiesString: '',
      link: ''
    };
    this.activeModalTab.set('projects');
    this.showProfileModal = true;
  }

  editProject(index: number) {
    if (this.resumeData()?.projects?.[index]) {
      this.editingProjectIndex = index;
      this.isAddingProject = false;
      const project = this.resumeData()!.projects![index];
      this.editProjectData = {
        name: project.name,
        description: project.description,
        technologiesString: project.technologies ? project.technologies.join(', ') : '',
        link: project.link || ''
      };
      this.activeModalTab.set('projects');
      this.showProfileModal = true;
    }
  }

  closeProjectModal() {
    this.showProfileModal = false;
    this.editingProjectIndex = null;
    this.isAddingProject = false;
    this.activeModalTab.set('basic');
  }

  saveProject() {
    if (this.resumeData()) {
      const updatedData = { ...this.resumeData()! };
      if (!updatedData.projects) {
        updatedData.projects = [];
      }

      const projectData: Project = {
        name: this.editProjectData.name,
        description: this.editProjectData.description,
        technologies: this.editProjectData.technologiesString.split(',').map(s => s.trim()).filter(s => s.length > 0),
        link: this.editProjectData.link || undefined
      };

      if (this.editingProjectIndex !== null) {
        // Edit existing
        updatedData.projects[this.editingProjectIndex] = projectData;
      } else {
        // Add new
        updatedData.projects.push(projectData);
      }

      this.resumeData.set(updatedData);
      this.closeProjectModal();
      this.successMessage.set(`Project ${this.editingProjectIndex !== null ? 'updated' : 'added'} successfully!`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  deleteProject(index: number) {
    if (this.resumeData()?.projects && confirm('Are you sure you want to delete this project?')) {
      const updatedData = { ...this.resumeData()! };
      updatedData.projects!.splice(index, 1);
      this.resumeData.set(updatedData);
      this.successMessage.set('Project deleted successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  // Education Modal Methods
  addEducation() {
    this.editingEducationIndex = null;
    this.isAddingEducation = true;
    this.editEducationData = {
      degree: '',
      institution: '',
      year: '',
      details: ''
    };
    this.activeModalTab.set('education');
    this.showProfileModal = true;
  }

  editEducation(index: number) {
    if (this.resumeData()?.education?.[index]) {
      this.editingEducationIndex = index;
      this.isAddingEducation = false;
      this.editEducationData = { ...this.resumeData()!.education![index] };
      this.activeModalTab.set('education');
      this.showProfileModal = true;
    }
  }

  closeEducationModal() {
    this.showProfileModal = false;
    this.editingEducationIndex = null;
    this.isAddingEducation = false;
    this.activeModalTab.set('basic');
  }

  saveEducation() {
    if (this.resumeData()) {
      const updatedData = { ...this.resumeData()! };
      if (!updatedData.education) {
        updatedData.education = [];
      }

      if (this.editingEducationIndex !== null) {
        // Edit existing
        updatedData.education[this.editingEducationIndex] = { ...this.editEducationData };
      } else {
        // Add new
        updatedData.education.push({ ...this.editEducationData });
      }

      this.resumeData.set(updatedData);
      this.closeEducationModal();
      this.successMessage.set(`Education ${this.editingEducationIndex !== null ? 'updated' : 'added'} successfully!`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  deleteEducation(index: number) {
    if (this.resumeData()?.education && confirm('Are you sure you want to delete this education?')) {
      const updatedData = { ...this.resumeData()! };
      updatedData.education!.splice(index, 1);
      this.resumeData.set(updatedData);
      this.successMessage.set('Education deleted successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  private parseCombinedResponse(content: string): GenerationResult {
    // Try to parse the combined response into separate cover letter and resume
    const lowerContent = content.toLowerCase();

    // Look for common separators
    const separators = [
      '=== resume ===',
      '===resume===',
      'resume:',
      '## resume',
      '# resume',
      'resume\n',
      'second',
      'resume section'
    ];

    let coverLetter = '';
    let resume = '';

    for (const separator of separators) {
      const index = lowerContent.indexOf(separator.toLowerCase());
      if (index !== -1) {
        coverLetter = content.substring(0, index).trim();
        resume = content.substring(index + separator.length).trim();
        break;
      }
    }

    // If no separator found, try to split by looking for resume keywords
    if (!coverLetter || !resume) {
      const resumeKeywords = ['experience', 'skills', 'education', 'projects'];
      let splitIndex = content.length;

      for (const keyword of resumeKeywords) {
        const index = lowerContent.indexOf(keyword);
        if (index !== -1 && index < splitIndex && index > content.length * 0.3) {
          splitIndex = index;
        }
      }

      if (splitIndex < content.length) {
        coverLetter = content.substring(0, splitIndex).trim();
        resume = content.substring(splitIndex).trim();
      } else {
        // Fallback: assume first half is cover letter, second half is resume
        const midPoint = Math.floor(content.length / 2);
        coverLetter = content.substring(0, midPoint).trim();
        resume = content.substring(midPoint).trim();
      }
    }

    return {
      coverLetter: coverLetter || content,
      resume: resume || content,
      type: 'both'
    };
  }

  closeGenerationModal() {
    this.showGenerationModal.set(false);
    this.generationResult.set(null);
  }
}