/**
 * Student Profile screen.
 * Header, basic info, progress overview, surah progress, notes, review history.
 */

const StudentProfileScreen = {
  studentId: null,
  student: null,
  progress: [],
  notes: [],
  levels: [],
  surahs: [],

  async render(params) {
    this.studentId = params && params.studentId;

    if (!this.studentId) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">&#x1F464;</div>
          <p class="empty-state-text">لم يتم اختيار طالب</p>
        </div>
      `;
    }

    try {
      const students = await window.api.getStudents();
      this.student = students.find(s => s.id === this.studentId);
      this.progress = await window.api.getProgress(this.studentId);
      this.notes = await window.api.getStudentNotes(this.studentId);
      this.levels = await window.api.getLevels();
      this.surahs = await window.api.getSurahs();
    } catch (e) {
      console.error('Failed to load student profile:', e);
    }

    if (!this.student) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">&#x1F464;</div>
          <p class="empty-state-text">لم يتم العثور على الطالب</p>
        </div>
      `;
    }

    const statusCounts = this._calculateStatusCounts();
    const progressPercentage = this._calculateProgress(statusCounts);

    return `
      <div class="screen-header">
        <button class="btn btn-secondary btn-sm" id="btn-back-students">&#x2190; العودة للطلاب</button>
        <h2 class="screen-title">${this.student.name_ar}</h2>
        <p class="screen-subtitle">${this.student.name_en || ''}</p>
      </div>

      <div class="profile-layout">
        <div class="profile-info-section">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">المعلومات الأساسية</h3>
            </div>
            <div class="profile-info-grid">
              <div class="profile-info-item">
                <span class="profile-info-label">المستوى</span>
                <span class="profile-info-value">${this.student.level_name || 'غير محدد'}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">تاريخ التسجيل</span>
                <span class="profile-info-value">${this.student.created_at ? new Date(this.student.created_at).toLocaleDateString('ar-SA') : ''}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">ملاحظات</span>
                <span class="profile-info-value">${this.student.notes || 'لا توجد ملاحظات'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-progress-section">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">نظرة عامة على التقدم</h3>
            </div>
            <div class="progress-overview">
              <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressPercentage}%"></div>
              </div>
              <div class="progress-percentage">${progressPercentage}% مكتمل</div>
              <div class="progress-stats-grid">
                ${this._renderProgressStats(statusCounts)}
              </div>
            </div>
          </div>
        </div>

        <div class="profile-surahs-section">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">تقدم السور</h3>
            </div>
            <div class="status-legend mb-md">
              ${StatusBadge.renderLegend()}
            </div>
            <div class="profile-surahs-list">
              ${this._renderSurahProgress()}
            </div>
          </div>
        </div>

        <div class="profile-notes-section">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">الملاحظات</h3>
              <button class="btn btn-sm btn-primary" id="btn-add-note">إضافة ملاحظة</button>
            </div>
            <div id="notes-list">
              ${this._renderNotes()}
            </div>
          </div>
        </div>

        <div class="profile-history-section">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">سجل المراجعات</h3>
            </div>
            <div class="review-history">
              ${this._renderReviewHistory()}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _calculateStatusCounts() {
    const counts = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      MEMORIZED: 0,
      REVIEW_REQUIRED: 0,
      WEAK: 0,
      PERFECT: 0
    };

    this.progress.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++;
    });

    const totalTracked = Object.values(counts).reduce((a, b) => a + b, 0);
    counts.NOT_STARTED = Math.max(0, 114 - totalTracked);

    return counts;
  },

  _calculateProgress(counts) {
    const memorized = (counts.MEMORIZED || 0) + (counts.PERFECT || 0);
    return Math.round((memorized / 114) * 100);
  },

  _renderProgressStats(counts) {
    const items = [
      { label: 'لم يبدأ', count: counts.NOT_STARTED, cssClass: 'status-not-started' },
      { label: 'قيد الحفظ', count: counts.IN_PROGRESS, cssClass: 'status-in-progress' },
      { label: 'تم الحفظ', count: counts.MEMORIZED, cssClass: 'status-memorized' },
      { label: 'يحتاج مراجعة', count: counts.REVIEW_REQUIRED, cssClass: 'status-review-required' },
      { label: 'ضعيف', count: counts.WEAK, cssClass: 'status-weak' },
      { label: 'متقن', count: counts.PERFECT, cssClass: 'status-perfect' }
    ];

    return items.map(item => `
      <div class="progress-stat-item">
        <span class="status-badge ${item.cssClass}">${item.count}</span>
        <span class="progress-stat-label">${item.label}</span>
      </div>
    `).join('');
  },

  _renderSurahProgress() {
    const progressMap = {};
    this.progress.forEach(p => { progressMap[p.surah_id] = p; });

    let html = '<div class="surahs-progress-grid">';
    this.surahs.forEach(surah => {
      const p = progressMap[surah.id];
      const status = p ? p.status : 'NOT_STARTED';
      html += `
        <div class="surah-progress-item">
          <span class="surah-progress-no">${surah.surah_no}</span>
          <span class="surah-progress-name">${surah.name_ar}</span>
          ${StatusBadge.render(status)}
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  _renderNotes() {
    if (!this.notes || this.notes.length === 0) {
      return '<p class="text-muted">لا توجد ملاحظات</p>';
    }

    return this.notes.map(note => `
      <div class="note-item">
        <div class="note-content">${note.content}</div>
        <div class="note-footer">
          <span class="note-date">${note.created_at ? new Date(note.created_at).toLocaleDateString('ar-SA') : ''}</span>
          <button class="btn btn-sm btn-danger" data-action="delete-note" data-note-id="${note.id}">حذف</button>
        </div>
      </div>
    `).join('');
  },

  _renderReviewHistory() {
    const reviewed = this.progress.filter(p => p.last_reviewed).sort((a, b) => {
      return new Date(b.last_reviewed) - new Date(a.last_reviewed);
    }).slice(0, 20);

    if (reviewed.length === 0) {
      return '<p class="text-muted">لا يوجد سجل مراجعات</p>';
    }

    return reviewed.map(p => {
      const surah = this.surahs.find(s => s.id === p.surah_id);
      return `
        <div class="history-item">
          <span class="history-surah">${surah ? surah.name_ar : ''}</span>
          ${StatusBadge.render(p.status)}
          <span class="history-date">${p.last_reviewed ? new Date(p.last_reviewed).toLocaleDateString('ar-SA') : ''}</span>
        </div>
      `;
    }).join('');
  },

  attachEvents() {
    const backBtn = document.getElementById('btn-back-students');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.AppRouter) window.AppRouter.navigate('students');
      });
    }

    const addNoteBtn = document.getElementById('btn-add-note');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => this._showAddNoteModal());
    }

    const notesList = document.getElementById('notes-list');
    if (notesList) {
      notesList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete-note"]');
        if (btn) {
          const noteId = parseInt(btn.dataset.noteId);
          this._deleteNote(noteId);
        }
      });
    }
  },

  _showAddNoteModal() {
    const body = `
      <div class="form-group">
        <label class="form-label" for="note-content">الملاحظة</label>
        <textarea class="form-textarea" id="note-content" placeholder="اكتب ملاحظة..."></textarea>
      </div>
    `;
    const actions = `
      <button class="btn btn-primary" id="modal-save-note">حفظ</button>
      <button class="btn btn-secondary" data-modal-close>إلغاء</button>
    `;

    const overlay = Modal.open({ title: 'إضافة ملاحظة', body, actions });

    overlay.querySelector('#modal-save-note').addEventListener('click', async () => {
      const content = overlay.querySelector('#note-content').value.trim();
      if (!content) { alert('يرجى كتابة ملاحظة'); return; }

      try {
        await window.api.addStudentNote({ student_id: this.studentId, content });
        Modal.close(overlay);
        this.notes = await window.api.getStudentNotes(this.studentId);
        const notesList = document.getElementById('notes-list');
        if (notesList) notesList.innerHTML = this._renderNotes();
      } catch (e) {
        console.error('Failed to add note:', e);
      }
    });
  },

  async _deleteNote(noteId) {
    try {
      await window.api.deleteStudentNote(noteId);
      this.notes = await window.api.getStudentNotes(this.studentId);
      const notesList = document.getElementById('notes-list');
      if (notesList) notesList.innerHTML = this._renderNotes();
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StudentProfileScreen;
}
