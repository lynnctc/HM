/* ============================================================
   Shared interactive components — Healthcare Management course site
   All components are vanilla JS, no dependencies.
   ============================================================ */
"use strict";

/* ---------- utils ---------- */
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

/* ============================================================
   Stepper framework (used by every step simulator)
   cfg = {steps, render(step,i), prev,next,play,reset,no}  (element ids)
   ============================================================ */
function makeStepper(cfg){
  let i = 0, timer = null;
  const total = cfg.steps.length;
  const $ = id => document.getElementById(id);
  const btnPrev = $(cfg.prev), btnNext = $(cfg.next), btnPlay = $(cfg.play), btnReset = $(cfg.reset), no = $(cfg.no);
  function stopPlay(){
    if(timer){ clearInterval(timer); timer = null; if(btnPlay) btnPlay.textContent = "▶ Auto-play"; }
  }
  function render(){
    cfg.render(cfg.steps[i], i);
    no.textContent = (i+1) + " / " + total;
    btnPrev.disabled = (i===0);
    btnNext.disabled = (i===total-1);
    if(i===total-1) stopPlay();
  }
  btnNext.addEventListener("click", ()=>{ stopPlay(); if(i<total-1){i++; render();} });
  btnPrev.addEventListener("click", ()=>{ stopPlay(); if(i>0){i--; render();} });
  btnReset.addEventListener("click", ()=>{ stopPlay(); i=0; render(); });
  if(btnPlay) btnPlay.addEventListener("click", ()=>{
    if(timer){ stopPlay(); return; }
    if(i===total-1){ i=0; render(); }
    btnPlay.textContent = "⏸ Pause";
    timer = setInterval(()=>{ if(i<total-1){ i++; render(); } else stopPlay(); }, 2400);
  });
  render();
}

/* ============================================================
   Quiz engine (bilingual)
   initQuiz(containerId, questions, scoreIds?)
   question = { en, zh, code?, opts:[string], ans:index, exp_en, exp_zh }
   scoreIds = { stat, fill, msg }   (optional sticky scorebar)
   ============================================================ */
function initQuiz(containerId, QS, scoreIds){
  const box = document.getElementById(containerId);
  let answered = 0, correct = 0;
  const stat = scoreIds ? document.getElementById(scoreIds.stat) : null;
  const fill = scoreIds ? document.getElementById(scoreIds.fill) : null;
  const msg  = scoreIds ? document.getElementById(scoreIds.msg)  : null;

  QS.forEach((item, qi)=>{
    const div = document.createElement("div");
    div.className = "q";
    let h = '<div class="q-head"><span class="q-no">Q'+(qi+1)+'</span><div>'
          + '<p class="q-text">'+item.en+'</p>'
          + (item.zh ? '<p class="q-zh">'+item.zh+'</p>' : '')
          + '</div></div>';
    if(item.code) h += '<pre class="code">'+esc(item.code)+'</pre>';
    h += '<ul class="opts">' + item.opts.map((o,oi)=>
      '<li><button class="opt" data-o="'+oi+'"><span class="mono">'+String.fromCharCode(65+oi)+'.</span> '+o+'</button></li>'
    ).join("") + '</ul><div class="explain"></div>';
    div.innerHTML = h;
    box.appendChild(div);

    const btns = div.querySelectorAll(".opt");
    const ex = div.querySelector(".explain");
    btns.forEach(b=>{
      b.addEventListener("click", ()=>{
        const pick = +b.dataset.o;
        btns.forEach(x=>x.disabled = true);
        btns[item.ans].classList.add("correct");
        const isRight = pick === item.ans;
        if(!isRight) b.classList.add("wrong");
        ex.innerHTML = (isRight ? "<b>Correct!</b> " : "<b>Not quite.</b> ") + item.exp_en
                     + (item.exp_zh ? '<span class="zh">'+(isRight?"答對了！":"再想想。")+" "+item.exp_zh+'</span>' : '');
        ex.classList.add("show");
        answered++; if(isRight) correct++;
        if(stat){
          stat.textContent = "Answered "+answered+" / "+QS.length+" (correct "+correct+")";
          fill.style.width = (answered / QS.length * 100) + "%";
          if(answered === QS.length && msg){
            const pct = correct / QS.length;
            msg.textContent = pct === 1
              ? "Perfect score! 全對，你已掌握本週內容 🎓"
              : pct >= 0.66
              ? "Nice work — review the sections for the ones you missed. 不錯！建議回頭複習答錯題對應的小節。"
              : "Consider re-reading this unit before the homework. 建議寫作業前把本週單元再讀一遍。";
          }
        }
      });
    });
  });
}

