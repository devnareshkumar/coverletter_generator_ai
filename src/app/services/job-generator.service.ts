import { Injectable } from '@angular/core';
import { JobDetails } from '../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobGeneratorService {
  generatePrompt(details: JobDetails): string {
    const toneGuide = {
      professional: 'professional and confident',
      casual: 'friendly and approachable',
      formal: 'formal and respectful'
    };

    return `You are an expert career coach. Generate a compelling cover letter for the following position:

Position: ${details.jobTitle}
Company: ${details.companyName}

Job Description:
${details.jobDescription}

Applicant's Experience:
${details.yourExperience}

Requirements:
- Write in a ${toneGuide[details.tone]} tone
- Length: 250-350 words
- Include specific examples from the job description
- Highlight relevant skills and experience
- Make it personalized and compelling
- Structure: Opening, 2-3 body paragraphs, closing

Please write the cover letter now:`;
  }

  downloadAsText(content: string, filename: string = 'cover-letter.txt') {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  downloadAsMarkdown(content: string, filename: string = 'cover-letter.md') {
    const markdown = `# Cover Letter\n\n${content}`;
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  copyToClipboard(content: string): Promise<boolean> {
    return navigator.clipboard.writeText(content)
      .then(() => true)
      .catch(() => false);
  }
}
