import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';

export interface GenerationResult {
  coverLetter?: string;
  resume?: string;
  type: 'coverLetter' | 'resume' | 'both';
}

@Component({
  selector: 'app-generation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" [class.closing]="isClosing" (click)="onClose()">
      <div class="modal-container">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-title-section">
              <div class="modal-icon">
                <i class="fa-solid" [class]="getModalIcon()"></i>
              </div>
              <div class="modal-title-content">
                <h2 class="modal-title">{{ getModalTitle() }}</h2>
                <p class="modal-subtitle">{{ getModalSubtitle() }}</p>
              </div>
            </div>
            <button class="modal-close-btn" (click)="onClose()" aria-label="Close modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Cover Letter Section -->
            <div *ngIf="data?.coverLetter" class="content-section">
              <div class="content-header">
                <div class="content-icon">
                  <i class="fa-solid fa-envelope-open-text"></i>
                </div>
                <h3 class="content-title">Cover Letter</h3>
                <span class="content-badge">Personalized</span>
              </div>
              <div class="content-text" [innerHTML]="formatText(data!.coverLetter!)"></div>
            </div>

            <!-- Resume Section -->
            <div *ngIf="data?.resume" class="content-section">
              <div class="content-header">
                <div class="content-icon">
                  <i class="fa-solid fa-file-user"></i>
                </div>
                <h3 class="content-title">Resume</h3>
                <span class="content-badge">ATS-Optimized</span>
              </div>
              <div class="content-text" [innerHTML]="formatText(data!.resume!)"></div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="modal-footer">
            <div class="action-groups">
              <div class="primary-actions">
                <button class="btn btn-primary" (click)="copyToClipboard()" [disabled]="isCopying()">
                  <i class="fa-solid fa-copy"></i>
                  <span>{{ isCopying() ? 'Copying...' : 'Copy All' }}</span>
                </button>
              </div>

              <div class="secondary-actions">
                <button class="btn btn-secondary" (click)="downloadAsTxt()">
                  <i class="fa-solid fa-file-text"></i>
                  <span>TXT</span>
                </button>
                <button class="btn btn-secondary" (click)="downloadAsMd()">
                  <i class="fa-solid fa-file-code"></i>
                  <span>MD</span>
                </button>
                <button class="btn btn-secondary" (click)="downloadAsPdf()">
                  <i class="fa-solid fa-file-pdf"></i>
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Status Messages -->
          <div *ngIf="message()" class="status-message" [class]="messageType()">
            <div class="message-icon">
              <i class="fa-solid" [class]="messageType() === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'"></i>
            </div>
            <span class="message-text">{{ message() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== MODAL OVERLAY ===== */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeInOverlay 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .modal-overlay.closing {
      animation: fadeOutOverlay 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    /* ===== MODAL CONTAINER ===== */
    .modal-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 2rem;
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .modal-overlay.closing .modal-container {
      animation: scaleOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    /* ===== MODAL CONTENT ===== */
    .modal-content {
      background: var(--color-surface);
      border-radius: 16px;
      box-shadow:
        0 25px 50px rgba(0, 0, 0, 0.25),
        0 15px 35px rgba(0, 0, 0, 0.15),
        0 5px 15px rgba(0, 0, 0, 0.1);
      max-width: 900px;
      max-height: 90vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }

    /* ===== MODAL HEADER ===== */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 2rem 2rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(135deg, var(--color-surface) 0%, rgba(var(--color-primary-rgb), 0.02) 100%);
    }

    .modal-title-section {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      flex: 1;
    }

    .modal-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.25rem;
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
    }

    .modal-title-content {
      flex: 1;
    }

    .modal-title {
      margin: 0 0 0.25rem 0;
      color: var(--color-text);
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .modal-subtitle {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 400;
    }

    .modal-close-btn {
      background: none;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      margin-left: 1rem;
    }

    .modal-close-btn:hover {
      background: var(--color-background);
      color: var(--color-text);
      transform: scale(1.05);
    }

    .modal-close-btn:active {
      transform: scale(0.95);
    }

    /* ===== MODAL BODY ===== */
    .modal-body {
      padding: 2rem;
      overflow-y: auto;
      flex: 1;
      max-height: calc(90vh - 200px);
    }

    .content-section {
      margin-bottom: 2rem;
    }

    .content-section:last-child {
      margin-bottom: 0;
    }

    .content-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .content-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      font-size: 0.875rem;
    }

    .content-title {
      margin: 0;
      color: var(--color-text);
      font-size: 1.125rem;
      font-weight: 600;
      flex: 1;
    }

    .content-badge {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.2);
    }

    .content-text {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      font-family: var(--font-family-mono);
      font-size: 0.875rem;
      line-height: 1.6;
      white-space: pre-wrap;
      color: var(--color-text);
      max-height: 400px;
      overflow-y: auto;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: box-shadow 0.2s ease;
    }

    .content-text:hover {
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .content-text::-webkit-scrollbar {
      width: 6px;
    }

    .content-text::-webkit-scrollbar-track {
      background: var(--color-background);
      border-radius: 3px;
    }

    .content-text::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: 3px;
    }

    .content-text::-webkit-scrollbar-thumb:hover {
      background: var(--color-text-secondary);
    }

    /* ===== MODAL FOOTER ===== */
    .modal-footer {
      padding: 1.5rem 2rem 2rem;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .action-groups {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
    }

    .primary-actions,
    .secondary-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* ===== BUTTON STYLES ===== */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      color: white;
      box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.2);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-secondary {
      background: var(--color-background);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--color-surface);
      border-color: var(--color-primary);
      color: var(--color-primary);
      transform: translateY(-1px);
    }

    /* ===== STATUS MESSAGES ===== */
    .status-message {
      position: absolute;
      bottom: 1rem;
      left: 2rem;
      right: 2rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 10;
    }

    .status-message.success {
      background: rgba(var(--color-success-rgb), 0.1);
      color: var(--color-success);
      border: 1px solid rgba(var(--color-success-rgb), 0.2);
    }

    .status-message.error {
      background: rgba(var(--color-error-rgb), 0.1);
      color: var(--color-error);
      border: 1px solid rgba(var(--color-error-rgb), 0.2);
    }

    .message-icon {
      flex-shrink: 0;
    }

    .message-text {
      flex: 1;
    }

    /* ===== ANIMATIONS ===== */
    @keyframes fadeInOverlay {
      from {
        opacity: 0;
        backdrop-filter: blur(0px);
      }
      to {
        opacity: 1;
        backdrop-filter: blur(4px);
      }
    }

    @keyframes fadeOutOverlay {
      from {
        opacity: 1;
        backdrop-filter: blur(4px);
      }
      to {
        opacity: 0;
        backdrop-filter: blur(0px);
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes scaleOut {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (max-width: 768px) {
      .modal-container {
        padding: 1rem;
      }

      .modal-content {
        max-height: 95vh;
      }

      .modal-header {
        padding: 1.5rem 1.5rem 1rem;
      }

      .modal-title {
        font-size: 1.25rem;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .modal-footer {
        padding: 1rem 1.5rem 1.5rem;
      }

      .action-groups {
        flex-direction: column;
        gap: 1rem;
      }

      .primary-actions,
      .secondary-actions {
        width: 100%;
        justify-content: center;
      }

      .btn {
        flex: 1;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .modal-title-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .modal-icon {
        width: 40px;
        height: 40px;
        font-size: 1rem;
      }

      .content-header {
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .content-title {
        font-size: 1rem;
      }

      .secondary-actions {
        flex-wrap: wrap;
      }

      .btn span:not(.fa-solid) {
        display: none;
      }
    }
  `]
})
export class GenerationModalComponent {
  @Input() data: GenerationResult | null = null;
  @Output() close = new EventEmitter<void>();

  message = signal<string>('');
  messageType = signal<'success' | 'error'>('success');
  isCopying = signal(false);
  isClosing = false;

  constructor() {}

  getModalTitle(): string {
    const type = this.data?.type;
    switch (type) {
      case 'coverLetter': return 'Cover Letter Generated';
      case 'resume': return 'Resume Generated';
      case 'both': return 'Documents Generated';
      default: return 'Generation Complete';
    }
  }

  getModalSubtitle(): string {
    const type = this.data?.type;
    switch (type) {
      case 'coverLetter': return 'Your personalized cover letter is ready';
      case 'resume': return 'Your optimized resume is ready';
      case 'both': return 'Both documents are ready for download';
      default: return 'Your content has been generated successfully';
    }
  }

  getModalIcon(): string {
    const type = this.data?.type;
    switch (type) {
      case 'coverLetter': return 'fa-envelope-open-text';
      case 'resume': return 'fa-file-user';
      case 'both': return 'fa-files';
      default: return 'fa-check-circle';
    }
  }

  onClose() {
    this.isClosing = true;
    // Wait for animation to complete before emitting close event
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }

  formatText(text: string): string {
    if (!text) return '';

    // Convert line breaks to HTML
    return text
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '')
      // Basic formatting for common patterns
      .replace(/^### (.*$)/gm, '<strong>$1</strong>')
      .replace(/^## (.*$)/gm, '<strong>$1</strong>')
      .replace(/^# (.*$)/gm, '<strong>$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  async copyToClipboard() {
    if (!this.data) return;

    this.isCopying.set(true);
    this.message.set('');

    try {
      let content = '';

      if (this.data.coverLetter) {
        content += '=== COVER LETTER ===\n\n' + this.data.coverLetter + '\n\n';
      }

      if (this.data.resume) {
        content += '=== RESUME ===\n\n' + this.data.resume;
      }

      await navigator.clipboard.writeText(content);

      this.message.set('Content copied to clipboard!');
      this.messageType.set('success');

      // Clear message after 3 seconds
      setTimeout(() => {
        this.message.set('');
      }, 3000);

    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.message.set('Failed to copy to clipboard. Please try again.');
      this.messageType.set('error');

      // Clear error message after 5 seconds
      setTimeout(() => {
        this.message.set('');
      }, 5000);
    } finally {
      this.isCopying.set(false);
    }
  }

  downloadAsTxt(): void {
    if (!this.data) return;

    let content = '';

    if (this.data.coverLetter) {
      content += '=== COVER LETTER ===\n\n' + this.data.coverLetter + '\n\n';
    }

    if (this.data.resume) {
      content += '=== RESUME ===\n\n' + this.data.resume;
    }

    this.downloadBlob(new Blob([content], { type: 'text/plain' }), 'generated-content.txt');
    this.showSuccessMessage('Downloaded as .txt file');
  }

  downloadAsMd(): void {
    if (!this.data) return;

    let content = '';

    if (this.data.coverLetter) {
      content += '# Cover Letter\n\n' + this.data.coverLetter + '\n\n';
    }

    if (this.data.resume) {
      content += '# Resume\n\n' + this.data.resume;
    }

    this.downloadBlob(new Blob([content], { type: 'text/markdown' }), 'generated-content.md');
    this.showSuccessMessage('Downloaded as .md file');
  }

  downloadAsPdf(): void {
    if (!this.data) return;

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const lineHeight = 6;
      let yPosition = 20;

      // Add title
      doc.setFontSize(18);
      doc.text('Generated Documents', 20, yPosition);
      yPosition += lineHeight * 2;

      // Add cover letter if exists
      if (this.data.coverLetter) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('Cover Letter', 20, yPosition);
        yPosition += lineHeight * 1.5;

        doc.setFontSize(10);
        const coverLetterLines = doc.splitTextToSize(this.data.coverLetter, 170);

        for (const line of coverLetterLines) {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += lineHeight;
        }

        yPosition += lineHeight;
      }

      // Add resume if exists
      if (this.data.resume) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text('Resume', 20, yPosition);
        yPosition += lineHeight * 1.5;

        doc.setFontSize(10);
        const resumeLines = doc.splitTextToSize(this.data.resume, 170);

        for (const line of resumeLines) {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += lineHeight;
        }
      }

      doc.save('generated-documents.pdf');
      this.showSuccessMessage('Downloaded as .pdf file');

    } catch (error) {
      console.error('Failed to download pdf:', error);
      this.showErrorMessage('Failed to download .pdf file');
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private showSuccessMessage(message: string) {
    this.message.set(message);
    this.messageType.set('success');
    setTimeout(() => this.message.set(''), 3000);
  }

  private showErrorMessage(message: string) {
    this.message.set(message);
    this.messageType.set('error');
    setTimeout(() => this.message.set(''), 5000);
  }
}