/* ============================================================
   Checkpoint — single inline question (bilingual)
   initCheckpoint(containerId, item)   item = same shape as quiz question
   ============================================================ */
function initCheckpoint(containerId, item){
  const div = document.getElementById(containerId);
  div.classList.add("checkpoint");
  let h = '<span class="cp-tag">Checkpoint</span>'
        + '<p class="q-text">'+item.en+'</p>'
        + (item.zh ? '<p class="q-zh">'+item.zh+'</p>' : '');
  if(item.code) h += '<pre class="code">'+esc(item.code)+'</pre>';
  h += '<ul class="opts">' + item.opts.map((o,oi)=>
    '<li><button class="opt" data-o="'+oi+'"><span class="mono">'+String.fromCharCode(65+oi)+'.</span> '+o+'</button></li>'
  ).join("") + '</ul><div class="explain"></div>';
  div.innerHTML = h;
  const btns = div.querySelectorAll(".opt");
  const ex = div.querySelector(".explain");
  btns.forEach(b=>{
    b.addEventListener("click", ()=>{
      btns.forEach(x=>x.disabled = true);
      btns[item.ans].classList.add("correct");
      if(+b.dataset.o !== item.ans) b.classList.add("wrong");
      ex.innerHTML = (+b.dataset.o === item.ans ? "<b>Correct!</b> " : "<b>Not quite.</b> ") + item.exp_en
                   + (item.exp_zh ? '<span class="zh">'+item.exp_zh+'</span>' : '');
      ex.classList.add("show");
    });
  });
}

/* ============================================================
   Sorter — classification game (bilingual)
   initSorter(containerId, cfg)
   cfg = { cats:[{id,label}], items:[{en,zh?,cat,exp_en,exp_zh?}] }
   Shows one item at a time; learner picks a category; feedback +
   explanation; running score; summary + restart at the end.
   ============================================================ */
function initSorter(containerId, cfg){
  const box = document.getElementById(containerId);
  box.classList.add("sorter");
  let i = 0, correct = 0;
  function esc0(s){ return s; } /* items are trusted authored HTML */
  function render(){
    if(i >= cfg.items.length){
      const pct = Math.round(correct / cfg.items.length * 100);
      box.innerHTML = '<div class="st-done"><b>Done! '+correct+' / '+cfg.items.length+' correct ('+pct+'%).</b> '
        + (pct===100 ? "You nailed every category." : "Scroll back through the section for the ones you missed.")
        + '<span class="zh">完成！答對 '+correct+' 題'+(pct===100?"，全對！":"，建議回頭複習答錯的類別。")+'</span></div>'
        + '<button class="btn st-next" id="'+containerId+'-restart">↻ Restart 重新開始</button>';
      document.getElementById(containerId+"-restart").addEventListener("click", ()=>{ i=0; correct=0; render(); });
      return;
    }
    const it = cfg.items[i];
    box.innerHTML =
      '<div class="st-prog"><span>Item '+(i+1)+' / '+cfg.items.length+'</span><span>Correct 答對: '+correct+'</span></div>'
      + '<div class="st-item">'+esc0(it.en)+(it.zh?'<span class="zh">'+it.zh+'</span>':'')+'</div>'
      + '<div class="st-cats">' + cfg.cats.map(c=>'<button class="st-cat" data-c="'+c.id+'">'+c.label+'</button>').join("") + '</div>'
      + '<div class="explain"></div>'
      + '<button class="btn primary st-next" style="display:none" id="'+containerId+'-next">Next ▸ 下一題</button>';
    const btns = box.querySelectorAll(".st-cat");
    const ex = box.querySelector(".explain");
    const nextBtn = document.getElementById(containerId+"-next");
    btns.forEach(b=>{
      b.addEventListener("click", ()=>{
        btns.forEach(x=>x.disabled = true);
        const right = b.dataset.c === it.cat;
        if(right) correct++;
        btns.forEach(x=>{ if(x.dataset.c === it.cat) x.classList.add("correct"); });
        if(!right) b.classList.add("wrong");
        ex.innerHTML = (right ? "<b>Correct!</b> " : "<b>Not quite.</b> ") + (it.exp_en||"")
                     + (it.exp_zh ? '<span class="zh">'+it.exp_zh+'</span>' : '');
        ex.classList.add("show");
        nextBtn.style.display = "inline-block";
      });
    });
    nextBtn.addEventListener("click", ()=>{ i++; render(); });
  }
  render();
}

