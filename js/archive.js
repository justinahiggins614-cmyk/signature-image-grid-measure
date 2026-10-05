/* Measure Archive — collapsible A–Z, lazy per-letter loading. */
(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
var letters={};
function card(r){
  var rows=r.table.map(function(t){return "<tr><td>"+t[0]+"</td><td>"+t[1]+"</td></tr>";}).join("");
  return "<div class='mitem'><h3>"+r.id+" — "+r.name+"</h3>"+r.svg+
   "<table class='measure'><tbody>"+rows+"</tbody></table></div>";
}
function render(filter){
  var az=$("az");az.innerHTML="";
  Object.keys(letters).sort().forEach(function(L){
    var recs=letters[L];
    if(filter)recs=recs.filter(function(r){return (r.name+" "+r.id+" "+r.shape).toLowerCase().indexOf(filter)>=0;});
    if(!recs.length)return;
    var d=document.createElement("details");d.className="az";
    d.innerHTML="<summary>"+L+" <span class='cnt'>"+recs.length+" records</span></summary>";
    var g=document.createElement("div");g.className="mgrid";
    d.appendChild(g);
    d.addEventListener("toggle",function(){
      if(d.open&&!g.dataset.done){g.dataset.done="1";
        g.innerHTML=recs.map(card).join("");}
    },{once:false});
    if(filter){g.innerHTML=recs.slice(0,60).map(card).join("");g.dataset.done="1";d.open=true;}
    az.appendChild(d);
  });
}
fetch("data/index.json").then(function(r){return r.json();}).then(function(idx){
  $("statline").textContent=idx.total.toLocaleString()+" of 1,000,000 reference measurements.";
  var jobs=idx.chunks.map(function(c){
    return fetch("data/measures/"+c).then(function(r){return r.json();});
  });
  return Promise.all(jobs);
}).then(function(chunks){
  chunks.forEach(function(recs){
    recs.forEach(function(r){
      var L=(r.name[0]||"#").toUpperCase();
      (letters[L]=letters[L]||[]).push(r);
    });
  });
  render("");
  var t;$("q").addEventListener("input",function(e){
    clearTimeout(t);t=setTimeout(function(){render(e.target.value.trim().toLowerCase());},250);
  });
}).catch(function(){$("statline").textContent="Archive failed to load.";});
})();
