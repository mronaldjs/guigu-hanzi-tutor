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
  const saveDrawingBtn = document.getElementById('saveDrawingBtn');
  const downloadDrawingBtn = document.getElementById('downloadDrawingBtn');
  const candidatesList = document.getElementById('candidatesList');
  const recognizeStatus = document.getElementById('recognizeStatus');
  const appToast = document.getElementById('appToast');

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
  const tabWordsBtn = document.getElementById('tabWordsBtn');
  const tabDrawingsBtn = document.getElementById('tabDrawingsBtn');
  const tabWordsCount = document.getElementById('tabWordsCount');
  const tabDrawingsCount = document.getElementById('tabDrawingsCount');
  const savedWordsView = document.getElementById('savedWordsView');
  const savedDrawingsView = document.getElementById('savedDrawingsView');
  const savedDrawingsGrid = document.getElementById('savedDrawingsGrid');
  const clearAllDrawingsBtn = document.getElementById('clearAllDrawingsBtn');

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
    if (!canvasWrapper || !canvas) return;
    const rect = canvasWrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
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
    candidates.forEach((cand, idx) => {
      const item = document.createElement('div');
      item.className = 'candidate-item' + (cand.char === currentCharacter ? ' selected' : '');
      item.setAttribute('data-index', idx + 1);
      item.innerHTML = `
        <span class="cand-rank">${idx + 1}</span>
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
              <span class="def-num">${String(defCount++).padStart(2, '0')}</span>
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
          div.innerHTML = `<span class="def-num">${String(count++).padStart(2, '0')}</span><span class="def-text">${d}</span>`;
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
    updateAllNotebookCounters();
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

  // Toast Notification System
  let toastTimer = null;
  function showToast(msg, duration = 2800) {
    if (!appToast) return;
    appToast.textContent = msg;
    appToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      appToast.classList.remove('show');
    }, duration);
  }

  // Generate High-Res 600x600 PNG of User's Calligraphy with Paper, Grid & Seal
  function generateDrawingImage() {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 600;
    const expCtx = exportCanvas.getContext('2d');

    // 1. Xuan Paper Background
    expCtx.fillStyle = '#f8f6ee';
    expCtx.fillRect(0, 0, 600, 600);

    // 2. Paper Border Frame
    expCtx.strokeStyle = 'rgba(200, 70, 60, 0.45)';
    expCtx.lineWidth = 3;
    expCtx.strokeRect(18, 18, 564, 564);

    // 3. Grid Lines (matches screen grid visibility)
    const showGrid = gridOverlay && !gridOverlay.classList.contains('hidden');
    if (showGrid) {
      expCtx.strokeStyle = 'rgba(200, 70, 60, 0.22)';
      expCtx.lineWidth = 1.5;
      expCtx.setLineDash([8, 8]);

      // Horizontal
      expCtx.beginPath();
      expCtx.moveTo(18, 300); expCtx.lineTo(582, 300);
      expCtx.stroke();

      // Vertical
      expCtx.beginPath();
      expCtx.moveTo(300, 18); expCtx.lineTo(300, 582);
      expCtx.stroke();

      // Diagonals
      expCtx.beginPath();
      expCtx.moveTo(18, 18); expCtx.lineTo(582, 582);
      expCtx.stroke();
      expCtx.beginPath();
      expCtx.moveTo(582, 18); expCtx.lineTo(18, 582);
      expCtx.stroke();
      expCtx.setLineDash([]);
    }

    // 4. Traditional Vermilion Seal "鬼谷"
    expCtx.save();
    expCtx.translate(535, 535);
    expCtx.rotate(-3 * Math.PI / 180);
    expCtx.strokeStyle = '#b91c1c';
    expCtx.lineWidth = 2.5;
    expCtx.strokeRect(-20, -20, 40, 40);
    expCtx.fillStyle = '#b91c1c';
    expCtx.font = 'bold 16px "Ma Shan Zheng", "Noto Serif SC", serif';
    expCtx.textAlign = 'center';
    expCtx.textBaseline = 'middle';
    expCtx.globalAlpha = 0.55;
    expCtx.fillText('鬼谷', 0, 0);
    expCtx.restore();

    // 5. User Strokes with Calligraphic Curves
    const rect = canvasWrapper ? canvasWrapper.getBoundingClientRect() : { width: 520, height: 520 };
    const curW = rect.width > 0 ? rect.width : 520;
    const curH = rect.height > 0 ? rect.height : 520;
    const scaleX = 600 / curW;
    const scaleY = 600 / curH;

    expCtx.lineWidth = 10;
    expCtx.lineCap = 'round';
    expCtx.lineJoin = 'round';
    expCtx.strokeStyle = '#161311';

    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      expCtx.beginPath();
      expCtx.moveTo(stroke[0].x * scaleX, stroke[0].y * scaleY);
      for (let i = 1; i < stroke.length; i++) {
        const p1 = stroke[i - 1];
        const p2 = stroke[i];
        const midX = ((p1.x + p2.x) / 2) * scaleX;
        const midY = ((p1.y + p2.y) / 2) * scaleY;
        expCtx.quadraticCurveTo(p1.x * scaleX, p1.y * scaleY, midX, midY);
      }
      expCtx.stroke();
    }

    return exportCanvas.toDataURL('image/png');
  }

  function getDetectedChar() {
    if (currentCharacter) return currentCharacter;
    const topCand = candidatesList.querySelector('.cand-char');
    if (topCand && topCand.textContent && topCand.textContent.trim() !== '--') {
      return topCand.textContent.trim();
    }
    return '字';
  }

  // LocalStorage Helpers for Drawings
  function getLocalDrawings() {
    try {
      return JSON.parse(localStorage.getItem('guigu_saved_drawings')) || [];
    } catch (e) {
      return [];
    }
  }

  function setLocalDrawings(drawings) {
    try {
      localStorage.setItem('guigu_saved_drawings', JSON.stringify(drawings));
    } catch (e) {}
    updateAllNotebookCounters();
  }

  // Save Calligraphy Drawing to Local Gallery
  function saveCurrentDrawing() {
    if (strokes.length === 0) {
      showToast('Desenhe algo na tela primeiro para salvar!');
      return;
    }

    const dataUrl = generateDrawingImage();
    const char = getDetectedChar();
    const drawings = getLocalDrawings();

    const newDrawing = {
      id: 'draw_' + Date.now(),
      char: char,
      image: dataUrl,
      strokes: JSON.parse(JSON.stringify(strokes)),
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    };

    drawings.unshift(newDrawing);
    if (drawings.length > 40) drawings.pop();
    setLocalDrawings(drawings);

    showToast(`✓ Caligrafia de "${char}" salva no seu caderno!`);
  }

  // Download Calligraphy as PNG Image File
  function downloadCurrentDrawing() {
    if (strokes.length === 0) {
      showToast('Desenhe algo na tela primeiro para baixar!');
      return;
    }

    const dataUrl = generateDrawingImage();
    const char = getDetectedChar();
    const filename = `caligrafia_${char}_${Date.now()}.png`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(`✓ Caligrafia "${char}" baixada como imagem PNG!`);
  }

  // Switch Notebook Tabs (Words vs Drawings)
  function switchNotebookTab(tab) {
    if (tab === 'words') {
      tabWordsBtn.classList.add('active');
      tabDrawingsBtn.classList.remove('active');
      savedWordsView.classList.remove('hidden');
      savedDrawingsView.classList.add('hidden');
      exportAnkiBtn.style.display = 'inline-flex';
    } else {
      tabWordsBtn.classList.remove('active');
      tabDrawingsBtn.classList.add('active');
      savedWordsView.classList.add('hidden');
      savedDrawingsView.classList.remove('hidden');
      exportAnkiBtn.style.display = 'none';
      renderSavedDrawings();
    }
  }

  // Render Saved Drawings Gallery in Notebook
  function renderSavedDrawings() {
    if (!savedDrawingsGrid) return;
    const drawings = getLocalDrawings();
    updateAllNotebookCounters();
    savedDrawingsGrid.innerHTML = '';

    if (drawings.length === 0) {
      if (clearAllDrawingsBtn) clearAllDrawingsBtn.style.display = 'none';
      savedDrawingsGrid.innerHTML = `
        <div style="color:var(--text-dim);padding:36px;grid-column:1/-1;text-align:center;">
          <p style="font-size:16px;margin-bottom:8px;">Nenhuma caligrafia salva ainda!</p>
          <p style="font-size:13px;">Desenhe um caractere chinês no canvas e clique no botão <strong>"Salvar"</strong> para guardar sua caligrafia aqui.</p>
        </div>
      `;
      return;
    }

    if (clearAllDrawingsBtn) clearAllDrawingsBtn.style.display = 'inline-flex';

    drawings.forEach(d => {
      const card = document.createElement('div');
      card.className = 'drawing-card';
      card.innerHTML = `
        <div class="drawing-thumb-wrapper">
          <img src="${d.image}" alt="${d.char}" class="drawing-thumb" loading="lazy">
          <span class="drawing-char-badge">${d.char}</span>
        </div>
        <div class="drawing-info">
          <div class="drawing-date">${d.date}</div>
          <div class="drawing-actions">
            <button class="draw-act-btn load-btn" title="Carregar no Canvas">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
              <span>Carregar</span>
            </button>
            <button class="draw-act-btn download-btn" title="Baixar PNG">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Baixar</span>
            </button>
            <button class="draw-act-btn delete-btn" title="Excluir da Galeria">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;

      card.querySelector('.load-btn').addEventListener('click', () => loadDrawingIntoCanvas(d));
      card.querySelector('.download-btn').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = d.image;
        a.download = `caligrafia_${d.char}_${d.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`✓ Download da caligrafia "${d.char}" iniciado!`);
      });
      card.querySelector('.delete-btn').addEventListener('click', () => {
        deleteSavedDrawing(d.id);
      });

      savedDrawingsGrid.appendChild(card);
    });
  }

  function loadDrawingIntoCanvas(drawing) {
    if (!drawing || !drawing.strokes || drawing.strokes.length === 0) return;
    strokes = JSON.parse(JSON.stringify(drawing.strokes));
    redrawStrokes();
    scheduleRecognition(50);
    notebookModal.classList.add('hidden');
    showToast(`✓ Caligrafia "${drawing.char}" carregada no canvas!`);
  }

  function deleteSavedDrawing(id) {
    let drawings = getLocalDrawings();
    drawings = drawings.filter(d => d.id !== id);
    setLocalDrawings(drawings);
    renderSavedDrawings();
    showToast('Desenho removido da galeria.');
  }

  function clearAllSavedDrawings() {
    if (!confirm('Deseja excluir todas as suas caligrafias salvas?')) return;
    setLocalDrawings([]);
    renderSavedDrawings();
    showToast('Todas as caligrafias foram removidas.');
  }

  function updateAllNotebookCounters() {
    const favs = getLocalFavs();
    const drawings = getLocalDrawings();
    if (tabWordsCount) tabWordsCount.textContent = favs.length;
    if (tabDrawingsCount) tabDrawingsCount.textContent = drawings.length;
    if (savedCountBadge) savedCountBadge.textContent = favs.length + drawings.length;
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

    audioBtn.classList.add('playing');
    if (zoomAudioBtn) zoomAudioBtn.classList.add('playing');

    utterance.onend = () => {
      audioBtn.classList.remove('playing');
      if (zoomAudioBtn) zoomAudioBtn.classList.remove('playing');
    };
    utterance.onerror = () => {
      audioBtn.classList.remove('playing');
      if (zoomAudioBtn) zoomAudioBtn.classList.remove('playing');
    };

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
    if (saveDrawingBtn) saveDrawingBtn.addEventListener('click', saveCurrentDrawing);
    if (downloadDrawingBtn) downloadDrawingBtn.addEventListener('click', downloadCurrentDrawing);

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

    // Keyboard Shortcuts (Ctrl+Z, Del, Esc, 1-9 Candidates)
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
      } else if (!e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        const cands = candidatesList.querySelectorAll('.candidate-item');
        if (cands && cands[idx]) {
          e.preventDefault();
          cands[idx].click();
        }
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
      renderSavedDrawings();
    });

    if (tabWordsBtn) tabWordsBtn.addEventListener('click', () => switchNotebookTab('words'));
    if (tabDrawingsBtn) tabDrawingsBtn.addEventListener('click', () => switchNotebookTab('drawings'));
    if (clearAllDrawingsBtn) clearAllDrawingsBtn.addEventListener('click', clearAllSavedDrawings);

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
      renderSavedDrawings();
    });

    tabGlossary.addEventListener('click', () => {
      setMobileActiveTab(tabGlossary);
      glossaryModal.classList.remove('hidden');
      if (cachedGlossary.length === 0) loadGlossary();
    });

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 150);
    });

    if (window.ResizeObserver && canvasWrapper) {
      const ro = new ResizeObserver(() => {
        resizeCanvas();
      });
      ro.observe(canvasWrapper);
    }
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
    updateAllNotebookCounters();
    loadGlossary();
    // Default inspect "仙" (Imortal)
    inspectCharacter('仙');
  });
  window.addEventListener('load', resizeCanvas);

})();
