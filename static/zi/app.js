"use strict";(()=>{var V="zi-library-v1";var T=class{constructor(){this.listeners=new Set;this.state=this.load()}get snapshot(){return this.state}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}markViewed(t){this.state={...this.state,recentCharacters:[t,...this.state.recentCharacters.filter(n=>n!==t)].slice(0,24),unlockedCharacters:this.state.unlockedCharacters.includes(t)?this.state.unlockedCharacters:[...this.state.unlockedCharacters,t]},this.save()}toggleFavorite(t){let n=this.state.favoriteCharacters.includes(t);this.state={...this.state,favoriteCharacters:n?this.state.favoriteCharacters.filter(a=>a!==t):[...this.state.favoriteCharacters,t]},this.save()}isFavorite(t){return this.state.favoriteCharacters.includes(t)}load(){try{let t=localStorage.getItem(V);if(t){let n=JSON.parse(t);return{recentCharacters:n.recentCharacters??[],unlockedCharacters:n.unlockedCharacters??[],favoriteCharacters:n.favoriteCharacters??[]}}}catch{}return{recentCharacters:[],unlockedCharacters:[],favoriteCharacters:[]}}save(){try{localStorage.setItem(V,JSON.stringify(this.state))}catch{}for(let t of this.listeners)t()}};function z(){let t=decodeURI(window.location.hash.replace(/^#/,"")).split("/").filter(Boolean);switch(t[0]){case void 0:return{screen:"home"};case"book":return{screen:"book"};case"search":return{screen:"search"};case"detail":return t[1]?{screen:"detail",character:t[1]}:{screen:"home"};case"strokes":return t[1]?{screen:"strokes",character:t[1]}:{screen:"home"};default:return{screen:"home"}}}function He(e){switch(e.screen){case"home":return"#/";case"book":return"#/book";case"search":return"#/search";case"detail":return`#/detail/${encodeURI(e.character)}`;case"strokes":return`#/strokes/${encodeURI(e.character)}`}}var W=!1;function h(e){W=!0;let t=He(e);if(window.location.hash===t){window.dispatchEvent(new HashChangeEvent("hashchange"));return}window.location.hash=t}function g(){W&&window.history.length>1?window.history.back():h({screen:"home"})}function Z(e){window.addEventListener("hashchange",()=>e(z()))}async function b(e){let t=await fetch(e);if(!t.ok)throw new Error(`Failed to load ${e}: ${t.status}`);return t.json()}var D=null,J=null,K=null,Y=null,Q=null;function ee(){return D??=b("./data/characters.json"),D}function Pe(){return J??=b("./data/words.json"),J}function Ie(){return K??=b("./data/sentences.json"),K}function Re(){return Y??=b("./data/supplements.json"),Y}function H(){return Q??=b("./data/curriculum.json").then(e=>e.order),Q}var X=new Map;function qe(e){let t=X.get(e);return t||(t=b(`./data/strokes/${encodeURIComponent(e)}.json`).then(n=>ze(n)).catch(()=>[]),X.set(e,t)),t}function ze(e){return e.strokes.map((t,n)=>({strokeIndex:n,path:t,medianPoints:(e.medians?.[n]??[]).filter(a=>a.length===2).map(([a,o])=>({x:a,y:o}))}))}async function S(e){let[t,n,a,o,s]=await Promise.all([ee(),qe(e),Pe(),Ie(),Re()]),i=t[e],r=s[e]??null;return{character:e,pinyin:i?.p||`${e}0`,definition:i?.d??null,radical:r?.r??null,structure:r?.st??null,components:r?.c??null,decomposition:r?.dc??null,learningHint:r?.h??null,strokeCount:i?.sc??n.length,strokes:n,words:a[e]??[],sentences:o[e]??[]}}var te=/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/,Oe=new Set("我要想看找查说读学写小大这个一的吗呢请帮给字".split(""));function ne(e){return te.test(e)}function ae(e){let t=e.trim(),n=[...t].filter(a=>te.test(a));return n.length===0?t:[...n].reverse().find(a=>!Oe.has(a))??n[n.length-1]}async function se(e){let t=e.replace(/[0-9]/g,"").toLowerCase();if(!t)return[];let n=await ee(),a=[];for(let[o,s]of Object.entries(n))if(s.p.replace(/[0-9]/g,"").startsWith(t)&&(a.push({character:o,pinyin:s.p}),a.length>=12))break;return a}var je={a:["ā","á","ǎ","à"],o:["ō","ó","ǒ","ò"],e:["ē","é","ě","è"],i:["ī","í","ǐ","ì"],u:["ū","ú","ǔ","ù"],ü:["ǖ","ǘ","ǚ","ǜ"]};function Be(e){let t=e.match(/[1-5]/),n=e.replace(/[0-9]/g,"");if(!t||t[0]==="5")return n;let a=Number(t[0]),o=n.toLowerCase(),s=o.indexOf("a");if(s<0&&(s=o.indexOf("o")),s<0&&(s=o.indexOf("e")),s<0){let r=o.indexOf("iu"),l=o.indexOf("ui");r>=0?s=r+1:l>=0&&(s=l+1)}if(s<0){for(let r=o.length-1;r>=0;r-=1)if("aeiouvü".includes(o[r])){s=r;break}}if(s<0)return n;let i=je[o[s]]?.[a-1];return i?n.slice(0,s)+i+n.slice(s+1):n}function E(e){return e.split(/(\s+)/).map(t=>/\s/.test(t)?t:Be(t)).join("")}var _e=["刚认识","常说常用","身边看到"];async function re(e=6){let t=await H(),n=[];for(let a=0;a<t.length;a+=e){let o=t.slice(a,a+e),s=n.length;n.push({id:`curriculum-section-${s+1}`,title:_e[s]??`继续探索 ${s+1}`,characters:o})}return n}async function oe(e){return(await H()).slice(0,e)}async function ie(e){let t=await H(),n=new Set(e);return t.find(a=>!n.has(a))??t[0]??null}async function ce(){return new Set(await H())}function d(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function w(){return`
    <header class="top-bar">
      <button class="icon-button" data-action="back" aria-label="返回">‹</button>
      <span class="top-bar-spacer"></span>
    </header>`}function P(e){return`
    <nav class="tab-bar">
      <button class="tab-button ${e==="home"?"tab-button-active":""}" data-nav="home">
        <span class="tab-icon">⌂</span><span class="tab-label">首页</span>
      </button>
      <button class="tab-button ${e==="book"?"tab-button-active":""}" data-nav="book">
        <span class="tab-icon">★</span><span class="tab-label">字本子</span>
      </button>
    </nav>`}function le(e){let t=0;for(let n of e)t=t+(n.codePointAt(0)??0)|0;return Math.abs(t)%9-4}async function de(e,t){let[n,a]=await Promise.all([re(),ce()]),o=new Set(t.snapshot.unlockedCharacters),s=new Set(t.snapshot.favoriteCharacters),i=a.size,r=[...o].filter(u=>a.has(u)).length,l=i>0?Math.round(r/i*100):0,c=n.map(u=>{let m=u.characters.filter(p=>o.has(p)),x=Math.max(u.characters.length-m.length,0),f=[...m.map(p=>`
        <button class="sticker-cell" data-character="${d(p)}"
                style="--tilt: ${le(p)}deg">
          <span class="sticker-char">${d(p)}</span>
          ${s.has(p)?'<span class="sticker-heart">♥</span>':""}
        </button>`),...Array.from({length:x},()=>`
        <div class="sticker-cell sticker-cell-locked"><span class="sticker-question">?</span></div>`)].join("");return`
      <section class="book-section">
        <header class="book-section-header">
          <h2>${d(u.title)}</h2>
          <span>${m.length}/${u.characters.length}</span>
        </header>
        <div class="sticker-grid">${f}</div>
      </section>`}).join("");e.innerHTML=`
    <div class="screen">
      <header class="book-header">
        <h1>我的字本子</h1>
        <span class="book-count">已认 ${r} / ${i} ✨</span>
      </header>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${Math.max(l,4)}%"></div>
      </div>
      <div class="book-sections">${c}</div>
      ${P("book")}
    </div>`;for(let u of e.querySelectorAll(".sticker-cell[data-character]"))u.addEventListener("click",()=>{h({screen:"detail",character:u.dataset.character??""})})}function Ae(){return typeof window<"u"&&"speechSynthesis"in window}function O(e){if(!Ae())return;let t=window.speechSynthesis;t.cancel();let n=new SpeechSynthesisUtterance(e);n.lang="zh-CN",n.rate=.45;let a=t.getVoices().find(o=>o.lang==="zh-CN")??t.getVoices().find(o=>o.lang.startsWith("zh"));a&&(n.voice=a),t.speak(n)}async function ue(e,t,n){e.innerHTML=`
    <div class="screen">
      ${w()}
      <div class="detail-loading">加载中…</div>
    </div>`,e.querySelector('[data-action="back"]')?.addEventListener("click",g);let a;try{a=await S(t)}catch{e.querySelector(".detail-loading").textContent="这个字还没收进来，换个字试试？";return}n.markViewed(t);let o=(a.components?.length??0)>0||(a.decomposition?.length??0)>0||(a.learningHint?.length??0)>0,s=a.radical!=null||a.structure!=null||a.strokeCount>0,i=n.isFavorite(t);e.innerHTML=`
    <div class="screen">
      <header class="top-bar">
        <button class="icon-button" data-action="back" aria-label="返回">‹</button>
        <span class="top-bar-spacer"></span>
        <button class="icon-button heart-button ${i?"heart-on":""}" data-action="favorite"
                aria-label="收藏">${i?"♥":"♡"}</button>
      </header>

      <div class="detail-body">
        <div class="hero-card">
          <div class="hero-character">
            <span class="hero-char">${d(a.character)}</span>
          </div>
          <div class="hero-pinyin">${d(E(a.pinyin))}</div>
          ${a.definition?`<div class="hero-definition">${d(a.definition)}</div>`:""}

          <div class="hero-actions">
            <button class="action-button action-gold" data-action="speak">🔊 读一下</button>
            ${a.strokes.length>0?'<button class="action-button action-blue" data-action="strokes">✍︎ 看怎么写</button>':'<span class="action-button action-disabled">还没有笔顺</span>'}
          </div>

          ${a.strokes.length===0?'<p class="hero-note">我先把这个字放大给你看。这个字的笔顺和练习还没收进来。</p>':""}
        </div>

        ${o?`
        <section class="detail-section">
          <h2 class="section-caption">这个字怎么记？</h2>
          <div class="detail-card">
            ${a.components?.length?`
            <div class="decompose-block">
              <span class="decompose-caption">可以这样拆</span>
              <div class="decompose-chips">
                ${a.components.map(r=>`<span class="decompose-chip">${d(r)}</span>`).join("")}
              </div>
            </div>`:""}
            ${a.decomposition?`<p class="learning-line">✂︎ ${d(a.decomposition)}</p>`:""}
            ${a.learningHint?`<p class="learning-line">💡 ${d(a.learningHint)}</p>`:""}
          </div>
        </section>`:""}

        ${a.words.length>0?`
        <section class="detail-section">
          <h2 class="section-caption">能组什么词？</h2>
          <div class="detail-card">
            <div class="word-chips">
              ${a.words.map(r=>`
              <button class="word-chip" data-speak="${d(r.w)}">
                <span class="word-text">${d(r.w)}</span>
                <span class="word-pinyin">${d(E(r.p))}</span>
              </button>`).join("")}
            </div>
          </div>
        </section>`:""}

        ${a.sentences.length>0?`
        <section class="detail-section">
          <h2 class="section-caption">用一用</h2>
          <div class="detail-card">
            ${a.sentences.map(r=>`
            <div class="sentence-row">
              <p class="sentence-text">${d(r.s)}</p>
              <button class="sentence-speak" data-speak="${d(r.s)}">🔊 听一下</button>
              <span class="sentence-pinyin">${d(r.p)}</span>
            </div>`).join("")}
          </div>
        </section>`:""}

        ${s?`
        <section class="detail-section">
          <h2 class="section-caption">多知道一点</h2>
          <div class="detail-card">
            ${[a.radical!=null?`<div class="meta-row"><span>部首</span><b>${d(a.radical)}</b></div>`:"",a.structure!=null?`<div class="meta-row"><span>结构</span><b>${d(a.structure)}</b></div>`:"",a.strokeCount>0?`<div class="meta-row"><span>笔画</span><b>${a.strokeCount}画</b></div>`:""].join("")}
          </div>
        </section>`:""}
      </div>
    </div>`,e.querySelector('[data-action="back"]')?.addEventListener("click",g),e.querySelector('[data-action="strokes"]')?.addEventListener("click",()=>{h({screen:"strokes",character:t})}),e.querySelector('[data-action="speak"]')?.addEventListener("click",()=>{O(a.character)}),e.querySelector('[data-action="favorite"]')?.addEventListener("click",r=>{n.toggleFavorite(t);let l=r.currentTarget,c=n.isFavorite(t);l.classList.toggle("heart-on",c),l.textContent=c?"♥":"♡"});for(let r of e.querySelectorAll("[data-speak]"))r.addEventListener("click",()=>O(r.dataset.speak??""))}function he(e,t,n){let a=t==="happy"?`<path d="M36 48 q4 -5 8 0" class="zi-mascot-line"/>
         <path d="M56 48 q4 -5 8 0" class="zi-mascot-line"/>`:`<circle cx="40" cy="48" r="3" fill="var(--outline)"/>
         <circle cx="60" cy="48" r="3" fill="var(--outline)"/>`,o=t==="happy"?'<path d="M42 60 q8 9 16 0" class="zi-mascot-line"/>':'<path d="M44 60 q6 6 12 0" class="zi-mascot-line"/>';return`
  <svg viewBox="0 0 100 110" width="${e}" height="${Math.round(e*1.1)}" aria-hidden="true">
    <g class="zi-mascot">
      <path d="M18 66 q-9 4 -10 12" class="zi-mascot-arm"/>
      <path d="M82 66 q9 4 10 12" class="zi-mascot-arm"/>
      <path d="M50 10 q-7 -6 -2 -8" class="zi-mascot-arm" fill="none"/>
      <rect x="10" y="12" width="80" height="80" rx="20"
            fill="${n}" stroke="var(--outline)" stroke-width="2.5"/>
      <circle cx="33" cy="56" r="4.5" fill="var(--mascot-cheek)"/>
      <circle cx="67" cy="56" r="4.5" fill="var(--mascot-cheek)"/>
      ${a}
      ${o}
    </g>
  </svg>`}async function pe(e,t){let n=t.snapshot,a=await oe(6),o=n.recentCharacters.length>0?n.recentCharacters:a,s=await ie(n.recentCharacters)??a[0]??"花";e.innerHTML=`
    <div class="screen">
      <header class="home-header">
        <span class="app-title">字</span>
        <button class="icon-button" data-nav="book" aria-label="字本子">★</button>
      </header>

      <section class="hero-entry">
        <div class="speech-bubble">想知道哪个字怎么写？打出来，我放大给你看。</div>
        ${he(78,"welcome","var(--sky-blue)")}
      </section>

      <section class="entry-cards">
        <button class="entry-card entry-card-gold" data-nav="search">
          <span class="entry-icon-circle">🔍</span>
          <span class="entry-title">查一查</span>
          <span class="entry-subtitle">打字或拼音</span>
        </button>
        <button class="entry-card entry-card-blue" data-nav="book">
          <span class="entry-icon-circle">★</span>
          <span class="entry-title">字本子</span>
          <span class="entry-subtitle">我的贴纸册</span>
        </button>
      </section>

      <section class="discovery">
        <button class="today-card" data-action="today">
          <span class="today-text">
            <span class="today-title">今日一字</span>
            <span class="today-subtitle">今天可以先认识它</span>
          </span>
          <span class="today-character">${d(s)}</span>
          <span class="today-arrow">→</span>
        </button>

        <div class="recent-block">
          <h2 class="section-caption">最近查过</h2>
          <div class="recent-chips">
            ${o.map(i=>`<button class="recent-chip" data-action="char" data-character="${d(i)}">${d(i)}</button>`).join("")}
          </div>
        </div>
      </section>

      ${P("home")}
    </div>`,e.querySelector('[data-action="today"]')?.addEventListener("click",()=>{s&&h({screen:"detail",character:s})});for(let i of e.querySelectorAll('[data-action="char"]'))i.addEventListener("click",()=>{h({screen:"detail",character:i.dataset.character??""})})}async function me(e){e.innerHTML=`
    <div class="screen">
      ${w()}
      <div class="search-body">
        <h1 class="search-heading">查一个字</h1>

        <div class="search-input-row">
          <input class="search-input" type="text" inputmode="text"
                 placeholder="例如：花 或 hua" autocomplete="off" autocapitalize="none" />
          <button class="search-clear" data-action="clear" aria-label="清除">✕</button>
        </div>

        <button class="search-submit" data-action="submit">🔍 开始查字</button>
        <p class="search-message">输入汉字或拼音，我来帮你找。</p>

        <div class="search-results" aria-live="polite"></div>
      </div>
    </div>`;let t=e.querySelector(".search-input"),n=e.querySelector(".search-message"),a=e.querySelector(".search-results");e.querySelector('[data-action="back"]')?.addEventListener("click",g),e.querySelector('[data-action="clear"]')?.addEventListener("click",()=>{t.value="",a.innerHTML="",n.textContent="输入汉字或拼音，我来帮你找。",t.focus()});function o(r,l){if(r.length===0){a.innerHTML="",n.textContent="没找到这个字，换个说法试试？";return}n.textContent=(l.includes(""),"找到啦，点一下看大字。"),a.innerHTML=r.map(c=>`
        <button class="search-result" data-character="${d(c.character)}">
          <span class="result-char">${d(c.character)}</span>
          <span class="result-pinyin">${d(E(c.pinyin))}</span>
        </button>`).join("");for(let c of a.querySelectorAll(".search-result"))c.addEventListener("click",()=>{h({screen:"detail",character:c.dataset.character??""})})}async function s(){let r=t.value.trim();if(!r){a.innerHTML="",n.textContent="输入汉字或拼音，我来帮你找。";return}let l=ae(r);if(ne(l)){let c=await S(l);if(c.pinyin&&c.pinyin!==`${l}0`){o([{character:l,pinyin:c.pinyin}],[""]);return}a.innerHTML="",n.textContent="这个字还没收进来，换个字试试？";return}o(await se(r),[])}let i;t.addEventListener("input",()=>{window.clearTimeout(i),i=window.setTimeout(()=>void s(),200)}),t.addEventListener("keydown",r=>{r.key==="Enter"&&s()}),e.querySelector('[data-action="submit"]')?.addEventListener("click",()=>void s()),t.focus()}var Fe=0;function I(e){let t=0;for(let n=1;n<e.length;n+=1)t+=Math.hypot(e[n].x-e[n-1].x,e[n].y-e[n-1].y);return t}function fe(e){return e.length===0?"":e.map((n,a)=>`${a===0?"M":"L"} ${n.x.toFixed(1)} ${n.y.toFixed(1)}`).join(" ")}function j(e,t){if(e.length===0)return{x:0,y:0};let n=I(e),a=Math.max(0,Math.min(1,t))*n,o=0;for(let s=1;s<e.length;s+=1){let i=Math.hypot(e[s].x-e[s-1].x,e[s].y-e[s-1].y);if(o+i>=a){let r=i===0?0:(a-o)/i;return{x:e[s-1].x+(e[s].x-e[s-1].x)*r,y:e[s-1].y+(e[s].y-e[s-1].y)*r}}o+=i}return e[e.length-1]}function Ne(e,t,n){let a=I(e),o=Math.max(0,t)*a,s=Math.min(1,n)*a,i=[j(e,t/a)],r=0;for(let c=1;c<e.length;c+=1){let u=Math.hypot(e[c].x-e[c-1].x,e[c].y-e[c-1].y);if(r+u>=o&&r+u<=s&&i.push(e[c]),r+=u,r>=s)break}let l=j(e,n);return i.push(l),i}function Ge(e,t){let n=Math.max(I(t),1),a=Math.max(Math.min(e.width,e.height),44),o=Math.max(44*1.4,e.width*e.height/n*1.25),s=Math.max(a*1.3,44*2.4);return Math.min(o,s)}function ve(e){let t=document.createElementNS("http://www.w3.org/2000/svg","svg");return t.innerHTML=e.trim(),t.firstElementChild}function ge(e){let t=`zi-scene-${Fe+=1}`,n=e.map(f=>`<path d="${f.path}" fill="var(--outline)" fill-opacity="0.06" stroke="var(--outline)" stroke-opacity="0.04" stroke-width="8" stroke-linejoin="round"/>`).join(`
`),a=`
    <g stroke="var(--sky-blue)" stroke-width="4" fill="none" opacity="1">
      <rect x="20" y="20" width="984" height="984" stroke-dasharray="18 14"/>
      <path d="M ${1024/2} 20 V 1004" stroke-dasharray="18 14"/>
      <path d="M 20 ${1024/2} H 1004" stroke-dasharray="18 14"/>
      <path d="M 20 20 L 1004 1004" stroke-dasharray="18 14" opacity="0.6"/>
      <path d="M 1004 20 L 20 1004" stroke-dasharray="18 14" opacity="0.6"/>
    </g>`,o=ve(`
    <svg viewBox="0 0 1024 1024" class="zi-stroke-svg">
      <defs><mask id="${t}-reveal" maskUnits="userSpaceOnUse">
        <path id="${t}-mask-path" d="" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"/>
      </mask></defs>
      <g transform="matrix(1 0 0 -1 0 1024)">
        <g class="zi-tian-grid" opacity="0.28">${a}</g>
        <g class="zi-ghost">${n}</g>
        <g class="zi-completed"></g>
        <g class="zi-active" mask="url(#${t}-reveal)"></g>
        <g class="zi-hints"></g>
      </g>
    </svg>
  `),s=o.querySelector(".zi-completed"),i=o.querySelector(".zi-active"),r=o.querySelector(".zi-hints"),l=o.querySelector(`#${t}-mask-path`),c=0,u=null,m=!1;function x(){m=!0,u!==null&&(cancelAnimationFrame(u),u=null)}return{el:o,get isPlaying(){return u!==null},setCompleted(f){x(),i.innerHTML="",r.innerHTML="",c=Math.min(Math.max(f,0),e.length),s.innerHTML=e.slice(0,c).map(p=>`<path d="${p.path}" fill="var(--outline)" stroke="var(--outline)" stroke-opacity="0.2" stroke-width="3" stroke-linejoin="round"/>`).join(`
`)},reset(){x(),c=0,s.innerHTML="",i.innerHTML="",r.innerHTML=""},playStroke(f,p=1){return new Promise(R=>{x();let L=e[f];if(!L||L.medianPoints.length<2){this.setCompleted(f+1),R();return}s.innerHTML=e.slice(0,c).map(v=>`<path d="${v.path}" fill="var(--outline)" stroke="var(--outline)" stroke-opacity="0.2" stroke-width="3" stroke-linejoin="round"/>`).join(`
`);let y=L.medianPoints,$=I(y),_=ve(`<path d="${L.path}" fill="var(--sky-blue)" stroke="var(--sky-blue)" stroke-width="4" stroke-linejoin="round"/>`);i.innerHTML="",i.appendChild(_);let we=_.getBBox(),Me=Ge(we,y);l.setAttribute("d",fe(y)),l.setAttribute("stroke-width",Me.toFixed(1)),l.setAttribute("stroke-dasharray",$.toFixed(1)),l.setAttribute("stroke-dashoffset",$.toFixed(1));let C=y[0],A=Math.max(44*1.45,12)/2;r.innerHTML=`
          <g class="zi-start-marker" opacity="0">
            <circle cx="${C.x}" cy="${C.y}" r="${A}" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="9"/>
            <circle cx="${C.x}" cy="${C.y}" r="${A}" fill="none" stroke="rgba(43,110,205,0.92)" stroke-width="5"/>
          </g>
          <path class="zi-tail" d="" fill="none" stroke="var(--sky-blue)" stroke-opacity="0.42"
                stroke-width="${Math.max(44*.34,3)}" stroke-linecap="round" stroke-linejoin="round"/>
          <circle class="zi-head" r="${44*.55}" fill="var(--sky-blue)"/>`;let xe=r.querySelector(".zi-start-marker"),$e=r.querySelector(".zi-tail"),F=r.querySelector(".zi-head"),Ee=(.18+Math.max($,80)/260)/Math.max(p,.1),Le=performance.now();m=!1;let Ce=v=>v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2,N=v=>{if(m||!o.isConnected){R();return}let G=Math.min((v-Le)/(Ee*1e3),1),k=Ce(G);l.setAttribute("stroke-dashoffset",($*(1-k)).toFixed(1));let U=j(y,k);if(F.setAttribute("cx",U.x.toFixed(1)),F.setAttribute("cy",U.y.toFixed(1)),k>.02){let q=Math.min(.28,Math.max(.1,90/$)),Te=Ne(y,Math.max(0,k-q),k);$e.setAttribute("d",fe(Te))}xe.setAttribute("opacity",k>.01&&k<.22?"1":"0"),G<1?u=requestAnimationFrame(N):(u=null,i.innerHTML="",r.innerHTML="",c=Math.min(f+1,e.length),s.innerHTML=e.slice(0,c).map(q=>`<path d="${q.path}" fill="var(--outline)" stroke="var(--outline)" stroke-opacity="0.2" stroke-width="3" stroke-linejoin="round"/>`).join(`
`),R())};u=requestAnimationFrame(N)})}}}var ke=["var(--sky-blue)","var(--warm-gold)","var(--mint)","var(--success-green)"];function ye(e){if(!e.querySelector(".zi-splatter-layer")){let o=document.createElement("div");o.className="zi-splatter-layer",e.appendChild(o)}let t=e.querySelector(".zi-splatter-layer"),n=document.createDocumentFragment(),a=[];for(let o=0;o<14;o+=1){let s=document.createElement("span");s.className="zi-splatter-particle";let i=Math.PI*2*o/14+Math.random()*.4,r=44+Math.random()*52,l=6+Math.random()*9;s.style.width=`${l}px`,s.style.height=`${l}px`,s.style.background=ke[o%ke.length],s.style.left="50%",s.style.top="50%",s.animate([{transform:"translate(-50%, -50%) scale(0)",opacity:1},{transform:`translate(calc(-50% + ${Math.cos(i)*r}px), calc(-50% + ${Math.sin(i)*r}px)) scale(1)`,opacity:1}],{duration:800,delay:Math.random()*120,easing:"ease-out",fill:"forwards"}),a.push(s),n.appendChild(s)}t.appendChild(n),window.setTimeout(()=>{a.forEach(o=>o.remove()),t.childElementCount===0&&t.remove()},1100)}async function be(e,t){e.innerHTML=`
    <div class="screen">
      ${w()}
      <div class="strokes-title-row"><span class="strokes-title">${d(t)}</span></div>
      <div class="strokes-body">
        <div class="strokes-status" aria-live="polite">准备中…</div>
        <div class="stroke-canvas-card"><div class="strokes-loading">加载中…</div></div>
        <button class="play-button" data-action="play" disabled>▶ 演示笔顺</button>
      </div>
    </div>`,e.querySelector('[data-action="back"]')?.addEventListener("click",g);let n=e.querySelector(".strokes-status"),a=e.querySelector(".stroke-canvas-card"),o=e.querySelector('[data-action="play"]'),i=(await S(t)).strokes;if(i.length===0){n.textContent="这个字的笔顺还没收进来。";return}a.querySelector(".strokes-loading")?.remove();let r=ge(i);a.appendChild(r.el);let l=0,c=!1;function u(){c?(n.textContent=`第 ${l+1} 笔，共 ${i.length} 笔`,n.classList.remove("strokes-status-done")):l>=i.length?(n.textContent="写完啦！✨",n.classList.add("strokes-status-done")):(n.textContent=`准备好了吗？一共 ${i.length} 笔`,n.classList.remove("strokes-status-done"))}async function m(){if(!c){for(c=!0,o.disabled=!0,l>=i.length&&(l=0,r.reset(),u());l<i.length;l+=1)if(u(),await r.playStroke(l),!r.el.isConnected){c=!1;return}c=!1,u(),ye(a),o.disabled=!1,o.textContent="↺ 再看一遍"}}u(),o.disabled=!1,o.addEventListener("click",()=>void m())}var M=document.getElementById("app"),B=new T;function Se(){let e=z();switch(M.innerHTML="",e.screen){case"home":pe(M,B);break;case"book":de(M,B);break;case"search":me(M);break;case"detail":ue(M,e.character,B);break;case"strokes":be(M,e.character);break}}document.addEventListener("click",e=>{let t=e.target.closest("[data-nav]");if(!t)return;let n=t.dataset.nav;n==="home"?h({screen:"home"}):n==="book"?h({screen:"book"}):n==="search"&&h({screen:"search"})});Z(Se);Se();"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./service-worker.js").catch(()=>{})});})();
