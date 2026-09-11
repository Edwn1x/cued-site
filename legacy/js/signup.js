// === Legacy chat sign-up overlay (shared) ===
// The conversational sign-up that actually creates the user: it walks through
// a short profile chat, collects SMS consent, and POSTs the profile as JSON to
// the Railway /signup route, which activates coaching for that phone number.
// Restyled to the current design system (see css/signup.css): an iMessage
// thread seen from the reader's phone — their sends blue on the right, Cued's
// replies gray on the left, tails on the last bubble of each run.
//
// Usage: include css/signup.css + this script on the page. The markup is
// injected at the end of <body>. Any of these open it:
//   - any element with [data-signup]
//   - a[href="#signup"]                  (the landing page's original CTAs)
//   - #signup .cta-primary               (the landing page's signup section)
//   - window.openChatSignup()            (for CTAs created after load)
(function(){
  const BACKEND='https://web-production-90171c.up.railway.app/signup';
  const FONTS_HREF='https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Inter:wght@400;500&display=swap';

  const MARKUP=`
<div class="co-bg" id="coOverlay" role="dialog" aria-modal="true" aria-label="Sign up for Cued">
  <div class="co-sheet" id="coSheet">
    <div class="co-handle"></div>
    <div class="co-head">
      <div class="co-head-info">
        <div class="co-avatar" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#007AFF"/><circle cx="63" cy="61" r="8.6" fill="#FFFFFF"/></svg></div>
        <div>
          <div class="co-head-name">Cued</div>
          <div class="co-head-sub">Text Message</div>
        </div>
      </div>
      <button type="button" class="co-close" id="coClose" aria-label="Close">✕</button>
    </div>
    <div class="co-msgs" id="coMsgs"></div>
    <div class="co-input-area" id="coInputArea"></div>
  </div>
</div>`;

  function init(){
    if(!document.getElementById('coOverlay')){
      document.body.insertAdjacentHTML('beforeend',MARKUP);
    }
    const overlay=document.getElementById('coOverlay');
    const msgs=document.getElementById('coMsgs');
    const inputArea=document.getElementById('coInputArea');
    if(!overlay||!msgs||!inputArea)return;

    let sdata={};
    let consentChecked=false;
    let fontsLoaded=false;

    // The overlay uses the live site's fonts (Inter + Hedvig Letters Serif);
    // the legacy sub-pages don't load them, so pull them in on first open.
    function ensureFonts(){
      if(fontsLoaded)return;
      fontsLoaded=true;
      if(document.querySelector('link[href*="Hedvig+Letters+Serif"]'))return;
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=FONTS_HREF;
      document.head.appendChild(link);
    }

    function scrollBottom(){
      requestAnimationFrame(()=>{ msgs.scrollTop=msgs.scrollHeight; });
    }

    function addMsg(text,who,delay=0){
      return new Promise(resolve=>{
        setTimeout(()=>{
          const m=document.createElement('div');
          m.className='co-msg '+who+' t';
          if(who==='user') m.textContent=text; else m.innerHTML=text;
          // Tail only on the last bubble of a run; a gap when the sender changes.
          const prev=msgs.lastElementChild;
          if(prev&&prev.classList.contains('co-msg')){
            if(prev.classList.contains(who)) prev.classList.remove('t');
            else m.classList.add('turn');
          }
          msgs.appendChild(m);
          requestAnimationFrame(()=>{
            m.classList.add('show');
            m.scrollIntoView({block:'nearest',behavior:'smooth'});
          });
          resolve();
        },delay);
      });
    }

    function showTyping(){
      const t=document.createElement('div');
      t.className='co-typing';
      t.innerHTML='<div class="co-dot"></div><div class="co-dot"></div><div class="co-dot"></div>';
      msgs.appendChild(t);
      scrollBottom();
      return t;
    }

    function coachSay(text,typingMs=700){
      return new Promise(resolve=>{
        const t=showTyping();
        setTimeout(()=>{
          msgs.removeChild(t);
          addMsg(text,'coach').then(resolve);
        },typingMs);
      });
    }

    function clearInput(){inputArea.innerHTML='';}

    function textInput(placeholder,type='text'){
      return new Promise(resolve=>{
        clearInput();
        const row=document.createElement('div');
        row.className='co-input-row';
        const inp=document.createElement('input');
        inp.className='co-input';
        inp.placeholder=placeholder;
        inp.type=type;
        inp.setAttribute('inputmode',type==='tel'?'tel':type==='number'?'numeric':'text');
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='co-send';
        btn.setAttribute('aria-label','Send');
        btn.innerHTML='<svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
        function submit(){
          const val=inp.value.trim();
          if(!val)return;
          addMsg(val,'user');
          clearInput();
          resolve(val);
        }
        btn.addEventListener('click',submit);
        inp.addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
        row.appendChild(inp);
        row.appendChild(btn);
        inputArea.appendChild(row);
        scrollBottom();
        inp.focus();
      });
    }

    function chips(options,multi=false){
      return new Promise(resolve=>{
        clearInput();
        const wrap=document.createElement('div');
        wrap.className='co-chips';
        const selected=new Set();
        options.forEach(opt=>{
          const c=document.createElement('button');
          c.type='button';
          c.className='co-chip'+(multi?' multi':'');
          c.textContent=opt.label;
          c.addEventListener('click',()=>{
            if(!multi){
              addMsg(opt.label,'user');
              clearInput();
              resolve([opt.value]);
            } else {
              c.classList.toggle('sel');
              selected.has(opt.value)?selected.delete(opt.value):selected.add(opt.value);
            }
          });
          wrap.appendChild(c);
        });
        inputArea.appendChild(wrap);
        if(multi){
          const btn=document.createElement('button');
          btn.type='button';
          btn.className='co-confirm';
          btn.textContent='Confirm →';
          btn.addEventListener('click',()=>{
            if(!selected.size)return;
            const labels=options.filter(o=>selected.has(o.value)).map(o=>o.label).join(', ');
            addMsg(labels,'user');
            clearInput();
            resolve([...selected]);
          });
          inputArea.appendChild(btn);
        }
        scrollBottom();
      });
    }

    function consentStep(){
      return new Promise(resolve=>{
        clearInput();
        const wrap=document.createElement('div');
        wrap.className='co-consent-wrap';
        const lbl=document.createElement('label');
        lbl.className='co-consent-label';
        const box=document.createElement('div');
        box.className='co-consent-box';
        const txt=document.createElement('span');
        txt.className='co-consent-text';
        txt.innerHTML='I agree to receive recurring automated SMS messages from Cued including workout plans, meal suggestions, and coaching check-ins. Message frequency: 5–8 msgs/day. Msg &amp; data rates may apply. Reply STOP to cancel. Reply HELP for help. <a href="terms.html" target="_blank">Terms</a> &amp; <a href="privacy.html" target="_blank">Privacy</a>.';
        lbl.appendChild(box);
        lbl.appendChild(txt);
        lbl.addEventListener('click',(e)=>{
          if(e.target.closest('a'))return; // let Terms/Privacy links open without toggling
          consentChecked=!consentChecked;
          box.classList.toggle('checked',consentChecked);
          box.innerHTML=consentChecked?'<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>':'';
        });
        wrap.appendChild(lbl);
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='co-confirm';
        btn.style.marginTop='10px';
        btn.textContent='Start coaching me →';
        btn.addEventListener('click',()=>{
          if(!consentChecked){
            box.classList.add('shake');
            setTimeout(()=>box.classList.remove('shake'),1200);
            return;
          }
          clearInput();
          resolve(true);
        });
        inputArea.appendChild(wrap);
        inputArea.appendChild(btn);
        scrollBottom();
      });
    }

    async function runChat(){
      msgs.innerHTML='';
      clearInput();
      sdata={};
      consentChecked=false;

      await coachSay("Hey! I'm your Cued coach. Let's get you set up — takes about 60 seconds. What's your first name?",900);
      sdata.name=await textInput('Your first name');
      await coachSay(`Nice to meet you, ${sdata.name}! How old are you?`,600);
      sdata.age=await textInput('Your age','number');
      await coachSay("What's your gender?",600);
      const [gender]=await chips([{label:'Male',value:'male'},{label:'Female',value:'female'},{label:'Non-binary',value:'non_binary'},{label:'Prefer not to say',value:'prefer_not_to_say'}]);
      sdata.gender=gender;
      await coachSay("What are you training for? Pick everything that applies.",700);
      const goals=await chips([{label:'Lose fat',value:'fat_loss'},{label:'Build muscle',value:'muscle_building'},{label:'Get stronger',value:'strength'},{label:'General fitness',value:'general_fitness'},{label:'Running / Endurance',value:'endurance'}],true);
      sdata.goal=goals.join(',');
      await coachSay("What's been your biggest obstacle so far?",600);
      const [obstacle]=await chips([{label:'Staying consistent',value:'consistency'},{label:'Nutrition / what to eat',value:'nutrition'},{label:'Not knowing what to do',value:'knowledge'},{label:'Not enough time',value:'time'},{label:'Motivation / accountability',value:'motivation'},{label:'Injuries',value:'injuries'}]);
      sdata.biggest_obstacle=obstacle;
      await coachSay("How long have you been training seriously?",600);
      const [exp]=await chips([{label:'Just starting out',value:'none'},{label:'Under 6 months',value:'beginner'},{label:'6 months – 2 years',value:'intermediate'},{label:'2+ years',value:'advanced'}]);
      sdata.experience=exp;
      await coachSay("What equipment do you have access to?",600);
      const [equip]=await chips([{label:'Full gym',value:'full_gym'},{label:'Limited gym',value:'limited_gym'},{label:'Home gym',value:'home_gym'},{label:'Bodyweight only',value:'bodyweight'}]);
      sdata.equipment=equip;
      await coachSay("Last thing — what's your phone number? That's where I'll text you.",700);
      sdata.phone=await textInput('(510) 555-1234','tel');
      await coachSay("Almost there! One quick consent before I can text you:",600);
      await consentStep();
      sdata.sms_consent=true;

      clearInput();
      await coachSay(`Perfect, ${sdata.name}! Setting up your profile...`,500);
      sdata.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        const res=await fetch(BACKEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sdata)});
        const data=await res.json();
        if(data.status==='ok'||data.status==='exists'){
          msgs.innerHTML='';
          const s=document.createElement('div');
          s.className='co-success';
          s.innerHTML=`<div class="co-success-icon">🎉</div><h3>You're in, ${sdata.name}!</h3><p>Your first coaching text is on its way. Keep an eye on your messages — your coach is getting your plan ready.</p>`;
          msgs.appendChild(s);
          inputArea.innerHTML='';
        } else {
          await coachSay((data&&data.message)||"Hmm, something went wrong. Try again?",400);
          showRetry();
        }
      } catch {
        await coachSay("Connection error — check your internet and try again.",400);
        showRetry();
      }
    }

    function showRetry(){
      clearInput();
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='co-confirm';
      btn.textContent='Try again';
      btn.addEventListener('click',runChat);
      inputArea.appendChild(btn);
    }

    let lastFocus=null;
    function open(){
      ensureFonts();
      lastFocus=document.activeElement;
      overlay.classList.add('open');
      document.body.style.overflow='hidden';
      if(!msgs.children.length) runChat();
    }
    function close(){
      overlay.classList.remove('open');
      document.body.style.overflow='';
      if(lastFocus&&lastFocus.focus) lastFocus.focus();
    }
    // Exposed so dynamically-created CTAs (e.g. the landing page's live-demo
    // nudge button, which doesn't exist at load time) can open the same overlay.
    window.openChatSignup=open;

    function bind(el){ el.addEventListener('click',(e)=>{ e.preventDefault(); open(); }); }
    document.querySelectorAll('[data-signup], a[href="#signup"], #signup .cta-primary').forEach(bind);

    document.getElementById('coClose').addEventListener('click',close);
    overlay.addEventListener('click',e=>{ if(e.target===overlay) close(); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&overlay.classList.contains('open')) close(); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
