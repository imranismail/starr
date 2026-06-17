import * as fs from 'fs';
import { injectable } from 'inversify';

@injectable()
export class FileUtils {
  writeConfigFile(content: string, outputPath: string, isDryRun: boolean): void {
    if (isDryRun) {
      console.log(`🟢 Would generate ${outputPath}`);
      return;
    }

    try {
      // Check if content is actually different before writing
      let existingContent = '';
      if (fs.existsSync(outputPath)) {
        try {
          existingContent = fs.readFileSync(outputPath, 'utf8');
        } catch (readError) {
          // File exists but can't be read, proceed with write
          console.warn(`⚠️  Warning: Could not read existing ${outputPath}, overwriting`);
        }
      }

      // Only write if content has changed
      if (existingContent !== content) {
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`✅ Generated ${outputPath}`);
      } else {
        console.log(`✨ ${outputPath} is already up to date`);
      }
    } catch (error: any) {
      console.error(`❌ Error writing ${outputPath}:`, error.message);
    }
  }

  readTemplate(templatePath: string): string {
    if (!fs.existsSync(templatePath)) {
      console.warn(`⚠️  Warning: Template file ${templatePath} not found`);
      return '';
    }

    try {
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error: any) {
      console.error(`❌ Error reading template ${templatePath}:`, error.message);
      return '';
    }
  }

  fileExists(path: string): boolean {
    return fs.existsSync(path);
  }

  readJsonFile(path: string): any {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  }
}
