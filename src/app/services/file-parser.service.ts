import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// For pdfjs-dist, you might need to set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.js';

@Injectable({
  providedIn: 'root'
})
export class FileParserService {

  constructor() {
    // No dynamic import needed here anymore as pdfjsLib is directly imported
  }

  parseFile(file: File): Observable<string> {
    if (file.type === 'application/pdf') {
      return this.parsePdf(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return this.parseDocx(file);
    } else if (file.type === 'text/plain') {
      return this.parseText(file);
    } else {
      return throwError(() => new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.'));
    }
  }

  private parseText(file: File): Observable<string> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e) => {
        observer.next(e.target?.result as string);
        observer.complete();
      };
      reader.onerror = (e) => {
        observer.error(new Error('Failed to read text file.'));
      };
      reader.readAsText(file);
    });
  }

  private parseDocx(file: File): Observable<string> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // mammoth is now directly imported
        mammoth.extractRawText({ arrayBuffer: arrayBuffer })
          .then((result: any) => {
            observer.next(result.value);
            observer.complete();
          })
          .catch((error: any) => {
            observer.error(new Error(`Failed to parse DOCX file: ${error.message}`));
          });
      };
      reader.onerror = (e) => {
        observer.error(new Error('Failed to read DOCX file.'));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  private parsePdf(file: File): Observable<string> {
    return from(file.arrayBuffer()).pipe(
      switchMap(arrayBuffer => {
        return new Observable<string>(observer => {
          // pdfjsLib is now directly imported
          const loadingTask = pdfjsLib.getDocument(arrayBuffer);
          loadingTask.promise.then((pdf: any) => {
            let textContent = '';
            const numPages = pdf.numPages;
            const pagePromises = [];

            for (let i = 1; i <= numPages; i++) {
              pagePromises.push(
                pdf.getPage(i).then((page: any) => {
                  return page.getTextContent();
                }).then((content: any) => {
                  textContent += content.items.map((item: any) => item.str).join(' ') + '\n';
                })
              );
            }

            Promise.all(pagePromises).then(() => {
              observer.next(textContent);
              observer.complete();
            }).catch((error: any) => {
              observer.error(new Error(`Failed to extract text from PDF: ${error.message}`));
            });
          }).catch((error: any) => {
            observer.error(new Error(`Failed to load PDF document: ${error.message}`));
          });
        });
      })
    );
  }
}
