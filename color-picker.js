(function(){
  const root = document.getElementById('colorPickerWrap');
  if(!root) return;
  const input = document.getElementById('uplColors');
  const preview = document.getElementById('colorPreview');
  const presets = [
    '#000000','#111111','#222222','#333333','#444444','#555555','#666666','#777777','#888888','#999999','#a0a0a0','#b0b0b0','#c0c0c0','#d0d0d0','#ffffff',
    '#8b4513','#a0522d','#b8860b','#d2691e','#cd853f','#deb887','#f4a460','#ffa500','#ff8c00',
    '#800000','#a52a2a','#b22222','#dc143c','#ff0000','#ff6347','#fa8072','#f08080',
    '#006400','#228b22','#32cd32','#3cb371','#90ee90','#7cfc00',
    '#000080','#0000ff','#1e90ff','#4169e1','#6495ed','#87ceeb','#00bfff',
    '#4b0082','#800080','#8a2be2','#9400d3','#da70d6','#ff69b4','#ff1493',
    '#40e0d0','#00ced1','#008080','#20b2aa'
  ];
  let selected = [];

  function parse(){
    const val = (input.value||'').trim();
    if(!val) return [];
    return val.split(',').map(s=>s.trim()).filter(Boolean);
  }
  function sync(){
    selected = parse();
    renderSwatches();
    renderPreview();
  }
  function save(){
    input.value = selected.join(', ');
  }
  function addColor(c){
    const hex = normalize(c);
    if(!hex) return;
    if(!selected.includes(hex)){ selected.push(hex); }
    save(); sync();
  }
  function removeColor(c){
    selected = selected.filter(x=>x!==c);
    save(); sync();
  }
  function normalize(c){
    if(!c) return '';
    let v=c.trim();
    if(/^#[0-9a-f]{3}$/i.test(v)) v='#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
    if(/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    return '';
  }

  function renderSwatches(){
    const sw = document.getElementById('colorSwatches');
    if(!sw) return;
    sw.innerHTML='';
    presets.forEach(c=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='color-chip'+(selected.includes(c)?' active':'');
      b.style.background=c;
      b.title=c;
      b.addEventListener('click',()=>{ if(selected.includes(c)) removeColor(c); else addColor(c); });
      sw.appendChild(b);
    });
  }
  function renderPreview(){
    if(!preview) return;
    preview.innerHTML='';
    selected.forEach(c=>{
      const d=document.createElement('span');
      d.className='color-pill';
      d.style.background=c;
      d.title=c;
      const x=document.createElement('button');
      x.type='button'; x.textContent='×'; x.title='Remove';
      x.addEventListener('click',()=>removeColor(c));
      d.appendChild(x);
      preview.appendChild(d);
    });
  }

  const cust=document.getElementById('customColor');
  const addCust=document.getElementById('addCustom');
  if(addCust&&cust){ addCust.addEventListener('click',()=>{ addColor(cust.value); cust.value='#000000'; }); }

  input.addEventListener('input', sync);
  const form=document.getElementById('uploadForm');
  if(form) form.addEventListener('reset', ()=>setTimeout(sync,0));
  sync();
})();