/* app.js — gallery, uploads, modal, animations */
(function(){
  const STORAGE_KEY = 'as_products_v1';
  const MAX_IMG = 2 * 1024 * 1024; // 2MB

  let products = [];
  let currentFilter = 'all';

  function loadProducts(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      products = raw ? JSON.parse(raw) : [];
    } catch(e){ products = []; }
  }
  async function loadSharedProducts(){
    if(!window.API_CONFIG || !window.API_CONFIG.WORKER_URL) return;
    try {
      const res = await fetch(window.API_CONFIG.WORKER_URL + '/api/products');
      if(!res.ok) return;
      const shared = await res.json();
      if(Array.isArray(shared) && shared.length > 0){
        products = shared.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          desc: p.desc,
          image: p.image,
          colors: (function(){ try { return JSON.parse(p.colors||'[]'); } catch(e){ return []; } })(),
          images_360: toFramesArray(p.images_360),
          has_360: !!p.has_360,
          date: p.created_at || p.date
        }));
        if(typeof window.renderGallery === 'function') window.renderGallery();
      }
    } catch(e){ console.error(e); }
  }
  function saveProducts(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }
    catch(e){ showToast(window.t('toast_toobig')); }
  }

  // ---------- Shared helpers ----------
  // images_360 may arrive as an array, a JSON string, or a double-encoded JSON
  // string (older records). Always normalize to a real array of URLs.
  function toFramesArray(v){
    if(Array.isArray(v)) return v.filter(Boolean);
    if(typeof v === 'string'){
      try {
        const parsed = JSON.parse(v);
        if(Array.isArray(parsed)) return parsed.filter(Boolean);
        if(typeof parsed === 'string') return toFramesArray(parsed);
      } catch(e){ return []; }
    }
    return [];
  }

  // Describe upload failures in a way the admin can act on.
  function describeUploadError(err){
    if(err && err.name === 'TypeError'){
      return window.t('toast_neterr') || 'Cannot reach the upload server (network or CORS blocked).';
    }
    return (err && err.message) || '';
  }

  // Downscale / re-encode big photos in the browser so uploads never fail on
  // file size (phone photos are often 3–10 MB).
  async function compressImage(file, opts){
    opts = opts || {};
    const maxDim = opts.maxDim || 1800;
    const quality = typeof opts.quality === 'number' ? opts.quality : 0.85;
    const maxBytes = opts.maxBytes || MAX_IMG;
    const minBytes = typeof opts.minBytes === 'number' ? opts.minBytes : Math.min(1536 * 1024, maxBytes);
    if(!file || !file.type || !file.type.startsWith('image/')) return file;
    if(file.size <= minBytes) return file; // small enough — keep the original bytes
    let url = null;
    try {
      url = URL.createObjectURL(file);
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('could not read this image'));
        el.src = url;
      });
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if(!w || !h) return file;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let q = quality;
      let blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
      if(blob && blob.size > maxBytes){
        // second pass: smaller dimensions + lower quality
        const s = Math.max(0.25, Math.min(1, Math.sqrt(maxBytes / blob.size) * 0.95));
        const w2 = Math.max(1, Math.round(canvas.width * s));
        const h2 = Math.max(1, Math.round(canvas.height * s));
        canvas.width = w2; canvas.height = h2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w2, h2);
        ctx.drawImage(img, 0, 0, w2, h2);
        q = Math.max(0.5, q - 0.15);
        blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
      }
      if(!blob) return file;
      const name = String(file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
    } catch(e){
      return file; // fall back to the original file rather than failing the upload
    } finally {
      if(url) URL.revokeObjectURL(url);
    }
  }

  // ---------- Gallery render ----------
  window.renderGallery = function(){
    const grid = document.getElementById('galleryGrid');
    const empty = document.getElementById('emptyState');
    if(!grid) return;
    grid.innerHTML = '';
    const list = products.filter(p => currentFilter === 'all' || p.category === currentFilter);
    if(list.length === 0){ empty.style.display = 'flex'; return; }
    empty.style.display = 'none';

    list.slice().reverse().forEach((p, idx) => {
      const card = document.createElement('article');
      card.className = 'product-card glass reveal in';
      card.dataset.id = p.id;
      card.style.cursor = 'pointer';
      card.style.animationDelay = (idx * 0.06) + 's';
      card.innerHTML = `
        <div class="pc-media">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <span class="pc-cat">${window.t('filter_' + p.category)}</span>
        </div>
        <div class="pc-body">
          <h3 class="pc-name">${escapeHtml(p.name)}</h3>
          ${p.price ? `<div class="pc-price">${escapeHtml(p.price)}</div>` : ''}
          ${p.desc ? `<p class="pc-desc">${escapeHtml(p.desc)}</p>` : ''}
          <div class="pc-foot">
            <span class="pc-date">${window.t('created_label')} · ${formatDate(p.date)}</span>
            <button class="pc-edit" data-id="${p.id}" aria-label="${window.t('btn_edit') || 'Edit'}">✎</button>
            <button class="pc-del" data-id="${p.id}" aria-label="${window.t('btn_delete')}">🗑</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    // edit handlers (admin only, opens the upload modal pre-filled)
    grid.querySelectorAll('.pc-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const prod = products.find(p => p.id === id);
        if(prod) openEdit(prod);
      });
    });

    // delete handlers
    grid.querySelectorAll('.pc-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        products = products.filter(p => p.id !== id);
        saveProducts();
        renderGallery();
        showToast(window.t('toast_deleted'));
        // also delete from the shared cloud catalog
        if(window.API_CONFIG){
          fetch(window.API_CONFIG.WORKER_URL + '/api/products/' + encodeURIComponent(id), { method: 'DELETE' })
            .catch(err => console.error(err));
        }
      });
    });
  };

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function formatDate(iso){
    try { return new Date(iso).toLocaleDateString(); } catch(e){ return iso; }
  }

  // ---------- Upload modal ----------
  const modal = document.getElementById('uploadModal');
  let editingId = null;   // null = new creation, otherwise the product id being edited
  let editingProd = null; // the product object being edited

  function openModal(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }

  function openEdit(prod){
    editingId = prod.id;
    editingProd = prod;
    // pre-fill fields
    document.getElementById('uplName').value = prod.name || '';
    document.getElementById('uplCat').value = prod.category || 'furniture';
    document.getElementById('uplPrice').value = prod.price || '';
    document.getElementById('uplDesc').value = prod.desc || '';
    const colorsArr = Array.isArray(prod.colors) ? prod.colors : (function(){ try { return JSON.parse(prod.colors||'[]'); } catch(e){ return []; } })();
    const colorsInput = document.getElementById('uplColors');
    if(colorsInput){ colorsInput.value = colorsArr.join(', '); colorsInput.dispatchEvent(new Event('input')); }
    // show existing image as current data + preview
    currentFileBlob = null;
    currentFileData = prod.image || null;
    const prev = document.getElementById('previewImg');
    if(prod.image){ prev.src = prod.image; prev.hidden = false; document.getElementById('dropInner').hidden = true; document.getElementById('uploadDrop').classList.add('has-img'); }
    current360Files = [];
    const info = document.getElementById('upl360Info');
    if(info){
      const n = toFramesArray(prod.images_360).length;
      info.textContent = n ? (n + ' ' + (window.t('frames_existing') || 'existing frames kept unless you choose new ones')) : '';
    }
    const title = document.getElementById('uploadTitle');
    if(title) title.textContent = (window.t('edit_creation') || 'Edit Creation');
    const saveBtn = document.getElementById('uploadSaveBtn');
    if(saveBtn) saveBtn.textContent = (window.t('btn_update') || 'Update Creation');
    openModal();
  }

  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; resetForm(); }
  function resetForm(){
    document.getElementById('uploadForm').reset();
    const prev = document.getElementById('previewImg');
    prev.hidden = true; prev.src = '';
    document.getElementById('dropInner').hidden = false;
    document.getElementById('uploadDrop').classList.remove('has-img');
    if(previewObjectUrl){ try { URL.revokeObjectURL(previewObjectUrl); } catch(e){} previewObjectUrl = null; }
    currentFileData = null;
    currentFileBlob = null;
    current360Files = [];
    editingId = null;
    editingProd = null;
    const info = document.getElementById('upl360Info');
    if(info) info.textContent = '';
    const title = document.getElementById('uploadTitle');
    if(title) title.textContent = (window.t('upload_title') || 'Add New Creation');
    const saveBtn = document.getElementById('uploadSaveBtn');
    if(saveBtn) saveBtn.textContent = (window.t('btn_save') || 'Save Creation');
  }

  document.getElementById('openUpload').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);

  // drag & drop
  const drop = document.getElementById('uploadDrop');
  const fileInput = document.getElementById('uplFile');
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  const files360 = document.getElementById('upl360Files');
  if(files360) files360.addEventListener('change', (e) => handle360Files(e.target.files));
  const clear360 = document.getElementById('upl360Clear');
  if(clear360) clear360.addEventListener('click', () => {
    current360Files = [];
    if(files360) files360.value = '';
    const info = document.getElementById('upl360Info');
    if(!info) return;
    const existing = editingProd ? toFramesArray(editingProd.images_360).length : 0;
    info.textContent = existing
      ? (existing + ' ' + (window.t('frames_existing') || 'existing frames kept unless you choose new ones'))
      : (window.t('frames_none') || 'No frames chosen — the 360° spin is optional and will be skipped.');
  });
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) handleFile(f);
  });

  let currentFileData = null;   // preview src for the main photo (object URL, or the remote URL when editing)
  let currentFileBlob = null;   // a newly chosen main photo that still has to be uploaded
  let previewObjectUrl = null;

  async function handleFile(file){
    if(!file) return;
    if(!file.type || !file.type.startsWith('image/')){
      showToast(window.t('toast_notimg') || 'Please pick an image file (PNG, JPG, WEBP).');
      return;
    }
    try {
      const prepared = await compressImage(file, { maxDim: 1800, quality: 0.85, maxBytes: MAX_IMG });
      if(previewObjectUrl){ try { URL.revokeObjectURL(previewObjectUrl); } catch(e){} previewObjectUrl = null; }
      currentFileBlob = prepared;
      currentFileData = URL.createObjectURL(prepared);
      previewObjectUrl = currentFileData;
      const prev = document.getElementById('previewImg');
      prev.src = currentFileData;
      prev.hidden = false;
      document.getElementById('dropInner').hidden = true;
      drop.classList.add('has-img');
    } catch(err){
      console.error(err);
      showToast((window.t('toast_uploadfail') || 'Could not read the photo') + ': ' + (err.message || ''));
    }
  }

  // 360 spin frames — OPTIONAL: when nothing is chosen the product simply has no spin.
  let current360Files = [];
  async function handle360Files(fileList){
    if(!fileList || !fileList.length) return;
    const all = Array.from(fileList);
    const images = all.filter(f => f && f.type && f.type.startsWith('image/'));
    const skipped = all.length - images.length;
    const info = document.getElementById('upl360Info');
    if(info) info.textContent = (window.t('frames_preparing') || 'Preparing photos…');
    const prepared = [];
    for(const f of images.slice(0, 48)){
      try {
        prepared.push(await compressImage(f, { maxDim: 1280, quality: 0.8, maxBytes: MAX_IMG, minBytes: 1024 * 1024 }));
      } catch(e){ prepared.push(f); }
    }
    current360Files = prepared.filter(Boolean);
    if(info){
      info.textContent = current360Files.length
        ? current360Files.length + ' ' + (window.t('frames_selected') || 'frames selected')
        : (window.t('frames_none') || 'No frames chosen — the 360° spin is optional and will be skipped.');
    }
    if(skipped > 0) showToast((window.t('toast_notimg') || 'Only image files are accepted') + ' (' + skipped + ')');
  }

  // Reusable R2 upload via the upload Worker (direct binding upload)
  async function uploadToR2(blob, filename, folder){
    const WORKER_URL = (window.API_CONFIG && window.API_CONFIG.R2_UPLOAD_WORKER)
      ? window.API_CONFIG.R2_UPLOAD_WORKER
      : "https://shoemaker-r2-uploader.solitary-grass-8ad1.workers.dev";
    const type = blob.type || "image/jpeg";
    const qs = new URLSearchParams({ filename: filename || "upload.jpg", contentType: type, folder: folder || "products" });
    const res = await fetch(WORKER_URL + "/api/upload?" + qs.toString(), {
      method: "POST",
      headers: { "Content-Type": type },
      body: blob
    });
    let data = {};
    try { data = await res.json(); } catch(e){}
    if(!res.ok || !data.publicUrl){ throw new Error(data.detail || data.error || ("R2 upload failed (" + res.status + ")")); }
    return data.publicUrl;
  }

  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('uplName').value.trim();
    if(!name){ showToast(window.t('toast_needname')); return; }
    if(!currentFileData){ showToast(window.t('toast_needimg')); return; }
    const isEdit = !!editingId;
    const colorsRaw = (document.getElementById('uplColors')?.value || '').trim();
    const colors = colorsRaw ? colorsRaw.split(',').map(c => c.trim()).filter(Boolean) : [];
    const prod = {
      id: isEdit ? editingId : ('p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7)),
      name,
      category: document.getElementById('uplCat').value,
      price: document.getElementById('uplPrice').value.trim(),
      desc: document.getElementById('uplDesc').value.trim(),
      image: currentFileData,
      colors,
      date: (isEdit && editingProd && (editingProd.date || editingProd.created_at)) || new Date().toISOString(),
    };

    const saveBtn = document.getElementById('uploadSaveBtn');
    const prevLabel = saveBtn ? saveBtn.textContent : '';
    const setBusy = (busy, txt) => { if(saveBtn){ saveBtn.disabled = busy; saveBtn.textContent = busy ? (txt || 'Saving…') : prevLabel; } };

    // Main image -> R2 (only when a NEW photo was chosen in this session)
    if(currentFileBlob){
      setBusy(true);
      try {
        prod.image = await uploadToR2(currentFileBlob, currentFileBlob.name || "product.jpg", "products");
      } catch (err) {
        console.error(err);
        setBusy(false);
        showToast((window.t('toast_uploadfail') || 'Image upload failed') + ": " + describeUploadError(err));
        return;
      }
    }

    // 360 spin frames -> R2. Optional: skipped completely when none are chosen.
    // When editing and no new frames are picked, the existing ones are kept.
    let images360 = (isEdit && editingProd) ? toFramesArray(editingProd.images_360) : [];
    if(current360Files.length){
      setBusy(true, 'Uploading 360° frames…');
      const fresh = [];
      try {
        for(let i = 0; i < current360Files.length; i++){
          const f = current360Files[i];
          setBusy(true, 'Uploading ' + (i + 1) + '/' + current360Files.length + '…');
          const url = await uploadToR2(f, f.name, "products/360");
          fresh.push(url);
        }
        images360 = fresh;
      } catch(err){
        console.error(err);
        setBusy(false);
        showToast((window.t('toast_uploadfail') || 'Image upload failed') + ": " + describeUploadError(err));
        return;
      }
    }
    prod.images_360 = images360;
    prod.has_360 = images360.length > 0;

    if(isEdit){
      const i = products.findIndex(p => p.id === editingId);
      if(i >= 0) products[i] = prod; else products.push(prod);
    } else {
      products.push(prod);
    }
    saveProducts();
    try {
      if (window.API_CONFIG) {
        await fetch(window.API_CONFIG.WORKER_URL + '/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...prod, colors: prod.colors || [], images_360: images360, has_360: images360.length > 0 })
        });
      }
    } catch (e) { console.error(e); }
    setBusy(false);
    currentFileData = null;
    const wasEdit = isEdit;
    closeModal();
    renderGallery();
    showToast(wasEdit ? (window.t('toast_updated') || 'Creation updated') : window.t('toast_saved'));
    // scroll to gallery
    document.getElementById('gallery').scrollIntoView({behavior:'smooth'});
  });

  // ---------- Filter chips ----------
  document.getElementById('filterChips').addEventListener('click', e => {
    const btn = e.target.closest('.chip-btn');
    if(!btn) return;
    document.querySelectorAll('#filterChips .chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.getAttribute('data-filter');
    renderGallery();
  });

  // ---------- Product detail / zoom ----------
  const detailModal = document.getElementById('detailModal');
  let zoomScale = 1, zoomTx = 0, zoomTy = 0, rotateY = 0;
  let mode360 = false;
  let currentOrderProduct = null;
  const detailImg = document.getElementById('detailImg');
  const zoomViewport = document.getElementById('zoomViewport');
  function applyZoom(){
    detailImg.style.transform = `translate(${zoomTx}px, ${zoomTy}px) scale(${zoomScale}) rotateY(${rotateY}deg)`;
    document.getElementById('zoomLevel').textContent = Math.round(zoomScale*100) + '%';
  }
  function reset360(){ rotateY = 0; applyZoom(); }
  function resetZoom(){ zoomScale = 1; zoomTx = 0; zoomTy = 0; rotateY = 0; applyZoom(); }
  function openDetail(prod){
    if(!prod) return;
    currentOrderProduct = prod;
    // reset 360 mode on new product
    mode360 = false;
    zoomViewport.classList.remove('view360');
    if(view360Hint) view360Hint.style.display = 'none';
    document.getElementById('view360').classList.remove('active-360');
    document.getElementById('detailName').textContent = prod.name;
    const priceEl = document.getElementById('detailPrice');
    priceEl.textContent = prod.price || '';
    priceEl.style.display = prod.price ? '' : 'none';
    document.getElementById('detailDesc').textContent = prod.desc || '';
    document.getElementById('detailCat').textContent = window.t('filter_' + prod.category);
    document.getElementById('detailDate').textContent = window.t('created_label') + ' · ' + formatDate(prod.date);
    detailImg.src = prod.image;
    detailImg.alt = prod.name;
    resetZoom();

    // colors
    const colors = (function(){ try { return JSON.parse(prod.colors||'[]'); } catch(e){ return []; } })();
    const picker = document.getElementById('colorPicker');
    const colorField = document.getElementById('colorField');
    if(picker && colorField){
      picker.innerHTML = '';
      if(colors.length > 0){
        currentColor = colors[0];
        colorField.style.display = '';
        colors.forEach(c => {
          const b = document.createElement('button');
          b.className = 'color-swatch' + (c === currentColor ? ' active' : '');
          b.style.background = c;
          b.onclick = () => {
            currentColor = c;
            picker.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
          };
          picker.appendChild(b);
        });
      } else {
        currentColor = '';
        colorField.style.display = 'none';
      }
    }

    detailModal.classList.add('open');
    detailModal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeDetail(){
    detailModal.classList.remove('open');
    detailModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    detailImg.src = '';
  }
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  document.getElementById('detailBackdrop').addEventListener('click', closeDetail);
  document.getElementById('zoomIn').addEventListener('click', () => { zoomScale = Math.min(4, zoomScale + 0.25); applyZoom(); });
  document.getElementById('zoomOut').addEventListener('click', () => { zoomScale = Math.max(0.5, zoomScale - 0.25); applyZoom(); });
  document.getElementById('zoomReset').addEventListener('click', resetZoom);
  const view360Btn = document.getElementById('view360');
  const view360Hint = document.getElementById('view360Hint');
  if(view360Btn){
    view360Btn.addEventListener('click', () => {
      mode360 = !mode360;
      zoomViewport.classList.toggle('view360', mode360);
      if(view360Hint) view360Hint.style.display = mode360 ? 'block' : 'none';
      view360Btn.classList.toggle('active-360', mode360);
      if(!mode360){ rotateY = 0; applyZoom(); }
      else { zoomScale = 1; zoomTx = 0; zoomTy = 0; applyZoom(); }
    });
  }

  // wheel zoom
  zoomViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    if(mode360){
      rotateY += e.deltaY < 0 ? -15 : 15;
      applyZoom();
    } else {
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      zoomScale = Math.min(4, Math.max(0.5, zoomScale + delta));
      applyZoom();
    }
  }, { passive: false });

  // drag to pan
  let dragging = false, startX=0, startY=0, origTx=0, origTy=0, origRot=0;
  zoomViewport.addEventListener('pointerdown', (e) => {
    dragging = true; zoomViewport.classList.add('dragging');
    startX = e.clientX; startY = e.clientY; origTx = zoomTx; origTy = zoomTy; origRot = rotateY;
    zoomViewport.setPointerCapture(e.pointerId);
  });
  zoomViewport.addEventListener('pointermove', (e) => {
    if(!dragging) return;
    if(mode360){
      rotateY = origRot + (e.clientX - startX) * 0.5;
      applyZoom();
    } else {
      zoomTx = origTx + (e.clientX - startX);
      zoomTy = origTy + (e.clientY - startY);
      applyZoom();
    }
  });
  zoomViewport.addEventListener('pointerup', () => { dragging = false; zoomViewport.classList.remove('dragging'); });
  zoomViewport.addEventListener('pointercancel', () => { dragging = false; zoomViewport.classList.remove('dragging'); });

  // click on gallery card -> open detail
  const grid = document.getElementById('galleryGrid');
  grid.addEventListener('click', (e) => {
    if(e.target.closest('.pc-del')) return;
    const card = e.target.closest('.product-card');
    if(!card) return;
    const id = card.dataset.id;
    const prod = products.find(p => p.id === id);
    if(prod) openDetail(prod);
  });

  // ---------- Localized order messages ----------
  function getOrderText(lang, channel, prod, model, size, qty, color){
    const cat = (typeof window.t === 'function') ? window.t('filter_' + prod.category) : prod.category;
    const price = prod.price || 'N/A';
    const imageNote = {
      en: '(product photo attached)',
      fr: '(photo du produit jointe)',
      wo: '(photo du produit jointe)',
      es: '(foto del producto adjunta)',
      it: '(foto del prodotto allegata)'
    }[lang] || '(product photo attached)';
    const colorLine = color ? (color.startsWith('#') ? color : color) : '';
    const colorLabel = {
      en: 'Color',
      fr: 'Couleur',
      wo: 'Color',
      es: 'Color',
      it: 'Colore',
      de: 'Farbe'
    }[lang] || 'Color';

    const templates = {
      en: {
        subject: 'Order: ' + prod.name,
        body:
        'Hello Lebougui Family,\\n\\nI would like to order the following product:\\n\\n' +
        'Product: ' + prod.name + '\\n' +
        'Category: ' + cat + '\\n' +
        'Image: ' + imageNote + '\\n' +
        'Model/Gender: ' + model + '\\n' +
        'Size: ' + size + '\\n' +
        (colorLine ? (colorLabel + ': ' + colorLine + '\\n') : '') +
        'Quantity: ' + qty + '\\n' +
        'Price: ' + price + '\\n\\n' +
        'Please confirm availability and delivery.\\n\\n' +
        'Thanks.'
      },
      fr: {
        subject: 'Commande : ' + prod.name,
        body:
        'Bonjour Lebougui Famille,\\n\\nJe souhaite commander le produit suivant :\\n\\n' +
        'Produit : ' + prod.name + '\\n' +
        'Catégorie : ' + cat + '\\n' +
        'Image : ' + imageNote + '\\n' +
        'Modèle/Genre : ' + model + '\\n' +
        'Taille : ' + size + '\\n' +
        (colorLine ? (colorLabel + ' : ' + colorLine + '\\n') : '') +
        'Quantité : ' + qty + '\\n' +
        'Prix : ' + price + '\\n\\n' +
        'Merci de confirmer la disponibilité et la livraison.\\n\\n' +
        'Merci.'
      },
      wo: {
        subject: 'Commande : ' + prod.name,
        body:
        'Bonjour Lebougui Den,\\n\\nDama bëgg commander bii:\\n\\n' +
        'Produit : ' + prod.name + '\\n' +
        'Catégorie : ' + cat + '\\n' +
        'Image : ' + imageNote + '\\n' +
        'Modèle/Genre : ' + model + '\\n' +
        'Taille : ' + size + '\\n' +
        (colorLine ? (colorLabel + ' : ' + colorLine + '\\n') : '') +
        'Quantité : ' + qty + '\\n' +
        'Prix : ' + price + '\\n\\n' +
        'Merci confirmer disponibilité ak livraison.\\n\\n' +
        'Jërëjëf.'
      },
      es: {
        subject: 'Pedido: ' + prod.name,
        body:
        'Hola Lebougui Familia,\\n\\nMe gustaría pedir el siguiente producto:\\n\\n' +
        'Producto: ' + prod.name + '\\n' +
        'Categoría: ' + cat + '\\n' +
        'Imagen: ' + imageNote + '\\n' +
        'Modelo/Género: ' + model + '\\n' +
        'Talla: ' + size + '\\n' +
        (colorLine ? (colorLabel + ': ' + colorLine + '\\n') : '') +
        'Cantidad: ' + qty + '\\n' +
        'Precio: ' + price + '\\n\\n' +
        'Por favor confirma disponibilidad y entrega.\\n\\n' +
        'Gracias.'
      },
      it: {
        subject: 'Ordine: ' + prod.name,
        body:
        'Ciao Lebougui Famiglia,\\n\\nVorrei ordinare il seguente prodotto:\\n\\n' +
        'Prodotto: ' + prod.name + '\\n' +
        'Categoria: ' + cat + '\\n' +
        'Immagine: ' + imageNote + '\\n' +
        'Modello/Genere: ' + model + '\\n' +
        'Taglia: ' + size + '\\n' +
        (colorLine ? (colorLabel + ': ' + colorLine + '\\n') : '') +
        'Quantità: ' + qty + '\\n' +
        'Prezzo: ' + price + '\\n\\n' +
        'Per favore conferma disponibilità e consegna.\\n\\n' +
        'Grazie.'
      }
      ,
      de: {
        subject: 'Bestellung: ' + prod.name,
        body:
        'Hallo Lebougui Familie,\\n\\nIch möchte folgendes Produkt bestellen:\\n\\n' +
        'Produkt: ' + prod.name + '\\n' +
        'Kategorie: ' + cat + '\\n' +
        'Bild: ' + imageNote + '\\n' +
        'Modell/Geschlecht: ' + model + '\\n' +
        'Größe: ' + size + '\\n' +
        (colorLine ? (colorLabel + ': ' + colorLine + '\\n') : '') +
        'Menge: ' + qty + '\\n' +
        'Preis: ' + price + '\\n\\n' +
        'Bitte bestätigen Sie Verfügbarkeit und Lieferung.\\n\\n' +
        'Danke.'
      }
    };
    return templates[lang] || templates.en;
  }

  // ---------- Product order via email ----------
  const orderEmailBtn = document.getElementById('orderEmailBtn');
  if(orderEmailBtn){
    orderEmailBtn.addEventListener('click', () => {
      const prod = currentOrderProduct;
      if(!prod){ return; }
      const model = document.getElementById('orderModel').selectedOptions[0].textContent.trim();
      const size = document.getElementById('orderSize').value;
      const qty = document.getElementById('orderQty').value || '1';
      const lang = (window.I18N && window.I18N.current) ? window.I18N.current : 'en';
      const localized = getOrderText(lang, 'email', prod, model, size, qty, currentColor);
      window.location.href = 'mailto:radtou86@gmail.com?subject=' + encodeURIComponent(localized.subject) + '&body=' + encodeURIComponent(localized.body);
      const st = document.getElementById('orderStatus');
      st.textContent = (typeof window.t === 'function') ? window.t('form_sent') : 'Email client opened.';
      st.classList.add('show');
      setTimeout(() => st.classList.remove('show'), 4000);
    });
  }

  // Share with photo (Web Share API) if supported
  const orderShareBtn = document.getElementById('orderShareBtn');
  if(orderShareBtn && typeof navigator !== 'undefined' && navigator.canShare){
    try {
      const testFile = new File([''], 'test.png', { type: 'image/png' });
      if(navigator.canShare({ files: [testFile] })) {
        orderShareBtn.style.display = 'block';
      }
    } catch(e){}
  }
  if(orderShareBtn){
    orderShareBtn.addEventListener('click', async () => {
      const prod = currentOrderProduct;
      if(!prod){ return; }
      const model = document.getElementById('orderModel').selectedOptions[0].textContent.trim();
      const size = document.getElementById('orderSize').value;
      const qty = document.getElementById('orderQty').value || '1';
      const lang = (window.I18N && window.I18N.current) ? window.I18N.current : 'en';
      const localized = getOrderText(lang, 'wa', prod, model, size, qty, currentColor);
      try {
        const res = await fetch(prod.image);
        const blob = await res.blob();
        const ext = (blob.type && blob.type.includes('png')) ? 'png' : 'jpg';
        const file = new File([blob], (prod.name || 'product') + '.' + ext, { type: blob.type || 'image/jpeg' });
        if(navigator.canShare && navigator.canShare({ files: [file] })){
          await navigator.share({ files: [file], title: localized.subject, text: localized.body });
          return;
        }
      } catch(e){}
      // fallback: open WhatsApp text only
      const text = encodeURIComponent(localized.body);
      window.open('https://wa.me/221775348003?text=' + text, '_blank');
    });
  }

  const orderWhatsappBtn = document.getElementById('orderWhatsappBtn');
  if(orderWhatsappBtn){
    orderWhatsappBtn.addEventListener('click', () => {
      const prod = currentOrderProduct;
      if(!prod){ return; }
      const model = document.getElementById('orderModel').selectedOptions[0].textContent.trim();
      const size = document.getElementById('orderSize').value;
      const qty = document.getElementById('orderQty').value || '1';
      const lang = (window.I18N && window.I18N.current) ? window.I18N.current : 'en';
      const localized = getOrderText(lang, 'wa', prod, model, size, qty, currentColor);
      const text = encodeURIComponent(localized.body);
      window.open('https://wa.me/221775348003?text=' + text, '_blank');
      const st = document.getElementById('orderStatus');
      st.textContent = 'WhatsApp opened with order details.';
      st.classList.add('show');
      setTimeout(() => st.classList.remove('show'), 4000);
    });
  }

  // ---------- Contact form ----------
  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('formName').value || '').trim();
    const phone = (document.getElementById('formPhone').value || '').trim();
    const msg = (document.getElementById('formMsg').value || '').trim();
    const text = encodeURIComponent('Name: ' + name + '\\nPhone: ' + phone + '\\nProject: ' + msg);
    const status = document.getElementById('formStatus');
    status.textContent = window.t('form_sent');
    status.classList.add('show');
    // Open WhatsApp chat with prefilled message (received on phone)
    window.open('https://wa.me/221775348003?text=' + text, '_blank');
    // Open email client to send the same (received on Gmail)
    setTimeout(() => {
      window.location.href = 'mailto:radtou86@gmail.com?subject=' + encodeURIComponent('New project request') + '&body=' + text;
    }, 400);
    e.target.reset();
    setTimeout(() => status.classList.remove('show'), 4000);
  });

  // ---------- Mobile menu ----------
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    menuToggle.classList.toggle('open');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.classList.remove('open');
  }));

  // ---------- Language switch ----------
  document.getElementById('langSwitch').addEventListener('click', e => {
    const btn = e.target.closest('button[data-lang]');
    if(!btn) return;
    document.querySelectorAll('#langSwitch button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.setLang(btn.getAttribute('data-lang'));
  });
  // sync active button on load
  document.querySelectorAll('#langSwitch button').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lang') === window.I18N.current);
  });

  // ---------- Scroll reveal ----------
  const revealEls = () => document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if(en.isIntersecting){
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  function observeReveals(){
    revealEls().forEach(el => { if(!el.classList.contains('in')) io.observe(el); });
  }
  observeReveals();
  // re-observe after gallery render adds elements (cards already .in)
  const mo = new MutationObserver(observeReveals);
  mo.observe(document.body, {childList:true, subtree:true});

  // ---------- Header shrink on scroll ----------
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if(window.scrollY > 60) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }, {passive:true});

  // ---------- Cursor glow ----------
  const glow = document.getElementById('cursorGlow');
  let gx=0, gy=0, cx=0, cy=0;
  window.addEventListener('mousemove', e => { gx = e.clientX; gy = e.clientY; }, {passive:true});
  function animGlow(){
    cx += (gx - cx) * 0.12;
    cy += (gy - cy) * 0.12;
    glow.style.transform = `translate(${cx-200}px, ${cy-200}px)`;
    requestAnimationFrame(animGlow);
  }
  animGlow();

  // ---------- Toast ----------
  let toastTimer = null;
  window.showToast = function(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  };
  function showToast(msg){ window.showToast(msg); }

  // ---------- Admin area ----------
  const ADMIN_PASS = '$$Senegal1960';
  let isAdmin = (function(){ try { return sessionStorage.getItem('as_admin') === '1'; } catch(e){ return false; } })();

  function applyAdmin(){
    document.body.classList.toggle('is-admin', isAdmin);
    const lbl = document.getElementById('adminBtnLabel');
    if(lbl) lbl.textContent = isAdmin ? (window.t ? 'Logout' : 'Logout') : 'Admin';
  }
  const adminBtn = document.getElementById('adminBtn');
  const loginModal = document.getElementById('loginModal');
  function openLogin(){ loginModal.classList.add('open'); loginModal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; document.getElementById('loginStatus').textContent=''; document.getElementById('loginForm').reset(); }
  function closeLogin(){ loginModal.classList.remove('open'); loginModal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  if(adminBtn) adminBtn.addEventListener('click', () => {
    if(isAdmin){
      isAdmin = false;
      try { sessionStorage.removeItem('as_admin'); } catch(e){}
      applyAdmin();
      showToast('Logged out.');
    } else {
      openLogin();
    }
  });
  document.getElementById('loginClose').addEventListener('click', closeLogin);
  document.getElementById('loginBackdrop').addEventListener('click', closeLogin);
  document.getElementById('loginCancel').addEventListener('click', closeLogin);
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('loginPass').value;
    if(val === ADMIN_PASS){
      isAdmin = true;
      try { sessionStorage.setItem('as_admin','1'); } catch(e){}
      applyAdmin();
      closeLogin();
      showToast('Welcome, Lebougui Family!');
    } else {
      document.getElementById('loginStatus').textContent = 'Wrong password.';
    }
  });
  applyAdmin();

  // ---------- Sync local creations to cloud ----------
  const syncBtn = document.getElementById('syncCloud');
  if(syncBtn){
    syncBtn.addEventListener('click', async () => {
      if(!window.API_CONFIG) { showToast('Cloud not configured.'); return; }
      loadProducts();
      let cloudIds = [];
      try {
        const res = await fetch(window.API_CONFIG.WORKER_URL + '/api/products');
        const cloud = await res.json();
        cloudIds = (cloud || []).map(p => p.id);
      } catch(e){}
      const missing = products.filter(p => !cloudIds.includes(p.id));
      if(missing.length === 0){ showToast('Everything is already in the cloud.'); return; }
      let ok = 0;
      for(const p of missing){
        try {
          const r = await fetch(window.API_CONFIG.WORKER_URL + '/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: p.id, name: p.name, category: p.category, price: p.price,
              desc: p.desc, image: p.image,
              colors: p.colors || [], images_360: toFramesArray(p.images_360), has_360: toFramesArray(p.images_360).length > 0
            })
          });
          if(r.ok) ok++;
        } catch(e){ console.error(e); }
      }
      showToast('Synced ' + ok + '/' + missing.length + ' creations to cloud.');
      loadSharedProducts();
    });
  }

  // ---------- Init ----------
   // Sync products across tabs/windows
   window.addEventListener('storage', (e) => {
     if (e.key === STORAGE_KEY) { loadProducts(); if (typeof window.renderGallery === 'function') window.renderGallery(); }
   });
   if ('BroadcastChannel' in window) {
     try {
       const bc = new BroadcastChannel('as_products');
       bc.onmessage = () => { loadProducts(); if (typeof window.renderGallery === 'function') window.renderGallery(); };
       const origSave = saveProducts;
       saveProducts = function(){ origSave(); try { bc.postMessage('updated'); } catch(e){} }
     } catch(e){}
   }
    console.info('Lebougui: cloudinaryReady =', !!(window.cloudinaryReady && window.cloudinaryReady()));
  loadProducts();
  // seed a couple of demo products if empty (optional)
  if(products.length === 0){
    // no seed, keep empty
  }
  renderGallery();
  loadSharedProducts();
  window.applyI18n();

  // expose
  window.renderGallery = window.renderGallery;
})();
