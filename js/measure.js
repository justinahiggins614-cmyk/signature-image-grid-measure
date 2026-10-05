/* The Signature Image Grid and Measure — workbench engine.
   Upload image/video -> grid overlays -> measure (ruler, protractor, area,
   color) -> 360° rotation -> real-unit calibration -> recreation report. */
(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
var stage=$("stage"),ctx=stage.getContext("2d");
var UNITS={mm:1,cm:10,m:1000,km:1000000,in:25.4,ft:304.8};

var S={img:null,imgName:"",iw:0,ih:0,rot:0,mode:"measure",
  grid:{type:"square",size:50},cal:null,measures:[],
  drag:null,anglePts:[],calLine:null,raw:null};

function flash(msg){var f=$("flash");f.style.display="block";f.textContent=msg;}
function setRead(t){$("readout").textContent=t;}

/* ---------- loading ---------- */
$("file").addEventListener("change",function(e){
  var f=e.target.files[0];if(!f)return;
  if(f.type.indexOf("video")===0){
    var v=$("vid");v.style.display="block";v.src=URL.createObjectURL(f);
    $("capframe").style.display="";S.imgName=f.name;flash("Video loaded — play it, pause on a frame, then Capture video frame.");
  }else{
    var img=new Image();
    img.onload=function(){setImage(img,f.name);URL.revokeObjectURL(img.src);};
    img.src=URL.createObjectURL(f);
  }
});
$("capframe").addEventListener("click",function(){
  var v=$("vid");if(!v.videoWidth){flash("Play the video first, then capture.");return;}
  var c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;
  c.getContext("2d").drawImage(v,0,0);
  var img=new Image();
  img.onload=function(){setImage(img,S.imgName+" @"+v.currentTime.toFixed(1)+"s");};
  img.src=c.toDataURL();
});
function setImage(img,name){
  var max=1600,sc=Math.min(1,max/Math.max(img.width,img.height));
  S.iw=Math.round(img.width*sc);S.ih=Math.round(img.height*sc);
  stage.width=S.iw;stage.height=S.ih;S.img=img;S.imgName=name;
  S.measures=[];S.cal=null;S.rot=0;$("rot").value=0;$("rotv").textContent="0°";
  var rc=document.createElement("canvas");rc.width=S.iw;rc.height=S.ih;
  rc.getContext("2d").drawImage(img,0,0,S.iw,S.ih);S.raw=rc;
  render();refreshTable();
  setRead("Loaded "+name+" ("+S.iw+"×"+S.ih+" px). Pick a tool and draw on the image.");
}
/* deterministic sample grid (no assets needed) */
$("sample").addEventListener("click",function(){
  var c=document.createElement("canvas");c.width=800;c.height=500;
  var g=c.getContext("2d");g.fillStyle="#f4f1e8";g.fillRect(0,0,800,500);
  var cols=["#c0392b","#2471a3","#229954","#8e44ad","#d4ac0d"];
  for(var i=0;i<5;i++){g.fillStyle=cols[i];
    g.beginPath();g.arc(120+i*140,250,60,0,7);g.fill();}
  g.strokeStyle="#2c3e50";g.lineWidth=6;g.strokeRect(60,80,680,340);
  g.fillStyle="#2c3e50";g.font="28px Georgia";
  g.fillText("SAMPLE GRID — 800 × 500",230,60);
  for(var x=0;x<=800;x+=50){g.fillRect(x,470,2,20);}
  var img=new Image();img.onload=function(){setImage(img,"sample-grid.png");};img.src=c.toDataURL();
});

/* ---------- coordinate transforms (rotation about centre) ---------- */
function rad(){return S.rot*Math.PI/180;}
function toImage(cx,cy){
  var dx=cx-stage.width/2,dy=cy-stage.height/2,r=-rad();
  return {x:dx*Math.cos(r)-dy*Math.sin(r)+S.iw/2,
          y:dx*Math.sin(r)+dy*Math.cos(r)+S.ih/2};
}
function toCanvas(ix,iy){
  var dx=ix-S.iw/2,dy=iy-S.ih/2,r=rad();
  return {x:dx*Math.cos(r)-dy*Math.sin(r)+stage.width/2,
          y:dx*Math.sin(r)+dy*Math.cos(r)+stage.height/2};
}
function evPos(e){
  var b=stage.getBoundingClientRect();
  return {x:(e.clientX-b.left)*stage.width/b.width,
          y:(e.clientY-b.top)*stage.height/b.height};
}
function fmtLen(px){
  if(!S.cal)return px.toFixed(1)+" px (uncalibrated)";
  return (px/S.cal.pxPerUnit).toFixed(3)+" "+S.cal.unit;
}
function fmtArea(px2){
  if(!S.cal)return px2.toFixed(1)+" px² (uncalibrated)";
  var u=px2/(S.cal.pxPerUnit*S.cal.pxPerUnit);
  return u.toFixed(4)+" "+S.cal.unit+"²";
}
function dist(a,b){return Math.hypot(b.x-a.x,b.y-a.y);}

/* ---------- pointer tools ---------- */
document.querySelectorAll(".toolbar [data-tool]").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll(".toolbar [data-tool]").forEach(function(x){x.classList.remove("on");});
    b.classList.add("on");S.mode=b.getAttribute("data-tool");S.anglePts=[];
    setRead("Tool: "+b.textContent+". "+hint());
  });
});
function hint(){
  return {measure:"Drag a line to measure its length.",angle:"Click three points (the 2nd is the corner).",
   area:"Drag a rectangle to measure its area.",color:"Click any pixel to read its color.",
   calibrate:"Drag along something of known length, then enter its real size."}[S.mode];
}
stage.addEventListener("pointerdown",function(e){
  if(!S.img)return;stage.setPointerCapture(e.pointerId);
  var p=toImage(evPos(e).x,evPos(e).y);
  if(S.mode==="angle"){
    S.anglePts.push(p);
    if(S.anglePts.length===3){
      var a=S.anglePts[0],b=S.anglePts[1],c=S.anglePts[2];
      var v1={x:a.x-b.x,y:a.y-b.y},v2={x:c.x-b.x,y:c.y-b.y};
      var dot=v1.x*v2.x+v1.y*v2.y;
      var deg=Math.acos(Math.max(-1,Math.min(1,dot/(Math.hypot(v1.x,v1.y)*Math.hypot(v2.x,v2.y)||1))))*180/Math.PI;
      S.measures.push({kind:"angle",pts:[a,b,c],deg:deg});
      S.anglePts=[];refreshTable();render();
      setRead("Angle: "+deg.toFixed(2)+"°");
    }else render();
    return;
  }
  if(S.mode==="color"){
    var x=Math.max(0,Math.min(S.iw-1,Math.round(p.x))),y=Math.max(0,Math.min(S.ih-1,Math.round(p.y)));
    var d=S.raw.getContext("2d").getImageData(x,y,1,1).data;
    var hex="#"+("0"+d[0].toString(16)).slice(-2)+("0"+d[1].toString(16)).slice(-2)+("0"+d[2].toString(16)).slice(-2);
    S.measures.push({kind:"color",pt:p,hex:hex,rgb:[d[0],d[1],d[2]]});
    refreshTable();render();setRead("Color at ("+x+", "+y+"): "+hex+"  rgb("+d[0]+","+d[1]+","+d[2]+")");
    return;
  }
  S.drag={start:p,cur:p};
});
stage.addEventListener("pointermove",function(e){
  if(!S.drag||!S.img)return;
  S.drag.cur=toImage(evPos(e).x,evPos(e).y);render();
  var d=dist(S.drag.start,S.drag.cur);
  if(S.mode==="measure")setRead("Length: "+fmtLen(d));
  else if(S.mode==="area")setRead("Area: "+fmtArea(Math.abs((S.drag.cur.x-S.drag.start.x)*(S.drag.cur.y-S.drag.start.y))));
  else if(S.mode==="calibrate")setRead("Calibration line: "+d.toFixed(1)+" px — release, then enter the real length.");
});
stage.addEventListener("pointerup",function(e){
  if(!S.drag)return;
  var s=S.drag.start,c=toImage(evPos(e).x,evPos(e).y);S.drag=null;
  if(S.mode==="measure"&&dist(s,c)>2){
    S.measures.push({kind:"distance",p1:s,p2:c,px:dist(s,c)});
    setRead("Length: "+fmtLen(dist(s,c)));
  }else if(S.mode==="area"&&Math.abs(c.x-s.x)>2&&Math.abs(c.y-s.y)>2){
    var w=Math.abs(c.x-s.x),h=Math.abs(c.y-s.y);
    S.measures.push({kind:"area",rect:{x:Math.min(s.x,c.x),y:Math.min(s.y,c.y),w:w,h:h},px2:w*h});
    setRead("Area: "+fmtArea(w*h));
  }else if(S.mode==="calibrate"&&dist(s,c)>2){
    S.calLine={p1:s,p2:c,px:dist(s,c)};
    $("calpx").textContent=dist(s,c).toFixed(1);
    $("calpanel").style.display="block";
    setRead("Enter the real-world length of that "+dist(s,c).toFixed(1)+" px line.");
  }
  refreshTable();render();
});
$("calgo").addEventListener("click",function(){
  var len=parseFloat($("callen").value),unit=$("calunit").value;
  if(!(len>0)||!S.calLine){flash("Enter a real length first.");return;}
  S.cal={pxPerUnit:S.calLine.px/len,unit:unit};
  $("calpanel").style.display="none";
  refreshTable();render();
  setRead("Calibrated: "+S.cal.pxPerUnit.toFixed(2)+" px = 1 "+unit+". All readings now in "+unit+".");
});
$("clearm").addEventListener("click",function(){S.measures=[];refreshTable();render();setRead("Marks cleared.");});
$("gridtype").addEventListener("change",function(e){S.grid.type=e.target.value;render();});
$("gridsize").addEventListener("input",function(e){S.grid.size=+e.target.value;render();});
$("rot").addEventListener("input",function(e){S.rot=+e.target.value;$("rotv").textContent=S.rot+"°";render();});

