import * as fs from 'fs';

export class FileHelper {
    static getFileSizeMB(filePath: string): number {
        try {
            const stats = fs.statSync(filePath);
            return stats.size / (1024 * 1024);
        } catch {
            return 0;
        }
    }
}
