const EXAM_QUESTION_COUNT = 100;
const PASS_LINE = 90;
const STORAGE_KEY = 'quiz_bank_data_v2';
const ADMIN_SESSION_KEY = 'quiz_admin_session_v1';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

let questionBank = Array.isArray(window.DEFAULT_QUESTION_BANK) ? normalizeQuestionBank(window.DEFAULT_QUESTION_BANK) : [];
let currentMode = null;
let practiceCurrentQuestion = null;
let examQuestions = [];
let examIndex = 0;
let examAnswers = [];
let editingQuestionId = null;

const bankStatus = document.getElementById('bankStatus');
const fileInput = document.getElementById('fileInput');
const loadFileBtn = document.getElementById('loadFileBtn');
const loadTextBtn = document.getElementById('loadTextBtn');
const jsonInput = document.getElementById('jsonInput');
const practiceModeBtn = document.getElementById('practiceModeBtn');
const examModeBtn = document.getElementById('examModeBtn');
const adminModeBtn = document.getElementById('adminModeBtn');
const quizPanel = document.getElementById('quizPanel');
const resultPanel = document.getElementById('resultPanel');
const adminLoginPanel = document.getElementById('adminLoginPanel');
const adminPanel = document.getElementById('adminPanel');
const questionCard = document.getElementById('questionCard');
const feedbackCard = document.getElementById('feedbackCard');
const navCard = document.getElementById('navCard');
const modeTitle = document.getElementById('modeTitle');
const progressText = document.getElementById('progressText');
const restartBtn = document.getElementById('restartBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const retakeExamBtn = document.getElementById('retakeExamBtn');
const resultBackHomeBtn = document.getElementById('resultBackHomeBtn');
const scoreSummary = document.getElementById('scoreSummary');
const resultList = document.getElementById('resultList');

const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginBackBtn = document.getElementById('adminLoginBackBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminQuestionForm = document.getElementById('adminQuestionForm');
const adminFormTitle = document.getElementById('adminFormTitle');
const adminSource = document.getElementById('adminSource');
const adminType = document.getElementById('adminType');
const adminQuestion = document.getElementById('adminQuestion');
const adminOptions = document.getElementById('adminOptions');
const adminAnswer = document.getElementById('adminAnswer');
const adminKnowledge = document.getElementById('adminKnowledge');
const adminExplanation = document.getElementById('adminExplanation');
const adminCancelEditBtn = document.getElementById('adminCancelEditBtn');
const adminQuestionList = document.getElementById('adminQuestionList');
const adminSearchInput = document.getElementById('adminSearchInput');
const adminFilterType = document.getElementById('adminFilterType');
const adminStatsGrid = document.getElementById('adminStatsGrid');
const exportBankBtn = document.getElementById('exportBankBtn');
const resetBankBtn = document.getElementById('resetBankBtn');

function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      questionBank = normalizeQuestionBank(JSON.parse(saved));
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      questionBank = normalizeQuestionBank(window.DEFAULT_QUESTION_BANK || []);
    }
  } else if (Array.isArray(window.DEFAULT_QUESTION_BANK) && window.DEFAULT_QUESTION_BANK.length) {
    questionBank = normalizeQuestionBank(window.DEFAULT_QUESTION_BANK);
  }
  updateBankStatus();

  if (localStorage.getItem(ADMIN_SESSION_KEY) === '1') {
    openAdminPanel();
  }
}

function updateBankStatus() {
  if (!questionBank.length) {
    bankStatus.textContent = '未加载题库';
    return;
  }
  const typeStats = questionBank.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});
  const statsText = Object.entries(typeStats)
    .map(([k, v]) => `${labelForType(k)} ${v}题`)
    .join(' / ');
  bankStatus.textContent = `已加载 ${questionBank.length} 题${statsText ? '（' + statsText + '）' : ''}`;
  renderAdminStats();
}

function labelForType(type) {
  if (type === 'single') return '单选';
  if (type === 'multiple') return '多选';
  if (type === 'truefalse') return '判断';
  return '未知';
}

