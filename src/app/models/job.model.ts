export interface JobDetails {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  yourExperience: string;
  tone: 'professional' | 'casual' | 'formal';
}

export interface AIResponse {
  content: string;
  provider: string;
  tokens: number;
}

export interface ResumeData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education?: Education[];
  certifications?: string[];
}

export interface Experience {
  position: string;
  company: string;
  duration?: string;
  description: string;
}

export interface Project {
  name: string;
  description: string;
  technologies?: string[];
  link?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year?: string;
  details?: string;
}
