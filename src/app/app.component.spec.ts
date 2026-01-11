import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AIService } from './services/ai.service';
import { ThemeService } from './services/theme.service';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let aiServiceSpy: jasmine.SpyObj<AIService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  beforeEach(async () => {
    // Create jasmine spies for the services
    aiServiceSpy = jasmine.createSpyObj('AIService', ['parseResume', 'generateCoverLetter']);
    themeServiceSpy = jasmine.createSpyObj('ThemeService', ['startSystemThemeListener', 'setTheme']);

    await TestBed.configureTestingModule({
      imports: [AppComponent, FormsModule, CommonModule], // Import standalone component and modules it uses
      providers: [
        { provide: AIService, useValue: aiServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initial change detection to bind properties
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.currentStep()).toBe('main');
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(component.successMessage()).toBeNull();
    expect(component.apiKey()).toBe('');
    expect(component.resumeText()).toBe('');
    expect(component.selectedFile()).toBeNull();
  });

  // --- onFileSelected Tests ---
  describe('onFileSelected', () => {
    it('should set selectedFile and clear resumeText when a file is selected', () => {
      const mockFile = new File(['resume content'], 'resume.txt', { type: 'text/plain' });
      const mockEvt = { target: { files: [mockFile] } } as unknown as Event;

      component.resumeText.set('some old resume text');
      component.onFileSelected(mockEvt);

      expect(component.selectedFile()).toBe(mockFile);
      expect(component.resumeText()).toBe('');
      expect(component.errorMessage()).toBeNull(); // Ensure error is cleared
    });

    it('should clear selectedFile when no file is selected (e.g., dialog cancelled)', () => {
      component.selectedFile.set(new File([''], 'test.txt'));
      const mockEvt = { target: { files: [] } } as unknown as Event;

      component.onFileSelected(mockEvt);

      expect(component.selectedFile()).toBeNull();
    });
  });

  // --- parseResume Tests ---
  describe('parseResume', () => {
    beforeEach(() => {
      component.apiKey.set('test-api-key');
      aiServiceSpy.parseResume.and.returnValue(of({ content: '```json\n{\"name\": \"John Doe\"}\n```' }));
    });

    it('should show error if no resume text or file is provided', () => {
      component.resumeText.set('');
      component.selectedFile.set(null);
      component.parseResume();
      expect(component.errorMessage()).toBe('Please paste your resume or upload a file.');
      expect(component.isLoading()).toBe(false);
    });

    it('should parse resumeText if no file is selected', () => {
      component.resumeText.set('My resume text');
      component.selectedFile.set(null);
      component.parseResume();
      expect(aiServiceSpy.parseResume).toHaveBeenCalledWith('My resume text', 'test-api-key', component.selectedAiModel());
      expect(component.isLoading()).toBe(false); // Should be false after observable completes
      expect(component.resumeData()?.name).toBe('John Doe');
      expect(component.successMessage()).toBe('Resume parsed successfully!');
    });

    it('should parse selected .txt file content', (done) => {
      const resumeContent = 'File content here';
      const mockFile = new File([resumeContent], 'resume.txt', { type: 'text/plain' });
      component.selectedFile.set(mockFile);
      component.resumeText.set('Should be ignored'); // Ensure file takes precedence

      // Mock FileReader as it's not available in JSDOM
      spyOn(FileReader.prototype, 'readAsText').and.callFake(function(this: FileReader, file: Blob) {
        this.onload!({ target: { result: resumeContent } } as ProgressEvent<FileReader>);
      });

      component.parseResume();

      // Give a tiny moment for async operations to complete if any
      fixture.whenStable().then(() => {
        expect(FileReader.prototype.readAsText).toHaveBeenCalledWith(mockFile);
        expect(aiServiceSpy.parseResume).toHaveBeenCalledWith(resumeContent, 'test-api-key', component.selectedAiModel());
        expect(component.resumeData()?.name).toBe('John Doe');
        expect(component.successMessage()).toBe('Resume parsed successfully!');
        expect(component.isLoading()).toBe(false);
        done();
      });
    });

    it('should show error for unsupported file types (pdf)', () => {
      const mockFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });
      component.selectedFile.set(mockFile);
      component.parseResume();
      expect(component.errorMessage()).toBe('PDF and DOCX file uploads are not directly supported for client-side parsing. Please paste the text content of your resume or upload a plain text file.');
      expect(aiServiceSpy.parseResume).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('should show error for unsupported file types (docx)', () => {
      const mockFile = new File(['docx content'], 'resume.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      component.selectedFile.set(mockFile);
      component.parseResume();
      expect(component.errorMessage()).toBe('PDF and DOCX file uploads are not directly supported for client-side parsing. Please paste the text content of your resume or upload a plain text file.');
      expect(aiServiceSpy.parseResume).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle API parsing error', () => {
      aiServiceSpy.parseResume.and.returnValue(throwError(() => new Error('API failed')));
      component.resumeText.set('My resume text');
      component.parseResume();
      expect(component.errorMessage()).toContain('Error: API failed');
      expect(component.isLoading()).toBe(false);
    });
  });

  // --- generateCoverLetter Tests ---
  describe('generateCoverLetter', () => {
    beforeEach(() => {
      component.apiKey.set('test-api-key');
      component.jobTitle.set('Software Engineer');
      component.companyName.set('Tech Corp');
      component.jobDescription.set('Develop software');
      aiServiceSpy.generateCoverLetter.and.returnValue(of({ content: 'Dear Hiring Manager...' }));
    });

    it('should show error if API key is missing', () => {
      component.apiKey.set('');
      component.generateCoverLetter();
      expect(component.errorMessage()).toBe('Please enter your Perplexity API key before generating.');
    });

    it('should show error if job details are missing', () => {
      component.jobTitle.set('');
      component.generateCoverLetter();
      expect(component.errorMessage()).toBe('Please fill in all job fields');
    });

    it('should show error if no resume content is available', () => {
      component.resumeText.set('');
      component.selectedFile.set(null);
      component.generateCoverLetter();
      expect(component.errorMessage()).toBe('Please paste your resume or upload a file.');
    });

    it('should parse resume and then generate cover letter if resumeData is null (from text)', (done) => {
      component.resumeText.set('My resume text');
      component.resumeData.set(null); // Ensure resumeData is null
      aiServiceSpy.parseResume.and.returnValue(of({ content: '```json\n{\"name\": \"John Doe\"}\n```' }));

      component.generateCoverLetter();

      fixture.whenStable().then(() => {
        expect(aiServiceSpy.parseResume).toHaveBeenCalledWith('My resume text', 'test-api-key', component.selectedAiModel());
        expect(aiServiceSpy.generateCoverLetter).toHaveBeenCalled();
        expect(component.generatedCoverLetter()).toBe('Dear Hiring Manager...');
        expect(component.currentStep()).toBe('output');
        expect(component.isLoading()).toBe(false);
        done();
      });
    });

    it('should parse resume and then generate cover letter if resumeData is null (from .txt file)', (done) => {
        const resumeContent = 'File content for generation';
        const mockFile = new File([resumeContent], 'resume.txt', { type: 'text/plain' });
        component.selectedFile.set(mockFile);
        component.resumeText.set(''); // Ensure text is clear
        component.resumeData.set(null); // Ensure resumeData is null
        aiServiceSpy.parseResume.and.returnValue(of({ content: '```json\n{\"name\": \"Jane Doe\"}\n```' }));

        spyOn(FileReader.prototype, 'readAsText').and.callFake(function(this: FileReader, file: Blob) {
            this.onload!({ target: { result: resumeContent } } as ProgressEvent<FileReader>);
        });

        component.generateCoverLetter();

        fixture.whenStable().then(() => {
            expect(FileReader.prototype.readAsText).toHaveBeenCalledWith(mockFile);
            expect(aiServiceSpy.parseResume).toHaveBeenCalledWith(resumeContent, 'test-api-key', component.selectedAiModel());
            expect(aiServiceSpy.generateCoverLetter).toHaveBeenCalled();
            expect(component.generatedCoverLetter()).toBe('Dear Hiring Manager...');
            expect(component.currentStep()).toBe('output');
            expect(component.isLoading()).toBe(false);
            done();
        });
    });

    it('should generate cover letter directly if resumeData is already available', () => {
      component.resumeData.set({ name: 'Existing User' } as any); // Mock some existing resume data
      component.generateCoverLetter();
      expect(aiServiceSpy.parseResume).not.toHaveBeenCalled(); // Should not parse again
      expect(aiServiceSpy.generateCoverLetter).toHaveBeenCalled();
      expect(component.generatedCoverLetter()).toBe('Dear Hiring Manager...');
      expect(component.currentStep()).toBe('output');
      expect(component.isLoading()).toBe(false);
    });

    it('should handle API generation error', () => {
      aiServiceSpy.generateCoverLetter.and.returnValue(throwError(() => new Error('Generation failed')));
      component.resumeData.set({ name: 'Existing User' } as any);
      component.generateCoverLetter();
      expect(component.errorMessage()).toContain('Error generating cover letter: Generation failed');
      expect(component.isLoading()).toBe(false);
    });
  });

  // --- other signal clearing tests ---
  it('should clear selectedFile when resumeText is manually updated', () => {
    component.selectedFile.set(new File([''], 'test.txt'));
    component.resumeText.set('new text input');
    expect(component.selectedFile()).toBeNull();
  });
});