function normalizeQuestionBank(data) {
  const rawList = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(rawList)) {
    throw new Error('题库必须是数组，或包含 questions 数组的对象。');
  }

  return rawList.map((item, index) => {
    if (!item.question || !Array.isArray(item.options) || !item.options.length) {
      throw new Error(`第 ${index + 1} 题缺少必要字段：question 或 options。`);
    }

    const type = item.type || 'single';
    const normalizedType = ['single', 'multiple', 'truefalse'].includes(type) ? type : 'single';
    const answer = Array.isArray(item.answer) ? item.answer : [item.answer];
    if (!answer.length || answer.some(v => !v)) {
      throw new Error(`第 ${index + 1} 题缺少 answer。`);
    }

    return {
      id: item.id || `q_${Date.now()}_${index + 1}`,
      type: normalizedType,
      question: String(item.question).trim(),
      options: item.options.map(String),
      answer: answer.map(v => String(v).trim().toUpperCase()).sort(),
      knowledgePoint: item.knowledgePoint ? String(item.knowledgePoint).trim() : '未提供知识点',
      explanation: item.explanation ? String(item.explanation).trim() : '未提供解析',
      source: item.source ? String(item.source).trim() : '未分类'
    };
  });
}

function persistBank() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questionBank));
  updateBankStatus();
  renderAdminList();
}

