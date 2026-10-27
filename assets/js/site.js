'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let catalog;
let currentPrompt = 17;
let showAllModels = false;
let galleryPaused = reducedMotion;
let toastTimer;

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

// Recordings run only when visible. The long film and playground take priority.
const managedVideos = new Set();
const visibleVideos = new Set();
function canPlay(video) {
  return visibleVideos.has(video) && video.dataset.wantsPlay === 'true' &&
    !document.hidden && !document.body.classList.contains('modal-open') && $('#explainer').paused;
}
function updateVideo(video) {
  if (canPlay(video)) {
    if (video.dataset.src && !video.getAttribute('src')) {
      video.src = video.dataset.src;
      video.load();
    }
    video.play().catch(() => { /* User controls remain available if autoplay is blocked. */ });
  } else video.pause();
}
const videoObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) visibleVideos.add(entry.target);
    else visibleVideos.delete(entry.target);
    updateVideo(entry.target);
  }
}, { threshold: .12 });
function manage(video, wantsPlay = !reducedMotion) {
  video.muted = true;
  video.dataset.wantsPlay = String(wantsPlay);
  managedVideos.add(video);
  videoObserver.observe(video);
}
function updateAllVideos() { managedVideos.forEach(updateVideo); }
document.addEventListener('visibilitychange', updateAllVideos);
$('#explainer').addEventListener('play', updateAllVideos);
$('#explainer').addEventListener('pause', updateAllVideos);
$('#explainer').addEventListener('ended', updateAllVideos);

