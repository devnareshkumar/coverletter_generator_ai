# AI Cover Letter & Resume Generator

A professional, client-side Angular application designed to streamline the job application process. This tool leverages Generative AI (Perplexity API) to parse existing resumes and generate highly tailored cover letters and optimized resumes for specific job descriptions.

<!-- Replace with actual live demo link if available -->
[Live Demo](https://devnareshkumar.github.io/coverletter_generator_ai/)

## 🚀 Project Purpose

The job market is competitive, and tailoring applications for every role is time-consuming. This project solves that problem by automating the customization process. It demonstrates the integration of modern frontend frameworks with Large Language Models (LLMs) to solve real-world productivity challenges without requiring a complex backend infrastructure.

## ✨ Key Features

-   **Smart Resume Parsing**: Extracts structured data (skills, experience, education) from PDF, DOCX, and TXT files using AI.
-   **Tailored Content Generation**:
    -   **Cover Letters**: Generates personalized letters matching the candidate's experience to the job requirements.
    -   **Resume Optimization**: Reorders and emphasizes relevant experience for specific roles (ATS optimization).
-   **Privacy-First Architecture**: Pure client-side execution. Your API keys and personal data never leave your browser except to communicate directly with the AI provider.
-   **Multi-Model Support**: Choose between various Perplexity models (Sonar, Sonar Pro, Deep Research) for different levels of reasoning.
-   **Rich Export Options**: Download generated documents as PDF, Markdown, or Text files.
-   **Modern UI/UX**:
    -   Dark/Light mode support.
    -   Interactive editing of parsed data.
    -   Responsive design.

## 🛠️ Tech Stack

-   **Framework**: Angular 17 (Standalone Components, Signals)
-   **Language**: TypeScript
-   **AI Integration**: Perplexity AI API
-   **File Processing**:
    -   `pdfjs-dist` (PDF parsing)
    -   `mammoth` (DOCX parsing)
-   **Document Generation**: `jspdf`
-   **Styling**: CSS3, FontAwesome
-   **CI/CD**: GitHub Actions (Automated deployment to GitHub Pages)

## 🔄 How It Works

1.  **Configuration**: The user enters their Perplexity API Key. This key is used locally for API requests.
2.  **Input**:
    -   User uploads a resume (PDF/DOCX/TXT) or pastes text.
    -   The app parses this into a structured JSON format using an LLM prompt.
3.  **Job Context**: User enters the Job Title, Company Name, and Job Description.
4.  **Generation**: The app constructs a sophisticated prompt combining the structured resume data and job details to generate tailored documents.
5.  **Output**: The user can view, copy, or download the generated cover letter and resume.

## 💻 Setup & Local Development

To run this project locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/devnareshkumar/coverletter_generator_ai.git
    cd coverletter_generator_ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    ng serve
    ```

4.  **Access the app**
    Open your browser and navigate to `http://localhost:4200/`.

## 🚀 Deployment

This project is configured for automated deployment to **GitHub Pages** using GitHub Actions.

-   **Workflow**: Located in `.github/workflows/deploy.yml`.
-   **Trigger**: Pushes to the `main` branch automatically build and deploy the application.
-   **Routing**: HashLocationStrategy is enabled to ensure stable routing on static hosts.

## 🔒 Security & Privacy Notes

-   **Client-Side Only**: This application has no backend server.
-   **API Keys**: Your Perplexity API Key is stored in the application state only during the session. It is not saved to any database or local storage by default for security reasons.
-   **Data Handling**: Resume data is processed in the browser memory.

## 🔮 Future Enhancements

-   [ ] LocalStorage integration to save API key (optional) and recent drafts.
-   [ ] Support for additional AI providers (OpenAI, Anthropic).
-   [ ] Drag-and-drop UI for resume sections reordering.

## 👨‍💻 Author

**Naresh Kumar**

-   **LinkedIn**: https://www.linkedin.com/in/naresh-kumar-katta/
-   **GitHub**: https://github.com/devnareshkumar
-   **Buy Me a Coffee**: https://buymeacoffee.com/naresh_kumar