function saveBank(data) {
  questionBank = normalizeQuestionBank(data);
  persistBank();
  alert(`题库导入成功，共 ${questionBank.length} 题。`);
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleQuestions(bank, count) {
  return shuffleArray(bank).slice(0, count);
}

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

function hideAllWorkspaces() {
  quizPanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  adminLoginPanel.classList.add('hidden');
  adminPanel.classList.add('hidden');
  feedbackCard.classList.add('hidden');
  navCard.classList.add('hidden');
}

function startPracticeMode() {
  if (!questionBank.length) {
    alert('请先导入题库。');
    return;
  }

  currentMode = 'practice';
  hideAllWorkspaces();
  quizPanel.classList.remove('hidden');
  modeTitle.textContent = '练习模式';
  loadRandomPracticeQuestion();
}

function loadRandomPracticeQuestion() {
  practiceCurrentQuestion = questionBank[Math.floor(Math.random() * questionBank.length)];
  progressText.textContent = '随机练习中，可无限抽题。';
  feedbackCard.classList.add('hidden');
  navCard.classList.add('hidden');
  renderQuestion(practiceCurrentQuestion, { mode: 'practice' });
}

function startExamMode() {
  if (!questionBank.length) {
    alert('请先导入题库。');
    return;
  }
  if (questionBank.length < EXAM_QUESTION_COUNT) {
    alert(`考试模式至少需要 ${EXAM_QUESTION_COUNT} 道题。当前题库只有 ${questionBank.length} 道。`);
    return;
  }

  currentMode = 'exam';
  examQuestions = sampleQuestions(questionBank, EXAM_QUESTION_COUNT);
  examIndex = 0;
  examAnswers = new Array(EXAM_QUESTION_COUNT).fill(null);
  hideAllWorkspaces();
  quizPanel.classList.remove('hidden');
  modeTitle.textContent = '考试模式';
  renderCurrentExamQuestion();
}

function renderCurrentExamQuestion() {
  const currentQuestion = examQuestions[examIndex];
  progressText.textContent = `第 ${examIndex + 1} / ${EXAM_QUESTION_COUNT} 题`;
  feedbackCard.classList.add('hidden');
  navCard.classList.add('hidden');
  renderQuestion(currentQuestion, { mode: 'exam', existingAnswer: examAnswers[examIndex] || [] });
}

function renderQuestion(question, { mode, existingAnswer = [] } = {}) {
  const inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
  const shouldAutoCheck = mode === 'practice' && question.type !== 'multiple';

  questionCard.innerHTML = `
    <div class="question-meta-row"><div class="question-type">${labelForType(question.type)}</div><div class="question-source">${escapeHtml(question.source || '未分类')}</div></div>
    <div class="question-text">${escapeHtml(question.question)}</div>
    <form id="questionForm">
      <div class="options-list">
        ${question.options.map((text, idx) => {
          const letter = optionLetter(idx);
          const checked = existingAnswer.includes(letter) ? 'checked' : '';
          return `
            <label class="option-item">
              <input type="${inputType}" name="option" value="${letter}" ${checked} />
              <div><strong>${letter}.</strong> ${escapeHtml(text)}</div>
            </label>
          `;
        }).join('')}
      </div>
      <div class="message-inline">${mode === 'practice' ? '练习模式：作答后即可查看答案。' : '考试模式：请选择答案后进入下一题。'}</div>
      <div id="formActions" class="result-actions"></div>
    </form>
  `;

  const form = document.getElementById('questionForm');
  const formActions = document.getElementById('formActions');

  if (mode === 'practice') {
    if (question.type === 'multiple') {
      const submitBtn = createButton('提交本题并查看答案', 'btn btn-primary', () => {
        const selected = getSelectedAnswers(form);
        if (!selected.length) {
          alert('请至少选择一个选项。');
          return;
        }
        showPracticeFeedback(question, selected);
      });
      formActions.appendChild(submitBtn);
    } else {
      form.addEventListener('change', () => {
        if (shouldAutoCheck) {
          const selected = getSelectedAnswers(form);
          if (selected.length) showPracticeFeedback(question, selected);
        }
      });
    }
  } else {
    const nextLabel = examIndex === EXAM_QUESTION_COUNT - 1 ? '提交考试' : '下一题';
    const nextBtn = createButton(nextLabel, 'btn btn-primary', () => handleExamNext(form, question));
    formActions.appendChild(nextBtn);
  }
}

function showPracticeFeedback(question, selected) {
  const isCorrect = compareAnswers(selected, question.answer);
  feedbackCard.className = `feedback-card ${isCorrect ? 'correct' : 'incorrect'}`;
  feedbackCard.classList.remove('hidden');
  feedbackCard.innerHTML = `
    <div><strong>${isCorrect ? '回答正确' : '回答错误'}</strong></div>
    <div class="feedback-block"><strong>你的答案：</strong>${selected.join('、')}</div>
    <div class="feedback-block"><strong>正确答案：</strong>${question.answer.join('、')}</div>
    <div class="feedback-block"><strong>知识点：</strong>${escapeHtml(question.knowledgePoint)}</div>
    <div class="feedback-block"><strong>解析：</strong>${escapeHtml(question.explanation)}</div>
  `;

  navCard.classList.remove('hidden');
  navCard.innerHTML = '';
  navCard.appendChild(createButton('再来一题', 'btn btn-secondary', loadRandomPracticeQuestion));
}

function handleExamNext(form, question) {
  const selected = getSelectedAnswers(form);
  if (!selected.length) {
    alert('请先作答。');
    return;
  }

  examAnswers[examIndex] = selected;

  if (examIndex < EXAM_QUESTION_COUNT - 1) {
    examIndex += 1;
    renderCurrentExamQuestion();
  } else {
    showExamResults();
  }
}

function showExamResults() {
  hideAllWorkspaces();
  resultPanel.classList.remove('hidden');

  let correctCount = 0;
  const resultHtml = examQuestions.map((question, idx) => {
    const userAnswer = examAnswers[idx] || [];
    const isCorrect = compareAnswers(userAnswer, question.answer);
    if (isCorrect) correctCount += 1;

    return `
      <div class="result-item ${isCorrect ? 'result-correct' : 'result-wrong'}">
        <h4>第 ${idx + 1} 题：${escapeHtml(question.question)}</h4>
        <div class="result-source">题库来源：${escapeHtml(question.source || '未分类')}</div>
        <div class="result-meta">
          <div><strong>你的答案：</strong>${userAnswer.length ? userAnswer.join('、') : '未作答'}</div>
          <div><strong>正确答案：</strong>${question.answer.join('、')}</div>
          <div><strong>结果：</strong>${isCorrect ? '正确' : '错误'}</div>
          <div><strong>知识点：</strong>${escapeHtml(question.knowledgePoint)}</div>
          <div><strong>解析：</strong>${escapeHtml(question.explanation)}</div>
        </div>
      </div>
    `;
  }).join('');

  const score = correctCount;
  const pass = score >= PASS_LINE;
  scoreSummary.innerHTML = `
    <div class="score-main">${score} / ${EXAM_QUESTION_COUNT}</div>
    <div style="margin-bottom: 12px;">共答对 ${correctCount} 题，及格线为 ${PASS_LINE} 分。</div>
    <div class="score-pass ${pass ? 'pass' : 'fail'}">${pass ? '考试通过' : '考试未通过'}</div>
  `;
  resultList.innerHTML = resultHtml;
}

function getSelectedAnswers(form) {
  const checked = [...form.querySelectorAll('input[name="option"]:checked')];
  return checked.map(item => item.value).sort();
}

function compareAnswers(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

function createButton(text, className, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function openAdminLogin() {
  hideAllWorkspaces();
  adminLoginPanel.classList.remove('hidden');
  adminPasswordInput.value = '';
  adminPasswordInput.focus();
}

function openAdminPanel() {
  hideAllWorkspaces();
  adminPanel.classList.remove('hidden');
  localStorage.setItem(ADMIN_SESSION_KEY, '1');
  renderAdminStats();
  renderAdminList();
  resetAdminForm();
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  hideAllWorkspaces();
}

function renderAdminStats() {
  if (!adminStatsGrid) return;
  const counts = {
    total: questionBank.length,
    single: questionBank.filter(q => q.type === 'single').length,
    multiple: questionBank.filter(q => q.type === 'multiple').length,
    truefalse: questionBank.filter(q => q.type === 'truefalse').length
  };
  const sources = new Set(questionBank.map(q => q.source).filter(Boolean)).size;
  adminStatsGrid.innerHTML = `
    <div class="admin-stat-card"><div class="admin-stat-label">总题数</div><div class="admin-stat-value">${counts.total}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">单选题</div><div class="admin-stat-value">${counts.single}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">多选题</div><div class="admin-stat-value">${counts.multiple}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">判断题</div><div class="admin-stat-value">${counts.truefalse}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">题库来源数</div><div class="admin-stat-value">${sources}</div></div>
  `;
}

function renderAdminList() {
  const keyword = adminSearchInput.value.trim().toLowerCase();
  const typeFilter = adminFilterType.value;
  let filtered = questionBank.filter(q => {
    const hitKeyword = !keyword || [q.question, q.source, q.knowledgePoint, q.explanation].join(' ').toLowerCase().includes(keyword);
    const hitType = typeFilter === 'all' || q.type === typeFilter;
    return hitKeyword && hitType;
  });

  filtered = filtered.sort((a, b) => a.source.localeCompare(b.source, 'zh-CN') || a.question.localeCompare(b.question, 'zh-CN'));

  if (!filtered.length) {
    adminQuestionList.innerHTML = '<div class="empty-state">没有符合条件的题目。</div>';
    return;
  }

  adminQuestionList.innerHTML = filtered.map((q, idx) => `
    <div class="admin-question-item">
      <div class="admin-question-head">
        <div>
          <div class="admin-question-badges">
            <span class="question-type">${labelForType(q.type)}</span>
            <span class="question-source">${escapeHtml(q.source || '未分类')}</span>
          </div>
          <div class="admin-question-title">${idx + 1}. ${escapeHtml(q.question)}</div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-light" data-action="edit" data-id="${q.id}">编辑</button>
          <button class="btn btn-danger" data-action="delete" data-id="${q.id}">删除</button>
        </div>
      </div>
      <div class="admin-question-meta">
        <div><strong>答案：</strong>${q.answer.join('、')}</div>
        <div><strong>知识点：</strong>${escapeHtml(q.knowledgePoint)}</div>
        <div><strong>解析：</strong>${escapeHtml(q.explanation)}</div>
      </div>
    </div>
  `).join('');
}

function parseOptions(text, type) {
  const lines = text.split(/\n+/).map(v => v.trim()).filter(Boolean);
  if (type === 'truefalse' && lines.length === 0) {
    return ['正确', '错误'];
  }
  return lines.map(line => line.replace(/^[A-Z]\s*[\.、\)]\s*/i, '').trim()).filter(Boolean);
}

function normalizeAnswerText(text) {
  return text.split(',').map(v => v.trim().toUpperCase()).filter(Boolean).sort();
}

function resetAdminForm() {
  editingQuestionId = null;
  adminFormTitle.textContent = '新增题目';
  adminQuestionForm.reset();
  adminCancelEditBtn.classList.add('hidden');
}

function fillAdminForm(question) {
  editingQuestionId = question.id;
  adminFormTitle.textContent = '编辑题目';
  adminSource.value = question.source || '';
  adminType.value = question.type;
  adminQuestion.value = question.question;
  adminOptions.value = question.options.map((opt, idx) => `${optionLetter(idx)}. ${opt}`).join('\n');
  adminAnswer.value = question.answer.join(',');
  adminKnowledge.value = question.knowledgePoint;
  adminExplanation.value = question.explanation;
  adminCancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: adminPanel.offsetTop - 20, behavior: 'smooth' });
}