// Responsive navigation and section highlighting.
const menuButton = $('.menu-button');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  $('#site-nav').classList.toggle('open', open);
});
$$('#site-nav a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false'); $('#site-nav').classList.remove('open');
}));
const navObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    $$('#site-nav a').forEach(a => {
      const active = a.hash === `#${entry.target.id}`;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
}, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
$$('#video, #overview, #method, #results, #analysis, #demo').forEach(s => navObserver.observe(s));

// Complete Table 1, in manuscript column order. Keep the published delta values.
// Model, date, size; start failure, accuracy, content, interaction, data management,
// functional testing, data display, design validation; aesthetics, functionality,
// total; average rank. Lower is better only for start failure and average rank.
const resultRows = [
  ['GPT-OSS-120B','25/08','116B/5B',1.4,37.6,49.7,31.3,36.6,26.0,43.0,61.5,40.3,54.4,47.4,19.5],
  ['Qwen3.5-122B-A10B','26/02','122B/10B',2.6,49.8,57.5,46.0,49.1,37.0,55.9,76.2,66.0,60.5,63.2,16.0],
  ['Qwen3.5-397B-A17B','26/02','397B/17B',0.5,48.7,59.2,43.5,47.5,33.6,57.0,77.9,69.9,65.0,67.5,14.1],
  ['Qwen3.6-35B-A3B','26/04','35B/3B',0.0,48.8,59.2,43.0,47.1,33.9,61.8,70.5,81.5,56.1,68.8,14.0],
  ['Qwen3.6-Plus','26/04','N/A',0.0,53.6,61.5,50.0,52.2,41.4,65.9,68.9,84.8,63.6,74.2,8.5],
  ['Qwen3.6-Max','26/04','N/A',0.0,55.4,64.7,51.1,53.8,45.3,64.0,70.5,87.8,64.4,76.1,5.9],
  ['Qwen3.7-Flash','26/07','N/A',1.1,48.5,54.6,45.2,48.1,33.6,65.1,64.3,84.0,54.2,69.1,15.5],
  ['GLM-5.1','26/04','754B/40B',0.0,54.0,63.2,47.4,56.9,39.4,64.5,78.7,87.8,61.2,74.5,6.9],
  ['GLM-5.2','26/06','754B/40B',0.0,57.5,62.1,52.4,62.5,45.1,68.6,73.4,87.2,65.3,76.3,4.3],
  ['Minimax-M2.7','26/03','229B/10B',0.9,53.4,62.4,49.0,52.2,38.8,66.4,74.2,81.4,60.3,70.8,10.3],
  ['DeepSeek-V3.2','25/12','671B/37B',0.0,49.7,56.0,45.2,51.6,35.1,60.2,74.2,69.0,56.5,62.8,13.9],
  ['DeepSeek-V4-Flash','26/07','284B/13B',2.6,51.3,58.0,45.4,55.6,37.9,58.3,77.9,72.2,57.9,65.1,13.3],
  ['Kimi-K2.6','26/04','1T/32B',0.9,54.9,68.4,49.8,50.3,42.2,66.7,72.5,83.5,58.7,68.6,9.3],
  ['Gemini-3.1-Pro','26/02','Undisclosed',0.0,53.2,60.9,50.2,50.6,39.1,65.6,73.4,62.9,60.9,61.9,11.1],
  ['GPT-5.2','25/12','Undisclosed',2.9,50.5,65.2,47.8,39.7,36.4,62.9,70.5,85.0,63.7,74.3,12.3],
  ['GPT-5.3-codex','26/02','Undisclosed',0.0,54.4,65.8,52.4,45.9,40.9,65.9,74.6,79.4,69.6,74.5,7.2],
  ['GPT-5.4-mini','26/03','Undisclosed',0.0,52.6,62.6,47.6,51.2,37.6,61.6,80.3,80.8,64.1,72.4,9.4],
  ['Claude-Opus-4.7','26/04','Undisclosed',0.0,57.0,68.4,48.1,62.2,41.6,72.8,75.8,80.7,69.5,75.1,4.7],
  ['GPT-5.5','26/04','Undisclosed',0.0,59.3,66.1,54.6,60.9,45.7,70.2,80.3,86.4,66.9,76.7,2.1],
  ['WebCatalyst','26/04','35B/3B',0.0,56.9,68.1,52.9,54.2,42.2,68.8,77.9,87.5,63.2,75.3,4.0],
];
const reportedDelta = ['Δ from Base','–','–','0.0','+8.1','+8.9','+9.9','+7.1','+8.3','+7.0','+7.4','+5.9','+7.0','+6.5','−10.0'];
const modelGroups = [
  { label: 'Other LLMs', rows: resultRows.slice(0,13), comparison: [...resultRows.slice(0,13),resultRows[19]] },
  { label: 'Proprietary LLMs', rows: resultRows.slice(13,19), comparison: resultRows.slice(13,19) },
  { label: 'Ours', rows: resultRows.slice(19), comparison: [...resultRows.slice(0,13),resultRows[19]] },
];
function renderResults() {
  const tbody=$('#results-body'); tbody.replaceChildren();
  modelGroups.forEach(group=>{
    const heading=document.createElement('tr'); heading.className='model-group';
    const label=document.createElement('th'); label.colSpan=15; label.scope='rowgroup'; label.textContent=group.label;
    heading.append(label); tbody.append(heading);
    group.rows.forEach(row=>{
      const tr=document.createElement('tr');
      tr.className=row[0]==='WebCatalyst'?'ours':row[0]==='Qwen3.6-35B-A3B'?'base':'';
      row.forEach((value,index)=>{
        const cell=document.createElement(index?'td':'th');
        if(!index){
          cell.scope='row'; cell.textContent=value;
          if(tr.className){
            const badge=document.createElement('span'); badge.className='table-badge'; badge.textContent=tr.className==='ours'?'Ours':'Base'; cell.append(badge);
          }
        } else if(index<3){
          cell.textContent=value; cell.className='model-metadata';
        } else {
          if([3,11,14].includes(index))cell.classList.add('group-start');
          const values=group.comparison.map(r=>r[index]);
          const best=[3,14].includes(index)?Math.min(...values):Math.max(...values);
          const number=document.createElement(value===best?'strong':'span');
          number.textContent=value.toFixed(1); cell.append(number);
        }
        tr.append(cell);
      });
      tbody.append(tr);
    });
  });
  const delta=document.createElement('tr');delta.className='delta-row';
  reportedDelta.forEach((value,index)=>{
    const cell=document.createElement(index?'td':'th');
    if(!index)cell.scope='row';
    if([3,11,14].includes(index))cell.classList.add('group-start');
    cell.textContent=value;delta.append(cell);
  });
  tbody.append(delta);
}
renderResults();

// Accessible analysis tabs, including arrow-key navigation.
const tabs=$$('[data-analysis]');
function selectAnalysis(tab) {
  tabs.forEach(t => {
    const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;
    $(`#panel-${t.dataset.analysis}`).hidden=!selected;
  });
}
tabs.forEach((tab,i) => {
  tab.addEventListener('click',()=>selectAnalysis(tab));
  tab.addEventListener('keydown',e=>{
    let next;
    if(e.key==='ArrowRight')next=(i+1)%tabs.length;
    if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
    if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;
    if(next!==undefined){e.preventDefault();selectAnalysis(tabs[next]);tabs[next].focus();}
  });
});

// Comparison gallery: the supplied recordings are played at their original speed.
function getPrompt(id) { return catalog.prompts.find(p=>p.id===Number(id)); }
function clearGallery() {
  $$('#demo-grid video').forEach(v=>{v.pause();videoObserver.unobserve(v);managedVideos.delete(v);visibleVideos.delete(v);v.removeAttribute('src');v.load();});
  $('#demo-grid').replaceChildren();
}
function updateGalleryButton() {
  $('#demo-play-toggle').textContent=galleryPaused?'Play all  ▷':'Pause all  Ⅱ';
  $('#demo-play-toggle').setAttribute('aria-label',`${galleryPaused?'Play':'Pause'} recorded comparisons`);
}
function renderGallery() {
  const prompt=getPrompt(currentPrompt);clearGallery();
  const allAvailable=Object.keys(prompt.recordings).length===6;
  if(!allAvailable)showAllModels=false;
  $('#compare-toggle').hidden=!allAvailable;
  $('#compare-toggle').textContent=showAllModels?'Show the main comparison':'Compare all 6 models';
  $('#compare-toggle').setAttribute('aria-pressed',String(showAllModels));
  $('#demo-category').textContent=`${prompt.category} / Prompt ${prompt.id}`;
  $('#demo-title').textContent=prompt.title;
  $('#current-prompt').textContent=prompt.prompt;
  $('#demo-grid').classList.toggle('all-models',showAllModels);
  $$('.example-choice').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.prompt)===currentPrompt)));
  const ids=showAllModels?['qwen','webcatalyst','claude','codex','gpt-mini','gemini']:['qwen','webcatalyst'];
  ids.forEach(id=>{
    const model=catalog.models.find(m=>m.id===id);
    const article=document.createElement('article');article.className=`demo-recording ${id==='webcatalyst'?'ours':''}`;
    const label=document.createElement('div');label.className='recording-label';
    const name=document.createElement('span');const dot=document.createElement('i');dot.className='model-indicator';
    name.append(dot,document.createTextNode(model.label));
    const play=document.createElement('button');play.textContent='Try it ↗';play.setAttribute('aria-label',`Play ${prompt.title} by ${model.label}`);
    play.addEventListener('click',()=>openPlayground(currentPrompt,id==='webcatalyst'?'qwen':id,'webcatalyst'));
    label.append(name,play);article.append(label);
    const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
    video.poster=prompt.posters[id];video.dataset.src=prompt.recordings[id];video.setAttribute('aria-label',`${prompt.title}, recorded gameplay by ${model.label}`);
    article.append(video);$('#demo-grid').append(article);manage(video,!galleryPaused);
  });
  updateGalleryButton();
}
$('#compare-toggle').addEventListener('click',()=>{if(!catalog)return;showAllModels=!showAllModels;renderGallery();});
$('#demo-play-toggle').addEventListener('click',()=>{
  galleryPaused=!galleryPaused;$$('#demo-grid video').forEach(v=>{v.dataset.wantsPlay=String(!galleryPaused);updateVideo(v);});updateGalleryButton();
});
$('#launch-live').addEventListener('click',()=>catalog?openPlayground(currentPrompt):notify('The demo catalog is still loading.'));
$('#browse-all').addEventListener('click',()=>catalog?openPlayground(currentPrompt):notify('The demo catalog is still loading.'));

