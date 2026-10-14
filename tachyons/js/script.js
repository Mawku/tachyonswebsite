'use strict';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.site-header');
const menu = document.getElementById('navigation');
const menuToggle = document.getElementById('menu-toggle');
const searchDialog = document.getElementById('search-dialog');
const searchToggle = document.getElementById('search-toggle');
const searchInput = document.getElementById('site-search');
function setMenu(open) {
  if (open) { menu.showModal(); document.body.classList.add('locked'); header.classList.add('menu-open'); }
  else { menu.close(); document.body.classList.remove('locked'); header.classList.remove('menu-open'); }
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
// A modal's top layer includes only its descendants; move the header into it while open.
const headerHome = document.createComment('header position');
header.before(headerHome);
function openMenu() { menu.prepend(header); setMenu(true); menuToggle.focus(); }
function closeMenu() { setMenu(false); headerHome.after(header); menuToggle.focus(); }
menuToggle.addEventListener('click', () => menu.open ? closeMenu() : openMenu());
menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu()));
function updateHeader(){header.classList.toggle('is-fixed',scrollY>80);}
addEventListener('scroll',updateHeader,{passive:true});updateHeader();
document.getElementById('dismiss-announcement').addEventListener('click',()=>{document.getElementById('announcement').hidden=true;document.documentElement.style.setProperty('--announcement','0px');});
const pages=[
 {title:'Privacy Policy',description:'How Tachyons collects, uses and protects your personal information.',url:'privacy-policy.html',keywords:'privacy policy policies data cookies rights personal information'},
 {title:'Our Story',description:'The origin of Tachyons. From a name in physics to a robotics squad.',url:'story.html',keywords:'origin physics tachyon faster light history'},
 {title:'Robotics & RoboCup',description:'Where it started: the squad and the World Cup in Incheon.',url:'story.html#robotics',keywords:'robots robot engineering competition korea'},
 {title:'Meet the Squad',description:'Angelo Caruso, Daniele del Popolo, Claude, and the people behind Tachyons.',url:'members.html',keywords:'team people founder ceo angelo daniele del popolo developer claude'},
 {title:'Ideas & Innovation',description:'No promises. No surprises. Just ideas.',url:'index.html#about',keywords:'ai technology ideas about'},
 {title:'Get in Touch',description:'Send a message or find us on Discord.',url:'index.html#contact',keywords:'contact email discord message'}
];
function renderSearch(){
 const term=searchInput.value.trim().toLowerCase();const results=pages.filter(p=>`${p.title} ${p.description} ${p.keywords}`.toLowerCase().includes(term));const target=document.getElementById('search-results');target.replaceChildren();
 if(!results.length){const p=document.createElement('p');p.textContent='No results. Try “robotics”, “squad” or “contact”.';target.append(p);return;}
 results.forEach(p=>{const a=document.createElement('a');a.className='search-result';a.href=p.url;const title=document.createElement('strong');title.textContent=p.title+' ↗';const desc=document.createElement('span');desc.textContent=p.description;a.append(title,desc);a.addEventListener('click',closeSearch);target.append(a);});
}
function closeSearch(){searchDialog.close();document.body.classList.remove('locked');searchToggle.focus();}
searchToggle.addEventListener('click',()=>{if(menu.open)closeMenu();searchDialog.showModal();document.body.classList.add('locked');renderSearch();searchInput.focus();});
searchDialog.querySelector('.dialog-close').addEventListener('click',closeSearch);
searchDialog.addEventListener('cancel',e=>{e.preventDefault();closeSearch();});searchInput.addEventListener('input',renderSearch);
const features=[
 {title:'A squad. A world stage.\nA new beginning.',kicker:'Robotics / RoboCup',detail:'From Incheon to the next chapter.',image:'media/hero-poster.png',alt:'A close-up of precision engineering',url:'story.html#robotics',position:'center'},
 {title:'Faster than light.\nJust getting started.',kicker:'Our origin / 2026',detail:'The idea behind the name.',image:'media/origin.svg',alt:'Abstract trajectories inspired by particles in motion',url:'story.html',position:'center'},
 {title:'Independent minds.\nShared ambition.',kicker:'People / The squad',detail:'Meet the people behind Tachyons.',image:'media/squad.svg',alt:'An abstract composition of connected circles',url:'members.html',position:'center'},
 {title:'No promises.\nJust possibilities.',kicker:'The next chapter',detail:'There is still space for the next inventor.',image:'media/hero-poster.png',alt:'Technology and precision engineering',url:'index.html#contact',position:'80% center'}
];
let featureIndex=0;
function showFeature(index,focus=false){featureIndex=(index+features.length)%features.length;const f=features[featureIndex];const panel=document.getElementById('feature-panel');panel.href=f.url;panel.setAttribute('aria-labelledby',`feature-tab-${featureIndex}`);const image=document.getElementById('feature-image');image.src=f.image;image.alt=f.alt;image.style.objectPosition=f.position;document.getElementById('feature-title').innerText=f.title;document.getElementById('feature-kicker').textContent=f.kicker;document.getElementById('feature-detail').textContent=f.detail;document.getElementById('feature-count').textContent=`0${featureIndex+1} / 04`;document.querySelectorAll('[data-feature]').forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===featureIndex));tab.tabIndex=i===featureIndex?0:-1;if(focus&&i===featureIndex)tab.focus();});}
document.querySelectorAll('[data-feature]').forEach(tab=>{tab.addEventListener('click',()=>showFeature(Number(tab.dataset.feature)));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=featureIndex+1;else if(e.key==='ArrowLeft')next=featureIndex-1;else if(e.key==='Home')next=0;else if(e.key==='End')next=features.length-1;else return;e.preventDefault();showFeature(next,true);});});
document.getElementById('feature-prev')?.addEventListener('click',()=>showFeature(featureIndex-1));document.getElementById('feature-next')?.addEventListener('click',()=>showFeature(featureIndex+1));
const video=document.getElementById('hero-video');const motionToggle=document.getElementById('motion-toggle');let videoPausedByUser=false;
function syncVideoButton(){if(!video)return;motionToggle.textContent=video.paused?'▶':'Ⅱ';motionToggle.setAttribute('aria-label',video.paused?'Play background video':'Pause background video');}
if(video){const start=()=>{if(!reducedMotion.matches&&!videoPausedByUser)video.play().catch(syncVideoButton);else video.pause();};video.addEventListener('play',syncVideoButton);video.addEventListener('pause',syncVideoButton);motionToggle.addEventListener('click',()=>{if(video.paused){videoPausedByUser=false;video.play().catch(syncVideoButton);}else{videoPausedByUser=true;video.pause();}});reducedMotion.addEventListener('change',start);document.addEventListener('visibilitychange',()=>document.hidden?video.pause():start());start();}
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.25});document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));}
document.querySelectorAll('.discord-copy').forEach(button=>button.addEventListener('click',async()=>{const status=button.parentElement.querySelector('.copy-status');try{await navigator.clipboard.writeText('spaghettiallassassina');status.textContent='Discord username copied: spaghettiallassassina';}catch{status.textContent='Discord: spaghettiallassassina';}}));
document.getElementById('year').textContent=new Date().getFullYear();
const form=document.getElementById('contact-form');
form?.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;const button=document.getElementById('form-submit-btn');const status=document.getElementById('form-status');const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);button.disabled=true;button.textContent='Sending…';status.className='form-status';status.textContent='Sending your message…';try{const response=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw new Error('send');status.textContent='Message sent. Thank you — I’ll get back to you soon.';form.reset();}catch{status.classList.add('error');status.textContent='Your message could not be sent. Please try again, or use Discord.';}finally{clearTimeout(timeout);button.disabled=false;button.replaceChildren(document.createTextNode('Send Message '));const arrow=document.createElement('span');arrow.textContent='↗';button.append(arrow);}});