function handleAdminSave(event) {
  event.preventDefault();

  const type = adminType.value;
  const options = parseOptions(adminOptions.value, type);
  const answer = normalizeAnswerText(adminAnswer.value);

  if (!adminQuestion.value.trim()) {
    alert('题干不能为空。');
    return;
  }
  if (!options.length) {
    alert('请至少填写一个选项。');
    return;
  }
  if (!answer.length) {
    alert('请填写正确答案。');
    return;
  }

  const payload = {
    id: editingQuestionId || `q_${Date.now()}`,
    source: adminSource.value.trim() || '未分类',
    type,
    question: adminQuestion.value.trim(),
    options,
    answer,
    knowledgePoint: adminKnowledge.value.trim() || '未提供知识点',
    explanation: adminExplanation.value.trim() || '未提供解析'
  };

  try {
    const normalized = normalizeQuestionBank([payload])[0];
    if (editingQuestionId) {
      questionBank = questionBank.map(item => item.id === editingQuestionId ? normalized : item);
    } else {
      questionBank.unshift(normalized);
    }
    persistBank();
    resetAdminForm();
    alert(editingQuestionId ? '题目已更新。' : '题目已新增。');
  } catch (error) {
    alert(`保存失败：${error.message}`);
  }
}

function handleAdminListClick(event) {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  const item = questionBank.find(q => q.id === id);
  if (!item) return;

  if (action === 'edit') {
    fillAdminForm(item);
    return;
  }

  if (action === 'delete') {
    const ok = window.confirm('确定删除这道题吗？此操作会立即生效。');
    if (!ok) return;
    questionBank = questionBank.filter(q => q.id !== id);
    persistBank();
    if (editingQuestionId === id) resetAdminForm();
  }
}