/* ============================================================
   Code inspector: clickable .tok spans inside a <pre>
   initInspector(codeElId, noteElId, defaultHTML?)
   Each .tok carries data-note (HTML, may contain .zh spans)
   ============================================================ */
function initInspector(codeElId, noteElId, defaultHTML){
  const note = document.getElementById(noteElId);
  const toks = document.querySelectorAll("#"+codeElId+" .tok");
  if(defaultHTML) note.innerHTML = defaultHTML;
  toks.forEach(t=>{
    t.setAttribute("tabindex","0");
    t.setAttribute("role","button");
    function show(){
      toks.forEach(x=>x.classList.remove("on"));
      t.classList.add("on");
      note.innerHTML = t.dataset.note;
    }
    t.addEventListener("click", show);
    t.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); show(); } });
  });
}

/* ============================================================
   Accordions:  <div class="acc"><button class="acc-h">…</button><div class="acc-b">…</div></div>
   ============================================================ */
function initAccordions(root){
  (root||document).querySelectorAll(".acc > .acc-h").forEach(h=>{
    h.addEventListener("click", ()=> h.parentElement.classList.toggle("open"));
  });
}

/* ============================================================
   Tabs:  container has .tabs (buttons .tab data-pane=id) + .tabpanes (.tabpane ids)
   ============================================================ */
function initTabs(tabsElId){
  const tabs = document.querySelectorAll("#"+tabsElId+" .tab");
  tabs.forEach(t=>{
    t.addEventListener("click", ()=>{
      tabs.forEach(x=>x.classList.remove("sel"));
      t.classList.add("sel");
      const paneIds = Array.from(tabs).map(x=>x.dataset.pane);
      paneIds.forEach(pid=>{
        const p = document.getElementById(pid);
        if(p) p.classList.toggle("sel", pid === t.dataset.pane);
      });
    });
  });
}

/* ============================================================
   Timeline: .tl-item click to expand
   ============================================================ */
function initTimeline(rootId){
  document.querySelectorAll("#"+rootId+" .tl-item").forEach(it=>{
    it.addEventListener("click", ()=> it.classList.toggle("open"));
    it.setAttribute("tabindex","0");
    it.addEventListener("keydown", e=>{ if(e.key==="Enter"){ it.classList.toggle("open"); } });
  });
}

/* ============================================================
   Picker panels (structure explorer / flowchart): buttons with data-note → detail box
   initPicker(btnSelector, detailElId, defaultHTML?)
   ============================================================ */
function initPicker(btnSelector, detailElId, defaultHTML){
  const btns = document.querySelectorAll(btnSelector);
  const det = document.getElementById(detailElId);
  if(defaultHTML) det.innerHTML = defaultHTML;
  btns.forEach(b=>{
    b.addEventListener("click", ()=>{
      btns.forEach(x=>x.classList.remove("sel"));
      b.classList.add("sel");
      det.innerHTML = b.dataset.note;
    });
  });
}

/* ============================================================
   Auto-init accordions on every page
   ============================================================ */
document.addEventListener("DOMContentLoaded", ()=> initAccordions());
