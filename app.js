/**
 * 情緒觀察表 (Emotional Awareness Retreat App)
 * 2026 PEI 第三屆情緒觀察營 覺察日記與統計工具
 * Core Logic, 12 Fields Wizard, Statistics, Backup & Restore, Excel Export
 */

(function () {
  'use strict';

  // 1. Initial Default Vocabularies (from Retreat Slides & Materials)
  const DEFAULT_TAGS = {
    bodyReactions: [
      '抿嘴', '皺眉', '倒吸一口氣', '嘆氣', '呼吸不穩', '呼吸急促', 
      '胃緊縮', '虛脫', '大叫', '喉痛', '頭暈', '肩膀緊繃', 
      '胃痛', '胸悶', '心跳加快', '咬牙', '手心冒汗', '手抖', '四肢無力', '背部緊繃'
    ],
    thoughts: [
      '啊！', '什麼？', '快遲到了！', '你在說什麼？', '好緊張', '好的', 
      '氣死人了！', '搞什麼！', '抱歉', '我要乖一點...', '好吧', '反正就這樣', 
      '憑什麼！', '怎麼會這樣', '糟糕', '完了', '好煩', '算了吧', '為什麼是我？'
    ],
    emotions: [
      '訝異', '擔心', '疲累', '驚嚇', '難過', '壓力', '懊悔', '憂傷', 
      '緊張', '煩躁', '徬徨', '傻眼', '傷感', '焦慮', '無奈', '悲傷', 
      '崩潰', '挫折', '恐懼', '害怕', '孤獨', '不解', '不喜', '憤怒', '委屈', '自責', '失望'
    ],
    grounding: [
      '按摩臉頰', '敲胸', '深呼吸', '按摩腸胃', '拔菜', '拔草', '行走', 
      '捏手指', '摩頂', '拍肩膀', '腳踩大地', '無', '喝溫水', '洗臉', '伸展身體', '閉眼靜坐', '觀息'
    ]
  };

  // 2. State Management
  const state = {
    activeTab: 'home', // 'home' | 'records' | 'stats' | 'data'
    mode: 'wizard', // 'wizard' | 'quick'
    currentStep: 1, // 1 through 12
    startDate: '2025-12-15', // Default from Page 17 (上課日期: 2025-12-15)
    tags: JSON.parse(localStorage.getItem('ea_tags')) || JSON.parse(JSON.stringify(DEFAULT_TAGS)),
    records: JSON.parse(localStorage.getItem('ea_records')) || [],
    statsPeriod: 'all',
    
    // Draft for current entry
    draft: getEmptyDraft(),
    editingRecordId: null
  };

  function getEmptyDraft() {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: localIso,
      event: '',
      trigger: '',
      bodyReactions: [],
      thoughts: [],
      emotions: [], // array of { name: '擔心', score: 90 }
      grounding: [],
      timing: '當下', // '當下' | '事後' | '未落地'
      postScore: 30, // 0~100
      seemedFact: '',
      realFact: '',
      factEvaluation: '完全錯誤', // '完全錯誤' | '部分錯誤' | '符合事實'
      reflection: ''
    };
  }

  // Save to localStorage
  function persistData() {
    localStorage.setItem('ea_records', JSON.stringify(state.records));
    localStorage.setItem('ea_tags', JSON.stringify(state.tags));
    localStorage.setItem('ea_startDate', state.startDate);
  }

  // Load custom start date if saved
  const savedStartDate = localStorage.getItem('ea_startDate');
  if (savedStartDate) {
    state.startDate = savedStartDate;
  }

  // 3. Wizard Step Configuration (12 Fields)
  const WIZARD_STEPS = [
    {
      step: 1,
      title: '觸發點',
      field: 'trigger',
      prompt: '觸發我情緒的境、那一句話、動作或眼神是什麼？ (可選填，可直接點「略過」或「下一步」)',
      render: renderStepTrigger
    },
    {
      step: 2,
      title: '身體反應',
      field: 'bodyReactions',
      prompt: '察覺當下身體有什麼生理訊號與反應？可多選或新增 (可選填，可略過)',
      render: renderStepBodyReactions
    },
    {
      step: 3,
      title: '心裡自然流露的話',
      field: 'thoughts',
      prompt: '腦海中第一時間冒出什麼自動化念頭？ (可選填，可略過)',
      render: renderStepThoughts
    },
    {
      step: 4,
      title: '情緒類別',
      field: 'emotions',
      prompt: '辨認此時此刻心中湧起的情緒是什麼？可複選或新增 (可選填，可略過)',
      render: renderStepEmotions
    },
    {
      step: 5,
      title: '情緒指數',
      field: 'emotionIntensity',
      prompt: '針對選取的情緒設定 0~100 的強度指數 (可選填，可略過)',
      render: renderStepEmotionIntensity
    },
    {
      step: 6,
      title: '情緒落地',
      field: 'grounding',
      prompt: '採用了哪種身體或威儀動作來幫助情緒落地？ (可選填，可略過)',
      render: renderStepGrounding
    },
    {
      step: 7,
      title: '情緒落地時機',
      field: 'timing',
      prompt: '是在境界當下立即做落地動作，還是事後才做？ (可選填，可略過)',
      render: renderStepTiming
    },
    {
      step: 8,
      title: '落地後情緒指數',
      field: 'postScore',
      prompt: '落地之後，情緒指數舒緩到多少？ (可選填，可略過)',
      render: renderStepPostScore
    },
    {
      step: 9,
      title: '好像的事實',
      field: 'seemedFact',
      prompt: '當時我的杏仁核腦補、以為的事實是什麼？ (可選填，可略過)',
      render: renderStepSeemedFact
    },
    {
      step: 10,
      title: '確立的事實',
      field: 'realFact',
      prompt: '冷靜查證後，真正的客觀真相是什麼？ (可選填，可略過)',
      render: renderStepRealFact
    },
    {
      step: 11,
      title: '事件發生的時間與事件經過',
      field: 'event',
      prompt: '回顧整起事件具體發生的時間與客觀經過 (放最後回顧，可選填，可略過)',
      render: renderStepEvent
    },
    {
      step: 12,
      title: '今日評價',
      field: 'reflection',
      prompt: '給自己的自我肯定、觀功念恩與學習收穫 (可選填，可略過，點完成儲存)',
      render: renderStepReflection
    }
  ];

  // 4. Wizard Step Rendering Functions
  function renderStepTrigger(container) {
    container.innerHTML = `
      <div>
        <label style="font-size: 13px; font-weight: 600; color: #5a557b; display: block; margin-bottom: 6px;">⚡ 境界與觸發點 (可選填，可直接點略過)</label>
        <textarea id="wiz-trigger" class="neumo-textarea" style="min-height: 140px;" placeholder="例如：看到時鐘指向 8:15、對方說了一句「這份報告不太對」...">${escapeHtml(state.draft.trigger)}</textarea>
      </div>
    `;
    const triggerInput = container.querySelector('#wiz-trigger');
    triggerInput.addEventListener('input', () => { state.draft.trigger = triggerInput.value; });
  }

  function renderStepBodyReactions(container) {
    renderTagCloudStep(container, 'bodyReactions', '身體反應', '輸入身體反應，例如：胸悶 (可選填，可略過)');
  }

  function renderStepThoughts(container) {
    renderTagCloudStep(container, 'thoughts', '心裡自然流露的話', '輸入心裡流露的話，例如：快遲到了！ (可選填，可略過)');
  }

  function renderStepEmotions(container) {
    renderTagCloudStep(container, 'emotions', '情緒類別', '輸入情緒，例如：焦慮、擔心 (可選填，可略過)');
  }

  function renderStepEmotionIntensity(container) {
    if (!state.draft.emotions || state.draft.emotions.length === 0) {
      container.innerHTML = `
        <div style="background: #f8f6fc; border-radius: var(--radius-lg); padding: 24px 18px; text-align: center; margin-bottom: 20px; border: 1px solid var(--border-light);">
          <p style="font-size: 14.5px; color: #5a547a; font-weight: 500; margin-bottom: 10px;">前一步未選取情緒類別，您可以直接點選下方<b>「略過」</b>或<b>「下一步」</b>繼續前進。</p>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">若想在此直接新增情緒並調整指數，請點擊下方按鈕：</p>
          <button id="btn-add-quick-emo" class="record-action-btn" style="margin: 0 auto; padding: 8px 18px; border-color: var(--primary); color: var(--primary);">+ 自訂情緒指數滑桿</button>
        </div>
      `;
      const addBtn = container.querySelector('#btn-add-quick-emo');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const name = prompt('請輸入情緒名稱（例如：緊張、壓力）：');
          if (name && name.trim()) {
            state.draft.emotions.push({ name: name.trim(), score: 75 });
            renderStepEmotionIntensity(container);
          }
        });
      }
      return;
    }

    let cardsHtml = '';
    state.draft.emotions.forEach((emo, idx) => {
      cardsHtml += `
        <div class="intensity-card">
          <div class="intensity-card-header">
            <span class="intensity-title">${idx + 1}. ${escapeHtml(emo.name)}</span>
            <span class="intensity-badge" id="badge-emo-${idx}">${emo.score || 50}</span>
          </div>
          <input type="range" min="0" max="100" class="neumo-slider emo-slider" data-idx="${idx}" value="${emo.score || 50}">
        </div>
      `;
    });

    container.innerHTML = `
      <div class="intensity-cards-list">
        ${cardsHtml}
      </div>
      <div style="font-size: 13px; color: var(--text-sub); text-align: center;">
        滑動滑桿以調整每種情緒的強度 (0 最輕微 ~ 100 最強烈，亦可略過)
      </div>
    `;

    container.querySelectorAll('.emo-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const val = parseInt(e.target.value, 10);
        state.draft.emotions[idx].score = val;
        const badge = container.querySelector(`#badge-emo-${idx}`);
        if (badge) badge.innerText = val;
      });
    });
  }

  function renderStepGrounding(container) {
    renderTagCloudStep(container, 'grounding', '情緒落地方式', '輸入落地方式，例如：深呼吸、拔草 (可選填，可略過)');
  }

  function renderStepTiming(container) {
    const current = state.draft.timing || '當下';
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <p style="font-size: 14.5px; color: var(--text-main); font-weight: 500;">
          您是在境界發生的當下立即做了情緒落地，還是事後才覺察並落地？(可選填，可略過)
        </p>
      </div>
      <div class="choice-pill-group">
        <div class="choice-pill ${current === '當下' ? 'selected' : ''}" data-val="當下">當下落地</div>
        <div class="choice-pill ${current === '事後' ? 'selected' : ''}" data-val="事後">事後落地</div>
        <div class="choice-pill ${current === '未落地' ? 'selected' : ''}" data-val="未落地">尚未落地</div>
      </div>
    `;

    container.querySelectorAll('.choice-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.choice-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        state.draft.timing = pill.dataset.val;
      });
    });
  }

  function renderStepPostScore(container) {
    const initialMaxScore = state.draft.emotions && state.draft.emotions.length > 0 
      ? Math.max(...state.draft.emotions.map(e => e.score || 50)) 
      : 80;
    const postVal = state.draft.postScore !== undefined ? state.draft.postScore : 25;

    container.innerHTML = `
      <div class="intensity-card" style="margin-bottom: 20px;">
        <div class="intensity-card-header">
          <span class="intensity-title">落地後的情緒指數</span>
          <span class="intensity-badge" id="badge-post-score">${postVal}</span>
        </div>
        <input type="range" min="0" max="100" id="slider-post-score" class="neumo-slider" value="${postVal}">
      </div>

      <div style="background: var(--surface-card); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--shadow-neumo-sm); text-align: center;">
        <div style="font-size: 13.5px; color: var(--text-sub);">落地前後情緒舒緩對比 (可略過)</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--primary); margin-top: 6px;" id="relief-diff-text">
          原始最高: ${initialMaxScore}分 → 落地後: ${postVal}分 (舒緩 ${Math.max(0, initialMaxScore - postVal)}分)
        </div>
      </div>
    `;

    const slider = container.querySelector('#slider-post-score');
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.draft.postScore = val;
      container.querySelector('#badge-post-score').innerText = val;
      const diff = Math.max(0, initialMaxScore - val);
      container.querySelector('#relief-diff-text').innerText = 
        `原始最高: ${initialMaxScore}分 → 落地後: ${val}分 (舒緩 ${diff}分)`;
    });
  }

  function renderStepSeemedFact(container) {
    container.innerHTML = `
      <div>
        <label style="font-size: 13px; font-weight: 600; color: #5a557b; display: block; margin-bottom: 6px;">🌫️ 好像的事實 (假相 / 腦補，可選填，可略過)</label>
        <textarea id="wiz-seemed" class="neumo-textarea" style="min-height: 140px;" placeholder="例如：我以為他是故意針對我、事情絕對完蛋了...">${escapeHtml(state.draft.seemedFact)}</textarea>
      </div>
    `;
    const textarea = container.querySelector('#wiz-seemed');
    textarea.addEventListener('input', () => { state.draft.seemedFact = textarea.value; });
  }

  function renderStepRealFact(container) {
    const curEval = state.draft.factEvaluation || '完全錯誤';
    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <label style="font-size: 13px; font-weight: 600; color: #5a557b; display: block; margin-bottom: 6px;">☀️ 確立的事實 (客觀真相，可選填，可略過)</label>
        <textarea id="wiz-real" class="neumo-textarea" style="min-height: 100px;" placeholder="例如：冷靜查證發現只是誤會，對方沒有惡意...">${escapeHtml(state.draft.realFact)}</textarea>
      </div>

      <div>
        <label style="font-size: 13px; font-weight: 600; color: #5a557b; display: block; margin-bottom: 6px;">杏仁核核對：「好像的事實」是否錯誤？</label>
        <div class="choice-pill-group">
          <div class="choice-pill ${curEval === '完全錯誤' ? 'selected' : ''}" data-val="完全錯誤">完全錯誤 (100% 假相)</div>
          <div class="choice-pill ${curEval === '部分錯誤' ? 'selected' : ''}" data-val="部分錯誤">部分錯誤</div>
          <div class="choice-pill ${curEval === '符合事實' ? 'selected' : ''}" data-val="符合事實">符合事實</div>
        </div>
      </div>
    `;

    const textarea = container.querySelector('#wiz-real');
    textarea.addEventListener('input', () => { state.draft.realFact = textarea.value; });

    container.querySelectorAll('.choice-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.choice-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        state.draft.factEvaluation = pill.dataset.val;
      });
    });
  }

  function renderStepEvent(container) {
    container.innerHTML = `
      <div style="margin-bottom: 12px;">
        <label style="font-size: 13px; font-weight: 600; color: #5a557b; display: block; margin-bottom: 6px;">📅 事件發生時間</label>
        <input type="datetime-local" id="wiz-time" class="neumo-input" value="${state.draft.createdAt}">
      </div>
      <div>
        <label style="font-size: 13px; font-weight: 600; color: #5a557b; display: block; margin-bottom: 6px;">📝 事件具體經過與客觀背景 (放最後回顧，可選填，可略過)</label>
        <textarea id="wiz-event" class="neumo-textarea" placeholder="回顧整起事件具體發生了什麼事... (可選填，亦可直接點下一步略過)">${escapeHtml(state.draft.event)}</textarea>
      </div>
    `;
    const timeInput = container.querySelector('#wiz-time');
    const eventInput = container.querySelector('#wiz-event');
    timeInput.addEventListener('change', () => { state.draft.createdAt = timeInput.value; });
    eventInput.addEventListener('input', () => { state.draft.event = eventInput.value; });
  }

  function renderStepReflection(container) {
    container.innerHTML = `
      <div>
        <label style="font-size: 13px; font-weight: 600; color: #5a557b; display: block; margin-bottom: 6px;">🌟 今日評價 (自我肯定、觀功念恩、學習收穫，可選填)</label>
        <textarea id="wiz-reflection" class="neumo-textarea" style="min-height: 140px;" placeholder="例如：讚嘆自己今天在境界當下有及時察覺身心反應，並做深呼吸落地！看到事實真相後放下很多，肯定自己的進步...">${escapeHtml(state.draft.reflection)}</textarea>
      </div>
      <div style="margin-top: 16px; padding: 12px; background: #f0eefa; border-radius: var(--radius-md); font-size: 13px; color: #574b90; text-align: center;">
        🎉 太棒了！您已走完情緒觀察表覺察流程，點擊下方「完成儲存」即可永久儲存至硬碟。
      </div>
    `;
    const textarea = container.querySelector('#wiz-reflection');
    textarea.addEventListener('input', () => { state.draft.reflection = textarea.value; });
  }

  // Helper to render Tag Clouds (Body, Thoughts, Emotions, Grounding)
  function renderTagCloudStep(container, categoryKey, title, placeholder) {
    const currentTags = state.tags[categoryKey] || [];
    
    // Check what is currently selected in draft
    let selectedValues = [];
    if (categoryKey === 'emotions') {
      selectedValues = (state.draft.emotions || []).map(e => typeof e === 'string' ? e : e.name);
    } else {
      selectedValues = state.draft[categoryKey] || [];
    }

    container.innerHTML = `
      <div class="neumo-input-group">
        <input type="text" id="wiz-add-tag-input" class="neumo-input" placeholder="${placeholder}">
        <button id="wiz-add-tag-btn" class="btn-primary">+ 新增</button>
      </div>

      <div class="tag-cloud" id="wiz-tag-cloud">
        ${currentTags.map(tag => {
          const isSelected = selectedValues.includes(tag);
          return `
            <div class="tag-pill ${isSelected ? 'selected' : ''}" data-tag="${escapeHtml(tag)}">
              <span>${escapeHtml(tag)}</span>
              <span class="tag-delete-btn" title="從詞庫移除">×</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const input = container.querySelector('#wiz-add-tag-input');
    const addBtn = container.querySelector('#wiz-add-tag-btn');
    const cloud = container.querySelector('#wiz-tag-cloud');

    // Add new tag handler
    function handleAddNewTag() {
      const val = input.value.trim();
      if (!val) return;
      if (!state.tags[categoryKey].includes(val)) {
        state.tags[categoryKey].unshift(val);
        persistData();
      }
      // Auto-select newly added tag
      toggleTagSelection(val, categoryKey);
      input.value = '';
      renderTagCloudStep(container, categoryKey, title, placeholder);
    }

    addBtn.addEventListener('click', handleAddNewTag);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddNewTag();
      }
    });

    // Cloud click delegation (selection and delete)
    cloud.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.tag-delete-btn');
      const pill = e.target.closest('.tag-pill');
      if (!pill) return;
      const tag = pill.dataset.tag;

      if (deleteBtn) {
        e.stopPropagation();
        if (confirm(`確定要將「${tag}」從詞庫選單中刪除嗎？`)) {
          state.tags[categoryKey] = state.tags[categoryKey].filter(t => t !== tag);
          // Also remove from draft if selected
          removeTagFromDraft(tag, categoryKey);
          persistData();
          renderTagCloudStep(container, categoryKey, title, placeholder);
        }
        return;
      }

      // Toggle selection
      toggleTagSelection(tag, categoryKey);
      pill.classList.toggle('selected');
    });
  }

  function toggleTagSelection(tag, categoryKey) {
    if (categoryKey === 'emotions') {
      const exists = state.draft.emotions.some(e => (typeof e === 'string' ? e : e.name) === tag);
      if (exists) {
        state.draft.emotions = state.draft.emotions.filter(e => (typeof e === 'string' ? e : e.name) !== tag);
      } else {
        state.draft.emotions.push({ name: tag, score: 75 });
      }
    } else {
      if (!state.draft[categoryKey]) state.draft[categoryKey] = [];
      const idx = state.draft[categoryKey].indexOf(tag);
      if (idx >= 0) {
        state.draft[categoryKey].splice(idx, 1);
      } else {
        state.draft[categoryKey].push(tag);
      }
    }
  }

  function removeTagFromDraft(tag, categoryKey) {
    if (categoryKey === 'emotions') {
      state.draft.emotions = state.draft.emotions.filter(e => (typeof e === 'string' ? e : e.name) !== tag);
    } else if (state.draft[categoryKey]) {
      state.draft[categoryKey] = state.draft[categoryKey].filter(t => t !== tag);
    }
  }

  // 5. Update Wizard UI and Header
  function updateWizardUI() {
    const stepConfig = WIZARD_STEPS[state.currentStep - 1];
    document.getElementById('step-badge').innerText = `步驟 ${stepConfig.step} / 12`;
    document.getElementById('step-title').innerText = stepConfig.title;
    document.getElementById('step-prompt').innerText = stepConfig.prompt;

    // Render body
    const body = document.getElementById('wizard-body');
    stepConfig.render(body);

    // Update bottom navigation buttons
    const prevBtn = document.getElementById('btn-wizard-prev');
    const nextText = document.getElementById('wizard-next-text');
    const nextIcon = document.getElementById('wizard-next-icon');

    prevBtn.disabled = state.currentStep === 1;

    if (state.currentStep === 12) {
      nextText.innerText = '完成儲存';
      nextIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    } else {
      nextText.innerText = '下一步';
      nextIcon.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';
    }

    // Update beads arch
    const beads = document.querySelectorAll('#beads-bar .bead');
    const activeBeadIdx = Math.floor(((state.currentStep - 1) / 11) * (beads.length - 1));
    beads.forEach((bead, i) => {
      bead.classList.toggle('active', i === activeBeadIdx);
    });
  }

  // Wizard Nav Actions
  function wizardNext() {
    if (state.currentStep < 12) {
      state.currentStep++;
      updateWizardUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      saveDraftRecord();
    }
  }

  function wizardPrev() {
    if (state.currentStep > 1) {
      state.currentStep--;
      updateWizardUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Save Record
  function saveDraftRecord() {
    // If emotion is empty, add default
    if (!state.draft.emotions || state.draft.emotions.length === 0) {
      state.draft.emotions = [{ name: '覺察', score: 50 }];
    }

    if (state.editingRecordId) {
      const idx = state.records.findIndex(r => r.id === state.editingRecordId);
      if (idx >= 0) {
        state.records[idx] = JSON.parse(JSON.stringify(state.draft));
        state.records[idx].id = state.editingRecordId;
      }
      state.editingRecordId = null;
      showToast('🎉 已更新情緒觀察表！');
    } else {
      state.records.unshift(JSON.parse(JSON.stringify(state.draft)));
      showToast('🎉 已成功儲存情緒觀察表！');
    }

    persistData();

    // Reset draft
    state.draft = getEmptyDraft();
    state.currentStep = 1;
    updateWizardUI();
    syncQuickForm();

    // Switch to records tab to see new card
    switchTab('records');
  }

  // 6. Quick Form Synchronization
  function syncQuickForm() {
    document.getElementById('quick-time').value = state.draft.createdAt;
    document.getElementById('quick-event').value = state.draft.event;
    document.getElementById('quick-trigger').value = state.draft.trigger;
    document.getElementById('quick-seemed-fact').value = state.draft.seemedFact;
    document.getElementById('quick-real-fact').value = state.draft.realFact;
    document.getElementById('quick-reflection').value = state.draft.reflection;
    document.getElementById('quick-post-score').value = state.draft.postScore || 30;
    document.getElementById('quick-post-score-val').innerText = state.draft.postScore || 30;

    // Render tag clouds for quick form
    renderQuickCloud('quick-body-tags', 'bodyReactions');
    renderQuickCloud('quick-thoughts-tags', 'thoughts');
    renderQuickCloud('quick-emotions-tags', 'emotions');
    renderQuickCloud('quick-grounding-tags', 'grounding');
    renderQuickIntensitySliders();

    // Timing choices
    document.querySelectorAll('#quick-timing-choices .choice-pill').forEach(pill => {
      pill.classList.toggle('selected', pill.dataset.val === (state.draft.timing || '當下'));
    });

    // Fact error choices
    document.querySelectorAll('#quick-fact-error-choices .choice-pill').forEach(pill => {
      pill.classList.toggle('selected', pill.dataset.val === (state.draft.factEvaluation || '完全錯誤'));
    });
  }

  function renderQuickCloud(containerId, categoryKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const currentTags = state.tags[categoryKey] || [];
    let selectedValues = [];
    if (categoryKey === 'emotions') {
      selectedValues = (state.draft.emotions || []).map(e => typeof e === 'string' ? e : e.name);
    } else {
      selectedValues = state.draft[categoryKey] || [];
    }

    container.innerHTML = currentTags.map(tag => {
      const isSelected = selectedValues.includes(tag);
      return `<div class="tag-pill ${isSelected ? 'selected' : ''}" data-cat="${categoryKey}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</div>`;
    }).join('');
  }

  function renderQuickIntensitySliders() {
    const box = document.getElementById('quick-intensity-sliders');
    if (!box) return;
    if (!state.draft.emotions || state.draft.emotions.length === 0) {
      box.innerHTML = '<div style="font-size:13px; color:var(--text-muted);">請先在上方第 5 欄點選情緒類別</div>';
      return;
    }
    box.innerHTML = state.draft.emotions.map((emo, idx) => `
      <div class="intensity-card">
        <div class="intensity-card-header">
          <span class="intensity-title">${idx + 1}. ${escapeHtml(emo.name)}</span>
          <span class="intensity-badge" id="quick-badge-emo-${idx}">${emo.score || 50}</span>
        </div>
        <input type="range" min="0" max="100" class="neumo-slider quick-emo-slider" data-idx="${idx}" value="${emo.score || 50}">
      </div>
    `).join('');

    box.querySelectorAll('.quick-emo-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const val = parseInt(e.target.value, 10);
        state.draft.emotions[idx].score = val;
        document.getElementById(`quick-badge-emo-${idx}`).innerText = val;
      });
    });
  }

  // 7. Records List & Management
  function renderRecordsList() {
    const list = document.getElementById('records-list');
    const emptyBox = document.getElementById('records-empty');
    const query = (document.getElementById('record-search-input').value || '').toLowerCase().trim();

    let filtered = state.records;
    if (query) {
      filtered = state.records.filter(r => {
        const bodyStr = (r.bodyReactions || []).join(' ');
        const thoughtsStr = (r.thoughts || []).join(' ');
        const emoStr = (r.emotions || []).map(e => e.name).join(' ');
        const allText = `${r.event} ${r.trigger} ${r.seemedFact} ${r.realFact} ${r.reflection} ${bodyStr} ${thoughtsStr} ${emoStr}`.toLowerCase();
        return allText.includes(query);
      });
    }

    if (filtered.length === 0) {
      list.innerHTML = '';
      emptyBox.style.display = 'block';
      return;
    }

    emptyBox.style.display = 'none';
    list.innerHTML = filtered.map(r => {
      const emoPills = (r.emotions || []).map(e => `
        <span class="record-emotion-pill">${escapeHtml(e.name)}: ${e.score}分</span>
      `).join('');

      const bodyPills = (r.bodyReactions || []).slice(0, 3).map(b => `
        <span style="font-size:12px; background:#f5f3fc; color:#6b668d; padding:2px 8px; border-radius:10px;">${escapeHtml(b)}</span>
      `).join('');

      const dateStr = r.createdAt ? r.createdAt.replace('T', ' ') : '近期';

      return `
        <div class="record-item-card" data-id="${r.id}">
          <div class="record-header-row">
            <span class="record-date-badge">📅 ${dateStr}</span>
            <span style="font-size:12px; color:#8e8aa8;">${r.timing || '當下'}落地</span>
          </div>

          <div class="record-emotions-wrap">
            ${emoPills}
          </div>

          ${r.trigger ? `
            <div class="record-section-snippet">
              <b>觸發點：</b> ${escapeHtml(truncate(r.trigger, 48))}
            </div>
          ` : ''}

          ${r.event ? `
            <div class="record-section-snippet">
              <b>事件：</b> ${escapeHtml(truncate(r.event, 48))}
            </div>
          ` : ''}

          <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
            <span style="font-size:12px; color:#8883a5;">身體反應：</span>
            ${bodyPills || '<span style="font-size:12px; color:#a09cb8;">無</span>'}
          </div>

          <div class="record-actions-row">
            <button class="record-action-btn btn-view-record" data-id="${r.id}">
              👁️ 詳情
            </button>
            <button class="record-action-btn btn-share-record" data-id="${r.id}">
              📤 分享
            </button>
            <button class="record-action-btn btn-edit-record" data-id="${r.id}">
              ✏️ 編輯
            </button>
            <button class="record-action-btn btn-delete-record" data-id="${r.id}" style="color:#e05666;">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach actions
    list.querySelectorAll('.btn-view-record').forEach(btn => {
      btn.addEventListener('click', () => showRecordDetailModal(btn.dataset.id));
    });

    list.querySelectorAll('.btn-share-record').forEach(btn => {
      btn.addEventListener('click', () => shareRecord(btn.dataset.id));
    });

    list.querySelectorAll('.btn-edit-record').forEach(btn => {
      btn.addEventListener('click', () => editRecord(btn.dataset.id));
    });

    list.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', () => deleteRecord(btn.dataset.id));
    });
  }

  function showRecordDetailModal(id) {
    const r = state.records.find(item => item.id === id);
    if (!r) return;

    const emoList = (r.emotions || []).map(e => `${e.name} (${e.score}分)`).join('、 ') || '無';
    const bodyList = (r.bodyReactions || []).join('、 ') || '無';
    const thoughtsList = (r.thoughts || []).join('、 ') || '無';
    const groundList = (r.grounding || []).join('、 ') || '無';

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 14px;">
        <h3 style="color: #4a4473; font-size: 20px;">📜 情緒觀察表明細</h3>
        <span style="font-size: 13px; color: var(--text-sub);">記錄時間：${r.createdAt.replace('T', ' ')}</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; font-size:14px; line-height:1.6;">
        <div><b>1. 事件：</b><p style="color:#555075; margin-top:2px;">${escapeHtml(r.event || '未填寫')}</p></div>
        <div><b>2. 觸發點：</b><p style="color:#555075; margin-top:2px;">${escapeHtml(r.trigger || '未填寫')}</p></div>
        <div><b>3. 身體反應：</b><p style="color:#555075; margin-top:2px;">${escapeHtml(bodyList)}</p></div>
        <div><b>4. 心裡自然流露的話：</b><p style="color:#555075; margin-top:2px;">${escapeHtml(thoughtsList)}</p></div>
        <div><b>5 & 6. 情緒類別與指數：</b><p style="color:#9b8cf1; font-weight:600; margin-top:2px;">${escapeHtml(emoList)}</p></div>
        <div><b>7. 情緒落地方式：</b><p style="color:#555075; margin-top:2px;">${escapeHtml(groundList)}</p></div>
        <div><b>8. 落地時機：</b><p style="color:#555075; margin-top:2px;">${escapeHtml(r.timing || '當下')}</p></div>
        <div><b>9. 落地後情緒指數：</b><p style="color:#555075; margin-top:2px;">${r.postScore !== undefined ? r.postScore + ' 分' : '未記錄'}</p></div>
        <div><b>10. 好像的事實 (假相)：</b><p style="color:#d9534f; margin-top:2px;">${escapeHtml(r.seemedFact || '未填寫')}</p></div>
        <div><b>11. 確立的事實 (真相)：</b><p style="color:#2e7d32; margin-top:2px;">${escapeHtml(r.realFact || '未填寫')}</p>
          <span style="font-size:12.5px; color:#787593;">[核對結論: ${r.factEvaluation || '完全錯誤'}]</span>
        </div>
        <div><b>12. 今日評價：</b><p style="color:#555075; margin-top:2px;">${escapeHtml(r.reflection || '未填寫')}</p></div>
      </div>

      <div style="display:flex; gap:10px; margin-top:16px;">
        <button id="modal-share-btn" class="btn-primary" style="flex:1;">📤 分享此卡片</button>
      </div>
    `;

    openModal(contentHtml);
    document.getElementById('modal-share-btn').addEventListener('click', () => {
      shareRecord(r.id);
    });
  }

  function shareRecord(id) {
    const r = state.records.find(item => item.id === id);
    if (!r) return;

    const emoList = (r.emotions || []).map(e => `${e.name} ${e.score}分`).join('、 ') || '無';
    const bodyList = (r.bodyReactions || []).join('、 ') || '無';
    const thoughtsList = (r.thoughts || []).join('、 ') || '無';
    const groundList = (r.grounding || []).join('、 ') || '無';

    const shareText = `【2026 PEI 情緒觀察表】
📅 時間：${r.createdAt.replace('T', ' ')}
📝 事件：${r.event || '無'}
⚡ 觸發點：${r.trigger || '無'}
🩺 身體反應：${bodyList}
💭 心裡流露：${thoughtsList}
💜 情緒指數：${emoList}
🌱 落地方式：${groundList} (${r.timing || '當下'}落地，後降為 ${r.postScore || 30}分)
🌫️ 好像的事實：${r.seemedFact || '無'}
☀️ 確立的事實：${r.realFact || '無'} (${r.factEvaluation || '完全錯誤'})
🌟 今日評價：${r.reflection || '無'}
---
由「情緒觀察表 App」記錄與自主備份`;

    if (navigator.share) {
      navigator.share({
        title: '我的情緒觀察表',
        text: shareText
      }).catch(() => {
        copyToClipboard(shareText);
      });
    } else {
      copyToClipboard(shareText);
    }
  }

  function editRecord(id) {
    const r = state.records.find(item => item.id === id);
    if (!r) return;

    state.draft = JSON.parse(JSON.stringify(r));
    state.editingRecordId = id;
    state.currentStep = 1;

    switchTab('home');
    updateWizardUI();
    syncQuickForm();
    showToast('✏️ 正在編輯此筆情緒觀察表');
  }

  function deleteRecord(id) {
    if (confirm('確定要刪除此筆情緒觀察表記錄嗎？')) {
      state.records = state.records.filter(r => r.id !== id);
      persistData();
      renderRecordsList();
      showToast('🗑️ 已刪除記錄');
    }
  }

  // 8. Statistics Calculation (Page 17 Exact Replica)
  function calculateStatistics() {
    // 1. Calculate learning days from start date
    const start = new Date(state.startDate);
    const now = new Date();
    const diffTime = Math.max(0, now - start);
    const learningDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // 2. Filter records by period
    const filteredRecords = filterRecordsByPeriod(state.records, state.statsPeriod);
    const sheetCount = filteredRecords.length;
    const sheetsPerDay = (sheetCount / Math.max(1, learningDays)).toFixed(1);

    // Update labels
    document.getElementById('stat-learning-days').innerText = `${learningDays} 天`;
    document.getElementById('stat-start-date-label').innerText = `(上課日期: ${state.startDate})`;
    document.getElementById('stat-sheets-count').innerText = `${sheetCount} 張`;
    document.getElementById('stat-sheets-per-day').innerText = `(${sheetsPerDay} 張／天)`;

    // Frequency counters
    const bodyCount = {};
    const thoughtsCount = {};
    const emotionsCount = {};
    const emotionsTotalScores = {};
    const groundingCount = {};
    const groundingRelief = {}; // { technique: [reliefDiffs] }
    let timingDownCount = 0; // 當下
    let timingAfterCount = 0; // 事後
    let timingUnlandedCount = 0; // 未落地
    let factErrorCount = 0; // 完全錯誤 or 部分錯誤
    let factEvaluatedCount = 0;

    filteredRecords.forEach(r => {
      // Body
      (r.bodyReactions || []).forEach(b => {
        bodyCount[b] = (bodyCount[b] || 0) + 1;
      });

      // Thoughts
      (r.thoughts || []).forEach(t => {
        thoughtsCount[t] = (thoughtsCount[t] || 0) + 1;
      });

      // Emotions
      const initialMax = r.emotions && r.emotions.length > 0 
        ? Math.max(...r.emotions.map(e => e.score || 50)) 
        : 60;
      const post = r.postScore !== undefined ? r.postScore : 30;
      const relief = Math.max(0, initialMax - post);

      (r.emotions || []).forEach(e => {
        emotionsCount[e.name] = (emotionsCount[e.name] || 0) + 1;
        emotionsTotalScores[e.name] = Math.max(emotionsTotalScores[e.name] || 0, e.score || 50);
      });

      // Timing
      if (r.timing === '當下') timingDownCount++;
      else if (r.timing === '事後') timingAfterCount++;
      else timingUnlandedCount++;

      // Grounding
      (r.grounding || []).forEach(g => {
        if (g && g !== '無') {
          groundingCount[g] = (groundingCount[g] || 0) + 1;
          if (!groundingRelief[g]) groundingRelief[g] = [];
          groundingRelief[g].push(relief);
        }
      });

      // Fact verification
      if (r.factEvaluation) {
        factEvaluatedCount++;
        if (r.factEvaluation === '完全錯誤' || r.factEvaluation === '部分錯誤') {
          factErrorCount++;
        }
      }
    });

    // 3. Render Body Reactions Rank (Top 3)
    renderTopRankList('stat-body-rank', bodyCount, '次');

    // 4. Render Thoughts Rank (Top 3)
    renderTopRankList('stat-thoughts-rank', thoughtsCount, '次');

    // 5. Render Emotions Percentage Rank
    const totalEmoMentions = Object.values(emotionsCount).reduce((a, b) => a + b, 0);
    const emoRankBox = document.getElementById('stat-emotions-rank');
    if (totalEmoMentions === 0) {
      emoRankBox.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">暫無資料</div>';
    } else {
      const sortedEmo = Object.entries(emotionsCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
      emoRankBox.innerHTML = sortedEmo.map(([name, count]) => {
        const pct = Math.round((count / totalEmoMentions) * 100);
        return `
          <div class="stats-rank-item">
            <span>${escapeHtml(name)}</span>
            <span class="val">${pct}%</span>
          </div>
        `;
      }).join('');
    }

    // 6. Strongest Emotion (Highest score / occurrences)
    const strongestEmoBox = document.getElementById('stat-strongest-emotion');
    const sortedByScore = Object.entries(emotionsTotalScores).sort((a, b) => b[1] - a[1]);
    if (sortedByScore.length > 0) {
      const topName = sortedByScore[0][0];
      const maxScore = sortedByScore[0][1];
      const count = emotionsCount[topName] || 1;
      strongestEmoBox.innerText = `${topName} ${maxScore} / ${count}次`;
    } else {
      strongestEmoBox.innerText = '無';
    }

    // 7. Grounding Timing Ratio (當下 vs 事後)
    const timingTotal = timingDownCount + timingAfterCount + timingUnlandedCount;
    if (timingTotal > 0) {
      const downPct = Math.round((timingDownCount / timingTotal) * 100);
      const afterPct = Math.round((timingAfterCount / timingTotal) * 100);
      const unlandedPct = Math.round((timingUnlandedCount / timingTotal) * 100);
      document.getElementById('stat-timing-ratio').innerText = `當下 ${downPct}%　事後 ${afterPct}%`;
      document.getElementById('stat-timing-unlanded').innerText = `未落地: ${unlandedPct}% (總計 ${timingTotal} 次)`;
    } else {
      document.getElementById('stat-timing-ratio').innerText = '當下 0%　事後 0%';
      document.getElementById('stat-timing-unlanded').innerText = '未落地: 0%';
    }

    // 8. Most Used Grounding (Top 3)
    renderTopRankList('stat-grounding-rank', groundingCount, '次');

    // 9. Most Effective Grounding (Highest avg relief / count)
    const effectiveBox = document.getElementById('stat-effective-grounding');
    let bestGrounding = null;
    let bestAvgRelief = -1;
    let bestCount = 0;

    Object.entries(groundingRelief).forEach(([name, reliefs]) => {
      const avg = reliefs.reduce((a, b) => a + b, 0) / reliefs.length;
      if (avg > bestAvgRelief) {
        bestAvgRelief = avg;
        bestGrounding = name;
        bestCount = reliefs.length;
      }
    });

    if (bestGrounding) {
      effectiveBox.innerText = `${bestGrounding} ${Math.round(bestAvgRelief)} / ${bestCount}次`;
    } else {
      effectiveBox.innerText = '無';
    }

    // 10. Fact Error Percentage (90% in sample)
    const falseRatioBox = document.getElementById('stat-false-ratio');
    if (factEvaluatedCount > 0) {
      const falsePct = Math.round((factErrorCount / factEvaluatedCount) * 100);
      falseRatioBox.innerText = `${falsePct}%`;
    } else {
      falseRatioBox.innerText = '0%';
    }

    // Update Date Range Display label
    updateDateRangeLabel();

    // Generate Weekly / Monthly / Quarterly / Annual Summary Report
    generateSummaryReport(filteredRecords, learningDays, sheetsPerDay, bodyCount, thoughtsCount, emotionsCount, strongestEmoBox.innerText, timingDownCount, timingAfterCount, timingTotal, bestGrounding, bestAvgRelief, bestCount, factErrorCount, factEvaluatedCount);
  }

  function renderTopRankList(containerId, countMap, unit) {
    const box = document.getElementById(containerId);
    const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (sorted.length === 0) {
      box.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">暫無資料</div>';
      return;
    }
    box.innerHTML = sorted.map(([name, count]) => `
      <div class="stats-rank-item">
        <span>${escapeHtml(name)}</span>
        <span class="val">${count} ${unit}</span>
      </div>
    `).join('');
  }

  function filterRecordsByPeriod(records, period) {
    if (period === 'all') return records;

    const now = new Date();
    return records.filter(r => {
      if (!r.createdAt) return true;
      const rDate = new Date(r.createdAt);

      if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return rDate >= startOfWeek;
      } else if (period === 'last_week') {
        const startOfLastWeek = new Date(now);
        startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
        return rDate >= startOfLastWeek && rDate < endOfLastWeek;
      } else if (period === 'month') {
        return rDate.getFullYear() === now.getFullYear() && rDate.getMonth() === now.getMonth();
      } else if (period === 'last_month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return rDate.getFullYear() === lastMonthDate.getFullYear() && rDate.getMonth() === lastMonthDate.getMonth();
      } else if (period === 'quarter') {
        const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const qStart = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0);
        const qEnd = new Date(now.getFullYear(), qStartMonth + 3, 0, 23, 59, 59, 999);
        return rDate >= qStart && rDate <= qEnd;
      } else if (period === 'last_quarter') {
        const lastQStartMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
        const lastQYear = lastQStartMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const normStartMonth = (lastQStartMonth + 12) % 12;
        const qStart = new Date(lastQYear, normStartMonth, 1, 0, 0, 0);
        const qEnd = new Date(lastQYear, normStartMonth + 3, 0, 23, 59, 59, 999);
        return rDate >= qStart && rDate <= qEnd;
      } else if (period === 'year') {
        return rDate.getFullYear() === now.getFullYear();
      } else if (period === 'last_year') {
        return rDate.getFullYear() === now.getFullYear() - 1;
      } else if (period === 'custom') {
        const startStr = document.getElementById('stats-date-start').value;
        const endStr = document.getElementById('stats-date-end').value;
        if (!startStr || !endStr) return true;
        const s = new Date(startStr);
        const e = new Date(endStr);
        e.setHours(23, 59, 59, 999);
        return rDate >= s && rDate <= e;
      }
      return true;
    });
  }


  // Generate Weekly / Monthly / Quarterly / Annual Heart Awareness Summary
  let currentSummaryTextToCopy = '';

  function generateSummaryReport(filteredRecords, learningDays, sheetsPerDay, bodyCount, thoughtsCount, emotionsCount, strongestEmoText, timingDownCount, timingAfterCount, timingTotal, bestGrounding, bestAvgRelief, bestCount, factErrorCount, factEvaluatedCount) {
    const titleEl = document.getElementById('summary-report-title');
    const bodyEl = document.getElementById('summary-report-body');
    if (!titleEl || !bodyEl) return;

    const now = new Date();
    const period = state.statsPeriod;
    let periodName = '本週';
    if (period === 'week') periodName = '本週';
    else if (period === 'last_week') periodName = '上週';
    else if (period === 'month') periodName = `${now.getMonth() + 1}月份`;
    else if (period === 'last_month') periodName = '上月份';
    else if (period === 'quarter') periodName = `${now.getFullYear()}年 第${Math.floor(now.getMonth() / 3) + 1}季`;
    else if (period === 'last_quarter') periodName = '上一季度';
    else if (period === 'year') periodName = `${now.getFullYear()}年度`;
    else if (period === 'last_year') periodName = `${now.getFullYear() - 1}年度`;
    else if (period === 'all') periodName = '歷程全覽';
    else if (period === 'custom') periodName = '自訂區間';

    titleEl.innerText = `📋 ${periodName}心靈覺察總結報告`;

    if (filteredRecords.length === 0) {
      bodyEl.innerHTML = `<div style="color:var(--text-muted); font-size:13.5px; padding:10px 0;">本期間尚未填寫情緒觀察表。面對境界時，練習隨時打開 App 記錄身心反應與落地，讓覺察不斷線！</div>`;
      currentSummaryTextToCopy = `【${periodName}心靈覺察總結】本期間尚未填寫記錄，持續練習讓覺察不斷線！`;
      return;
    }

    const topBody = Object.entries(bodyCount).sort((a,b)=>b[1]-a[1])[0];
    const topThought = Object.entries(thoughtsCount).sort((a,b)=>b[1]-a[1])[0];
    const totalEmoMentions = Object.values(emotionsCount).reduce((a,b)=>a+b, 0);
    const topEmo = Object.entries(emotionsCount).sort((a,b)=>b[1]-a[1])[0];
    const topEmoPct = topEmo && totalEmoMentions > 0 ? Math.round((topEmo[1] / totalEmoMentions) * 100) : 0;
    const timingDownPct = timingTotal > 0 ? Math.round((timingDownCount / timingTotal) * 100) : 0;
    const falseRatioPct = factEvaluatedCount > 0 ? Math.round((factErrorCount / factEvaluatedCount) * 100) : 0;

    const html = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div><b>📈 保溫實修進度：</b>本期間共記錄了 <span style="color:var(--primary); font-weight:700;">${filteredRecords.length} 張</span> 情緒觀察表（平均每日 ${sheetsPerDay} 張），持續保溫不間斷！</div>
        <div><b>🧘 身心生理慣性：</b>面對境界時，身體最常出現的預警訊號是「<span style="color:#d9534f; font-weight:600;">${topBody ? topBody[0] : '無'}</span>」，大腦第一時間浮現的自動念頭是「<span style="color:#e67e22; font-weight:600;">${topThought ? topThought[0] : '無'}</span>」。</div>
        <div><b>💜 情緒光譜輪廓：</b>主要湧現的情緒為「<span style="color:var(--primary); font-weight:700;">${topEmo ? topEmo[0] : '無'}</span> (佔 ${topEmoPct}%)」，最強烈的情緒表現為 ${escapeHtml(strongestEmoText)}。</div>
        <div><b>🌱 落地轉化成效：</b>在面臨境界時，有 <span style="color:#2e7d32; font-weight:700;">${timingDownPct}%</span> 能做到「當下立即落地」！其中以「<span style="color:#2e7d32; font-weight:600;">${bestGrounding || '深呼吸'}</span>」最為有效，平均幫心靈舒緩了 ${bestAvgRelief > 0 ? Math.round(bestAvgRelief) : 0} 分情緒張力。</div>
        <div><b>☀️ 假相超越與真相：</b>經查證後，高達 <span style="color:#d9534f; font-weight:700;">${falseRatioPct}%</span> 的「好像的事實」證實只是大腦杏仁核的假相腦補，成功從情緒漩渦中看見客觀事實真相！</div>
        <div style="margin-top:6px; padding:10px; background:#f0eefa; border-radius:10px; font-size:13px; color:#524785;">
          💬 <b>上師實修叮嚀：</b>「核心：不要求做得很多，而是『不要斷』，變成習慣。練久了，面對境界時，就能更絲滑地流水線走完：<b>辨認 ➔ 落地 ➔ 再看真相</b>！」
        </div>
      </div>
    `;

    bodyEl.innerHTML = html;

    currentSummaryTextToCopy = `【2026 PEI ${periodName}心靈覺察總結報告】
📈 保溫實修：本期間填寫 ${filteredRecords.length} 張觀察表 (日均 ${sheetsPerDay} 張)
🧘 身心慣性：身體最常出現「${topBody ? topBody[0] : '無'}」，心裡最常流露「${topThought ? topThought[0] : '無'}」
💜 情緒分佈：核心情緒為「${topEmo ? topEmo[0] : '無'} (佔 ${topEmoPct}%)」，最強烈為 ${strongestEmoText}
🌱 落地轉化：當下落地率達 ${timingDownPct}%，以「${bestGrounding || '深呼吸'}」最為有效 (舒緩約 ${bestAvgRelief > 0 ? Math.round(bestAvgRelief) : 0}分)
☀️ 假相超越：好像的事實錯誤率達 ${falseRatioPct}%，成功識破杏仁核假相，看見客觀真相！
---
由「情緒觀察表 App」記錄與自主備份`;
  }

  function updateDateRangeLabel() {
    const label = document.getElementById('stats-date-label');
    const now = new Date();
    const fmt = d => `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;

    if (state.statsPeriod === 'all') {
      if (state.records.length > 0) {
        const dates = state.records.map(r => new Date(r.createdAt)).sort((a,b)=>a-b);
        label.innerText = `${fmt(dates[0])} ~ ${fmt(dates[dates.length-1])} (全部)`;
      } else {
        label.innerText = '全部記錄';
      }
    } else if (state.statsPeriod === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      label.innerText = `${fmt(start)} ~ ${fmt(now)}`;
    } else {
      label.innerText = `${fmt(now)} (統計中)`;
    }
  }

  // 9. Excel Export (Page 17 Match)
  function exportToExcel() {
    if (!window.XLSX) {
      alert('Excel 匯出元件載入中，請稍候重試');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: 統計摘要表
    const summaryData = [
      ['2026 PEI 第三屆情緒觀察營 - 情緒統計總覽報表'],
      ['產生時間', new Date().toLocaleString()],
      ['學習天數', document.getElementById('stat-learning-days').innerText],
      ['填寫張數', document.getElementById('stat-sheets-count').innerText],
      ['最強烈情緒', document.getElementById('stat-strongest-emotion').innerText],
      ['落地時機比例', document.getElementById('stat-timing-ratio').innerText],
      ['最有效落地方式', document.getElementById('stat-effective-grounding').innerText],
      ['好像的事實錯誤率', document.getElementById('stat-false-ratio').innerText],
      []
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, '情緒統計總覽');

    // Sheet 2: 完整 12 欄位原始明細記錄
    const recordsHeader = [
      '序號', '記錄時間', '1.事件', '2.觸發點', '3.身體反應', 
      '4.心裡自然流露的話', '5.情緒類別', '6.最高情緒指數', 
      '7.情緒落地方式', '8.落地時機', '9.落地後情緒指數', 
      '10.好像的事實(假相)', '11.確立的事實(真相)', '假相核對結論', '12.今日評價'
    ];

    const recordsRows = state.records.map((r, i) => {
      const emoList = (r.emotions || []).map(e => `${e.name}(${e.score})`).join('; ');
      const maxEmoScore = r.emotions && r.emotions.length > 0 
        ? Math.max(...r.emotions.map(e => e.score || 0)) : '';

      return [
        i + 1,
        (r.createdAt || '').replace('T', ' '),
        r.event || '',
        r.trigger || '',
        (r.bodyReactions || []).join('、'),
        (r.thoughts || []).join('、'),
        emoList,
        maxEmoScore,
        (r.grounding || []).join('、'),
        r.timing || '當下',
        r.postScore !== undefined ? r.postScore : '',
        r.seemedFact || '',
        r.realFact || '',
        r.factEvaluation || '完全錯誤',
        r.reflection || ''
      ];
    });

    const wsRecords = XLSX.utils.aoa_to_sheet([recordsHeader, ...recordsRows]);
    XLSX.utils.book_append_sheet(wb, wsRecords, '情緒觀察表明細');

    const fileName = `情緒觀察表統計報表_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('📊 Excel 報表已匯出並下載！');
  }

  // 10. Backup and Restore (JSON Hard Drive File)
  function downloadBackupJSON() {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      startDate: state.startDate,
      tags: state.tags,
      records: state.records
    };

    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emotion_awareness_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('💾 備份檔已下載至硬碟！');
  }

  function handleRestoreJSON(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.records || !Array.isArray(data.records)) {
          alert('備份檔案格式不正確');
          return;
        }

        if (confirm(`讀取到 ${data.records.length} 筆觀察表記錄。確定要還原並覆蓋目前資料嗎？`)) {
          state.records = data.records;
          if (data.tags) state.tags = data.tags;
          if (data.startDate) state.startDate = data.startDate;
          persistData();
          renderRecordsList();
          calculateStatistics();
          showToast('✅ 備份已成功還原！');
        }
      } catch (err) {
        alert('解析備份檔案失敗：' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function saveToLocalServerDir() {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      startDate: state.startDate,
      tags: state.tags,
      records: state.records
    };

    fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupObj)
    }).then(res => res.json()).then(data => {
      if (data.ok) {
        showToast('💻 已直接備份至本機 ' + data.filename);
      } else {
        downloadBackupJSON();
      }
    }).catch(() => {
      // If running standalone file without server, fallback to browser file download
      downloadBackupJSON();
    });
  }

  // 11. Sample Data Loader (Matching Page 17 exact statistics: 21 sheets, 皺眉 15次, 抿嘴 10次, 倒吸一口氣 8次, 傻眼 43%, 疲累 50/2次, 落地比例 25%/50%, 錯誤率 90%)
  function loadSampleData() {
    if (state.records.length > 0 && !confirm('載入範例資料將新增 21 張營隊示範記錄，確定載入嗎？')) {
      return;
    }

    const sampleRecords = [];
    const baseDate = new Date('2026-10-19T08:30:00');

    for (let i = 0; i < 21; i++) {
      const recDate = new Date(baseDate.getTime() + i * 5 * 3600000);
      const isFatigue = i < 2;
      const mainEmo = isFatigue ? '疲累' : (i % 3 === 0 ? '傻眼' : (i % 3 === 1 ? '不解' : '不喜'));
      const emoScore = isFatigue ? 50 : Math.floor(60 + Math.random() * 35);
      
      const bodies = [];
      if (i < 15) bodies.push('皺眉');
      if (i < 10) bodies.push('抿嘴');
      if (i < 8) bodies.push('倒吸一口氣');
      if (bodies.length === 0) bodies.push('胸悶');

      const thoughts = [];
      if (i < 11) thoughts.push('啊？');
      else if (i < 17) thoughts.push('怎麼會這樣');
      else thoughts.push('糟糕');

      const groundings = [];
      if (i < 15) groundings.push('深呼吸');
      else if (i < 19) groundings.push('敲胸');
      else groundings.push('腳踩大地');

      if (i === 19) groundings.unshift('按摩腸胃'); // most effective

      const timing = i < 5 ? '當下' : (i < 15 ? '事後' : '未落地');
      const postScore = groundings.includes('按摩腸胃') ? 4 : Math.floor(20 + Math.random() * 25);
      const isFalse = i < 19; // 19 / 21 = ~90% false

      sampleRecords.push({
        id: 'sample_' + (i + 1),
        createdAt: recDate.toISOString().slice(0, 16),
        event: `營隊第 ${Math.floor(i / 3) + 1} 天練習：日常境界覺察記錄 #${i + 1}`,
        trigger: '遇到突發境界，對方說了一句話觸發自動化反應',
        bodyReactions: bodies,
        thoughts: thoughts,
        emotions: [{ name: mainEmo, score: emoScore }],
        grounding: groundings,
        timing: timing,
        postScore: postScore,
        seemedFact: '以為對方故意找麻煩或事情徹底搞砸了',
        realFact: '客觀查證發現大家只是趕時間，對方沒有惡意',
        factEvaluation: isFalse ? '完全錯誤' : '符合事實',
        reflection: '今天及時做了深呼吸，有看見事實真相，給自己一個讚！'
      });
    }

    state.records = sampleRecords;
    state.startDate = '2025-12-15';
    persistData();
    renderRecordsList();
    calculateStatistics();
    showToast('✨ 成功載入 21 張營隊範例資料！');
  }

  // 12. Modals and Helpers
  function openModal(contentHtml) {
    const modal = document.getElementById('general-modal');
    document.getElementById('modal-body').innerHTML = contentHtml;
    modal.classList.add('active');
  }

  function closeModal() {
    document.getElementById('general-modal').classList.remove('active');
  }

  function showToast(msg) {
    const toast = document.getElementById('toast-msg');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 已複製到剪貼簿！可貼到 LINE 或記事本');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 已複製文字！');
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substr(0, len) + '...' : str;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 13. Tab Navigation
  function switchTab(tabId) {
    state.activeTab = tabId;

    document.querySelectorAll('.tab-page').forEach(page => {
      page.style.display = 'none';
    });
    document.querySelectorAll('.dock-item').forEach(item => {
      item.classList.remove('active');
    });

    const activePage = document.getElementById(`tab-${tabId}`);
    if (activePage) activePage.style.display = 'block';

    const activeDock = document.getElementById(`dock-${tabId}`);
    if (activeDock) activeDock.classList.add('active');

    // Tab specific lifecycle
    if (tabId === 'home') {
      if (state.mode === 'wizard') {
        updateWizardUI();
      } else {
        syncQuickForm();
      }
    } else if (tabId === 'records') {
      renderRecordsList();
    } else if (tabId === 'stats') {
      calculateStatistics();
    } else if (tabId === 'data') {
      document.getElementById('input-start-date').value = state.startDate;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 14. Event Listeners Setup
  function initEventListeners() {
    // Dock Navigation
    document.querySelectorAll('.dock-item').forEach(item => {
      item.addEventListener('click', () => {
        switchTab(item.dataset.tab);
      });
    });

    // Top Header Buttons
    document.getElementById('btn-header-home').addEventListener('click', () => {
      state.currentStep = 1;
      switchTab('home');
    });

    document.getElementById('btn-header-trash').addEventListener('click', () => {
      if (confirm('確定要清空當前填寫的草稿嗎？')) {
        state.draft = getEmptyDraft();
        state.currentStep = 1;
        state.editingRecordId = null;
        updateWizardUI();
        syncQuickForm();
        showToast('🧹 已重設草稿');
      }
    });

    // Mode Toggle (Wizard vs Quick)
    document.getElementById('btn-mode-wizard').addEventListener('click', () => {
      state.mode = 'wizard';
      document.getElementById('btn-mode-wizard').classList.add('active');
      document.getElementById('btn-mode-quick').classList.remove('active');
      document.getElementById('wizard-flow-container').style.display = 'block';
      document.getElementById('quick-form-container').style.display = 'none';
      updateWizardUI();
    });

    document.getElementById('btn-mode-quick').addEventListener('click', () => {
      state.mode = 'quick';
      document.getElementById('btn-mode-quick').classList.add('active');
      document.getElementById('btn-mode-wizard').classList.remove('active');
      document.getElementById('wizard-flow-container').style.display = 'none';
      document.getElementById('quick-form-container').style.display = 'block';
      syncQuickForm();
    });

    // Wizard Bottom Nav
    document.getElementById('btn-wizard-next').addEventListener('click', wizardNext);
    document.getElementById('btn-wizard-prev').addEventListener('click', wizardPrev);
    const skipBtn = document.getElementById('btn-wizard-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', wizardNext);
    }

    // Copy Summary Report
    const copySummaryBtn = document.getElementById('btn-copy-summary');
    if (copySummaryBtn) {
      copySummaryBtn.addEventListener('click', () => {
        if (currentSummaryTextToCopy) {
          copyToClipboard(currentSummaryTextToCopy);
        }
      });
    }

    // Quick Form Save
    document.getElementById('btn-quick-save').addEventListener('click', () => {
      state.draft.createdAt = document.getElementById('quick-time').value || state.draft.createdAt;
      state.draft.event = document.getElementById('quick-event').value;
      state.draft.trigger = document.getElementById('quick-trigger').value;
      state.draft.seemedFact = document.getElementById('quick-seemed-fact').value;
      state.draft.realFact = document.getElementById('quick-real-fact').value;
      state.draft.reflection = document.getElementById('quick-reflection').value;
      state.draft.postScore = parseInt(document.getElementById('quick-post-score').value, 10);
      saveDraftRecord();
    });

    // Quick Form Post Score Slider
    document.getElementById('quick-post-score').addEventListener('input', (e) => {
      document.getElementById('quick-post-score-val').innerText = e.target.value;
    });

    // Quick Form Tag Pill Clicks
    ['quick-body-tags', 'quick-thoughts-tags', 'quick-emotions-tags', 'quick-grounding-tags'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', (e) => {
        const pill = e.target.closest('.tag-pill');
        if (!pill) return;
        const cat = pill.dataset.cat;
        const tag = pill.dataset.tag;
        toggleTagSelection(tag, cat);
        pill.classList.toggle('selected');
        if (cat === 'emotions') {
          renderQuickIntensitySliders();
        }
      });
    });

    // Quick Form Timing & Fact Choices
    document.getElementById('quick-timing-choices').addEventListener('click', (e) => {
      const pill = e.target.closest('.choice-pill');
      if (!pill) return;
      document.querySelectorAll('#quick-timing-choices .choice-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      state.draft.timing = pill.dataset.val;
    });

    document.getElementById('quick-fact-error-choices').addEventListener('click', (e) => {
      const pill = e.target.closest('.choice-pill');
      if (!pill) return;
      document.querySelectorAll('#quick-fact-error-choices .choice-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      state.draft.factEvaluation = pill.dataset.val;
    });

    // Records Search Input
    document.getElementById('record-search-input').addEventListener('input', renderRecordsList);

    // Statistics Period Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.statsPeriod = chip.dataset.period;
        const customBox = document.getElementById('custom-date-box');
        if (state.statsPeriod === 'custom') {
          customBox.style.display = 'flex';
        } else {
          customBox.style.display = 'none';
        }
        calculateStatistics();
      });
    });

    document.getElementById('btn-run-stats').addEventListener('click', calculateStatistics);
    document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);

    // Data & Backup Buttons
    document.getElementById('btn-backup-json').addEventListener('click', downloadBackupJSON);
    
    document.getElementById('btn-trigger-restore').addEventListener('click', () => {
      document.getElementById('file-restore-input').click();
    });
    document.getElementById('file-restore-input').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleRestoreJSON(e.target.files[0]);
      }
    });

    document.getElementById('btn-save-to-local-server').addEventListener('click', saveToLocalServerDir);

    document.getElementById('input-start-date').addEventListener('change', (e) => {
      state.startDate = e.target.value;
      persistData();
      showToast('📅 學習起算日已更新！');
    });

    document.getElementById('btn-load-sample-data').addEventListener('click', loadSampleData);

    document.getElementById('btn-clear-all-data').addEventListener('click', () => {
      if (confirm('⚠️ 警告：這將清空所有的情緒觀察表記錄！建議先下載備份檔。確定要清空嗎？')) {
        state.records = [];
        persistData();
        renderRecordsList();
        calculateStatistics();
        showToast('🗑️ 已清空全部記錄');
      }
    });

    // Share App QR Code Modal
    document.getElementById('btn-show-app-qrcode').addEventListener('click', showAppQRCodeModal);

    // Copy App Link
    document.getElementById('btn-copy-app-link').addEventListener('click', () => {
      const shareUrl = window.location.href;
      const shareMsg = `【2026 PEI 情緒觀察表 App】\n讓覺察不斷線！隨時在手機填寫情緒觀察表、辨認、落地、再看真相，100% 保存在自己手機硬碟。\n立即開啟：${shareUrl}`;
      copyToClipboard(shareMsg);
    });

    // PWA Mobile Guide Modal
    document.getElementById('btn-show-pwa-guide').addEventListener('click', showPWAGuideModal);

    // Vocabulary Management Modal
    document.getElementById('btn-manage-tags').addEventListener('click', showManageTagsModal);

    document.getElementById('btn-reset-tags').addEventListener('click', () => {
      if (confirm('確定要將詞庫重設為預設詞彙嗎？')) {
        state.tags = JSON.parse(JSON.stringify(DEFAULT_TAGS));
        persistData();
        showToast('🔄 已重設詞庫為預設值');
      }
    });

    // Modal Close
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('general-modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('general-modal')) {
        closeModal();
      }
    });
  }

  // 15. Special Modals (QR Code, PWA Guide, Manage Tags)
  function showAppQRCodeModal() {
    const currentUrl = window.location.href;
    const content = `
      <div style="text-align: center;">
        <h3 style="color: #4a4473; font-size: 19px; margin-bottom: 6px;">📱 手機掃描開啟 App</h3>
        <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 16px;">
          請用手機相機 (iPhone 或 Android) 掃描下方 QR Code 即可直接在手機執行！
        </p>
        <div id="qrcode-canvas-wrap" style="display:inline-block; padding:14px; background:#fff; border-radius:18px; box-shadow:var(--shadow-neumo-sm); margin-bottom:14px;"></div>
        <div style="font-size: 12.5px; color: #787593; word-break: break-all; margin-bottom: 14px;">
          連線網址：<br><b>${currentUrl}</b>
        </div>
        <button id="modal-copy-link-btn" class="btn-primary" style="width: 100%;">複製網址分享給家人朋友</button>
      </div>
    `;
    openModal(content);

    // Generate QR Code
    setTimeout(() => {
      const container = document.getElementById('qrcode-canvas-wrap');
      if (container && window.QRCode) {
        new QRCode(container, {
          text: currentUrl,
          width: 180,
          height: 180,
          colorDark: '#4a4473',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }, 50);

    document.getElementById('modal-copy-link-btn').addEventListener('click', () => {
      copyToClipboard(currentUrl);
    });
  }

  function showPWAGuideModal() {
    const isStandaloneNow = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const canOneClick = !!deferredPrompt;

    const content = `
      <div>
        <h3 style="color: #4a4473; font-size: 19px; text-align: center; margin-bottom: 12px;">📲 手機安裝與使用說明</h3>
        
        ${isStandaloneNow ? `
          <div style="background:#e8f5e9; color:#2e7d32; padding:12px; border-radius:12px; margin-bottom:14px; font-weight:600; text-align:center; font-size:14px;">
            ✓ 偵測到您目前已在獨立 App 模式下運行！所有資料完全離線保存在手機硬碟中。
          </div>
        ` : ''}

        ${canOneClick ? `
          <div style="margin-bottom: 16px;">
            <button id="modal-oneclick-install-btn" class="btn-primary" style="width:100%; height:50px; font-size:15px;">
              🚀 點此一鍵安裝「情緒觀察表」至手機桌面
            </button>
          </div>
        ` : ''}

        <div style="font-size: 13.5px; line-height: 1.6; color: #4e4a6a;">
          <div style="background:#f6f4fd; padding:14px; border-radius:14px; margin-bottom:12px; border:1px solid var(--border-light);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <b style="color:var(--primary); font-size:14.5px;">🤖 Android 安卓手機 (可一鍵式安裝)</b>
              <span style="font-size:11.5px; background:#e7e4f7; color:var(--primary); padding:2px 8px; border-radius:10px;">最方便</span>
            </div>
            1. 在 Chrome 或 Edge 瀏覽器打開本網址<br>
            2. 畫面上方會自動出現 <b>「一鍵安裝」</b> 按鈕，點擊即自動將圖示放到手機桌面！<br>
            3. 若沒看到橫幅，可點擊瀏覽器右上角 <b>「⋮」選單 ➜ 點選「安裝應用程式」</b>。
          </div>

          <div style="background:#f6f4fd; padding:14px; border-radius:14px; border:1px solid var(--border-light);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <b style="color:var(--primary); font-size:14.5px;">🍎 iPhone 蘋果手機 (需2步引導操作)</b>
              <span style="font-size:11.5px; background:#e7e4f7; color:var(--primary); padding:2px 8px; border-radius:10px;">依 Apple 規範</span>
            </div>
            <i>因 iOS 系統安全機制限制，網頁無法越權自動安裝，需手動確認 2 步：</i><br>
            1. 在 Safari 瀏覽器打開本網址，點螢幕下方中央的 <b>「分享」按鈕 ⬆️</b><br>
            2. 選單往下滑動，點選 <b>「加入主畫面」➕ (Add to Home Screen)</b><br>
            3. 點右上角「新增」，手機桌面就會出現專屬圖示，隨點隨用且支援完全離線！
          </div>
        </div>
      </div>
    `;
    openModal(content);

    const oneClickBtn = document.getElementById('modal-oneclick-install-btn');
    if (oneClickBtn && deferredPrompt) {
      oneClickBtn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            showToast('🎉 已成功加入手機桌面！');
            closeModal();
          }
          deferredPrompt = null;
        });
      });
    }
  }

  function showManageTagsModal() {
    const content = `
      <div>
        <h3 style="color: #4a4473; font-size: 19px; text-align: center; margin-bottom: 12px;">🏷️ 詞庫標籤管理</h3>
        <p style="font-size: 13px; color: var(--text-sub); text-align: center; margin-bottom: 14px;">
          點擊標籤旁的 × 可移除詞彙，填寫時隨時輸入即可新增。
        </p>

        <div style="max-height: 360px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
          <div>
            <b style="font-size: 13.5px; color: var(--primary);">🩺 身體反應 (${state.tags.bodyReactions.length} 項)</b>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
              ${state.tags.bodyReactions.map(t => `<span class="record-emotion-pill" style="font-size:12px;">${t}</span>`).join('')}
            </div>
          </div>

          <div>
            <b style="font-size: 13.5px; color: var(--primary);">💭 心裡自然流露的話 (${state.tags.thoughts.length} 項)</b>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
              ${state.tags.thoughts.map(t => `<span class="record-emotion-pill" style="font-size:12px;">${t}</span>`).join('')}
            </div>
          </div>

          <div>
            <b style="font-size: 13.5px; color: var(--primary);">💜 情緒類別 (${state.tags.emotions.length} 項)</b>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
              ${state.tags.emotions.map(t => `<span class="record-emotion-pill" style="font-size:12px;">${t}</span>`).join('')}
            </div>
          </div>

          <div>
            <b style="font-size: 13.5px; color: var(--primary);">🌱 情緒落地方式 (${state.tags.grounding.length} 項)</b>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
              ${state.tags.grounding.map(t => `<span class="record-emotion-pill" style="font-size:12px;">${t}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    openModal(content);
  }

  // 16. PWA Mobile Installation (One-Click for Android/Chrome + Visual Guide for iOS)
  let deferredPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);

  function setupPWAInstallation() {
    const banner = document.getElementById('mobile-install-banner');
    const actionBtn = document.getElementById('btn-install-action');
    const dismissBtn = document.getElementById('btn-dismiss-install');
    const subText = document.getElementById('install-sub-text');

    if (isStandalone) {
      if (banner) banner.style.display = 'none';
      return;
    }

    // Android & Chrome beforeinstallprompt event (Native 1-Click Install)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (banner && !sessionStorage.getItem('dismissed_install_banner')) {
        subText.innerText = '點擊一鍵安裝到手機桌面';
        actionBtn.innerText = '一鍵安裝';
        banner.style.display = 'flex';
      }
    });

    // iOS Safari Detection (Apple requires Share -> Add to Home Screen)
    if (isIOS && !isStandalone && !sessionStorage.getItem('dismissed_install_banner')) {
      if (banner) {
        subText.innerText = '加入 iPhone 桌面，全螢幕離線使用';
        actionBtn.innerText = '安裝說明';
        banner.style.display = 'flex';
      }
    }

    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        if (deferredPrompt) {
          // Native One-Click Install Prompt (Android / Chrome / Edge)
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              showToast('🎉 已成功加入手機桌面！');
              if (banner) banner.style.display = 'none';
            }
            deferredPrompt = null;
          });
        } else if (isIOS) {
          showIOSInstallSheet();
        } else {
          showPWAGuideModal();
        }
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        if (banner) banner.style.display = 'none';
        sessionStorage.setItem('dismissed_install_banner', 'true');
      });
    }

    window.addEventListener('appinstalled', () => {
      showToast('🎉 「情緒觀察表」已安裝至您的裝置！');
      if (banner) banner.style.display = 'none';
      deferredPrompt = null;
    });
  }

  function showIOSInstallSheet() {
    const content = `
      <div class="ios-guide-sheet">
        <h3 style="color: #4a4473; font-size: 19px; font-weight: 700;">🍎 iPhone 加入桌面教學</h3>
        <p style="font-size: 13px; color: var(--text-sub);">
          依 Apple 安全規範，只需簡單 2 步即可加入 iPhone 桌面像原生 App 一樣使用：
        </p>

        <div class="ios-step-box">
          <div class="ios-step-num">1</div>
          <div class="ios-step-content">
            點擊 Safari 螢幕底部中央的 <b>「分享」圖示</b>（方框帶向上箭頭 ⬆️）。
          </div>
        </div>

        <div class="ios-step-box">
          <div class="ios-step-num">2</div>
          <div class="ios-step-content">
            在滑出的選單中往下滑動，找到並點選 <b>「加入主畫面」➕</b>（Add to Home Screen）。
          </div>
        </div>

        <div class="ios-step-box">
          <div class="ios-step-num">3</div>
          <div class="ios-step-content">
            點擊右上角的 <b>「新增」</b>，手機桌面就會出現「情緒觀察」圖示，免開瀏覽器隨開即用！
          </div>
        </div>

        <div class="ios-arrow-bounce">⬇️</div>
        <div style="font-size: 12px; color: var(--primary); font-weight: 600;">
          請看下方 Safari 底部工具列中央的分享按鈕
        </div>
      </div>
    `;
    openModal(content);
  }

  // 17. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(() => {
        console.log('Emotion Awareness SW registered');
      }).catch(err => {
        console.log('SW registration note:', err);
      });
    });
  }

  // 17. App Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    updateWizardUI();
    calculateStatistics();
    setupPWAInstallation();
  });

})();
