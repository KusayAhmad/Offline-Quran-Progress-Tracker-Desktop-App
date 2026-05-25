/**
 * Bundle export service.
 * Creates a compressed .zip bundle containing data.json, Excel, PDF, and metadata.
 */

const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Export a full bundle (zip) containing all data.
 * @param {object} db - Database instance
 * @param {string} filepath - Output zip file path
 * @returns {object} - Result
 */
async function exportBundle(db, filepath) {
  const exportService = require('./export');
  const pdfService = require('./export-pdf');

  const zip = new AdmZip();

  // 1. Add data.json (full database export)
  const allData = exportService.getAllData(db);
  zip.addFile('data.json', Buffer.from(JSON.stringify(allData, null, 2), 'utf8'));

  // 2. Add Excel file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-export-'));
  const excelPath = path.join(tmpDir, 'report.xlsx');
  await exportService.exportToExcel(db, excelPath);
  zip.addLocalFile(excelPath, '', 'report.xlsx');

  // 3. Add PDF summary
  const pdfPath = path.join(tmpDir, 'summary.pdf');
  await pdfService.exportSummaryPDF(db, pdfPath);
  zip.addLocalFile(pdfPath, '', 'summary.pdf');

  // 4. Add metadata.json
  const profile = db.prepare('SELECT * FROM profiles LIMIT 1').get() || {};
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE archived = 0').get().count;
  const exportDate = new Date().toISOString();
  const teacherName = profile.name_ar || '';
  const circleName = profile.name_en || '';
  const institution = profile.institution || '';

  // Generate a simple source_id hash from teacher + institution + timestamp
  const sourceStr = teacherName + institution + exportDate;
  let sourceHash = 0;
  for (let i = 0; i < sourceStr.length; i++) {
    const ch = sourceStr.charCodeAt(i);
    sourceHash = ((sourceHash << 5) - sourceHash) + ch;
    sourceHash = sourceHash & sourceHash; // Convert to 32-bit integer
  }
  const sourceId = Math.abs(sourceHash).toString(36);

  const metadata = {
    version: '1.0.0',
    app_version: '1.0.0',
    export_date: exportDate,
    teacher_name: teacherName,
    circle_name: circleName,
    institution: institution,
    source_id: sourceId,
    studentCount
  };
  zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2), 'utf8'));

  // Write zip
  zip.writeZip(filepath);

  // Cleanup temp files
  try {
    fs.unlinkSync(excelPath);
    fs.unlinkSync(pdfPath);
    fs.rmdirSync(tmpDir);
  } catch (e) {
    // Non-critical cleanup
  }

  // Log export
  try {
    db.prepare('INSERT INTO exports_history (type, filename) VALUES (?, ?)').run('bundle', filepath);
  } catch (e) { /* non-critical */ }

  return {
    success: true,
    path: filepath
  };
}

module.exports = {
  exportBundle
};