/* ---------- render ---------- */
function render(){
  ctx.clearRect(0,0,stage.width,stage.height);
  ctx.fillStyle="#081627";ctx.fillRect(0,0,stage.width,stage.height);
  if(S.img){
    ctx.save();ctx.translate(stage.width/2,stage.height/2);ctx.rotate(rad());
    ctx.drawImage(S.img,-S.iw/2,-S.ih/2,S.iw,S.ih);ctx.restore();
  }
  drawGrid();drawMeasures();
  if(S.drag&&(S.mode==="measure"||S.mode==="calibrate")){
    var a=toCanvas(S.drag.start.x,S.drag.start.y),b=toCanvas(S.drag.cur.x,S.drag.cur.y);
    ctx.strokeStyle="#ff9d2e";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  if(S.drag&&S.mode==="area"){
    var r=S.drag;r={x:Math.min(r.start.x,r.cur.x),y:Math.min(r.start.y,r.cur.y),w:Math.abs(r.cur.x-r.start.x),h:Math.abs(r.cur.y-r.start.y)};
    var c1=toCanvas(r.x,r.y),c2=toCanvas(r.x+r.w,r.y+r.h);
    ctx.strokeStyle="#ff9d2e";ctx.lineWidth=2;ctx.strokeRect(c1.x,c1.y,c2.x-c1.x,c2.y-c1.y);
  }
  S.anglePts.forEach(function(p){var c=toCanvas(p.x,p.y);ctx.fillStyle="#37d67a";ctx.beginPath();ctx.arc(c.x,c.y,5,0,7);ctx.fill();});
}
function drawGrid(){
  var t=S.grid.type;if(t==="none"||!S.img)return;
  var W=stage.width,H=stage.height;
  ctx.strokeStyle="rgba(120,180,255,.45)";ctx.lineWidth=1;ctx.beginPath();
  if(t==="square"){var s=S.grid.size;
    for(var x=s;x<W;x+=s){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(var y=s;y<H;y+=s){ctx.moveTo(0,y);ctx.lineTo(W,y);}
  }else if(t==="thirds"){
    [1/3,2/3].forEach(function(f){ctx.moveTo(W*f,0);ctx.lineTo(W*f,H);ctx.moveTo(0,H*f);ctx.lineTo(W,H*f);});
  }else if(t==="golden"){var ph=1.6180339887;
    [1/ph,1-1/ph].forEach(function(f){ctx.moveTo(W*f,0);ctx.lineTo(W*f,H);ctx.moveTo(0,H*f);ctx.lineTo(W,H*f);});
  }else if(t==="diagonal"){
    ctx.moveTo(0,0);ctx.lineTo(W,H);ctx.moveTo(W,0);ctx.lineTo(0,H);
    [1/3,2/3].forEach(function(f){ctx.moveTo(W*f,0);ctx.lineTo(W*f,H);ctx.moveTo(0,H*f);ctx.lineTo(W,H*f);});
  }
  ctx.stroke();
}
function drawMeasures(){
  ctx.font="13px monospace";
  S.measures.forEach(function(m,i){
    ctx.fillStyle="#ff9d2e";ctx.strokeStyle="#ff9d2e";ctx.lineWidth=2;
    if(m.kind==="distance"||m.kind==="calref"){
      var a=toCanvas(m.p1.x,m.p1.y),b=toCanvas(m.p2.x,m.p2.y);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      [a,b].forEach(function(p){ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill();});
      ctx.fillText(fmtLen(m.px),(a.x+b.x)/2+6,(a.y+b.y)/2-6);
    }else if(m.kind==="angle"){
      var p=m.pts.map(function(q){return toCanvas(q.x,q.y);});
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.stroke();
      ctx.fillText(m.deg.toFixed(1)+"°",p[1].x+8,p[1].y-8);
    }else if(m.kind==="area"){
      var r=m.rect,c1=toCanvas(r.x,r.y),c2=toCanvas(r.x+r.w,r.y+r.h);
      ctx.strokeRect(c1.x,c1.y,c2.x-c1.x,c2.y-c1.y);
      ctx.fillText(fmtArea(m.px2),c1.x+6,c1.y+16);
    }else if(m.kind==="color"){
      var c=toCanvas(m.pt.x,m.pt.y);
      ctx.fillStyle=m.hex;ctx.fillRect(c.x-8,c.y-8,16,16);
      ctx.fillStyle="#ff9d2e";ctx.fillText(m.hex,c.x+12,c.y+4);
    }
  });
}

/* ---------- table + report ---------- */
function reading(m){
  if(m.kind==="distance")return fmtLen(m.px);
  if(m.kind==="angle")return m.deg.toFixed(2)+"°";
  if(m.kind==="area")return fmtArea(m.px2);
  if(m.kind==="color")return m.hex+" rgb("+m.rgb.join(",")+")";
  return "";
}
function refreshTable(){
  var tb=$("mtable").querySelector("tbody");tb.innerHTML="";
  S.measures.forEach(function(m,i){
    var tr=document.createElement("tr");
    tr.innerHTML="<td>"+(i+1)+"</td><td>"+m.kind+"</td><td></td><td></td>";
    tr.children[2].textContent=reading(m);
    var del=document.createElement("button");del.className="btn ghost";del.textContent="✕";
    del.setAttribute("aria-label","Delete measurement "+(i+1));
    del.addEventListener("click",function(){S.measures.splice(i,1);refreshTable();render();});
    tr.children[3].appendChild(del);tb.appendChild(tr);
  });
}
function buildReport(){
  return {site:"The Signature Image Grid and Measure",image:S.imgName,
    pixels:{w:S.iw,h:S.ih},rotation_deg:S.rot,grid:S.grid,
    calibration:S.cal||"uncalibrated (pixels only)",
    measurements:S.measures.map(function(m,i){
      var o={n:i+1,kind:m.kind,reading:reading(m)};
      if(m.p1)o.p1={x:+m.p1.x.toFixed(1),y:+m.p1.y.toFixed(1)};
      if(m.p2)o.p2={x:+m.p2.x.toFixed(1),y:+m.p2.y.toFixed(1)};
      if(m.pts)o.points=m.pts.map(function(p){return {x:+p.x.toFixed(1),y:+p.y.toFixed(1)};});
      if(m.rect)o.rect={x:+m.rect.x.toFixed(1),y:+m.rect.y.toFixed(1),w:+m.rect.w.toFixed(1),h:+m.rect.h.toFixed(1)};
      if(m.hex)o.color=m.hex;
      return o;})};
}
function reportText(r){
  var L=["THE SIGNATURE IMAGE GRID AND MEASURE — RECREATION REPORT","Image: "+r.image,
   "Size: "+r.pixels.w+" × "+r.pixels.h+" px","Rotation: "+r.rotation_deg+"°",
   "Grid: "+r.grid.type+(r.grid.type==="square"?" ("+r.grid.size+" px)":""),
   "Scale: "+(r.calibration==="uncalibrated (pixels only)"?"uncalibrated":r.calibration.pxPerUnit.toFixed(2)+" px per "+r.calibration.unit),"",
   "MEASUREMENTS ("+r.measurements.length+"):"];
  r.measurements.forEach(function(m){L.push("  "+m.n+". ["+m.kind+"] "+m.reading);});
  L.push("", "Reproduce: reload this image, set the same grid, rotation and scale,",
         "then re-mark the listed points — every reading above will repeat exactly.");
  return L.join("\n");
}
$("report").addEventListener("click",function(){
  if(!S.img){flash("Load an image first.");return;}
  var r=buildReport();$("reportout").textContent=reportText(r);
  setRead("Report built: "+r.measurements.length+" measurements. Download it or copy it.");
});
$("dljson").addEventListener("click",function(){
  if(!S.img){flash("Load an image first.");return;}
  var blob=new Blob([JSON.stringify(buildReport(),null,1)],{type:"application/json"});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="grid-measure-report.json";a.click();URL.revokeObjectURL(a.href);
});
$("copyrep").addEventListener("click",function(){
  var t=$("reportout").textContent;
  if(document.execCommand("copy")){}
  navigator.clipboard&&navigator.clipboard.writeText(t);
  var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);
  ta.select();try{document.execCommand("copy");}catch(e){}
  document.body.removeChild(ta);setRead("Report copied.");
});
$("dlpng").addEventListener("click",function(){
  if(!S.img){flash("Load an image first.");return;}
  var c=document.createElement("canvas");c.width=stage.width;c.height=stage.height;
  var g=c.getContext("2d");g.drawImage(stage,0,0);
  var a=document.createElement("a");a.href=c.toDataURL("image/png");
  a.download="grid-measure-marked.png";a.click();
});
/* live count */
fetch("measure-manifest.json").then(function(r){return r.json();}).then(function(m){
  $("countline").textContent=m.total_records.toLocaleString()+" reference measurements archived · marching to 1,000,000";
}).catch(function(){});
render();
})();
