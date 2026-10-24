/* Scroll depth and interaction system shared by every page. */
document.body.classList.add('cinema-edition');
document.querySelectorAll('.logo').forEach(e=>e.innerHTML='echo<span class="identity-dot">●</span>myshow<span class="brand-dot">®</span>');
const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');document.body.prepend(progress);
if(page==='index'){
 $('.hero-copy').innerHTML='<div class="eyebrow"><span></span> DELHI-NCR / CINEMA & CULTURE</div><h1>MAKE<br>A NIGHT<br><em>OF IT.</em></h1><p class="hero-description">Films worth the big screen.<br>Nights worth being there for.</p><div class="hero-actions"><a class="primary" href="movies.html">Explore movies <span>↗</span></a><a class="hero-ai-link" href="events.html">Find a live experience ↗</a></div><div class="hero-proof"><span>01 — PICK YOUR ESCAPE</span><span>02 — MAKE IT HAPPEN</span></div>';
 $('.hero-label').innerHTML='<span class="feature-number">01—07</span><span class="feature-word">THE BIG SCREEN EDIT</span>';
 $('.hero-bottom').innerHTML='<span class="live-dot">●</span><span>THE CITY IS YOURS. GO FIND YOUR MOMENT.</span><a href="#movie-grid">SCROLL TO DISCOVER ↓</a>';
 $('.hero').insertAdjacentHTML('afterend','<div class="culture-marquee" aria-hidden="true"><div>'+Array(4).fill('<span>GOOD FILMS</span><i>✳</i><span>GREAT COMPANY</span><i>✳</i><span>BIG NIGHTS</span><i>✳</i>').join('')+'</div></div>');
 $('.discovery strong').textContent='What are you heading out for?';$('.discovery p').textContent='A movie, a gig, a story to tell tomorrow.';
 $('.city-editorial h2').innerHTML='Delhi after dark.<br>A different kind of alive.';
 $('.ai-invite h2').textContent='Can’t decide? Tell us your mood.';
 $('.ai-invite p').textContent='Echo AI finds a film or experience that fits your night.';
}
function refine(){
 document.querySelectorAll('.scene-caption').forEach(e=>{if(e.textContent!=='MOVE TO EXPLORE / SELECT A FILM')e.textContent='MOVE TO EXPLORE / SELECT A FILM'});
 document.querySelectorAll('canvas[aria-label="Interactive 3D echoal cinema sculpture"]').forEach(e=>e.setAttribute('aria-label','Interactive 3D cinema poster gallery'));
 document.querySelectorAll('.movie-card,.event-card,.deal-card,.saved-ticket,.editorial-image,.editorial-mini,.stream-banner,.offer-banner,.account-panel,.payment-panel,.order-summary,.event-reserve').forEach(e=>{if(e.dataset.refined)return;e.dataset.refined='1';e.classList.add('depth-surface');if(observer)observer.observe(e)});
 document.querySelectorAll('.event-image,.editorial-image,.film-atmosphere,.hero-copy,.echo-scene,.ticket-art,.intro-echo').forEach(e=>{if(!e.dataset.parallax)e.dataset.parallax=e.matches('.hero-copy')?'.07':e.matches('.echo-scene')?'.05':e.matches('.film-atmosphere')?'.15':'.035'});
 document.querySelectorAll('.page-intro:not(.has-3d)').forEach(e=>{e.classList.add('has-3d');sceneSlot(e,'mini')});
}
const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(isIntersecting){target.classList.add('in-view');observer.unobserve(target)}})},{threshold:.08}):null;
refine();let refining=false;new MutationObserver(()=>{if(refining)return;refining=true;requestAnimationFrame(()=>{refine();refining=false})}).observe(main,{childList:true,subtree:true});
let ticking=false;function renderDepth(){ticking=false;const moving=typeof motionOn==='undefined'||motionOn;const height=innerHeight;const max=document.documentElement.scrollHeight-height;progress.style.transform='scaleX('+(max>0?scrollY/max:0)+')';document.querySelectorAll('[data-parallax]').forEach(e=>{const r=e.getBoundingClientRect();if(r.top>height+100||r.bottom< -100)return;const distance=(height*.45-(r.top+r.height*.5));e.style.setProperty('--scroll-depth',moving?Math.max(-55,Math.min(55,distance*Number(e.dataset.parallax)))+'px':'0px')});$('header').classList.toggle('scrolled',scrollY>30)}
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(renderDepth)}},{passive:true});addEventListener('resize',renderDepth);addEventListener('echo-motion',renderDepth);renderDepth();
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!motionOn)return;const button=e.target.closest('.primary,.dark-button');if(!button)return;const r=button.getBoundingClientRect();button.style.setProperty('--mx',Math.max(-3,Math.min(3,(e.clientX-r.left-r.width/2)*.06))+'px');button.style.setProperty('--my',Math.max(-2,Math.min(2,(e.clientY-r.top-r.height/2)*.06))+'px')});document.addEventListener('pointerout',e=>{const b=e.target.closest('.primary,.dark-button');if(b&&!b.contains(e.relatedTarget)){b.style.setProperty('--mx','0px');b.style.setProperty('--my','0px')}});
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.primary,.dark-button');if(!b)return;const r=b.getBoundingClientRect();const ripple=document.createElement('span');ripple.className='button-ripple';ripple.style.left=e.clientX-r.left+'px';ripple.style.top=e.clientY-r.top+'px';b.append(ripple);setTimeout(()=>ripple.remove(),600)});
// Use verified local artwork on the featured films and their 3D counterparts.
const localArtwork={2:'assets/films/interstellar.jpg',4:'assets/films/dark-knight.jpg',6:'assets/films/oppenheimer.jpg'};
Object.entries(localArtwork).forEach(([id,src])=>{movies[id].image=src});
function localPosters(){document.querySelectorAll('img').forEach(img=>{const id=movies.findIndex(m=>img.alt.includes(m.title));if(localArtwork[id]&&!img.getAttribute('src').startsWith('assets/films/'))img.src=localArtwork[id]})}localPosters();new MutationObserver(localPosters).observe(main,{childList:true,subtree:true});