// Keep desktop canvas dimensions inside a responsive, accurately scaled viewport.
const frameResizeObserver=new ResizeObserver(entries=>entries.forEach(entry=>{
  const frame=$('iframe',entry.target);if(frame)frame.style.transform=`scale(${entry.contentRect.width/1280})`;
}));
function clearPlayground() {
  $$('.live-viewport').forEach(view=>frameResizeObserver.unobserve(view));
  $$('#playground iframe').forEach(frame=>{frame.src='about:blank';});
  $('#playground-frames').replaceChildren();
}
function renderPlayground() {
  if(!catalog)return;
  const prompt=getPrompt($('#playground-prompt').value);clearPlayground();
  $('#playground-original').textContent=prompt.prompt;
  [$('#left-model').value,$('#right-model').value].forEach(id=>{
    const model=catalog.models.find(m=>m.id===id);const url=prompt.outputs[id];
    const card=document.createElement('article');card.className='live-artifact';
    const heading=document.createElement('div');heading.className='live-heading';
    const name=document.createElement('span');name.textContent=model.label;
    const full=document.createElement('a');full.textContent='Open in a new tab ↗';full.href=url;full.target='_blank';full.rel='noopener noreferrer';
    heading.append(name,full);card.append(heading);
    const view=document.createElement('div');view.className='live-viewport';
    const frame=document.createElement('iframe');frame.title=`${prompt.title} — ${model.label}`;
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock');
    frame.setAttribute('allow','fullscreen; gamepad');frame.allowFullscreen=true;frame.referrerPolicy='no-referrer';frame.src=url;
    view.append(frame);card.append(view);$('#playground-frames').append(card);frameResizeObserver.observe(view);
  });
}
function showDialog(dialog) {
  dialog.showModal();document.body.classList.add('modal-open');$('#explainer').pause();updateAllVideos();
}
function openPlayground(id,left='qwen',right='webcatalyst') {
  $('#playground-prompt').value=String(id);$('#left-model').value=left;$('#right-model').value=right;
  showDialog($('#playground'));renderPlayground();
}
['playground-prompt','left-model','right-model'].forEach(id=>$(`#${id}`).addEventListener('change',renderPlayground));
$('#reload-games').addEventListener('click',renderPlayground);
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>$(`#${button.dataset.close}`).close()));
$$('dialog').forEach(dialog=>{
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{
    if(dialog.id==='playground')clearPlayground();
    if(!$('dialog[open]'))document.body.classList.remove('modal-open');updateAllVideos();
  });
});
$$('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
  $('#enlarged-figure').src=button.dataset.zoom;
  $('#enlarged-figure').alt=$('img',button)?.alt||'Enlarged research figure';
  showDialog($('#image-dialog'));
}));

