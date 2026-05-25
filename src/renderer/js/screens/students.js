/**
 * Students List screen.
 * Table with name, level, progress%, last review, status.
 * Add/Edit/Archive/Search/Filter functionality.
 */

const StudentsScreen = {
  students: [],
  levels: [],
  currentFilter: { level_id: '', status: '' },
  searchQuery: '',

  async render() {
    try {
      this.students = await window.api.getStudents();
      this.levels = await window.api.getLevels();
    } catch (e) {
      console.error('Failed to load students:', e);
    }

    return `
      <div class="screen-header">
        <h2 class="screen-title">الطلاب</h2>
        <p class="screen-subtitle">إدارة بيانات الطلاب ومتابعة تقدمهم</p>
      </div>

      <div class="students-toolbar">
        <div class="students-toolbar-actions">
          <button class="btn btn-primary" id="btn-add-student">
            <span>&#x2795;</span>
            <span>إضافة طالب</span>
          </button>
        </div>
        <div class="students-toolbar-filters">
          <input type="text" class="form-input students-search" id="students-search" placeholder="بحث عن طالب..." />
          <select class="form-select students-filter" id="filter-level">
            <option value="">جميع المستويات</option>
            ${this.levels.map(l => `<option value="${l.id}">${l.name_ar}</option>`).join('')}
          </select>
          <select class="form-select students-filter" id="filter-status">
            <option value="">جميع الحالات</option>
            <option value="NOT_STARTED">لم يبدأ</option>
            <option value="IN_PROGRESS">قيد الحفظ</option>
            <option value="MEMORIZED">تم الحفظ</option>
            <option value="REVIEW_REQUIRED">يحتاج مراجعة</option>
            <option value="WEAK">ضعيف</option>
            <option value="PERFECT">متقن</option>
          </select>
        </div>
      </div>

      <div id="students-table-container">
        ${this._renderTable(this.students)}
      </div>
    `;
  },

  _renderTable(students) {
    if (!students || students.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">&#x1F464;</div>
          <p class="empty-state-text">لا يوجد طلاب</p>
          <p class="text-muted">اضغط على "إضافة طالب" لإضافة طالب جديد</p>
        </div>
      `;
    }

    let html = '<div class="table-container"><table>';
    html += `
      <thead>
        <tr>
          <th>الاسم</th>
          <th>المستوى</th>
          <th>الملاحظات</th>
          <th>تاريخ التسجيل</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
    `;

    students.forEach(student => {
      const levelName = student.level_name || 'غير محدد';
      const createdDate = student.created_at ? new Date(student.created_at).toLocaleDateString('ar-SA') : '';

      html += `
        <tr class="clickable-row" data-student-id="${student.id}">
          <td class="student-name-cell">
            <strong>${student.name_ar}</strong>
            ${student.name_en ? `<small class="text-muted">${student.name_en}</small>` : ''}
          </td>
          <td><span class="level-chip">${levelName}</span></td>
          <td class="notes-cell">${student.notes || ''}</td>
          <td>${createdDate}</td>
          <td class="actions-cell">
            <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${student.id}">تعديل</button>
            <button class="btn btn-sm btn-danger" data-action="archive" data-id="${student.id}">أرشفة</button>
            <button class="btn btn-sm btn-secondary" data-action="profile" data-id="${student.id}">الملف</button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    return html;
  },

  attachEvents() {
    // Add student button
    const addBtn = document.getElementById('btn-add-student');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._showAddModal());
    }

    // Search input
    const searchInput = document.getElementById('students-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this._applyFilters();
      });
    }

    // Level filter
    const levelFilter = document.getElementById('filter-level');
    if (levelFilter) {
      levelFilter.addEventListener('change', (e) => {
        this.currentFilter.level_id = e.target.value;
        this._applyFilters();
      });
    }

    // Status filter
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentFilter.status = e.target.value;
        this._applyFilters();
      });
    }

    // Table action buttons
    this._attachTableEvents();
  },

  _attachTableEvents() {
    const container = document.getElementById('students-table-container');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id);

      if (action === 'edit') this._showEditModal(id);
      else if (action === 'archive') this._confirmArchive(id);
      else if (action === 'profile') this._navigateToProfile(id);
    });
  },

  _applyFilters() {
    let filtered = this.students;

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        (s.name_ar && s.name_ar.includes(query)) ||
        (s.name_en && s.name_en.toLowerCase().includes(query))
      );
    }

    if (this.currentFilter.level_id) {
      filtered = filtered.filter(s => s.level_id == this.currentFilter.level_id);
    }

    const container = document.getElementById('students-table-container');
    if (container) {
      container.innerHTML = this._renderTable(filtered);
    }
  },

  _showAddModal() {
    const body = this._getStudentForm({});
    const actions = `
      <button class="btn btn-primary" id="modal-save-student">حفظ</button>
      <button class="btn btn-secondary" data-modal-close>إلغاء</button>
    `;

    const overlay = Modal.open({
      title: 'إضافة طالب جديد',
      body,
      actions
    });

    overlay.querySelector('#modal-save-student').addEventListener('click', async () => {
      const nameAr = overlay.querySelector('#student-name-ar').value.trim();
      const nameEn = overlay.querySelector('#student-name-en').value.trim();
      const levelId = overlay.querySelector('#student-level').value;
      const notes = overlay.querySelector('#student-notes').value.trim();

      if (!nameAr) {
        alert('يرجى إدخال اسم الطالب');
        return;
      }

      try {
        await window.api.addStudent({
          name_ar: nameAr,
          name_en: nameEn || null,
          level_id: levelId ? parseInt(levelId) : null,
          notes: notes || null
        });
        Modal.close(overlay);
        // Reload
        const container = document.getElementById('screen-container');
        container.innerHTML = await this.render();
        this.attachEvents();
      } catch (e) {
        console.error('Failed to add student:', e);
      }
    });
  },

  _showEditModal(id) {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    const body = this._getStudentForm(student);
    const actions = `
      <button class="btn btn-primary" id="modal-save-student">تحديث</button>
      <button class="btn btn-secondary" data-modal-close>إلغاء</button>
    `;

    const overlay = Modal.open({
      title: 'تعديل بيانات الطالب',
      body,
      actions
    });

    overlay.querySelector('#modal-save-student').addEventListener('click', async () => {
      const nameAr = overlay.querySelector('#student-name-ar').value.trim();
      const nameEn = overlay.querySelector('#student-name-en').value.trim();
      const levelId = overlay.querySelector('#student-level').value;
      const notes = overlay.querySelector('#student-notes').value.trim();

      if (!nameAr) {
        alert('يرجى إدخال اسم الطالب');
        return;
      }

      try {
        await window.api.updateStudent({
          id,
          name_ar: nameAr,
          name_en: nameEn || null,
          level_id: levelId ? parseInt(levelId) : null,
          notes: notes || null
        });
        Modal.close(overlay);
        const container = document.getElementById('screen-container');
        container.innerHTML = await this.render();
        this.attachEvents();
      } catch (e) {
        console.error('Failed to update student:', e);
      }
    });
  },

  _confirmArchive(id) {
    const student = this.students.find(s => s.id === id);
    if (!student) return;

    Modal.confirm({
      title: 'أرشفة طالب',
      message: `هل أنت متأكد من أرشفة الطالب "${student.name_ar}"؟`,
      confirmText: 'أرشفة',
      cancelText: 'إلغاء',
      onConfirm: async () => {
        try {
          await window.api.archiveStudent(id);
          const container = document.getElementById('screen-container');
          container.innerHTML = await this.render();
          this.attachEvents();
        } catch (e) {
          console.error('Failed to archive student:', e);
        }
      }
    });
  },

  _navigateToProfile(id) {
    if (window.AppRouter) {
      window.AppRouter.navigate('student-profile', { studentId: id });
    }
  },

  _getStudentForm(student) {
    return `
      <div class="form-group">
        <label class="form-label" for="student-name-ar">اسم الطالب (عربي) *</label>
        <input type="text" class="form-input" id="student-name-ar" value="${student.name_ar || ''}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="student-name-en">اسم الطالب (إنجليزي)</label>
        <input type="text" class="form-input" id="student-name-en" value="${student.name_en || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="student-level">المستوى</label>
        <select class="form-select" id="student-level">
          <option value="">بدون مستوى</option>
          ${this.levels.map(l => `<option value="${l.id}" ${student.level_id == l.id ? 'selected' : ''}>${l.name_ar}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="student-notes">ملاحظات</label>
        <textarea class="form-textarea" id="student-notes">${student.notes || ''}</textarea>
      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StudentsScreen;
}