function exportCurrentBank() {
  const blob = new Blob([JSON.stringify(questionBank, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  a.href = url;
  a.download = `question_bank_export_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetToDefaultBank() {
  const ok = window.confirm('确定恢复到内置题库吗？当前后台新增或编辑的内容将被覆盖。');
  if (!ok) return;
  questionBank = normalizeQuestionBank(window.DEFAULT_QUESTION_BANK || []);
  persistBank();
  resetAdminForm();
  alert('已恢复为内置题库。');
}

loadFileBtn.addEventListener('click', () => {
  const file = fileInput.files[0];
  if (!file) {
    alert('请先选择 JSON 文件。');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      saveBank(parsed);
    } catch (error) {
      alert(`导入失败：${error.message}`);
    }
  };
  reader.readAsText(file, 'utf-8');
});

loadTextBtn.addEventListener('click', () => {
  const raw = jsonInput.value.trim();
  if (!raw) {
    alert('请先粘贴 JSON 内容。');
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    saveBank(parsed);
  } catch (error) {
    alert(`导入失败：${error.message}`);
  }
});

practiceModeBtn.addEventListener('click', startPracticeMode);
examModeBtn.addEventListener('click', startExamMode);
adminModeBtn.addEventListener('click', openAdminLogin);
adminLoginBtn.addEventListener('click', () => {
  if (adminPasswordInput.value !== DEFAULT_ADMIN_PASSWORD) {
    alert('管理员密码错误。');
    return;
  }
  openAdminPanel();
});
adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') adminLoginBtn.click();
});
adminLoginBackBtn.addEventListener('click', hideAllWorkspaces);
adminLogoutBtn.addEventListener('click', logoutAdmin);
adminQuestionForm.addEventListener('submit', handleAdminSave);
adminCancelEditBtn.addEventListener('click', resetAdminForm);
adminSearchInput.addEventListener('input', renderAdminList);
adminFilterType.addEventListener('change', renderAdminList);
adminQuestionList.addEventListener('click', handleAdminListClick);
exportBankBtn.addEventListener('click', exportCurrentBank);
resetBankBtn.addEventListener('click', resetToDefaultBank);
restartBtn.addEventListener('click', () => {
  if (currentMode === 'practice') startPracticeMode();
  if (currentMode === 'exam') startExamMode();
});
backHomeBtn.addEventListener('click', hideAllWorkspaces);
retakeExamBtn.addEventListener('click', startExamMode);
resultBackHomeBtn.addEventListener('click', hideAllWorkspaces);

init();