async function loadDemos() {
  const response=await fetch('assets/data/demos.json');if(!response.ok)throw new Error('Demo catalog unavailable');
  catalog=await response.json();
  catalog.featured.forEach(id=>{
    const prompt=getPrompt(id);const button=document.createElement('button');button.className='example-choice';
    button.dataset.prompt=String(id);button.setAttribute('aria-pressed',String(id===currentPrompt));
    const img=document.createElement('img');img.src=prompt.posters.webcatalyst;img.alt='';img.loading='lazy';img.width=240;img.height=135;
    const label=document.createElement('span');label.append(document.createTextNode(prompt.title));
    const number=document.createElement('b');number.textContent=String(id).padStart(2,'0');label.append(number);button.append(img,label);
    button.addEventListener('click',()=>{currentPrompt=id;renderGallery();});$('#featured-picker').append(button);
  });
  // Curated examples lead the picker; every supplied prompt remains available.
  const order=[...catalog.featured,...catalog.prompts.map(p=>p.id).filter(id=>!catalog.featured.includes(id))];
  order.forEach(id=>{const p=getPrompt(id);$('#playground-prompt').add(new Option(`${String(id).padStart(2,'0')} · ${p.title}`,String(id)));});
  for(const model of catalog.models){$('#left-model').add(new Option(model.label,model.id));$('#right-model').add(new Option(model.label,model.id));}
  renderGallery();
}
loadDemos().catch(error=>{
  console.error(error);$('#demo-grid').textContent='The gallery could not load. Please refresh the page, or watch the explainer above.';
  $('#demo-grid').className='loading-message';
});

$('#copy-citation').addEventListener('click',async()=>{
  const text=$('#bibtex').textContent;
  try{
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
    else{
      const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();
      const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('Clipboard unavailable');
    }
    $('#copy-citation').textContent='Copied ✓';$('#copy-status').textContent='Citation copied to clipboard.';
    setTimeout(()=>{$('#copy-citation').textContent='Copy ⧉';},2200);
  }catch{
    const selection=getSelection();const range=document.createRange();range.selectNodeContents($('#bibtex'));selection.removeAllRanges();selection.addRange(range);
    notify('Citation selected. Press Ctrl+C or Command+C to copy.');
  }
});
