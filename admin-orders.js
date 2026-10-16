(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmt(iso){try{return new Date(iso).toLocaleString();}catch(e){return iso;}}

  async function load(){
    const list=document.getElementById('ordersList');
    try{
      const res=await fetch(window.API_CONFIG.WORKER_URL+'/api/orders');
      const orders=await res.json();
      let items=0,news=0;
      orders.forEach(o=>{ items+=(o.items||[]).length; if(o.status==='new') news++; });
      document.getElementById('statOrders').textContent=orders.length;
      document.getElementById('statItems').textContent=items;
      document.getElementById('statNew').textContent=news;
      if(orders.length===0){ list.innerHTML='<p class="empty-state" style="display:block">No orders yet.</p>'; return; }
      list.innerHTML='';
      orders.forEach(o=>{
        const card=document.createElement('div');
        card.className='order-card glass';
        let rows='';
        (o.items||[]).forEach(it=>{
          rows+=`<li><img src="${esc(it.product_image)}" alt=""/><div><strong>${esc(it.product_name)}</strong><br><small>${it.color?'● '+esc(it.color)+' · ':''}${it.model?esc(it.model)+' · ':''}Size: ${esc(it.size)} · Qty: ${esc(it.qty)}${it.price?' · '+esc(it.price):''}</small></div></li>`;
        });
        card.innerHTML=`
          <div class="order-head">
            <div><strong>${esc(o.id)}</strong> ${o.status==='new'?'<span class="badge-new">NEW</span>':''}</div>
            <div>${fmt(o.created_at)}</div>
          </div>
          <div><strong>${esc(o.customer_name)}</strong> · ${esc(o.customer_phone)} ${o.customer_email?' · '+esc(o.customer_email):''}</div>
          ${o.address?'<div>📍 '+esc(o.address)+'</div>':''}
          ${o.notes?'<div>📝 '+esc(o.notes)+'</div>':''}
          <ul class="order-items">${rows || '<li>No items</li>'}</ul>
          <div class="cart-total"><span>Total</span><span>${esc(o.total)}</span></div>
          ${o.status==='new'?'<button class="btn btn-primary btn-sm" data-done="'+esc(o.id)+'">Mark done</button>':''}
        `;
        list.appendChild(card);
      });
      list.querySelectorAll('[data-done]').forEach(btn=>btn.addEventListener('click',async()=>{
        await fetch(window.API_CONFIG.WORKER_URL+'/api/orders/'+encodeURIComponent(btn.getAttribute('data-done')),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'done'})});
        load();
      }));
    }catch(e){
      console.error(e);
      list.innerHTML='<p>Failed to load orders.</p>';
    }
  }
  load();
})();
