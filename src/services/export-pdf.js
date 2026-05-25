/**
 * PDF Export service.
 * Generates PDF reports using pdfkit.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

const STATUS_LABELS = {
  NOT_STARTED: 'لم يبدأ',
  IN_PROGRESS: 'قيد التقدم',
  MEMORIZED: 'محفوظ',
  REVIEW_REQUIRED: 'يحتاج مراجعة',
  WEAK: 'ضعيف',
  PERFECT: 'متقن'
};

/**
 * Export student report to PDF.
 */
function exportStudentPDF(db, studentId, filepath) {
  return new Promise((resolve, reject) => {
    const reportsService = require('./reports');
    const report = reportsService.getStudentReport(db, studentId);

    if (!report) {
      return resolve({ success: false, error: 'Student not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).text('Student Progress Report', { align: 'center' });
    doc.moveDown();

    // Student info
    doc.fontSize(14).text(`Student: ${report.student.name_ar || ''}`);
    if (report.student.name_en) {
      doc.fontSize(12).text(`Name (EN): ${report.student.name_en}`);
    }
    if (report.student.level_name) {
      doc.text(`Level: ${report.student.level_name}`);
    }
    doc.moveDown();

    // Summary
    doc.fontSize(14).text('Progress Summary');
    doc.fontSize(11);
    doc.text(`Total Surahs: ${report.totalSurahs}`);
    doc.text(`Memorized: ${report.memorizedTotal} (${report.progressPercentage}%)`);
    doc.moveDown();

    // Status breakdown
    doc.fontSize(12).text('Status Breakdown:');
    doc.fontSize(10);
    Object.entries(report.statusCounts).forEach(([status, count]) => {
      doc.text(`  ${STATUS_LABELS[status] || status}: ${count}`);
    });
    doc.moveDown();

    // Progress entries (limited)
    if (report.progress.length > 0) {
      doc.fontSize(12).text('Progress Details:');
      doc.fontSize(9);
      const displayProgress = report.progress.slice(0, 50);
      displayProgress.forEach(p => {
        doc.text(`  ${p.surah_name} (${p.surah_no}) - ${STATUS_LABELS[p.status] || p.status}`);
      });
      if (report.progress.length > 50) {
        doc.text(`  ... and ${report.progress.length - 50} more entries`);
      }
    }

    doc.end();

    stream.on('finish', () => {
      try {
        db.prepare('INSERT INTO exports_history (type, filename) VALUES (?, ?)').run('pdf_student', filepath);
      } catch (e) { /* non-critical */ }
      resolve({ success: true, path: filepath });
    });
    stream.on('error', reject);
  });
}

/**
 * Export class report to PDF.
 */
function exportClassPDF(db, filepath) {
  return new Promise((resolve, reject) => {
    const reportsService = require('./reports');
    const report = reportsService.getClassReport(db);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).text('Class Progress Report', { align: 'center' });
    doc.moveDown();

    if (report.profile) {
      doc.fontSize(12).text(`Teacher: ${report.profile.name_ar || ''}`);
      doc.text(`Institution: ${report.profile.institution || ''}`);
      doc.moveDown();
    }

    doc.fontSize(12).text(`Total Students: ${report.totalStudents}`);
    doc.text(`Total Surahs: ${report.totalSurahs}`);
    doc.moveDown();

    // Student summaries
    doc.fontSize(14).text('Student Progress:');
    doc.fontSize(10);
    report.students.forEach(s => {
      doc.text(`${s.name_ar} - ${s.progressPercentage}% (${s.level_name || 'No Level'})`);
    });

    doc.end();

    stream.on('finish', () => {
      try {
        db.prepare('INSERT INTO exports_history (type, filename) VALUES (?, ?)').run('pdf_class', filepath);
      } catch (e) { /* non-critical */ }
      resolve({ success: true, path: filepath });
    });
    stream.on('error', reject);
  });
}

/**
 * Export level report to PDF.
 */
function exportLevelPDF(db, levelId, filepath) {
  return new Promise((resolve, reject) => {
    const reportsService = require('./reports');
    const report = reportsService.getLevelReport(db, levelId);

    if (!report) {
      return resolve({ success: false, error: 'Level not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).text('Level Progress Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Level: ${report.level.name_ar}`);
    doc.fontSize(12).text(`Students: ${report.totalStudents}`);
    doc.text(`Surahs: ${report.totalSurahs}`);
    doc.moveDown();

    // Student summaries
    doc.fontSize(14).text('Student Progress:');
    doc.fontSize(10);
    report.students.forEach(s => {
      doc.text(`${s.name_ar} - ${s.progressPercentage}%`);
    });

    doc.end();

    stream.on('finish', () => {
      try {
        db.prepare('INSERT INTO exports_history (type, filename) VALUES (?, ?)').run('pdf_level', filepath);
      } catch (e) { /* non-critical */ }
      resolve({ success: true, path: filepath });
    });
    stream.on('error', reject);
  });
}

/**
 * Export global summary to PDF.
 */
function exportSummaryPDF(db, filepath) {
  return new Promise((resolve, reject) => {
    const reportsService = require('./reports');
    const summary = reportsService.getGlobalSummary(db);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).text('Global Summary Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Overview');
    doc.fontSize(11);
    doc.text(`Total Students: ${summary.totalStudents}`);
    doc.text(`Total Levels: ${summary.totalLevels}`);
    doc.text(`Total Surahs: ${summary.totalSurahs}`);
    doc.text(`Overall Progress: ${summary.overallPercentage}%`);
    doc.moveDown();

    doc.fontSize(14).text('Status Distribution:');
    doc.fontSize(11);
    Object.entries(summary.statusCounts).forEach(([status, count]) => {
      doc.text(`  ${STATUS_LABELS[status] || status}: ${count}`);
    });
    doc.moveDown();

    if (summary.levelStats.length > 0) {
      doc.fontSize(14).text('Levels:');
      doc.fontSize(11);
      summary.levelStats.forEach(l => {
        doc.text(`  ${l.name_ar}: ${l.student_count} students`);
      });
    }

    doc.end();

    stream.on('finish', () => {
      try {
        db.prepare('INSERT INTO exports_history (type, filename) VALUES (?, ?)').run('pdf_summary', filepath);
      } catch (e) { /* non-critical */ }
      resolve({ success: true, path: filepath });
    });
    stream.on('error', reject);
  });
}

module.exports = {
  exportStudentPDF,
  exportClassPDF,
  exportLevelPDF,
  exportSummaryPDF
};
