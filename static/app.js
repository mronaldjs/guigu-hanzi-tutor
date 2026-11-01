// Guigu Hanzi Tutor - Frontend Logic
(function() {
  'use strict';

  // State
  let strokes = []; // Array of strokes: [ [ {x, y, t}, ... ], ... ]
  let currentStroke = [];
  let isDrawing = false;
  let recognizeTimeout = null;
  let hanziWriterInstance = null;
  let zoomWriterInstance = null;
  let currentCharacter = null;
  let currentEntryData = null;
  let cachedGlossary = [];
  let cachedFavorites = [];
  let selectedCategory = 'all';

  // DOM Elements - Studio
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const canvasHint = document.getElementById('canvasHint');
  const gridOverlay = document.getElementById('gridOverlay');
  const gridToggleBtn = document.getElementById('gridToggleBtn');
  const undoBtn = document.getElementById('undoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const candidatesList = document.getElementById('candidatesList');
  const recognizeStatus = document.getElementById('recognizeStatus');

  // DOM Elements - Sections
  const studioSection = document.getElementById('studioSection');
  const inspectorSection = document.getElementById('inspectorSection');

  // Inspector Elements
  const inspectorPlaceholder = document.getElementById('inspectorPlaceholder');
  const inspectorContent = document.getElementById('inspectorContent');
  const charMainBox = document.getElementById('charMainBox');
  const charDisplay = document.getElementById('charDisplay');
  const expandCharBtn = document.getElementById('expandCharBtn');
  const pinyinDisplay = document.getElementById('pinyinDisplay');
  const tradDisplay = document.getElementById('tradDisplay');
  const copyCharBtn = document.getElementById('copyCharBtn');
  const audioBtn = document.getElementById('audioBtn');
  const saveWordBtn = document.getElementById('saveWordBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const animateStrokeBtn = document.getElementById('animateStrokeBtn');
  const quizStrokeBtn = document.getElementById('quizStrokeBtn');
  const hanziWriterTarget = document.getElementById('hanziWriterTarget');

  // Xianxia & Definitions Elements
  const xianxiaBanner = document.getElementById('xianxiaBanner');
  const xianxiaBadge = document.getElementById('xianxiaBadge');
  const xianxiaTitle = document.getElementById('xianxiaTitle');
  const xianxiaTrans = document.getElementById('xianxiaTrans');
  const xianxiaLore = document.getElementById('xianxiaLore');
  const definitionsList = document.getElementById('definitionsList');
  const compoundsGrid = document.getElementById('compoundsGrid');

  // Search & Header
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const savedCountBadge = document.getElementById('savedCountBadge');
  const toggleNotebookBtn = document.getElementById('toggleNotebookBtn');
  const toggleGlossaryBtn = document.getElementById('toggleGlossaryBtn');

  // Notebook Modal
  const notebookModal = document.getElementById('notebookModal');
  const notebookBackdrop = document.getElementById('notebookBackdrop');
  const closeNotebookBtn = document.getElementById('closeNotebookBtn');
  const savedWordsBody = document.getElementById('savedWordsBody');
  const notebookSearchInput = document.getElementById('notebookSearchInput');

  // Glossary Modal
  const glossaryModal = document.getElementById('glossaryModal');
  const glossaryBackdrop = document.getElementById('glossaryBackdrop');
  const closeGlossaryBtn = document.getElementById('closeGlossaryBtn');
  const glossaryBody = document.getElementById('glossaryBody');
  const glossarySearchInput = document.getElementById('glossarySearchInput');
  const categoryTabsBar = document.getElementById('categoryTabsBar');

  // Zoom / Fullscreen Modal
  const zoomModal = document.getElementById('zoomModal');
  const zoomBackdrop = document.getElementById('zoomBackdrop');
  const closeZoomBtn = document.getElementById('closeZoomBtn');
  const zoomGiantChar = document.getElementById('zoomGiantChar');
  const zoomWriterTarget = document.getElementById('zoomWriterTarget');
  const zoomToggleWriterBtn = document.getElementById('zoomToggleWriterBtn');
  const zoomWriterBtnText = document.getElementById('zoomWriterBtnText');
  const zoomAnimateBtn = document.getElementById('zoomAnimateBtn');
  const zoomQuizBtn = document.getElementById('zoomQuizBtn');
  const zoomPinyin = document.getElementById('zoomPinyin');
  const zoomAudioBtn = document.getElementById('zoomAudioBtn');
  const zoomSaveBtn = document.getElementById('zoomSaveBtn');
  const zoomSaveBtnText = document.getElementById('zoomSaveBtnText');
  const zoomTrad = document.getElementById('zoomTrad');
  const zoomXianxiaBanner = document.getElementById('zoomXianxiaBanner');
  const zoomXianxiaBadge = document.getElementById('zoomXianxiaBadge');
  const zoomXianxiaTitle = document.getElementById('zoomXianxiaTitle');
  const zoomXianxiaTrans = document.getElementById('zoomXianxiaTrans');
  const zoomXianxiaLore = document.getElementById('zoomXianxiaLore');
  const zoomDefsList = document.getElementById('zoomDefsList');
  const zoomCompoundsGrid = document.getElementById('zoomCompoundsGrid');

  // Mobile Bottom Nav Tabs
  const tabStudio = document.getElementById('tabStudio');
  const tabInspector = document.getElementById('tabInspector');
  const tabNotebook = document.getElementById('tabNotebook');
  const tabGlossary = document.getElementById('tabGlossary');

  // Setup HiDPI Canvas
  function resizeCanvas() {
    const rect = canvasWrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    redrawStrokes();
  }

  // Get pointer coordinates relative to canvas
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      t: Date.now()
    };
  }

  // Canvas Event Listeners
  function startDrawing(e) {
    if (e.cancelable) e.preventDefault();
    isDrawing = true;
    currentStroke = [];
    const pos = getPos(e);
    currentStroke.push(pos);
    canvasHint.classList.add('fade-out');

    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1512';

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function drawMove(e) {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    currentStroke.push(pos);

    // Calligraphic curve smoothing
    if (currentStroke.length >= 3) {
      const p1 = currentStroke[currentStroke.length - 2];
      const p2 = currentStroke[currentStroke.length - 1];
      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      ctx.stroke();
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  }

  function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke.length > 0) {
      strokes.push(currentStroke);
      currentStroke = [];
      scheduleRecognition();
    }
  }

  // Redraw all strokes from history
  function redrawStrokes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (strokes.length === 0) {
      canvasHint.classList.remove('fade-out');
      return;
    }
    canvasHint.classList.add('fade-out');

    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1512';

    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        const p1 = stroke[i - 1];
        const p2 = stroke[i];
        const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      }
      ctx.stroke();
    }
  }

  // Clear & Undo
  function clearCanvas() {
    strokes = [];
    currentStroke = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvasHint.classList.remove('fade-out');
    candidatesList.innerHTML = '<div class="candidate-empty">Os caracteres correspondentes aparecerão aqui</div>';
    recognizeStatus.textContent = 'Desenhe para reconhecer...';
  }

  function undoLastStroke() {
    if (strokes.length > 0) {
      strokes.pop();
      redrawStrokes();
      if (strokes.length > 0) {
        scheduleRecognition(100);
      } else {
        candidatesList.innerHTML = '<div class="candidate-empty">Os caracteres correspondentes aparecerão aqui</div>';
        recognizeStatus.textContent = 'Desenhe para reconhecer...';
      }
    }
  }

  // Recognition Handler
  function scheduleRecognition(delay = 400) {
    if (recognizeTimeout) clearTimeout(recognizeTimeout);
    recognizeStatus.textContent = 'Reconhecendo...';
    recognizeTimeout = setTimeout(performRecognition, delay);
  }

  async function performRecognition() {
    if (strokes.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const formattedStrokes = strokes.map(stroke => 
      stroke.map(p => [Math.round(p.x), Math.round(p.y), p.t])
    );

    try {
      const resp = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          strokes: formattedStrokes
        })
      });
      const data = await resp.json();

      if (data.candidates && data.candidates.length > 0) {
        renderCandidates(data.candidates);
        recognizeStatus.textContent = `${data.candidates.length} candidatos encontrados`;
        // Auto inspect top candidate if inspector is empty
        if (!currentCharacter) {
          inspectCharacter(data.candidates[0].char);
        }
      } else {
        candidatesList.innerHTML = '<div class="candidate-empty">Nenhum caractere reconhecido</div>';
        recognizeStatus.textContent = 'Não reconhecido';
      }
    } catch (err) {
      console.error('Recognition error:', err);
      recognizeStatus.textContent = 'Erro de conexão';
    }
  }

  // Render Candidates Bar
  function renderCandidates(candidates) {
    candidatesList.innerHTML = '';
    candidates.forEach((cand) => {
      const item = document.createElement('div');
      item.className = 'candidate-item' + (cand.char === currentCharacter ? ' selected' : '');
      item.innerHTML = `
        <span class="cand-char">${cand.char}</span>
        <span class="cand-pinyin">${cand.pinyin || ''}</span>
      `;
      item.addEventListener('click', () => {
        document.querySelectorAll('.candidate-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        inspectCharacter(cand.char);
      });
      candidatesList.appendChild(item);
    });
  }

  // Inspect Character Details
  async function inspectCharacter(char) {
    currentCharacter = char;
    try {
      const resp = await fetch(`/api/lookup?q=${encodeURIComponent(char)}`);
      const data = await resp.json();
      currentEntryData = data;

      inspectorPlaceholder.classList.add('hidden');
      inspectorContent.classList.remove('hidden');

      // Top Header
      charDisplay.textContent = char;
      const primaryEntry = data.entries && data.entries.length > 0 ? data.entries[0] : null;

      pinyinDisplay.textContent = primaryEntry ? primaryEntry.pinyin : '--';
      tradDisplay.textContent = (primaryEntry && primaryEntry.traditional !== char) 
        ? primaryEntry.traditional 
        : 'Idêntico ao simplificado';

      // Update Save Button State
      const isSavedLocal = getLocalFavs().some(f => f.word === char);
      updateSaveBtnState(data.is_saved || isSavedLocal);

      // Setup Hanzi Writer Animation in Inspector
      setupHanziWriter(char);

      // Context Banner
      if (data.xianxia && data.xianxia.length > 0) {
        const topX = data.xianxia[0];
        xianxiaBanner.classList.remove('hidden');
        xianxiaBadge.textContent = topX.category || 'Contexto Especial';
        xianxiaTitle.textContent = `${topX.term} (${topX.pinyin})`;
        xianxiaTrans.textContent = topX.translation_pt;
        xianxiaLore.textContent = topX.lore_pt;
      } else {
        xianxiaBanner.classList.add('hidden');
      }

      // Definitions
      definitionsList.innerHTML = '';
      if (data.entries && data.entries.length > 0) {
        let defCount = 1;
        data.entries.forEach(entry => {
          entry.definitions.forEach(def => {
            const defDiv = document.createElement('div');
            defDiv.className = 'def-item';
            defDiv.innerHTML = `
              <span class="def-num">${defCount++}.</span>
              <span class="def-text">${def}</span>
            `;
            definitionsList.appendChild(defDiv);
          });
        });
      } else {
        definitionsList.innerHTML = '<div class="def-item"><span class="def-text">Nenhuma definição encontrada no CEDICT.</span></div>';
      }

      // Compound Words Grid
      compoundsGrid.innerHTML = '';
      if (data.compounds && data.compounds.length > 0) {
        data.compounds.forEach(comp => {
          const compCard = document.createElement('div');
          compCard.className = 'compound-card';
          compCard.innerHTML = `
            <div class="comp-header">
              <span class="comp-char">${comp.simplified}</span>
              <span class="comp-pinyin">${comp.pinyin}</span>
            </div>
            <div class="comp-def">${comp.definition}</div>
          `;
          compCard.addEventListener('click', () => {
            inspectCharacter(comp.simplified);
          });
          compoundsGrid.appendChild(compCard);
        });
      } else {
        compoundsGrid.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Nenhuma palavra composta comum listada.</div>';
      }

    } catch (err) {
      console.error('Lookup error:', err);
    }
  }

  // Open Character in Fullscreen / Zoom Mode
  async function openZoomModal(char) {
    if (!char) return;
    await inspectCharacter(char);
    if (!currentEntryData) return;

    zoomGiantChar.textContent = char;
    zoomGiantChar.classList.remove('hidden');
    zoomWriterTarget.classList.add('hidden');
    zoomToggleWriterBtn.classList.remove('hidden');
    zoomWriterBtnText.textContent = 'Ver Animação de Traços';
    zoomAnimateBtn.classList.add('hidden');
    zoomQuizBtn.classList.add('hidden');

    const primaryEntry = currentEntryData.entries && currentEntryData.entries.length > 0 ? currentEntryData.entries[0] : null;
    zoomPinyin.textContent = primaryEntry ? primaryEntry.pinyin : '--';
    zoomTrad.textContent = (primaryEntry && primaryEntry.traditional !== char) ? primaryEntry.traditional : 'Idêntico ao simplificado';

    // Update zoom save button
    const isSavedZoom = getLocalFavs().some(f => f.word === char);
    updateZoomSaveBtnState(currentEntryData.is_saved || isSavedZoom);

    // Zoom Context Banner
    if (currentEntryData.xianxia && currentEntryData.xianxia.length > 0) {
      const topX = currentEntryData.xianxia[0];
      zoomXianxiaBanner.classList.remove('hidden');
      zoomXianxiaBadge.textContent = topX.category || 'Contexto Especial';
      zoomXianxiaTitle.textContent = `${topX.term} (${topX.pinyin})`;
      zoomXianxiaTrans.textContent = topX.translation_pt;
      zoomXianxiaLore.textContent = topX.lore_pt;
    } else {
      zoomXianxiaBanner.classList.add('hidden');
    }

    // Zoom Definitions
    zoomDefsList.innerHTML = '';
    if (currentEntryData.entries && currentEntryData.entries.length > 0) {
      let count = 1;
      currentEntryData.entries.forEach(e => {
        e.definitions.forEach(d => {
          const div = document.createElement('div');
          div.className = 'def-item';
          div.innerHTML = `<span class="def-num">${count++}.</span><span class="def-text">${d}</span>`;
          zoomDefsList.appendChild(div);
        });
      });
    }

    // Zoom Compounds
    zoomCompoundsGrid.innerHTML = '';
    if (currentEntryData.compounds && currentEntryData.compounds.length > 0) {
      currentEntryData.compounds.forEach(comp => {
        const cCard = document.createElement('div');
        cCard.className = 'compound-card';
        cCard.innerHTML = `
          <div class="comp-header">
            <span class="comp-char">${comp.simplified}</span>
            <span class="comp-pinyin">${comp.pinyin}</span>
          </div>
          <div class="comp-def">${comp.definition}</div>
        `;
        cCard.addEventListener('click', () => {
          openZoomModal(comp.simplified);
        });
        zoomCompoundsGrid.appendChild(cCard);
      });
    }

    zoomModal.classList.remove('hidden');
  }

  // Toggle Giant Hanzi Writer in Zoom Modal
  function toggleZoomWriter() {
    if (!currentCharacter || currentCharacter.length !== 1) return;

    if (zoomWriterTarget.classList.contains('hidden')) {
      // Show writer
      zoomGiantChar.classList.add('hidden');
      zoomWriterTarget.classList.remove('hidden');
      zoomWriterBtnText.textContent = 'Ver Caractere Estático';
      zoomAnimateBtn.classList.remove('hidden');
      zoomQuizBtn.classList.remove('hidden');

      zoomWriterTarget.innerHTML = '';
      const size = window.innerWidth <= 768 ? 180 : 220;
      zoomWriterInstance = HanziWriter.create('zoomWriterTarget', currentCharacter, {
        width: size,
        height: size,
        padding: 10,
        showOutline: true,
        strokeColor: '#1a1512',
        outlineColor: '#cbd5e1',
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 150
      });
      zoomWriterInstance.animateCharacter();
    } else {
      // Show static text
      zoomGiantChar.classList.remove('hidden');
      zoomWriterTarget.classList.add('hidden');
      zoomWriterBtnText.textContent = 'Ver Animação de Traços';
      zoomAnimateBtn.classList.add('hidden');
      zoomQuizBtn.classList.add('hidden');
    }
  }

  // Update Save Word Button UI
  function updateSaveBtnState(isSaved) {
    if (isSaved) {
      saveWordBtn.classList.add('saved');
      saveBtnText.textContent = 'Salvo';
    } else {
      saveWordBtn.classList.remove('saved');
      saveBtnText.textContent = 'Salvar';
    }
  }

  function updateZoomSaveBtnState(isSaved) {
    if (isSaved) {
      zoomSaveBtn.classList.add('saved');
      zoomSaveBtnText.textContent = 'Salvo';
    } else {
      zoomSaveBtn.classList.remove('saved');
      zoomSaveBtnText.textContent = 'Salvar';
    }
  }

  // LocalStorage Helpers for Favorites
  function getLocalFavs() {
    try {
      return JSON.parse(localStorage.getItem('guigu_saved_favs')) || [];
    } catch (e) {
      return [];
    }
  }

  function setLocalFavs(favs) {
    try {
      localStorage.setItem('guigu_saved_favs', JSON.stringify(favs));
    } catch (e) {}
  }

  function exportNotebookToTSV() {
    const favs = getLocalFavs();
    const lines = ["Caractere\tPinyin\tSignificado\tNotas Cultivo"];
    favs.forEach(f => {
      lines.push(`${f.word}\t${f.pinyin || ''}\t${f.definition || ''}\t${f.xianxia_note || ''}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palavras_salvas_hanzi.tsv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Toggle Save Word / Character
  async function toggleSaveCurrentWord() {
    if (!currentCharacter || !currentEntryData) return;

    let favs = getLocalFavs();
    const isCurrentlySaved = favs.some(f => f.word === currentCharacter);
    const primaryEntry = currentEntryData.entries && currentEntryData.entries.length > 0 ? currentEntryData.entries[0] : null;
    const pinyin = primaryEntry ? primaryEntry.pinyin : '';
    const definition = primaryEntry && primaryEntry.definitions ? primaryEntry.definitions.slice(0, 2).join(' / ') : '';
    const topX = (currentEntryData.xianxia && currentEntryData.xianxia.length > 0) ? currentEntryData.xianxia[0] : null;
    const xianxiaNote = topX ? `${topX.category}: ${topX.translation_pt}` : '';

    if (isCurrentlySaved) {
      favs = favs.filter(f => f.word !== currentCharacter);
      setLocalFavs(favs);
      updateSaveBtnState(false);
      updateZoomSaveBtnState(false);
      loadFavorites();
      try {
        fetch('/api/favorites/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: currentCharacter })
        });
      } catch (e) {}
    } else {
      favs.unshift({
        word: currentCharacter,
        pinyin: pinyin,
        definition: definition,
        xianxia_note: xianxiaNote,
        created_at: new Date().toISOString()
      });
      setLocalFavs(favs);
      updateSaveBtnState(true);
      updateZoomSaveBtnState(true);
      loadFavorites();
      try {
        fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: currentCharacter,
            pinyin: pinyin,
            definition: definition,
            xianxia_note: xianxiaNote
          })
        });
      } catch (e) {}
    }
  }

  // Load and Render Saved Favorites
  async function loadFavorites() {
    let favs = getLocalFavs();
    if (favs.length === 0) {
      try {
        const resp = await fetch('/api/favorites');
        const data = await resp.json();
        if (data.favorites && data.favorites.length > 0) {
          favs = data.favorites;
          setLocalFavs(favs);
        }
      } catch (e) {}
    }
    cachedFavorites = favs;
    savedCountBadge.textContent = cachedFavorites.length;
    renderFavorites(cachedFavorites);
  }

  function renderFavorites(favs) {
    savedWordsBody.innerHTML = '';
    const nbCountBadge = document.getElementById('notebookCountBadge');
    if (nbCountBadge) {
      nbCountBadge.textContent = `${favs.length} ${favs.length === 1 ? 'salvo' : 'salvos'}`;
    }

    if (favs.length === 0) {
      savedWordsBody.innerHTML = `
        <div style="color:var(--text-dim);padding:30px;grid-column:1/-1;text-align:center;">
          <p style="font-size:16px;margin-bottom:8px;">Seu caderno está vazio!</p>
          <p style="font-size:13px;">Clique no botão "Salvar" ao inspecionar qualquer caractere ou termo para guardá-lo aqui.</p>
        </div>
      `;
      return;
    }

    favs.forEach(f => {
      const card = document.createElement('div');
      card.className = 'saved-card';
      card.innerHTML = `
        <div class="saved-card-header">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <span class="glossary-term">${f.word}</span>
            <span class="glossary-pinyin">${f.pinyin || ''}</span>
          </div>
          <div class="saved-card-actions">
            <button class="delete-saved-btn" title="Remover dos salvos">&times;</button>
          </div>
        </div>
        ${f.xianxia_note ? `<span class="glossary-tag">${f.xianxia_note}</span>` : ''}
        <div class="glossary-lore">${f.definition || 'Sem definição salva'}</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-saved-btn')) return;
        notebookModal.classList.add('hidden');
        openZoomModal(f.word);
      });

      const delBtn = card.querySelector('.delete-saved-btn');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await fetch('/api/favorites/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: f.word })
        });
        if (currentCharacter === f.word) {
          updateSaveBtnState(false);
          updateZoomSaveBtnState(false);
        }
        loadFavorites();
      });

      savedWordsBody.appendChild(card);
    });
  }

  // Setup HanziWriter Animation in Inspector
  function setupHanziWriter(char) {
    hanziWriterTarget.innerHTML = '';
    if (typeof HanziWriter === 'undefined' || char.length !== 1) {
      animateStrokeBtn.style.display = 'none';
      quizStrokeBtn.style.display = 'none';
      return;
    }

    animateStrokeBtn.style.display = 'inline-block';
    quizStrokeBtn.style.display = 'inline-block';

    try {
      hanziWriterInstance = HanziWriter.create('hanziWriterTarget', char, {
        width: 90,
        height: 90,
        padding: 5,
        showOutline: true,
        strokeColor: '#1a1512',
        outlineColor: '#cbd5e1',
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 150
      });
    } catch (e) {
      console.warn('HanziWriter load error:', e);
    }
  }

  // Audio Pronunciation via SpeechSynthesis
  function playAudio(text) {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta síntese de voz nativa.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  // Copy to Clipboard
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHTML = copyCharBtn.innerHTML;
      copyCharBtn.innerHTML = '<svg class="copy-svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      copyCharBtn.style.opacity = '1';
      setTimeout(() => {
        copyCharBtn.innerHTML = originalHTML;
        copyCharBtn.style.opacity = '';
      }, 1200);
    });
  }

  // Xianxia / General Glossary Modal Handlers
  async function loadGlossary() {
    try {
      const resp = await fetch('/api/xianxia');
      const data = await resp.json();
      cachedGlossary = data.terms || [];

      // Update category counts dynamically
      const catCounts = {
        'all': cachedGlossary.length,
        'Combate & Técnicas': 0,
        'Cultivo & Xianxia': 0,
        'Social & Relações': 0,
        'Chinês Essencial': 0,
        'RPG & Interface': 0,
        'Itens & Alquimia': 0,
        'Mundo & Lugares': 0
      };
      cachedGlossary.forEach(t => {
        if (catCounts[t.category] !== undefined) {
          catCounts[t.category]++;
        }
      });

      const catMap = {
        'all': 'catCountAll',
        'Combate & Técnicas': 'catCountCombat',
        'Cultivo & Xianxia': 'catCountCultivation',
        'Social & Relações': 'catCountSocial',
        'Chinês Essencial': 'catCountEssential',
        'RPG & Interface': 'catCountRpg',
        'Itens & Alquimia': 'catCountItems',
        'Mundo & Lugares': 'catCountWorld'
      };
      for (const [cat, elId] of Object.entries(catMap)) {
        const el = document.getElementById(elId);
        if (el) el.textContent = catCounts[cat] || 0;
      }

      filterAndRenderGlossary();
    } catch (e) {
      console.error('Failed to load glossary:', e);
    }
  }

  function filterAndRenderGlossary() {
    const q = glossarySearchInput.value.toLowerCase().trim();
    let filtered = cachedGlossary;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (q) {
      filtered = filtered.filter(t => 
        t.term.includes(q) ||
        t.pinyin.toLowerCase().includes(q) ||
        t.translation_pt.toLowerCase().includes(q) ||
        t.lore_pt.toLowerCase().includes(q)
      );
    }

    const countBadge = document.getElementById('glossaryCountBadge');
    if (countBadge) {
      countBadge.textContent = `${filtered.length} ${filtered.length === 1 ? 'termo' : 'termos'}`;
    }

    renderGlossary(filtered);
  }

  function renderGlossary(terms) {
    glossaryBody.innerHTML = '';
    if (terms.length === 0) {
      glossaryBody.innerHTML = '<div style="color:var(--text-dim);padding:24px;grid-column:1/-1;text-align:center;">Nenhum termo encontrado nesta categoria</div>';
      return;
    }
    terms.forEach(t => {
      const card = document.createElement('div');
      card.className = 'glossary-item-card';
      card.innerHTML = `
        <span class="glossary-tag">${t.category}</span>
        <div class="glossary-term-row">
          <span class="glossary-term">${t.term}</span>
          <span class="glossary-pinyin">${t.pinyin}</span>
        </div>
        <div class="glossary-trans">${t.translation_pt}</div>
        <div class="glossary-lore">${t.lore_pt}</div>
      `;
      card.addEventListener('click', () => {
        glossaryModal.classList.add('hidden');
        openZoomModal(t.term);
      });
      glossaryBody.appendChild(card);
    });
  }

  // Event Listeners Initialization
  function initEvents() {
    // Mouse Events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawMove);
    window.addEventListener('mouseup', stopDrawing);

    // Touch Events (Mobile Web App friendly)
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawMove, { passive: false });
    window.addEventListener('touchend', stopDrawing);
    window.addEventListener('touchcancel', stopDrawing);

    // Studio Action Buttons
    clearBtn.addEventListener('click', clearCanvas);
    undoBtn.addEventListener('click', undoLastStroke);

    gridToggleBtn.addEventListener('click', () => {
      gridOverlay.classList.toggle('hidden');
      gridToggleBtn.classList.toggle('active');
    });

    // Inspector Action Buttons
    audioBtn.addEventListener('click', () => {
      if (currentCharacter) playAudio(currentCharacter);
    });

    copyCharBtn.addEventListener('click', () => {
      if (currentCharacter) copyToClipboard(currentCharacter);
    });

    saveWordBtn.addEventListener('click', toggleSaveCurrentWord);

    // Open Zoom Mode from main character box or expand icon
    charMainBox.addEventListener('click', (e) => {
      if (e.target.closest('#copyCharBtn')) return;
      if (currentCharacter) openZoomModal(currentCharacter);
    });

    expandCharBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentCharacter) openZoomModal(currentCharacter);
    });

    animateStrokeBtn.addEventListener('click', () => {
      if (hanziWriterInstance) hanziWriterInstance.animateCharacter();
    });

    quizStrokeBtn.addEventListener('click', () => {
      if (hanziWriterInstance) {
        hanziWriterInstance.quiz({
          onComplete: () => {
            alert('Perfeito! Você completou os traços corretamente!');
          }
        });
      }
    });

    // Zoom Modal Buttons
    closeZoomBtn.addEventListener('click', () => zoomModal.classList.add('hidden'));
    zoomBackdrop.addEventListener('click', () => zoomModal.classList.add('hidden'));

    zoomToggleWriterBtn.addEventListener('click', toggleZoomWriter);

    zoomAnimateBtn.addEventListener('click', () => {
      if (zoomWriterInstance) zoomWriterInstance.animateCharacter();
    });

    zoomQuizBtn.addEventListener('click', () => {
      if (zoomWriterInstance) {
        zoomWriterInstance.quiz({
          onComplete: () => {
            alert('Perfeito! Você completou os traços corretamente!');
          }
        });
      }
    });

    zoomAudioBtn.addEventListener('click', () => {
      if (currentCharacter) playAudio(currentCharacter);
    });

    zoomSaveBtn.addEventListener('click', toggleSaveCurrentWord);

    // Category Tabs in Glossary
    categoryTabsBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;
      categoryTabsBar.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedCategory = pill.dataset.cat;
      filterAndRenderGlossary();
    });

    glossarySearchInput.addEventListener('input', () => {
      const clearBtn = document.getElementById('clearGlossarySearchBtn');
      if (clearBtn) clearBtn.style.display = glossarySearchInput.value ? 'block' : 'none';
      filterAndRenderGlossary();
    });

    const clearGlossaryBtn = document.getElementById('clearGlossarySearchBtn');
    if (clearGlossaryBtn) {
      clearGlossaryBtn.addEventListener('click', () => {
        glossarySearchInput.value = '';
        clearGlossaryBtn.style.display = 'none';
        glossarySearchInput.focus();
        filterAndRenderGlossary();
      });
    }

    // Keyboard Shortcuts (Ctrl+Z, Del, Esc)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLastStroke();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        clearCanvas();
      } else if (e.key === 'Escape') {
        zoomModal.classList.add('hidden');
        notebookModal.classList.add('hidden');
        glossaryModal.classList.add('hidden');
      }
    });

    // Header Search Input
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        if (val) inspectCharacter(val);
      }
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      searchInput.focus();
    });

    searchInput.addEventListener('input', () => {
      clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    });

    // Notebook Modal
    toggleNotebookBtn.addEventListener('click', () => {
      notebookModal.classList.remove('hidden');
      loadFavorites();
    });

    const exportAnkiBtn = document.getElementById('exportAnkiBtn');
    if (exportAnkiBtn) {
      exportAnkiBtn.addEventListener('click', exportNotebookToTSV);
    }

    closeNotebookBtn.addEventListener('click', () => {
      notebookModal.classList.add('hidden');
    });

    notebookBackdrop.addEventListener('click', () => {
      notebookModal.classList.add('hidden');
    });

    notebookSearchInput.addEventListener('input', () => {
      const q = notebookSearchInput.value.toLowerCase().trim();
      const filtered = cachedFavorites.filter(f =>
        f.word.includes(q) ||
        (f.pinyin && f.pinyin.toLowerCase().includes(q)) ||
        (f.definition && f.definition.toLowerCase().includes(q)) ||
        (f.xianxia_note && f.xianxia_note.toLowerCase().includes(q))
      );
      renderFavorites(filtered);
    });

    // Glossary Modal
    toggleGlossaryBtn.addEventListener('click', () => {
      glossaryModal.classList.remove('hidden');
      if (cachedGlossary.length === 0) loadGlossary();
    });

    closeGlossaryBtn.addEventListener('click', () => {
      glossaryModal.classList.add('hidden');
    });

    glossaryBackdrop.addEventListener('click', () => {
      glossaryModal.classList.add('hidden');
    });

    // Mobile Bottom Navigation Tabs Handlers
    tabStudio.addEventListener('click', () => {
      setMobileActiveTab(tabStudio);
      studioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    tabInspector.addEventListener('click', () => {
      setMobileActiveTab(tabInspector);
      inspectorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    tabNotebook.addEventListener('click', () => {
      setMobileActiveTab(tabNotebook);
      notebookModal.classList.remove('hidden');
      loadFavorites();
    });

    tabGlossary.addEventListener('click', () => {
      setMobileActiveTab(tabGlossary);
      glossaryModal.classList.remove('hidden');
      if (cachedGlossary.length === 0) loadGlossary();
    });

    window.addEventListener('resize', resizeCanvas);
  }

  function setMobileActiveTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  }

  // App Initialization
  document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    initEvents();
    loadFavorites();
    loadGlossary();
    // Default inspect "仙" (Imortal)
    inspectCharacter('仙');
  });

})();
