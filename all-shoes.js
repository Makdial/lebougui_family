(function(){
  let products = [];
  let currentFilter = 'all';
  let currentProduct = null;
  let currentColor = '';
  let cart = [];
  let frames360 = [];
  let frameIndex = 0;

  // ---------- Cart ----------
  function loadCart(){
    try { cart = JSON.parse(localStorage.getItem('lb_cart')||'[]'); } catch(e){ cart=[]; }
    updateCartBadge();
  }
  function saveCart(){
    try { localStorage.setItem('lb_cart', JSON.stringify(cart)); } catch(e){}
    updateCartBadge();
    renderCart();
  }
  function cartTotal(){
    return cart.reduce((s,i)=>s + (parseFloat(String(i.price).replace(/[^0-9.]/g,''))||0) * i.qty, 0);
  }
  function updateCartBadge(){
    const badge = document.getElementById('cartBadge');
    if(badge) badge.textContent = cart.reduce((s,i)=>s+i.qty,0);
  }

  // ---------- Products ----------
  async function loadProducts(){
    try {
      const res = await fetch(window.API_CONFIG.WORKER_URL+'/api/products');
      products = await res.json();
    } catch(e){ products = []; }
    renderGallery();
  }

  function renderGallery(){
    const grid = document.getElementById('galleryGrid');
    const empty = document.getElementById('emptyState');
    if(!grid) return;
    grid.innerHTML = '';
    const list = products.filter(p=>currentFilter==='all'||p.category===currentFilter);
    if(list.length===0){ empty.style.display='flex'; return; }
    empty.style.display='none';
    list.slice().forEach((p,idx)=>{
      const card=document.createElement('article');
      card.className='product-card glass reveal in';
      card.style.animationDelay=(idx*0.06)+'s';
      card.innerHTML=`<div class="pc-media"><img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"/></div><div class="pc-body"><h3 class="pc-name">${escapeHtml(p.name)}</h3>${p.price?'<div class="pc-price">'+escapeHtml(p.price)+'</div>':''}</div>`;
      card.addEventListener('click',()=>openDetail(p));
      grid.appendChild(card);
    });
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function formatDate(iso){try{return new Date(iso).toLocaleDateString();}catch(e){return iso;}}
  function parseColors(p){ try { return JSON.parse(p.colors||'[]'); } catch(e){ return []; } }
  function parseFrames(p){
    const v = p && p.images_360;
    if(Array.isArray(v)) return v.filter(Boolean);
    if(typeof v === 'string'){
      try {
        const parsed = JSON.parse(v);
        if(Array.isArray(parsed)) return parsed.filter(Boolean);
        if(typeof parsed === 'string') return parseFrames({ images_360: parsed });
      } catch(e){ return []; }
    }
    return [];
  }

  // ---------- Detail ----------
  const detailModal=document.getElementById('detailModal');
  const detailImg=document.getElementById('detailImg');
  const zoomViewport=document.getElementById('zoomViewport');
  let zoomScale=1,zoomTx=0,zoomTy=0,rotateY=0,mode360=false;
  function applyZoom(){detailImg.style.transform=`translate(${zoomTx}px,${zoomTy}px) scale(${zoomScale}) rotateY(${rotateY}deg)`;document.getElementById('zoomLevel').textContent=Math.round(zoomScale*100)+'%';}
  function resetZoom(){zoomScale=1;zoomTx=0;zoomTy=0;rotateY=0;mode360=false;zoomViewport.classList.remove('view360');document.getElementById('view360').classList.remove('active-360');applyZoom();}

  function openDetail(prod){
    currentProduct=prod; resetZoom();
    document.getElementById('detailName').textContent=prod.name;
    document.getElementById('detailPrice').textContent=prod.price||''; document.getElementById('detailPrice').style.display=prod.price?'':'none';
    document.getElementById('detailDesc').textContent=prod.desc||'';
    document.getElementById('detailCat').textContent=window.t('filter_'+prod.category);
    document.getElementById('detailDate').textContent=window.t('created_label')+' · '+formatDate(prod.created_at||prod.date);
    detailImg.src=prod.image;

    // colors
    const colors=parseColors(prod);
    const picker=document.getElementById('colorPicker');
    const colorField=document.getElementById('colorField');
    picker.innerHTML='';
    if(colors.length>0){
      currentColor=colors[0]; colorField.style.display='';
      colors.forEach(c=>{
        const b=document.createElement('button');
        b.className='color-swatch'+(c===currentColor?' active':'');
        b.style.background=c;
        b.onclick=()=>{currentColor=c; picker.querySelectorAll('.color-swatch').forEach(x=>x.classList.remove('active')); b.classList.add('active');};
        picker.appendChild(b);
      });
    } else { currentColor=''; colorField.style.display='none'; }

    // 360 frames
    frames360=parseFrames(prod); frameIndex=0;
    const bar=document.getElementById('bar360');
    const spin=document.getElementById('spin360');
    if(frames360.length>1){
      bar.style.display='flex';
      spin.max=frames360.length-1; spin.value=0;
      detailImg.src=frames360[0];
    } else {
      bar.style.display='none';
    }
    document.getElementById('view360').style.display=frames360.length>1?'':'none';
    const v3=document.getElementById('view3D'); if(v3){ v3.style.display=((currentProduct.image||'').toLowerCase().match(/\.(glb|gltf|obj|fbx)(\?|$)/)||parseFrames(currentProduct).length>1)?'':'none'; }

    detailModal.classList.add('open'); detailModal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  }
  function closeDetail(){detailModal.classList.remove('open');detailModal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  document.getElementById('detailClose').onclick=closeDetail;
  document.getElementById('detailBackdrop').onclick=closeDetail;
  document.getElementById('zoomIn').onclick=()=>{zoomScale=Math.min(4,zoomScale+0.25);applyZoom();};
  document.getElementById('zoomOut').onclick=()=>{zoomScale=Math.max(0.5,zoomScale-0.25);applyZoom();};
  document.getElementById('zoomReset').onclick=resetZoom;
  document.getElementById('view360').onclick=()=>{
    if(frames360.length<2) return;
    mode360=!mode360;
    zoomViewport.classList.toggle('view360',mode360);
    document.getElementById('view360').classList.toggle('active-360',mode360);
    if(mode360){ zoomScale=1;zoomTx=0;zoomTy=0; detailImg.src=frames360[frameIndex]; }
    else { rotateY=0; detailImg.src=currentProduct.image; }
    applyZoom();
  };
  const v3=document.getElementById('view3D'); if(v3) v3.onclick=()=>{ if(currentProduct&&currentProduct.image){ const fr=parseFrames(currentProduct); if(fr.length>1){ window.open('viewer3d.html?frames='+encodeURIComponent(fr.join(',')),'_blank'); return; } window.open('viewer3d.html?url='+encodeURIComponent(currentProduct.image),'_blank'); } };
  const spinEl=document.getElementById('spin360');
  if(spinEl) spinEl.addEventListener('input',()=>{ frameIndex=parseInt(spinEl.value)||0; if(frames360[frameIndex]) detailImg.src=frames360[frameIndex]; });

  // wheel + drag spin
  let dragging=false,startX=0,startY=0,origTx=0,origTy=0,origFrame=0;
  zoomViewport.addEventListener('wheel',e=>{
    if(mode360 && frames360.length>1){
      e.preventDefault();
      frameIndex=(frameIndex+(e.deltaY<0?-1:1)+frames360.length)%frames360.length;
      detailImg.src=frames360[frameIndex]; const s=document.getElementById('spin360'); if(s) s.value=frameIndex;
    } else {
      e.preventDefault();
      const delta=e.deltaY<0?0.15:-0.15;
      zoomScale=Math.min(4,Math.max(0.5,zoomScale+delta)); applyZoom();
    }
  },{passive:false});
  zoomViewport.addEventListener('pointerdown',e=>{dragging=true;zoomViewport.classList.add('dragging');startX=e.clientX;startY=e.clientY;origTx=zoomTx;origTy=zoomTy;origFrame=frameIndex;zoomViewport.setPointerCapture(e.pointerId);});
  zoomViewport.addEventListener('pointermove',e=>{
    if(!dragging) return;
    if(mode360 && frames360.length>1){
      const delta=Math.round((e.clientX-startX)/(zoomViewport.clientWidth/frames360.length));
      frameIndex=((origFrame+delta)%frames360.length+frames360.length)%frames360.length;
      detailImg.src=frames360[frameIndex]; const s=document.getElementById('spin360'); if(s) s.value=frameIndex;
    } else {
      zoomTx=origTx+(e.clientX-startX); zoomTy=origTy+(e.clientY-startY); applyZoom();
    }
  });
  zoomViewport.addEventListener('pointerup',()=>{dragging=false;zoomViewport.classList.remove('dragging');});
  zoomViewport.addEventListener('pointercancel',()=>{dragging=false;zoomViewport.classList.remove('dragging');});

  // ---------- Add to cart ----------
  function addCurrentToCart(){
    if(!currentProduct) return;
    const qty=parseInt(document.getElementById('orderQty').value)||1;
    const size=document.getElementById('orderSize').value;
    const model=document.getElementById('orderModel').value;
    cart.push({
      line_id:'c_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      product_id:currentProduct.id,
      product_name:currentProduct.name,
      product_image:currentProduct.image,
      color:currentColor, size, model, qty, price:currentProduct.price||''
    });
    saveCart();
    showToast(window.t('toast_added_cart')||'Added to cart');
  }
  document.getElementById('addToCartBtn').onclick=addCurrentToCart;
  document.getElementById('buyNowBtn').onclick=()=>{addCurrentToCart();closeDetail();openCart();};

  // ---------- Cart modal ----------
  const cartModal=document.getElementById('cartModal');
  function openCart(){ renderCart(); checkoutTotal(); cartModal.classList.add('open'); cartModal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeCart(){ cartModal.classList.remove('open'); document.body.style.overflow=''; }
  function renderCart(){
    const list=document.getElementById('cartList');
    if(!list) return;
    list.innerHTML='';
    if(cart.length===0){ list.innerHTML='<li class="cart-item"><span data-i18n="toast_cart_empty">Cart is empty</span></li>'; return; }
    cart.forEach(item=>{
      const li=document.createElement('li'); li.className='cart-item';
      li.innerHTML=`<img src="${item.product_image}" alt=""/><div class="cart-item-info"><strong>${escapeHtml(item.product_name)}</strong><small>${item.color?'● '+item.color+' · ':''}${window.t('order_size')}: ${item.size} · ${window.t('order_qty')}: ${item.qty}${item.price?' · '+escapeHtml(item.price):''}</small></div>`;
      const rm=document.createElement('button'); rm.className='btn btn-ghost btn-sm'; rm.textContent='✕';
      rm.onclick=()=>{ cart=cart.filter(c=>c.line_id!==item.line_id); saveCart(); };
      li.appendChild(rm);
      list.appendChild(li);
    });
  }
  function checkoutTotal(){
    const t=cartTotal();
    const txt=(t?t.toLocaleString():'0')+' FCFA';
    const a=document.getElementById('cartTotal'); if(a) a.textContent=txt;
    const b=document.getElementById('checkoutTotal'); if(b) b.textContent=txt;
  }
  document.getElementById('cartBtn').onclick=openCart;
  document.getElementById('cartClose').onclick=closeCart;
  document.getElementById('cartBackdrop').onclick=closeCart;
  document.getElementById('cartClearBtn').onclick=()=>{ cart=[]; saveCart(); };
  document.getElementById('cartCheckoutBtn').onclick=()=>{ if(cart.length===0){showToast(window.t('toast_cart_empty'));return;} closeCart(); openCheckout(); };

  // ---------- Checkout modal ----------
  const checkoutModal=document.getElementById('checkoutModal');
  function openCheckout(){ checkoutTotal(); checkoutModal.classList.add('open'); checkoutModal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeCheckout(){ checkoutModal.classList.remove('open'); document.body.style.overflow=''; }
  document.getElementById('checkoutClose').onclick=closeCheckout;
  document.getElementById('checkoutCancel').onclick=closeCheckout;
  document.getElementById('checkoutBackdrop').onclick=closeCheckout;

  document.getElementById('checkoutForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const customer={
      name:document.getElementById('coName').value.trim(),
      phone:document.getElementById('coPhone').value.trim(),
      email:document.getElementById('coEmail').value.trim(),
      address:document.getElementById('coAddress').value.trim(),
      notes:document.getElementById('coNotes').value.trim()
    };
    const total=cartTotal();
    const order={ id:'o_'+Date.now(), total:(total?total.toLocaleString():'0')+' FCFA', notes:customer.notes, address:customer.address };
    const items=cart.map(i=>({product_id:i.product_id,product_name:i.product_name,product_image:i.product_image,color:i.color,size:i.size,qty:i.qty,price:i.price,model:i.model}));
    const status=document.getElementById('checkoutStatus');
    status.textContent=window.t('sending')||'Sending...';
    try{
      const res=await fetch(window.API_CONFIG.WORKER_URL+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order,items,customer})});
      if(!res.ok) throw new Error('HTTP '+res.status);
      cart=[]; saveCart();
      status.textContent=window.t('toast_order_placed')||'Order sent!';
      setTimeout(()=>{ closeCheckout(); showToast(window.t('toast_order_placed')||'Order sent!'); }, 1200);
    }catch(err){
      console.error(err);
      status.textContent=window.t('toast_order_fail')||'Order failed';
    }
  });

  // ---------- Filters / lang ----------
  document.getElementById('filterChips').addEventListener('click',e=>{
    const btn=e.target.closest('.chip-btn'); if(!btn)return;
    document.querySelectorAll('#filterChips .chip-btn').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active'); currentFilter=btn.getAttribute('data-filter'); renderGallery();
  });
  document.querySelectorAll('#langSwitch button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#langSwitch button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); window.setLang(b.getAttribute('data-lang'));
    renderCart(); checkoutTotal();
  }));
  document.querySelectorAll('#langSwitch button').forEach(b=>b.classList.toggle('active',b.getAttribute('data-lang')===window.I18N.current));

  // ---------- Toast ----------
  let toastTimer=null;
  function showToast(msg){
    const el=document.getElementById('toast'); if(!el) return;
    el.textContent=msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
  }

  // ---------- Init ----------
  window.applyI18n();
  loadCart();
  renderCart();
  loadProducts();
})();
